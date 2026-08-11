# RAG AI Support Assistant — Phase 1

A production-shaped RAG support platform: upload company knowledge, index it as embeddings, and answer questions with grounded, cited responses.

## Stack note

This project runs on TanStack Start (React + Vite + Tailwind) with Lovable Cloud (Postgres + pgvector + auth) as the backend. Instead of a separate `backend/` Express folder, the server layer is TanStack server functions — same separation of concerns (routes → services → rag/embeddings/vectorstore), with the AI key held server-side only. Nothing sensitive ever reaches the browser.

## Phase 1 scope

1. **Landing page** (`/`) — hero with the RAG badge, headline, both CTAs, animated chat mockup, How It Works, feature cards, RAG architecture preview, tech badges. Light/dark, fully responsive.
2. **Auth** (`/auth`) — email/password sign-in + sign-up, Google sign-in, forgot password + reset page. Redirects to the dashboard.
3. **Dashboard shell** — sidebar (AI Assistant, Conversations, Knowledge Base, Documents, Analytics, RAG Architecture, Support Tickets, Settings), user profile footer, live System Status panel (AI API / Knowledge Base / RAG Engine, with Demo Mode and Service Unavailable states). Mobile drawer.
4. **AI Assistant** (`/assistant`) — the real working RAG chat:
   - welcome state with six clickable suggested questions
   - streaming responses, typing indicator, markdown rendering, copy / regenerate / feedback
   - source cards (document, type, page, snippet, relevance %, expand)
   - "How this answer was generated" expandable pipeline visualization
   - grounded-refusal state with Talk to Human / Submit Question / Search KB
   - conversation persistence and history
5. **Knowledge ingestion (minimum to make chat real)** — upload PDF / DOCX / TXT / MD / CSV, extract → chunk → embed → index, with animated progress. Documents list with status. Seeded NovaTech demo documents so the assistant works immediately.

Phase 2 (next): full Documents table with preview/search/re-index, Analytics, Settings, Support Tickets, Conversations management page, RAG Architecture page.

## Design

Indigo/violet on slate (#4F46E5 / #7C3AED / #F8FAFC / #111827), Plus Jakarta Sans headings + Inter body, rounded cards, subtle borders and soft shadows, restrained motion. All colors as semantic tokens in `src/styles.css` with light and dark values.

## Technical details

**Database (Lovable Cloud, pgvector)**
- `profiles` — user display name, email, avatar; auto-created on signup by trigger.
- `documents` — name, file type, size, status (processing/ready/failed), chunk count, timestamps, `owner_id`.
- `document_chunks` — document_id, chunk index, page number, text, `embedding vector(1536)`, metadata jsonb; HNSW cosine index.
- `conversations` / `messages` — messages store role, content, and a `sources` jsonb payload (citations + relevance) so history replays with citations.
- `tickets` — escalation records (question, transcript, sources, status).
- RLS on every table scoped to `auth.uid()`, plus explicit GRANTs.
- `match_chunks(query_embedding, match_count, min_similarity)` SQL function for similarity search.
- Migration seeds five NovaTech demo documents with chunks.

**Server layer** (`src/lib/*.functions.ts`, helpers in `*.server.ts`)
- `chat` — embed query → `match_chunks` (topK 5, similarity threshold) → build context → stream grounded answer → persist message + sources + relevance. Refuses when retrieval is empty or below threshold.
- `documents` — upload/extract/chunk/embed/index, list, reindex, delete.
- Embeddings via `openai/text-embedding-3-small` (1536-dim); generation via `google/gemini-3.6-flash` through Lovable AI, key server-side only.
- System prompt enforces grounding and explicit "not in the knowledge base" answers.
- Zod validation on every input; file type and size limits; friendly error messages, no stack traces.

**Demo mode** — if AI or vector search is unavailable, the status panel flips to Demo Mode and the assistant serves clearly-labelled sample NovaTech answers so the whole flow stays testable.

**Docs** — README covering setup, environment, RAG architecture, and API surface. Secrets stay in Lovable Cloud's encrypted store; Settings shows only `••••••••••••••••` / "Configured securely on server".
