import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { chunkPages, cleanText, MAX_UPLOAD_BYTES, SUPPORTED_EXTENSIONS } from "@/lib/rag";

const EMBED_BATCH = 64;

const IngestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  fileType: z.string().trim().min(1).max(20),
  sizeBytes: z.number().int().min(0).max(MAX_UPLOAD_BYTES),
  sourceUrl: z.string().url().max(2000).optional().nullable(),
  pages: z
    .array(z.object({ page: z.number().int().min(0).max(10000), text: z.string().max(400_000) }))
    .min(1)
    .max(600),
});

/** Live status of AI + knowledge base, used by the System Status panel. */
export const getSystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAiConfigured } = await import("@/lib/ai.server");
    const aiConfigured = isAiConfigured();

    const [{ count: chunkCount }, { count: pendingCount }, { count: documentCount }] = await Promise.all([
      context.supabase.from("document_chunks").select("id", { count: "exact", head: true }).not("embedding", "is", null),
      context.supabase.from("document_chunks").select("id", { count: "exact", head: true }).is("embedding", null),
      context.supabase.from("documents").select("id", { count: "exact", head: true }),
    ]);

    return {
      aiConfigured,
      documents: documentCount ?? 0,
      indexedChunks: chunkCount ?? 0,
      pendingChunks: pendingCount ?? 0,
      knowledgeReady: (chunkCount ?? 0) > 0,
      demoMode: !aiConfigured,
    };
  });

/** Embed any chunks that do not have a vector yet (demo seed + failed uploads). */
export const ensureIndexed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAiConfigured, embedTexts } = await import("@/lib/ai.server");
    if (!isAiConfigured()) return { indexed: 0, remaining: 0, demoMode: true };

    const { data: pending, error } = await context.supabase
      .from("document_chunks")
      .select("id, content")
      .is("embedding", null)
      .limit(EMBED_BATCH);

    if (error) throw new Error("Could not read the knowledge base.");
    if (!pending || pending.length === 0) return { indexed: 0, remaining: 0, demoMode: false };

    const vectors = await embedTexts(pending.map((c) => c.content));

    for (let i = 0; i < pending.length; i++) {
      const { error: updateError } = await context.supabase
        .from("document_chunks")
        .update({ embedding: JSON.stringify(vectors[i]) as unknown as string })
        .eq("id", pending[i]!.id);
      if (updateError) console.error("index update failed", updateError.message);
    }

    const { count } = await context.supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);

    return { indexed: pending.length, remaining: count ?? 0, demoMode: false };
  });

export const getKnowledgeStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ count: documents }, { count: chunks }, { count: embeddings }, latest] = await Promise.all([
      context.supabase.from("documents").select("id", { count: "exact", head: true }),
      context.supabase.from("document_chunks").select("id", { count: "exact", head: true }),
      context.supabase
        .from("document_chunks")
        .select("id", { count: "exact", head: true })
        .not("embedding", "is", null),
      context.supabase.from("documents").select("updated_at").order("updated_at", { ascending: false }).limit(1),
    ]);

    return {
      documents: documents ?? 0,
      chunks: chunks ?? 0,
      embeddings: embeddings ?? 0,
      lastUpdated: latest.data?.[0]?.updated_at ?? null,
    };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id, name, file_type, size_bytes, status, chunk_count, page_count, is_demo, updated_at, error_message")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load documents.");
    return data ?? [];
  });

export const getDocument = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: document, error } = await context.supabase
      .from("documents")
      .select("id, name, file_type, size_bytes, status, chunk_count, page_count, is_demo, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !document) throw new Error("Document not found.");

    const { data: chunks } = await context.supabase
      .from("document_chunks")
      .select("id, chunk_index, page_number, content, embedding")
      .eq("document_id", data.id)
      .order("chunk_index");

    return {
      document,
      chunks: (chunks ?? []).map((c) => ({
        id: c.id,
        chunkIndex: c.chunk_index,
        pageNumber: c.page_number,
        content: c.content,
        indexed: c.embedding !== null,
      })),
    };
  });

