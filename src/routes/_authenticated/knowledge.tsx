import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkle,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteDocument,
  getDocument,
  getKnowledgeStats,
  ingestDocument,
  listDocuments,
  reindexDocument,
  searchKnowledge,
} from "@/lib/kb.functions";
import { extractPages } from "@/lib/extract.client";
import { formatBytes, isSupportedFile, MAX_UPLOAD_BYTES, fileExtension } from "@/lib/rag";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — NovaTech Assist" },
      { name: "description", content: "Upload, inspect and re-index the documents powering your AI support answers." },
      { property: "og:title", content: "Knowledge Base — NovaTech Assist" },
      { property: "og:description", content: "Manage the documents behind every grounded AI answer." },
    ],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const queryClient = useQueryClient();
  const fetchDocuments = useServerFn(listDocuments);
  const fetchStats = useServerFn(getKnowledgeStats);
  const fetchDocument = useServerFn(getDocument);
  const runIngest = useServerFn(ingestDocument);
  const runDelete = useServerFn(deleteDocument);
  const runReindex = useServerFn(reindexDocument);
  const runSearch = useServerFn(searchKnowledge);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchKnowledge>> | null>(null);
  const [searching, setSearching] = useState(false);

  const documents = useQuery({ queryKey: ["documents"], queryFn: () => fetchDocuments() });
  const stats = useQuery({ queryKey: ["kb-stats"], queryFn: () => fetchStats() });
  const inspected = useQuery({
    queryKey: ["document", inspectId],
    queryFn: () => fetchDocument({ data: { id: inspectId! } }),
    enabled: Boolean(inspectId),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["kb-stats"] });
    queryClient.invalidateQueries({ queryKey: ["status"] });
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (!isSupportedFile(file.name)) {
        toast.error(`${file.name}: unsupported file type. Use PDF, DOCX, TXT, MD or CSV.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${file.name} is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`);
        continue;
      }

      setUploading(file.name);
      try {
        const pages = await extractPages(file);
        const result = await runIngest({
          data: {
            name: file.name,
            fileType: fileExtension(file.name),
            sizeBytes: file.size,
            pages,
          },
        });
        toast.success(
          result.indexed
            ? `${file.name} indexed into ${result.chunks} chunks.`
            : `${file.name} stored with ${result.chunks} chunks — embedding pending.`,
        );
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not process ${file.name}.`);
      } finally {
        setUploading(null);
      }
    }
  }

  const reindexMutation = useMutation({
    mutationFn: (id: string) => runReindex({ data: { id } }),
    onSuccess: (result) => {
      toast.success(`Re-indexed ${result.reindexed} chunks.`);
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Re-index failed."),
  });

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await runDelete({ data: { id: pendingDelete.id } });
      toast.success(`${pendingDelete.name} removed from the knowledge base.`);
      refresh();
    } catch {
      toast.error("Could not delete this document.");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await runSearch({ data: { query: query.trim() } }));
    } catch {
      toast.error("Search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything the assistant is allowed to answer from. Upload documents, inspect chunks and re-index.
          </p>
        </div>
        <Button className="gap-2" onClick={() => inputRef.current?.click()} disabled={Boolean(uploading)}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload documents
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileText} label="Documents" value={stats.data?.documents ?? 0} />
        <StatCard icon={Layers} label="Chunks" value={stats.data?.chunks ?? 0} />
        <StatCard icon={Sparkle} label="Embeddings" value={stats.data?.embeddings ?? 0} />
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "mt-6 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-brand bg-brand/5" : "border-border",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.markdown,.csv"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Upload className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">
          {uploading ? `Processing ${uploading}…` : "Drop files here or click upload"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DOCX, TXT, Markdown and CSV · up to {formatBytes(MAX_UPLOAD_BYTES)} per file
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mt-8 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search inside your documents…"
            maxLength={300}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" disabled={searching}>
          {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {results && (
        <div className="surface-panel mt-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {results.length} match{results.length === 1 ? "" : "es"}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setResults(null)}>
              Clear
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {results.map((result) => (
              <li key={result.id} className="rounded-lg bg-muted/50 px-3 py-2.5">
                <p className="text-sm font-medium">{result.documentName}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{result.content}</p>
              </li>
            ))}
            {results.length === 0 && <p className="text-sm text-muted-foreground">No chunks matched that phrase.</p>}
          </ul>
        </div>
      )}

      {/* Documents */}
      <h2 className="font-display mt-10 text-sm font-semibold">Indexed documents</h2>
      {documents.isLoading ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : documents.data?.length ? (
        <ul className="mt-4 space-y-2">
          {documents.data.map((document) => (
            <li key={document.id} className="surface-panel flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{document.name}</p>
                  {document.is_demo && <Badge variant="secondary">Sample</Badge>}
                  <Badge
                    variant={document.status === "ready" ? "secondary" : "outline"}
                    className={cn("capitalize", document.status === "failed" && "text-destructive")}
                  >
                    {document.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {document.chunk_count} chunks · {document.file_type.toUpperCase()} ·{" "}
                  {formatBytes(document.size_bytes ?? 0)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setInspectId(document.id)}>
                  Inspect
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Re-index"
                  onClick={() => reindexMutation.mutate(document.id)}
                  disabled={reindexMutation.isPending}
                >
                  <RefreshCw className={cn("size-4", reindexMutation.isPending && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  onClick={() => setPendingDelete({ id: document.id, name: document.name })}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No documents yet. Upload one to build your knowledge base.</p>
        </div>
      )}

      {/* Chunk inspector */}
      <Dialog open={Boolean(inspectId)} onOpenChange={(open) => !open && setInspectId(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">{inspected.data?.document.name ?? "Document"}</DialogTitle>
            <DialogDescription>
              {inspected.data
                ? `${inspected.data.chunks.length} chunks · ${
                    inspected.data.chunks.filter((chunk) => chunk.indexed).length
                  } embedded`
                : "Loading chunks…"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {inspected.data?.chunks.map((chunk) => (
              <div key={chunk.id} className="rounded-lg border border-border/70 px-3 py-2.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Chunk {chunk.chunkIndex + 1}
                    {chunk.pageNumber ? ` · page ${chunk.pageNumber}` : ""}
                  </span>
                  <Badge variant={chunk.indexed ? "secondary" : "outline"}>
                    {chunk.indexed ? "embedded" : "pending"}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed">{chunk.content}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name} and all of its chunks will be removed. The assistant will no longer be able to
              answer from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <div className="surface-panel p-5">
      <Icon className="size-4 text-brand" />
      <p className="font-display mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
