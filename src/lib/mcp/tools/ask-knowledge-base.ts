import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { buildContext } from "@/lib/rag";
import { retrieve } from "../retrieval";

export default defineTool({
  name: "ask_knowledge_base",
  title: "Ask the knowledge base",
  description:
    "Ask a support question and get a grounded answer generated only from the signed-in user's Retrieva knowledge base, with the cited source documents.",
  inputSchema: {
    question: z.string().trim().min(1).max(2000).describe("The support question to answer."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ question }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }

    const { isAiConfigured, streamChat, readChatDeltas, SYSTEM_PROMPT } = await import("@/lib/ai.server");
    const { sources } = await retrieve(ctx, question, 5);

    if (sources.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "That information is not available in the knowledge base. Upload a document that covers it, or escalate with create_support_ticket.",
          },
        ],
        structuredContent: { grounded: false, sources: [] },
      };
    }

    if (!isAiConfigured()) {
      const text = sources
        .map((s, i) => `[${i + 1}] ${s.documentName}\n${s.content}`)
        .join("\n\n");
      return {
        content: [{ type: "text", text: `Answer generation is unavailable; here is the retrieved context:\n\n${text}` }],
        structuredContent: { grounded: false, sources },
      };
    }

    const upstream = await streamChat([
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Retrieved knowledge-base context:\n\n${buildContext(sources)}\n\nQuestion: ${question}`,
      },
    ]);

    let answer = "";
    for await (const delta of readChatDeltas(upstream)) answer += delta;

    const citations = sources
      .map((s, i) => `[${i + 1}] ${s.documentName}${s.pageNumber ? ` (page ${s.pageNumber})` : ""}`)
      .join("\n");

    return {
      content: [{ type: "text", text: `${answer.trim()}\n\nSources:\n${citations}` }],
      structuredContent: {
        grounded: true,
        answer: answer.trim(),
        sources: sources.map((s) => ({
          documentId: s.documentId,
          documentName: s.documentName,
          pageNumber: s.pageNumber,
          similarity: s.similarity,
        })),
      },
    };
  },
});
