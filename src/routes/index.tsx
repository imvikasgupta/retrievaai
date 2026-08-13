import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Blocks,
  BookOpenCheck,
  Database,
  FileSearch,
  Gauge,
  LifeBuoy,
  Quote,
  ShieldCheck,
  Sparkle,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RAG AI Support Assistant — Grounded answers from your knowledge base" },
      {
        name: "description",
        content:
          "Upload your documentation and let an AI support assistant answer with cited, grounded responses. Vector search, live pipeline visibility and human escalation built in.",
      },
      { property: "og:title", content: "RAG AI Support Assistant" },
      {
        property: "og:description",
        content:
          "Grounded, citation-backed AI support answers over your own documents — with retrieval visibility and human escalation.",
      },
    ],
  }),
  component: Landing,
});

const PIPELINE = [
  { icon: BookOpenCheck, title: "Upload", copy: "PDF, DOCX, Markdown and text files land in your knowledge base." },
  { icon: Blocks, title: "Process", copy: "Documents are cleaned and split into overlapping, context-aware chunks." },
  { icon: Sparkle, title: "Embed", copy: "Each chunk becomes a 1536-dimension vector using OpenAI embeddings." },
  { icon: Database, title: "Store", copy: "Vectors are indexed in Postgres with pgvector for fast similarity search." },
  { icon: FileSearch, title: "Retrieve", copy: "Every question pulls the most relevant chunks with a scored match." },
  { icon: Quote, title: "Answer", copy: "The model answers strictly from retrieved context, with citations." },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Grounded, never guessing",
    copy: "The assistant answers only from retrieved context and says so plainly when the knowledge base has no answer.",
  },
  {
    icon: Workflow,
    title: "Transparent pipeline",
    copy: "Watch embedding, retrieval and generation happen live, with chunk scores for every answer.",
  },
  {
    icon: LifeBuoy,
    title: "Human escalation",
    copy: "One click turns an unresolved conversation into a support ticket with the full transcript attached.",
  },
  {
    icon: Gauge,
    title: "Knowledge control",
    copy: "Inspect chunks, re-index documents and see exactly what the assistant can and cannot answer.",
  },
];

function Landing() {
  const { isAuthenticated } = useAuth();
  const primaryTo = isAuthenticated ? "/assistant" : "/auth";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="gradient-brand flex size-8 items-center justify-center rounded-lg text-brand-foreground">
              <Sparkle className="size-4" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight">Retrieva AI</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#pipeline" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#demo" className="transition-colors hover:text-foreground">
              Demo
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                {isAuthenticated ? "Dashboard" : "Sign in"}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to={primaryTo}>
                Try the assistant
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(45% 60% at 50% 50%, color-mix(in oklab, var(--brand) 30%, transparent), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
            <Badge variant="secondary" className="animate-rise gap-2 rounded-full px-3 py-1 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-success" />
              Retrieval-augmented · Cited answers · No hallucinations
            </Badge>
            <h1 className="animate-rise font-display mx-auto mt-6 max-w-3xl text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-6xl">
              Support answers your customers can <span className="text-gradient-brand">actually trust</span>
            </h1>
            <p className="animate-rise mx-auto mt-5 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
              Upload your documentation once. Every answer is retrieved from your own knowledge base, cited back to the
              source document, and escalated to a human the moment the answer isn't there.
            </p>
            <div className="animate-rise mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to={primaryTo}>
                  Start asking questions
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#pipeline">See the pipeline</a>
              </Button>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              {[
                { value: "1536-dim", label: "OpenAI embeddings" },
                { value: "pgvector", label: "Similarity search in Postgres" },
                { value: "100%", label: "Answers cited to a source chunk" },
              ].map((stat) => (
                <div key={stat.label} className="surface-panel px-5 py-6 text-left">
                  <p className="font-display text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section id="pipeline" className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-brand">The RAG pipeline</p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              From raw document to grounded answer
            </h2>
            <p className="mt-3 text-muted-foreground">
              Nothing is hidden. Each stage runs server-side and reports back to the interface in real time so you can
              see precisely where an answer came from.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((step, index) => (
              <div key={step.title} className="surface-panel group relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-xs font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
                <div className="animate-flow-line absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-border/60 bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-brand">Why teams pick it</p>
                <h2 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Built for support teams who can't afford a wrong answer
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Every response carries its evidence. When the knowledge base falls short, the assistant hands the
                  conversation to a person instead of inventing something.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="surface-panel p-5">
                    <feature.icon className="size-5 text-brand" />
                    <h3 className="font-display mt-3 text-sm font-semibold">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Demo CTA */}
        <section id="demo" className="mx-auto max-w-6xl px-6 py-20">
          <div className="surface-panel relative overflow-hidden px-8 py-14 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(60% 80% at 50% 0%, color-mix(in oklab, var(--violet) 18%, transparent), transparent 70%)",
              }}
            />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Try it with the Retrieva sample knowledge base
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Five pre-loaded documents cover products, pricing, refunds, security and support. Ask a question and
                watch the retrieval happen — then upload your own files.
              </p>
              <Button asChild size="lg" className="mt-8 gap-2">
                <Link to={primaryTo}>
                  Open the assistant
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Retrieva. Sample company for demonstration purposes.</p>
          <p>Retrieval-augmented generation · pgvector · Grounded answers</p>
        </div>
      </footer>
    </div>
  );
}
