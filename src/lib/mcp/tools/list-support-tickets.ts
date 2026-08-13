import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_support_tickets",
  title: "List support tickets",
  description: "List the signed-in user's escalated Retrieva support tickets and their status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, question, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const tickets = data ?? [];
    const text = tickets.length
      ? tickets.map((t) => `- [${t.status}] ${t.question} (${t.created_at})`).join("\n")
      : "No support tickets yet.";
    return { content: [{ type: "text", text }], structuredContent: { tickets } };
  },
});
