/**
 * Server-only adapter for the AI provider.
 *
 * Everything that touches the model API lives here so the rest of the app never
 * sees credentials. Swap this file to move to a different provider.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const CHAT_MODEL = "google/gemini-3.6-flash";

export const SYSTEM_PROMPT = `You are a professional customer-support assistant.

Answer questions using only the retrieved knowledge-base context provided to you.

Do not invent, assume, or fabricate information.

If the answer cannot be found in the retrieved context, clearly state that the information is not available in the knowledge base.

When possible, reference the relevant source documents by name.

Keep responses clear, accurate, concise, and helpful. Use short paragraphs or bullet lists.`;

export class AiUnavailableError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = "AiUnavailableError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiUnavailableError("AI service is not configured", 503);
  return key;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"]);
}

function friendlyError(status: number): AiUnavailableError {
  if (status === 429) {
    return new AiUnavailableError("The assistant is busy right now. Please try again in a moment.", 429);
  }
  if (status === 402) {
    return new AiUnavailableError("AI credits are exhausted. Add credits to keep using the assistant.", 402);
  }
  return new AiUnavailableError("The AI service is temporarily unavailable. Please try again.", 503);
}

/** Create embeddings for a batch of texts. Batches are capped by the caller. */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
  });

  if (!res.ok) {
    console.error("embeddings failed", res.status, await res.text().catch(() => ""));
    throw friendlyError(res.status);
  }

  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  if (!vector) throw new AiUnavailableError("Could not process the question.", 503);
  return vector;
}

/** Streaming chat completion. Returns the raw upstream SSE response. */
export async function streamChat(messages: { role: string; content: string }[]): Promise<Response> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify({ model: CHAT_MODEL, messages, stream: true, temperature: 0.2 }),
  });

  if (!res.ok || !res.body) {
    console.error("chat failed", res.status, await res.text().catch(() => ""));
    throw friendlyError(res.status);
  }
  return res;
}

/** Parse an OpenAI-compatible SSE stream into plain text deltas. */
export async function* readChatDeltas(response: Response): AsyncGenerator<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // partial JSON frame — ignore and continue
      }
    }
  }
}

/** Non-streaming chat completion. Used by the escalation reply drafter. */
export async function completeChat(
  messages: { role: string; content: string }[],
  model: string = CHAT_MODEL,
): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey(),
    },
    body: JSON.stringify({ model, messages, temperature: 0.3 }),
  });

  if (!res.ok) {
    console.error("chat completion failed", res.status, await res.text().catch(() => ""));
    throw friendlyError(res.status);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}
