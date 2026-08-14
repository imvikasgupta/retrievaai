# Retrieva AI

A retrieval-augmented AI support assistant that answers questions from your own
documentation with citations.

## Features

- Knowledge base ingestion (PDF, DOCX, text) with chunking and embeddings
- pgvector similarity search with a visualized RAG pipeline
- Grounded, citation-backed answers
- Human escalation with AI-drafted replies
- Agent integrations over MCP

## Development

Requires Node.js and npm.

```sh
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Postgres + pgvector