/** Chunk + embed + index an extracted document. */
export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IngestSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(data.fileType)) {
      throw new Error("That file type is not supported.");
    }

    const { isAiConfigured, embedTexts } = await import("@/lib/ai.server");

    const chunks = chunkPages(data.pages);
    if (chunks.length === 0) {
      throw new Error("We couldn't read any text from this document. Please try another file.");
    }

    const { data: document, error: insertError } = await context.supabase
      .from("documents")
      .insert({
        owner_id: context.userId,
        name: data.name,
        file_type: data.fileType,
        size_bytes: data.sizeBytes,
        source_url: data.sourceUrl ?? null,
        status: "processing",
        page_count: data.pages.length,
        chunk_count: chunks.length,
      })
      .select("id")
      .single();

    if (insertError || !document) {
      console.error("document insert failed", insertError?.message);
      throw new Error("We couldn't save this document. Please try again.");
    }

    try {
      const vectors: (number[] | null)[] = [];
      if (isAiConfigured()) {
        for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
          const batch = chunks.slice(i, i + EMBED_BATCH);
          const embedded = await embedTexts(batch.map((c) => cleanText(c.content)));
          vectors.push(...embedded);
        }
      } else {
        vectors.push(...chunks.map(() => null));
      }

      const rows = chunks.map((chunk, i) => ({
        document_id: document.id,
        owner_id: context.userId,
        chunk_index: chunk.index,
        page_number: chunk.page,
        content: chunk.content,
        embedding: vectors[i] ? (JSON.stringify(vectors[i]) as unknown as string) : null,
        metadata: { document_name: data.name, file_type: data.fileType },
      }));

      for (let i = 0; i < rows.length; i += 100) {
        const { error: chunkError } = await context.supabase.from("document_chunks").insert(rows.slice(i, i + 100));
        if (chunkError) throw new Error(chunkError.message);
      }

      await context.supabase
        .from("documents")
        .update({ status: "ready", chunk_count: chunks.length })
        .eq("id", document.id);

      return { documentId: document.id, chunks: chunks.length, indexed: isAiConfigured() };
    } catch (error) {
      console.error("ingest failed", error);
      await context.supabase
        .from("documents")
        .update({ status: "failed", error_message: "Processing failed" })
        .eq("id", document.id);
      throw new Error("We couldn't process this document. Please try again.");
    }
  });

export const reindexDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isAiConfigured, embedTexts } = await import("@/lib/ai.server");
    if (!isAiConfigured()) throw new Error("AI service is not available right now.");

    const { data: chunks, error } = await context.supabase
      .from("document_chunks")
      .select("id, content")
      .eq("document_id", data.id)
      .order("chunk_index");
    if (error || !chunks?.length) throw new Error("Nothing to re-index for this document.");

    await context.supabase.from("documents").update({ status: "processing" }).eq("id", data.id);

    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await embedTexts(batch.map((c) => c.content));
      for (let j = 0; j < batch.length; j++) {
        await context.supabase
          .from("document_chunks")
          .update({ embedding: JSON.stringify(vectors[j]) as unknown as string })
          .eq("id", batch[j]!.id);
      }
    }

    await context.supabase.from("documents").update({ status: "ready" }).eq("id", data.id);
    return { reindexed: chunks.length };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete this document.");
    return { ok: true };
  });

/** Keyword search across chunk text — used by "Search knowledge base". */
export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(1).max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("document_chunks")
      .select("id, content, page_number, documents(id, name, file_type)")
      .ilike("content", `%${data.query.replace(/[%_]/g, "")}%`)
      .limit(20);
    if (error) throw new Error("Search is unavailable right now.");
    return (rows ?? []).map((row) => ({
      id: row.id,
      content: row.content,
      pageNumber: row.page_number,
      documentId: row.documents?.id ?? "",
      documentName: row.documents?.name ?? "Unknown document",
      fileType: row.documents?.file_type ?? "txt",
    }));
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, title, status, updated_at, messages(content, created_at)")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Could not load conversations.");
    return (data ?? []).map((c) => {
      const sorted = [...(c.messages ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        updatedAt: c.updated_at,
        lastMessage: sorted[sorted.length - 1]?.content ?? "",
        messageCount: sorted.length,
      };
    });
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: conversation } = await context.supabase
      .from("conversations")
      .select("id, title")
      .eq("id", data.id)
      .maybeSingle();
    if (!conversation) throw new Error("Conversation not found.");

    const { data: messages } = await context.supabase
      .from("messages")
      .select("id, role, content, sources, metadata, created_at")
      .eq("conversation_id", data.id)
      .order("created_at");

    return { conversation, messages: messages ?? [] };
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversations").update({ title: data.title }).eq("id", data.id);
    if (error) throw new Error("Could not rename this conversation.");
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversations").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete this conversation.");
    return { ok: true };
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().trim().min(1).max(2000),
        conversationId: z.string().uuid().nullable().optional(),
        transcript: z.array(z.object({ role: z.string().max(20), content: z.string().max(8000) })).max(50),
        sources: z.array(z.any()).max(20).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: ticket, error } = await context.supabase
      .from("tickets")
      .insert({
        user_id: context.userId,
        conversation_id: data.conversationId ?? null,
        question: data.question,
        transcript: data.transcript,
        sources: data.sources as never,
      })
      .select("id, created_at")
      .single();
    if (error || !ticket) throw new Error("Could not create the support ticket.");
    return ticket;
  });

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select("id, question, status, created_at, sources")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load tickets.");
    return data ?? [];
  });
