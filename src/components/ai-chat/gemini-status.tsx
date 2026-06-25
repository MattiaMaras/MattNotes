"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { AlertTriangle, Eye, EyeOff, KeyRound } from "lucide-react";
import { geminiApiKeyAtom } from "@/lib/store/atoms";

/**
 * BYOK key entry. Shown when the user has no Gemini key saved, or when they
 * explicitly reopen it to change/clear the key (`forceOpen`). The key is
 * persisted to localStorage only — see `geminiApiKeyAtom`.
 */
export function GeminiStatus({
  forceOpen = false,
  onSaved,
}: {
  forceOpen?: boolean;
  onSaved?: () => void;
}) {
  const [apiKey, setApiKey] = useAtom(geminiApiKeyAtom);
  const [input, setInput] = useState(apiKey);
  const [reveal, setReveal] = useState(false);

  if (apiKey && !forceOpen) return null;

  function save() {
    setApiKey(input.trim());
    onSaved?.();
  }

  return (
    <div className="mx-3 mb-2 space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
      <p className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle className="size-3.5" />
        {apiKey ? "Chiave API Gemini" : "Inserisci la tua chiave API Gemini"}
      </p>
      <p className="text-muted-foreground">
        Gratuita su Google AI Studio. Resta solo nel tuo browser: non passa mai
        dai nostri server, e non condividi quota con altri utenti.
      </p>
      <div className="flex items-center gap-1">
        <input
          type={reveal ? "text" : "password"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="AIza…"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none"
        />
        <button
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Nascondi chiave" : "Mostra chiave"}
          className="shrink-0 rounded-md border border-border p-1.5 transition-colors hover:bg-accent"
        >
          {reveal ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </button>
        <button
          onClick={save}
          className="shrink-0 rounded-md border border-border px-2 py-1 transition-colors hover:bg-accent"
        >
          Salva
        </button>
      </div>
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
      >
        <KeyRound className="size-3" />
        Ottieni una chiave gratis
      </a>
    </div>
  );
}
