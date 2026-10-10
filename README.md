# Retrieva AI

A retrieval-augmented AI support assistant that answers questions from your own
documentation with citations.

## Features

- Knowledge base ingestion (PDF, DOCX, text) with chunking and embeddings
- pgvector similarity search with a visualized RAG pipeline
- Grounded, citation-backed answers
- Human escalation with AI-drafted replies
- Agent integrations over MCP

## Run locally (VS Code)

The app is a standard TanStack Start project — it runs fully on your own
machine. The only external services it talks to are the hosted Postgres
database (pgvector) and the AI APIs, both reached over the internet with the
keys in `.env`.

1. Clone the repo and open it in VS Code.
2. Install [Bun](https://bun.sh) (or use npm).
3. Copy `.env` values — you need:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` (same values, server side)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, for privileged operations)
   - `OPENAI_API_KEY` (embeddings) and `LOVABLE_API_KEY` (chat model)
4. Install and start:

```sh
bun install
bun run dev
```

The app is now at http://localhost:8080. Auth, knowledge base, chat, and
tickets all work against the same cloud database as the live site.

### Running without any hosted backend

If you want zero cloud dependency, you would need to self-host Postgres with
the pgvector extension and apply the schema/RLS policies, then point the
`SUPABASE_*` variables at it. That is a larger migration — the current setup
already works from localhost with no Lovable infrastructure in the request
path.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Postgres + pgvector
