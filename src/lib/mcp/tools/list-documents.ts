import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_documents",
  title: "List knowledge base documents",
  description: "List the documents in the signed-in user's Retrieva knowledge base with their indexing status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, file_type, status, chunk_count, page_count, updated_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const docs = data ?? [];
    const text = docs.length
      ? docs
          .map((d) => `- ${d.name} (${d.file_type}, ${d.status}, ${d.chunk_count} chunks, ${d.page_count} pages)`)
          .join("\n")
      : "No documents in the knowledge base yet.";
    return { content: [{ type: "text", text }], structuredContent: { documents: docs } };
  },
});
