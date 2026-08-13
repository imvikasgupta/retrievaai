import type { ToolContext } from "@lovable.dev/mcp-js";
import { DEFAULT_RAG_SETTINGS, type RetrievedSource } from "@/lib/rag";
import { supabaseForUser } from "./supabase";

/** Vector search over the caller's knowledge base, with a keyword fallback. */
export async function retrieve(ctx: ToolContext, query: string, topK: number) {
  const supabase = supabaseForUser(ctx);
  const { isAiConfigured, embedQuery } = await import("@/lib/ai.server");

  if (!isAiConfigured()) {
    const { data } = await supabase
      .from("document_chunks")
      .select("id, content, page_number, documents(id, name, file_type)")
      .ilike("content", `%${query.replace(/[%_]/g, "")}%`)
      .limit(topK);
    const sources: RetrievedSource[] = (data ?? []).map((row) => ({
      chunkId: row.id,
      documentId: row.documents?.id ?? "",
      documentName: row.documents?.name ?? "Unknown document",
      fileType: row.documents?.file_type ?? "txt",
      pageNumber: row.page_number,
      content: row.content,
      similarity: 0,
    }));
    return { sources, mode: "keyword" as const };
  }

  const embedding = await embedQuery(query);
  const { data: matches, error } = await supabase.rpc("match_chunks", {
    query_embedding: JSON.stringify(embedding) as unknown as string,
    match_count: topK,
    min_similarity: DEFAULT_RAG_SETTINGS.similarityThreshold,
  });
  if (error) throw new Error(error.message);

  const sources: RetrievedSource[] = (matches ?? []).map((m) => ({
    chunkId: m.chunk_id,
    documentId: m.document_id,
    documentName: m.document_name,
    fileType: m.file_type,
    pageNumber: m.page_number,
    content: m.content,
    similarity: m.similarity,
  }));
  return { sources, mode: "vector" as const };
}
