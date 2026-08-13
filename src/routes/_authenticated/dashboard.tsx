import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  Layers,
  LifeBuoy,
  Loader2,
  MessageSquare,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSystemStatus, ensureIndexed, listConversations, listTickets } from "@/lib/kb.functions";
import { displayName, useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Retrieva AI" },
      { name: "description", content: "System status, knowledge base health and recent support activity." },
      { property: "og:title", content: "Overview — Retrieva AI" },
      { property: "og:description", content: "Monitor your RAG pipeline, indexed documents and escalations." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getSystemStatus);
  const fetchConversations = useServerFn(listConversations);
  const fetchTickets = useServerFn(listTickets);
  const runIndex = useServerFn(ensureIndexed);

  const status = useQuery({ queryKey: ["status"], queryFn: () => fetchStatus() });
  const conversations = useQuery({ queryKey: ["conversations"], queryFn: () => fetchConversations() });
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: () => fetchTickets() });

  const indexMutation = useMutation({
    mutationFn: () => runIndex(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["status"] }),
  });

  // Index any chunks that are still waiting for embeddings (e.g. the demo corpus).
  const pending = status.data?.pendingChunks ?? 0;
  useEffect(() => {
    if (pending > 0 && status.data?.aiConfigured && !indexMutation.isPending) {
      indexMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, status.data?.aiConfigured]);

  const stats = [
    { label: "Documents", value: status.data?.documents ?? 0, icon: FileText, to: "/knowledge" as const },
    { label: "Indexed chunks", value: status.data?.indexedChunks ?? 0, icon: Layers, to: "/knowledge" as const },
    { label: "Conversations", value: conversations.data?.length ?? 0, icon: MessageSquare, to: "/assistant" as const },
    { label: "Escalations", value: tickets.data?.length ?? 0, icon: LifeBuoy, to: "/tickets" as const },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Welcome back, {displayName(user).split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's the health of your retrieval pipeline and support activity.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/assistant">
            Ask a question
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* System status */}
      <div className="surface-panel mt-8 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold">System status</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live health of the AI service and the vector index behind every answer.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              status.refetch();
              indexMutation.mutate();
            }}
            disabled={indexMutation.isPending}
          >
            {indexMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Re-check
          </Button>
        </div>

        {status.isLoading ? (
          <Skeleton className="mt-5 h-20 w-full" />
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatusRow
              ok={Boolean(status.data?.aiConfigured)}
              title="AI service"
              okText="Connected"
              badText="Demo Mode"
            />
            <StatusRow
              ok={Boolean(status.data?.knowledgeReady)}
              title="Vector index"
              okText={`${status.data?.indexedChunks ?? 0} chunks ready`}
              badText="No chunks indexed"
            />
            <StatusRow
              ok={pending === 0}
              title="Embedding queue"
              okText="Up to date"
              badText={`${pending} chunk${pending === 1 ? "" : "s"} pending`}
            />
          </div>
        )}

        {status.data && !status.data.aiConfigured && (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            The AI service isn't reachable, so the assistant is running in <strong>Demo Mode</strong> with sample
            Retrieva answers. Everything else in the product still works.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="surface-panel p-5 transition-shadow hover:shadow-lift">
            <stat.icon className="size-4 text-brand" />
            <p className="font-display mt-3 text-2xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent conversations */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface-panel p-6">
          <h2 className="font-display text-sm font-semibold">Recent conversations</h2>
          {conversations.isLoading ? (
            <Skeleton className="mt-4 h-24 w-full" />
          ) : conversations.data?.length ? (
            <ul className="mt-4 space-y-3">
              {conversations.data.slice(0, 5).map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    to="/assistant"
                    search={{ c: conversation.id }}
                    className="block rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-sm font-medium">{conversation.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{conversation.lastMessage}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="No conversations yet. Ask your first question." to="/assistant" cta="Open assistant" />
          )}
        </div>

        <div className="surface-panel p-6">
          <h2 className="font-display text-sm font-semibold">Open escalations</h2>
          {tickets.isLoading ? (
            <Skeleton className="mt-4 h-24 w-full" />
          ) : tickets.data?.length ? (
            <ul className="mt-4 space-y-3">
              {tickets.data.slice(0, 5).map((ticket) => (
                <li key={ticket.id} className="rounded-lg px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm">{ticket.question}</p>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {ticket.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="No escalations. The assistant is handling everything." to="/tickets" cta="View tickets" />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ ok, title, okText, badText }: { ok: boolean; title: string; okText: string; badText: string }) {
  return (
    <div className="rounded-xl border border-border/70 px-4 py-3">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="size-4 text-success" />
        ) : (
          <TriangleAlert className="size-4 text-warning" />
        )}
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{ok ? okText : badText}</p>
    </div>
  );
}

function EmptyHint({ text, to, cta }: { text: string; to: "/assistant" | "/tickets"; cta: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <Database className="mx-auto size-5 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="ghost" size="sm" className="mt-2">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
