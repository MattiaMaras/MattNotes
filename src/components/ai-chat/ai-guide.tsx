"use client";

import { useState } from "react";
import { Check, Copy, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PULL_COMMAND = "ollama pull qwen3.6";

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Installa e avvia Ollama",
    body: (
      <>
        Scarica{" "}
        <a
          href="https://ollama.com/download"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          Ollama
        </a>{" "}
        e lascialo in esecuzione in background.
      </>
    ),
  },
  {
    title: "Scarica un modello",
    body: <>Da terminale, ad es. un modello leggero e veloce per studiare.</>,
  },
  {
    title: "Seleziona il modello",
    body: <>Comparirà nel menu a tendina in alto in questo pannello.</>,
  },
  {
    title: "Chiedi pure",
    body: (
      <>
        Scrivi una domanda o usa le azioni rapide: la nota corrente viene usata
        come contesto.
      </>
    ),
  },
];

/**
 * Compact in-panel guide that walks the user through getting the local AI
 * assistant working. Dismissable; re-openable from the panel header (?).
 */
export function AiGuide({ onDismiss }: { onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(PULL_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the command is visible to copy manually.
    }
  }

  return (
    <div className="mx-3 mb-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold">Come usare l&apos;assistente AI</h3>
        <button
          onClick={onDismiss}
          aria-label="Nascondi guida"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <ol className="space-y-2 text-xs text-muted-foreground">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {i + 1}
            </span>
            <span>
              <span className="font-medium text-foreground">{step.title}.</span>{" "}
              {step.body}
            </span>
          </li>
        ))}
      </ol>

      {/* Copyable pull command. */}
      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5">
        <code className="truncate font-mono text-xs">{PULL_COMMAND}</code>
        <button
          onClick={copyCommand}
          aria-label="Copia comando"
          className={cn(
            "shrink-0 rounded p-1 transition-colors",
            copied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Modelli consigliati: <span className="font-medium">qwen3.6</span>,{" "}
        <span className="font-medium">llama3.2</span>,{" "}
        <span className="font-medium">deepseek-r1</span>.
      </p>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="size-3" />
        Tutto in locale: nessun dato lascia il tuo computer.
      </p>
    </div>
  );
}
