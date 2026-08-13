import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_support_ticket",
  title: "Escalate to a human agent",
  description:
    "Create a Retrieva support ticket for the signed-in user when the knowledge base cannot answer a question and a human should follow up.",
  inputSchema: {
    question: z.string().trim().min(1).max(2000).describe("The unresolved question to escalate."),
    notes: z.string().trim().max(4000).optional().describe("Optional context for the human agent."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ question, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const transcript = [
      { role: "user", content: question },
      ...(notes ? [{ role: "assistant", content: notes }] : []),
    ];
    const { data, error } = await supabase
      .from("tickets")
      .insert({
        user_id: ctx.getUserId(),
        question,
        transcript: transcript as never,
        sources: [] as never,
      })
      .select("id, status, created_at")
      .single();
    if (error || !data) {
      return { content: [{ type: "text", text: error?.message ?? "Could not create the ticket." }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Ticket ${data.id} created with status "${data.status}".` }],
      structuredContent: { ticket: data },
    };
  },
});
