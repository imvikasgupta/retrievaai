import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StageKey = "embed" | "retrieve" | "generate";
export type StageState = { status: "idle" | "active" | "done"; detail?: string | undefined };
export type PipelineState = Record<StageKey, StageState>;

export const IDLE_PIPELINE: PipelineState = {
  embed: { status: "idle" },
  retrieve: { status: "idle" },
  generate: { status: "idle" },
};

const LABELS: Record<StageKey, string> = {
  embed: "Embedding question",
  retrieve: "Searching vector index",
  generate: "Generating grounded answer",
};

export function PipelineTrace({ state, latencyMs }: { state: PipelineState; latencyMs?: number | null | undefined }) {
  const stages: StageKey[] = ["embed", "retrieve", "generate"];
  const anyActivity = stages.some((stage) => state[stage].status !== "idle");
  if (!anyActivity) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">RAG pipeline</p>
        {typeof latencyMs === "number" && (
          <span className="text-xs text-muted-foreground">{(latencyMs / 1000).toFixed(1)}s</span>
        )}
      </div>
      <ol className="mt-2.5 space-y-2">
        {stages.map((stage) => {
          const { status, detail } = state[stage];
          return (
            <li key={stage} className="flex items-center gap-2.5 text-sm">
              {status === "done" ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : status === "active" ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={cn(
                  "flex-1",
                  status === "idle" ? "text-muted-foreground/60" : "text-foreground",
                )}
              >
                {LABELS[stage]}
              </span>
              {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
