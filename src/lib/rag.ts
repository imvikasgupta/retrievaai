/** Shared RAG types and pure helpers (safe to import from the browser). */

export type RetrievedSource = {
  chunkId: string;
  documentId: string;
  documentName: string;
  fileType: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
};

export type ChatAnswer = {
  answer: string;
  sources: RetrievedSource[];
  grounded: boolean;
  demo: boolean;
  conversationId: string;
};

export type RagSettings = {
  topK: number;
  similarityThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
};

export const DEFAULT_RAG_SETTINGS: RagSettings = {
  topK: 5,
  similarityThreshold: 0.25,
  chunkSize: 1100,
  chunkOverlap: 150,
};

export const SUPPORTED_EXTENSIONS = [
  "pdf",
  "docx",
  "txt",
  "md",
  "markdown",
  "csv",
  "xlsx",
  "xls",
] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const SUGGESTED_QUESTIONS = [
  "What services do you provide?",
  "How can I contact support?",
  "What is your refund policy?",
  "Explain the onboarding process.",
  "How do I reset my password?",
  "How can I upgrade my plan?",
];

export function fileExtension(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

export function isSupportedFile(name: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(fileExtension(name));
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Normalise whitespace and strip control characters from extracted text. */
export function cleanText(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type PageText = { page: number; text: string };
export type Chunk = { index: number; page: number | null; content: string };

/**
 * Split page text into overlapping chunks on sentence/paragraph boundaries.
 */
export function chunkPages(
  pages: PageText[],
  chunkSize = DEFAULT_RAG_SETTINGS.chunkSize,
  overlap = DEFAULT_RAG_SETTINGS.chunkOverlap,
): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;

  for (const page of pages) {
    const text = cleanText(page.text);
    if (!text) continue;

    let cursor = 0;
    while (cursor < text.length) {
      let end = Math.min(cursor + chunkSize, text.length);
      if (end < text.length) {
        const window = text.slice(cursor, end);
        const breakAt = Math.max(
          window.lastIndexOf("\n\n"),
          window.lastIndexOf(". "),
          window.lastIndexOf("\n"),
        );
        if (breakAt > chunkSize * 0.4) end = cursor + breakAt + 1;
      }
      const content = text.slice(cursor, end).trim();
      if (content.length > 20) {
        chunks.push({ index: index++, page: page.page || null, content });
      }
      if (end >= text.length) break;
      cursor = Math.max(end - overlap, cursor + 1);
    }
  }

  return chunks;
}

export function buildContext(sources: RetrievedSource[]): string {
  return sources
    .map((source, i) => {
      const page = source.pageNumber ? `, page ${source.pageNumber}` : "";
      return `[${i + 1}] Source: ${source.documentName}${page}\n${source.content}`;
    })
    .join("\n\n---\n\n");
}

export function relevanceLabel(similarity: number): string {
  return `${Math.round(Math.max(0, Math.min(1, similarity)) * 100)}%`;
}

/** Models offered to agents when drafting an escalation reply. */
export const ESCALATION_MODELS = [
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash", hint: "Fast, balanced default" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro", hint: "Deeper reasoning" },
  { id: "openai/gpt-5.1", label: "GPT-5.1", hint: "Strong writing quality" },
  { id: "openai/gpt-5.1-mini", label: "GPT-5.1 Mini", hint: "Cheap and quick" },
] as const;

export const DEFAULT_ESCALATION_MODEL = ESCALATION_MODELS[0].id;

export const ESCALATION_MODEL_IDS = ESCALATION_MODELS.map((m) => m.id) as unknown as [string, ...string[]];
