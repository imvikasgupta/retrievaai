import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { retrieve } from "../retrieval";

export default defineTool({
  name: "search_knowledge_base",
  title: "Search knowledge base",
  description:
    "Semantic search over the signed-in user's Retrieva knowledge base. Returns the most relevant document chunks with their source document, page and similarity score.",
  inputSchema: {
    query: z.string().trim().min(1).max(300).describe("What to search for."),
    limit: z.number().int().min(1).max(10).optional().describe("Max chunks to return (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const { sources, mode } = await retrieve(ctx, query, limit ?? 5);
    if (sources.length === 0) {
      return { content: [{ type: "text", text: `No matching content found for "${query}".` }] };
    }
    const text = sources
      .map(
        (s, i) =>
          `[${i + 1}] ${s.documentName}${s.pageNumber ? ` (page ${s.pageNumber})` : ""} — similarity ${s.similarity.toFixed(3)}\n${s.content}`,
      )
      .join("\n\n");
    return {
      content: [{ type: "text", text }],
      structuredContent: { mode, sources },
    };
  },
});
