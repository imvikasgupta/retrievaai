import { useState } from "react";
import { ChevronDown, FileText, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { relevanceLabel, type RetrievedSource } from "@/lib/rag";
import { cn } from "@/lib/utils";

export function SourceList({ sources }: { sources: RetrievedSource[] }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Quote className="size-4 text-brand" />
          {sources.length} source{sources.length === 1 ? "" : "s"} cited
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul className="space-y-2 border-t border-border/70 px-4 py-3">
          {sources.map((source, index) => (
            <li key={source.chunkId} className="rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">
                    [{index + 1}] {source.documentName}
                  </span>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {relevanceLabel(source.similarity)} match
                </Badge>
              </div>
              <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{source.content}</p>
              {source.pageNumber ? (
                <p className="mt-1 text-[11px] text-muted-foreground">Page {source.pageNumber}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
