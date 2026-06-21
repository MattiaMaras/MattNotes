import Link from "next/link";
import {
  ArrowRight,
  Brain,
  FunctionSquare,
  Layers,
  NotebookPen,
  PenLine,
  RefreshCw,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const metadata = {
  title: "MattNotes — Appunti per studenti STEM",
  description:
    "Tipografia LaTeX, canvas Apple Pencil, codice Python eseguibile e AI in locale. Local-first, funziona offline.",
};

const FEATURES = [
  {
    icon: FunctionSquare,
    title: "Formule LaTeX",
    body: "Scrivi equazioni con anteprima KaTeX in tempo reale, accanto al testo. Digita «/» per inserirle ovunque.",
  },
  {
    icon: PenLine,
    title: "Canvas Apple Pencil",
    body: "Disegna schemi e dimostrazioni a mano libera con palm rejection. A riposo la lavagna mostra solo il disegno.",
  },
  {
    icon: Terminal,
    title: "Codice Python",
    body: "Celle eseguibili nel browser con Pyodide: premi «Esegui» e vedi subito output ed errori, zero setup.",
  },
  {
    icon: Sparkles,
    title: "Assistente AI in locale",
    body: "Spiegazioni e generazione di esercizi con Ollama. Tutto sul tuo dispositivo: nessun dato lascia il computer.",
  },
  {
    icon: Brain,
    title: "Flashcard con ripasso",
    body: "Genera flashcard dalle tue note e ripassale con la ripetizione spaziata (algoritmo SM-2).",
  },
  {
    icon: RefreshCw,
    title: "Local-first & sync",
    body: "Funziona offline ed è installabile come app. Accedi per sincronizzare gli appunti su tutti i tuoi dispositivi.",
  },
];

/** Public marketing landing at `/`. The workspace lives at `/app`. */
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <NotebookPen className="size-5 text-primary" />
            <span>MattNotes</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Accedi</Link>
            </Button>
            <Button size="sm" asChild className="gap-1.5">
              <Link href="/app">
                Apri l&apos;app <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--accent),transparent)] opacity-60"
        />
        <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Local-first · pensato per le materie STEM
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Gli appunti che tengono il passo con la tua mente
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
            Testo, formule LaTeX, disegni a mano e codice Python eseguibile in un
            unico documento. Con un assistente AI che gira interamente in locale.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild className="gap-2">
              <Link href="/sign-up">
                Inizia gratis <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Accedi</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            I tuoi appunti, sincronizzati e disponibili offline su tutti i tuoi
            dispositivi
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-ring/60"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-card px-6 py-14 text-center">
          <Layers className="size-8 text-primary" />
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Tutto ciò che ti serve per studiare, in un&apos;unica app
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Gratis, senza pubblicità e a costo zero: l&apos;AI e l&apos;esecuzione
            del codice girano sul tuo computer.
          </p>
          <Button size="lg" asChild className="gap-2">
            <Link href="/sign-up">
              Crea il tuo account <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-1.5">
            <NotebookPen className="size-4" /> MattNotes
          </span>
          <span>Local-first · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
