import { auth, defineMcp } from "@lovable.dev/mcp-js";
import askKnowledgeBase from "./tools/ask-knowledge-base";
import searchKnowledgeBase from "./tools/search-knowledge-base";
import listDocuments from "./tools/list-documents";
import createSupportTicket from "./tools/create-support-ticket";
import listSupportTickets from "./tools/list-support-tickets";

// Must be the direct Supabase host — the published proxy URL fails RFC 8414 issuer matching.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "retrieva-ai",
  title: "Retrieva AI",
  version: "0.1.0",
  instructions:
    "Tools for Retrieva AI, a retrieval-augmented support assistant. Use `ask_knowledge_base` for grounded answers with citations, `search_knowledge_base` for raw matching chunks, `list_documents` to see indexed sources, and `create_support_ticket` / `list_support_tickets` for human escalation. All data is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [askKnowledgeBase, searchKnowledgeBase, listDocuments, createSupportTicket, listSupportTickets],
});
