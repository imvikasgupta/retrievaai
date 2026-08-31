import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import {
  ArrowRight,
  Blocks,
  BookOpenCheck,
  Database,
  FileSearch,
  Quote,
  Sparkle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { WaterCursor } from "@/components/effects/WaterCursor";
import { TeamSection } from "@/components/team-section";
import { trackCtaClick } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Retrieva AI — Grounded RAG Support Assistant" },
      {
        name: "description",
        content:
          "Upload your documentation and let an AI support assistant answer with cited, grounded responses. Vector search, live pipeline visibility and human escalation built in.",
      },
      { property: "og:title", content: "Retrieva AI — Grounded RAG Support Assistant" },
      {
        property: "og:description",
        content:
          "Grounded, citation-backed AI support answers over your own documents — with retrieval visibility and human escalation.",
      },
      { property: "og:url", content: "https://retrievaai.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://retrievaai.lovable.app/" }],
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

function Landing() {
  const { isAuthenticated } = useAuth();
  const primaryTo = isAuthenticated ? "/assistant" : "/auth";

  return (
    <div className="min-h-screen bg-background">
      <ClientOnly>
        <WaterCursor />
      </ClientOnly>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Sparkle className="size-4" />
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight">Retrieva AI</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#pipeline" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              The Team
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
              <Link
                to={primaryTo}
                onClick={() => trackCtaClick("try_the_rag_assistant", "Try the RAG Assistant", "header")}
              >
                Try the RAG Assistant
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
            <Badge variant="secondary" className="animate-rise gap-2 rounded-full px-3 py-1 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-success" />
              Cited answers from your own documents
            </Badge>
            <h1 className="animate-rise font-display mx-auto mt-6 max-w-3xl text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-6xl">
              Support answers backed by <span className="text-brand">your documents</span>
            </h1>
            <p className="animate-rise mx-auto mt-5 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
              Upload your documentation once. Answers are retrieved from your knowledge base, cited to the source
              document, and passed to a human when the answer isn't there.
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
                { value: "AI", label: "OpenAI embeddings" },
                { value: "RAG", label: "Similarity search in Postgres" },
                { value: "Selected", label: "Every answer maps to a source chunk" },
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
              Each stage runs server-side and reports back in real time, so you can see where an answer came from.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((step, index) => {
              const isLast = index === PIPELINE.length - 1;
              const arrowDirLg = index % 3 === 2 || isLast ? "down" : "right";
              const arrowDirMd = index % 2 === 1 || isLast ? "down" : "right";
              return (
                <div
                  key={step.title}
                  className="surface-panel pipeline-card-hover group relative p-6"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand/20">
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-display text-xs font-semibold text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-base font-semibold transition-colors duration-300 group-hover:text-brand">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>

                  {/* Flow arrow to next step */}
                  {!isLast && (
                    <>
                      {/* Desktop arrow */}
                      <span
                        className={`pointer-events-none absolute z-10 hidden text-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:block ${
                          arrowDirLg === "right"
                            ? "right-3 top-1/2 -translate-y-1/2"
                            : "bottom-3 left-1/2 -translate-x-1/2"
                        }`}
                      >
                        <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 shadow-sm backdrop-blur-sm">
                          <ArrowRight
                            className={`size-4 transition-transform duration-300 group-hover:animate-arrow-travel ${
                              arrowDirLg === "down" ? "rotate-90" : ""
                            }`}
                            style={{
                              [arrowDirLg === "right" ? "--arrow-travel-x" : "--arrow-travel-y"]:
                                arrowDirLg === "right" ? "1rem" : "1rem",
                              [arrowDirLg === "right" ? "--arrow-travel-y" : "--arrow-travel-x"]: "0",
                            }}
                          />
                        </span>
                      </span>
                      {/* Tablet arrow */}
                      <span
                        className={`pointer-events-none absolute z-10 hidden text-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:block lg:hidden ${
                          arrowDirMd === "right"
                            ? "right-3 top-1/2 -translate-y-1/2"
                            : "bottom-3 left-1/2 -translate-x-1/2"
                        }`}
                      >
                        <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 shadow-sm backdrop-blur-sm">
                          <ArrowRight
                            className={`size-4 transition-transform duration-300 group-hover:animate-arrow-travel ${
                              arrowDirMd === "down" ? "rotate-90" : ""
                            }`}
                            style={{
                              [arrowDirMd === "right" ? "--arrow-travel-x" : "--arrow-travel-y"]:
                                arrowDirMd === "right" ? "1rem" : "1rem",
                              [arrowDirMd === "right" ? "--arrow-travel-y" : "--arrow-travel-x"]: "0",
                            }}
                          />
                        </span>
                      </span>
                      {/* Mobile arrow */}
                      <span className="pointer-events-none absolute bottom-3 left-1/2 z-10 block -translate-x-1/2 text-brand opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:hidden">
                        <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 shadow-sm backdrop-blur-sm">
                          <ArrowRight className="size-4 rotate-90 transition-transform duration-300 group-hover:animate-arrow-travel-down" />
                        </span>
                      </span>
                    </>
                  )}

                  <div className="animate-flow-line absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </section>

        <TeamSection />

        {/* Demo CTA */}
        <section id="demo" className="mx-auto max-w-6xl px-6 py-20">
          <div className="surface-panel relative overflow-hidden px-8 py-14 text-center">
            <div className="relative">
              <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Try it with the sample knowledge base
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
Some pre-loaded documents cover products, pricing, refunds, security and support. Ask a question, then upload
                your own files.
              </p>
              <Button asChild size="lg" className="mt-8 gap-2">
                <Link
                  to={primaryTo}
                  onClick={() =>
                    trackCtaClick("open_the_rag_assistant", "Open the RAG Assistant", "demo_section")
                  }
                >
                  Open the RAG Assistant
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Retrieva AI</p>
          <p className="flex items-center gap-1.5">
            Made by
            <span className="group relative inline-block cursor-default font-semibold text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-brand">
              Vikas Gupta
              <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-brand transition-transform duration-300 group-hover:origin-left group-hover:scale-x-100" />
            </span>
          </p>
          <p>Retrieval AI</p>
        </div>
      </footer>
    </div>
  );
}
