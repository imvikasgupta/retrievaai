import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { buildContext, DEFAULT_RAG_SETTINGS, type RetrievedSource } from "@/lib/rag";
import { demoAnswer } from "@/lib/demo";

const BodySchema = z.object({
  question: z.string().trim().min(1).max(2000),
  conversationId: z.string().uuid().nullable().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(20)
    .default([]),
});

function isOpaqueKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        if (!headers.get("Authorization")) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token || token.split(".").length !== 3) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch {
          return new Response("Invalid request", { status: 400 });
        }

        const supabase = userClient(token);
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return new Response("Unauthorized", { status: 401 });

        const { isAiConfigured, embedQuery, streamChat, readChatDeltas, SYSTEM_PROMPT } = await import(
          "@/lib/ai.server"
        );
        const demoMode = !isAiConfigured();

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(sse(event, data)));

            try {
              // 1. Conversation
              let conversationId = body.conversationId ?? null;
              if (!conversationId) {
                const { data: created } = await supabase
                  .from("conversations")
                  .insert({
                    user_id: userId,
                    title: body.question.slice(0, 70),
                  })
                  .select("id")
                  .single();
                conversationId = created?.id ?? null;
              }
              if (!conversationId) throw new Error("Could not start this conversation.");
              send("conversation", { conversationId });

              await supabase.from("messages").insert({
                conversation_id: conversationId,
                user_id: userId,
                role: "user",
                content: body.question,
              });

              // 2. Embed the question
              send("stage", { stage: "embed", status: "active" });
              const startedAt = Date.now();
              let sources: RetrievedSource[] = [];

              if (demoMode) {
                send("stage", { stage: "embed", status: "done", detail: "Demo Mode" });
                send("stage", { stage: "retrieve", status: "active" });
                const fallback = demoAnswer(body.question);
                sources = fallback.sources;
                send("stage", { stage: "retrieve", status: "done", detail: `${sources.length} chunks` });
                send("sources", { sources });
                send("stage", { stage: "generate", status: "active" });

                for (const word of fallback.answer.split(/(\s+)/)) {
                  send("delta", { text: word });
                  await new Promise((r) => setTimeout(r, 12));
                }
                send("stage", { stage: "generate", status: "done" });

                await supabase.from("messages").insert({
                  conversation_id: conversationId,
                  user_id: userId,
                  role: "assistant",
                  content: fallback.answer,
                  sources: sources as never,
                  metadata: { demo: true, grounded: fallback.grounded, latency_ms: Date.now() - startedAt },
                });

                send("done", {
                  grounded: fallback.grounded,
                  demo: true,
                  latencyMs: Date.now() - startedAt,
                  conversationId,
                });
                controller.close();
                return;
              }

              const embedding = await embedQuery(body.question);
              send("stage", { stage: "embed", status: "done", detail: `${embedding.length} dims` });

              // 3. Vector search
              send("stage", { stage: "retrieve", status: "active" });
              const { data: matches, error: matchError } = await supabase.rpc("match_chunks", {
                query_embedding: JSON.stringify(embedding) as unknown as string,
                match_count: DEFAULT_RAG_SETTINGS.topK,
                min_similarity: DEFAULT_RAG_SETTINGS.similarityThreshold,
              });
              if (matchError) throw new Error(matchError.message);

              sources = (matches ?? []).map((m) => ({
                chunkId: m.chunk_id,
                documentId: m.document_id,
                documentName: m.document_name,
                fileType: m.file_type,
                pageNumber: m.page_number,
                content: m.content,
                similarity: m.similarity,
              }));
              send("stage", { stage: "retrieve", status: "done", detail: `${sources.length} chunks` });
              send("sources", { sources });

              // 4. Grounded generation
              send("stage", { stage: "generate", status: "active" });

              if (sources.length === 0) {
                const message =
                  "I couldn't find information about that in the knowledge base. Try rephrasing your question, upload a document that covers it, or escalate to a human agent.";
                for (const word of message.split(/(\s+)/)) {
                  send("delta", { text: word });
                  await new Promise((r) => setTimeout(r, 10));
                }
                await supabase.from("messages").insert({
                  conversation_id: conversationId,
                  user_id: userId,
                  role: "assistant",
                  content: message,
                  sources: [] as never,
                  metadata: { grounded: false, latency_ms: Date.now() - startedAt },
                });
                send("stage", { stage: "generate", status: "done" });
                send("done", { grounded: false, demo: false, latencyMs: Date.now() - startedAt, conversationId });
                controller.close();
                return;
              }

              const upstream = await streamChat([
                { role: "system", content: SYSTEM_PROMPT },
                ...body.history.slice(-6),
                {
                  role: "user",
                  content: `Retrieved knowledge-base context:\n\n${buildContext(sources)}\n\nQuestion: ${body.question}`,
                },
              ]);

              let answer = "";
              for await (const delta of readChatDeltas(upstream)) {
                answer += delta;
                send("delta", { text: delta });
              }
              send("stage", { stage: "generate", status: "done" });

              await supabase.from("messages").insert({
                conversation_id: conversationId,
                user_id: userId,
                role: "assistant",
                content: answer,
                sources: sources as never,
                metadata: { grounded: true, latency_ms: Date.now() - startedAt },
              });
              await supabase
                .from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", conversationId);

              send("done", { grounded: true, demo: false, latencyMs: Date.now() - startedAt, conversationId });
              controller.close();
            } catch (error) {
              console.error("chat stream failed", error);
              const message =
                error instanceof Error && "status" in error
                  ? error.message
                  : "The assistant hit an unexpected error. Please try again.";
              send("error", { message });
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
