import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listTickets } from "@/lib/kb.functions";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "Escalations — NovaTech Assist" },
      { name: "description", content: "Conversations handed off to a human agent with full transcripts." },
      { property: "og:title", content: "Escalations — NovaTech Assist" },
      { property: "og:description", content: "Track support tickets escalated from the AI assistant." },
    ],
  }),
  component: TicketsPage,
});

function TicketsPage() {
  const fetchTickets = useServerFn(listTickets);
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: () => fetchTickets() });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-2xl font-bold tracking-tight">Escalations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        When the knowledge base can't answer, the conversation becomes a ticket here — transcript and retrieved sources
        included.
      </p>

      {tickets.isLoading ? (
        <Skeleton className="mt-8 h-40 w-full" />
      ) : tickets.data?.length ? (
        <ul className="mt-8 space-y-3">
          {tickets.data.map((ticket) => (
            <li key={ticket.id} className="surface-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="flex-1 text-sm font-medium">{ticket.question}</p>
                <Badge variant="secondary" className="capitalize">
                  {ticket.status}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Opened {new Date(ticket.created_at).toLocaleString()}
              </p>
            </li>
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
