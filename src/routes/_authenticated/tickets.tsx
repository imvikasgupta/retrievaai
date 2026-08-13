import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Copy, LifeBuoy, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { draftTicketReply, listTickets } from "@/lib/kb.functions";
import { DEFAULT_ESCALATION_MODEL, ESCALATION_MODELS, relevanceLabel } from "@/lib/rag";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "Escalations — Retrieva AI" },
      { name: "description", content: "Conversations handed off to a human agent with full transcripts." },
      { property: "og:title", content: "Escalations — Retrieva AI" },
      { property: "og:description", content: "Track support tickets escalated from the AI assistant." },
    ],
  }),
  component: TicketsPage,
});

type Draft = {
  reply: string;
  model: string;
  grounded: boolean;
  sources: { chunkId: string; documentName: string; pageNumber: number | null; similarity: number }[];
};

function TicketsPage() {
  const fetchTickets = useServerFn(listTickets);
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: () => fetchTickets() });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold tracking-tight">Escalations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        When the knowledge base can't answer, the conversation becomes a ticket here — transcript and retrieved sources
        included. Pick a model to draft a grounded reply.
      </p>

      {tickets.isLoading ? (
        <Skeleton className="mt-8 h-40 w-full" />
      ) : tickets.data?.length ? (
        <ul className="mt-8 space-y-3">
          {tickets.data.map((ticket) => (
            <TicketCard key={ticket.id} id={ticket.id} question={ticket.question} status={ticket.status} createdAt={ticket.created_at} />
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <LifeBuoy className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No escalations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The assistant is resolving questions from your knowledge base.
          </p>
          <Button asChild variant="ghost" size="sm" className="mt-4 gap-2">
            <Link to="/assistant">
              <MessageSquare className="size-4" />
              Open the assistant
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function TicketCard({
  id,
  question,
  status,
  createdAt,
}: {
  id: string;
  question: string;
  status: string;
  createdAt: string;
}) {
  const [model, setModel] = useState<string>(DEFAULT_ESCALATION_MODEL);
  const [draft, setDraft] = useState<Draft | null>(null);
  const drafter = useServerFn(draftTicketReply);

  const generate = useMutation({
    mutationFn: () => drafter({ data: { ticketId: id, model } }),
    onSuccess: (result) => setDraft(result as Draft),
    onError: (error: Error) => toast.error(error.message || "Could not draft a reply."),
  });

  return (
    <li className="surface-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex-1 text-sm font-medium">{question}</p>
        <Badge variant="secondary" className="capitalize">
          {status}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Opened {new Date(createdAt).toLocaleString()}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="h-9 w-56" aria-label="Choose the AI model for this reply">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESCALATION_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  <Bot className="size-3.5 text-muted-foreground" />
                  {m.label}
                  <span className="text-xs text-muted-foreground">· {m.hint}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-2" disabled={generate.isPending} onClick={() => generate.mutate()}>
          <Sparkles className="size-4" />
          {generate.isPending ? "Drafting…" : draft ? "Regenerate reply" : "Draft reply with AI"}
        </Button>
      </div>

      {generate.isPending ? <Skeleton className="mt-4 h-24 w-full" /> : null}

      {draft ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Draft from {ESCALATION_MODELS.find((m) => m.id === draft.model)?.label ?? draft.model}
              {draft.grounded ? " · grounded in the knowledge base" : " · no matching sources"}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => {
                void navigator.clipboard.writeText(draft.reply);
                toast.success("Reply copied");
              }}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{draft.reply}</p>
          {draft.sources.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {draft.sources.map((s) => (
                <li key={s.chunkId}>
                  <Badge variant="outline" className="font-normal">
                    {s.documentName}
                    {s.pageNumber ? ` · p.${s.pageNumber}` : ""} · {relevanceLabel(s.similarity)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
