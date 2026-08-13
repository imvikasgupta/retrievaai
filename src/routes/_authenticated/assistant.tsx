import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Database,
  LifeBuoy,
  Loader2,
  Plus,
  SendHorizonal,
  ShieldCheck,
  Sparkle,
  Square,
  TriangleAlert,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { getSystemStatus, listConversations, getConversation, createTicket } from "@/lib/kb.functions";
import { SUGGESTED_QUESTIONS, type RetrievedSource } from "@/lib/rag";
import { IDLE_PIPELINE, PipelineTrace, type PipelineState, type StageKey } from "@/components/assistant/PipelineTrace";
import { SourceList } from "@/components/assistant/SourceList";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  validateSearch: z.object({ c: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "AI Assistant — Retrieva AI" },
      { name: "description", content: "Ask questions and get grounded answers cited to your knowledge base." },
      { property: "og:title", content: "AI Assistant — Retrieva AI" },
      { property: "og:description", content: "Grounded, citation-backed answers from your documents." },
    ],
  }),
  component: AssistantPage,
});

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: RetrievedSource[];
  grounded?: boolean | undefined;
  demo?: boolean | undefined;
  latencyMs?: number | null | undefined;
  pipeline?: PipelineState | undefined;
};

function AssistantPage() {
  const search = useSearch({ from: "/_authenticated/assistant" });
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getSystemStatus);
  const fetchConversations = useServerFn(listConversations);
  const loadConversation = useServerFn(getConversation);
  const escalate = useServerFn(createTicket);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(search.c ?? null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const status = useQuery({ queryKey: ["status"], queryFn: () => fetchStatus() });
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: () => fetchConversations() });

  // Load an existing conversation when one is selected from the sidebar.
  useEffect(() => {
    let cancelled = false;
    if (!search.c) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    setConversationId(search.c);
    loadConversation({ data: { id: search.c } })
      .then((result) => {
        if (cancelled) return;
        setMessages(
          result.messages.map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            content: message.content,
            sources: (message.sources as unknown as RetrievedSource[]) ?? [],
            grounded: (message.metadata as { grounded?: boolean } | null)?.grounded,
            demo: (message.metadata as { demo?: boolean } | null)?.demo,
          })),
        );
      })
      .catch(() => toast.error("Could not load that conversation."));
    return () => {
      cancelled = true;
    };
  }, [search.c, loadConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!streaming) inputRef.current?.focus();
  }, [streaming, search.c]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || streaming) return;

      setInput("");
      const userMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
        sources: [],
      };
      const assistantId = `assistant-${Date.now()}`;
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: "assistant", content: "", sources: [], pipeline: { ...IDLE_PIPELINE } },
      ]);
      setStreaming(true);

      const patch = (update: (message: ChatMessage) => ChatMessage) =>
        setMessages((prev) => prev.map((message) => (message.id === assistantId ? update(message) : message)));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Your session expired. Please sign in again.");

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question: trimmed, conversationId, history }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(response.status === 401 ? "Your session expired. Please sign in again." : "Request failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const eventLine = frame.split("\n").find((line) => line.startsWith("event: "));
            const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
            if (!eventLine || !dataLine) continue;
            const event = eventLine.slice(7).trim();
            const payload = JSON.parse(dataLine.slice(6)) as Record<string, never>;

            if (event === "conversation") {
              setConversationId(payload["conversationId"] as unknown as string);
            } else if (event === "stage") {
              const stage = payload["stage"] as unknown as StageKey;
              patch((message) => ({
                ...message,
                pipeline: {
                  ...(message.pipeline ?? IDLE_PIPELINE),
                  [stage]: {
                    status: payload["status"] as unknown as "active" | "done",
                    detail: payload["detail"] as unknown as string | undefined,
                  },
                },
              }));
            } else if (event === "sources") {
              patch((message) => ({ ...message, sources: payload["sources"] as unknown as RetrievedSource[] }));
            } else if (event === "delta") {
              patch((message) => ({ ...message, content: message.content + (payload["text"] as unknown as string) }));
            } else if (event === "done") {
              patch((message) => ({
                ...message,
                grounded: payload["grounded"] as unknown as boolean,
                demo: payload["demo"] as unknown as boolean,
                latencyMs: payload["latencyMs"] as unknown as number,
              }));
            } else if (event === "error") {
              throw new Error(payload["message"] as unknown as string);
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } catch (error) {
        if (controller.signal.aborted) {
          patch((message) => ({ ...message, content: message.content || "_Response stopped._" }));
        } else {
          const text = error instanceof Error ? error.message : "Something went wrong";
          toast.error(text);
          patch((message) => ({ ...message, content: message.content || `⚠️ ${text}` }));
        }
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
    },
    [conversationId, messages, queryClient, streaming],
  );

  async function handleEscalate(message: ChatMessage) {
    const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    try {
      await escalate({
        data: {
          question,
          conversationId,
          transcript: messages.map((m) => ({ role: m.role, content: m.content })),
          sources: message.sources,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Escalated to a human agent. A ticket has been created.");
    } catch {
      toast.error("Could not create the ticket. Please try again.");
    }
  }

  const demoMode = status.data?.demoMode;
  const empty = messages.length === 0;
  const recent = useMemo(() => conversations.data?.slice(0, 12) ?? [], [conversations.data]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Conversation list */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-muted/20 p-3 xl:flex">
        <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
          <Link to="/assistant" search={{}}>
            <Plus className="size-4" />
            New conversation
          </Link>
        </Button>
        <p className="mt-5 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recent</p>
        <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {recent.map((conversation) => (
            <Link
              key={conversation.id}
              to="/assistant"
              search={{ c: conversation.id }}
              className={cn(
                "block truncate rounded-lg px-3 py-2 text-sm transition-colors",
                conversation.id === search.c
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {conversation.title}
            </Link>
          ))}
          {recent.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No conversations yet.</p>}
        </div>
      </aside>

      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border/60 px-6 py-3">
          <div>
            <h1 className="font-display text-sm font-semibold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Grounded answers with citations from your knowledge base</p>
          </div>
          <div className="flex items-center gap-2">
            {demoMode ? (
              <Badge variant="secondary" className="gap-1.5">
                <TriangleAlert className="size-3" />
                Demo Mode
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                <ShieldCheck className="size-3 text-success" />
                {status.data?.indexedChunks ?? 0} chunks indexed
              </Badge>
            )}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {empty && (
              <div className="animate-rise pt-10 text-center">
                <span className="gradient-brand mx-auto flex size-12 items-center justify-center rounded-2xl text-brand-foreground">
                  <Sparkle className="size-6" />
                </span>
                <h2 className="font-display mt-5 text-2xl font-bold tracking-tight">
                  Ask anything about your knowledge base
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Answers are retrieved from your uploaded documents and cited back to the exact source chunk.
                </p>
                <div className="mx-auto mt-8 grid max-w-xl gap-2 sm:grid-cols-2">
                  {SUGGESTED_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => send(question)}
                      className="surface-panel px-4 py-3 text-left text-sm transition-shadow hover:shadow-lift"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                {status.data && !status.data.knowledgeReady && (
                  <Button asChild variant="ghost" size="sm" className="mt-6 gap-2">
                    <Link to="/knowledge">
                      <Database className="size-4" />
                      Upload your first document
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end gap-3">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {message.content}
                  </div>
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="size-3.5" />
                  </span>
                </div>
              ) : (
                <div key={message.id} className="flex gap-3">
                  <span className="gradient-brand mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-brand-foreground">
                    <Sparkle className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-3">
                    {message.pipeline && <PipelineTrace state={message.pipeline} latencyMs={message.latencyMs} />}

                    {message.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_li]:my-0.5 [&_p]:my-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Thinking…</p>
                    )}

                    <SourceList sources={message.sources} />

                    {message.grounded === false && !streaming && (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
                        <p className="flex-1 text-sm">
                          This wasn't answered from the knowledge base. A human can take it from here.
                        </p>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleEscalate(message)}>
                          <LifeBuoy className="size-4" />
                          Escalate to a human
                        </Button>
                      </div>
                    )}

                    {message.demo && (
                      <p className="text-xs text-muted-foreground">
                        Sample answer generated in Demo Mode from the Retrieva example corpus.
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border/60 px-6 py-4">
          <form
            className="mx-auto flex max-w-3xl items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about products, pricing, refunds, security…"
              rows={1}
              maxLength={2000}
              className="max-h-40 min-h-11 flex-1 resize-none"
            />
            {streaming ? (
              <Button type="button" size="icon" variant="outline" onClick={() => abortRef.current?.abort()}>
                <Square className="size-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()}>
                {status.isLoading ? <Loader2 className="size-4 animate-spin" /> : <SendHorizonal className="size-4" />}
              </Button>
            )}
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
            Answers come only from your knowledge base. Press Enter to send, Shift + Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
