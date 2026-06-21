"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "offline";

const OLLAMA_TAGS_URL = "http://localhost:11434/api/tags";

/**
 * Pings the local Ollama server. On failure it renders the "Avvia Ollama"
 * banner described in the spec. Models discovered via `/api/tags` are reported
 * up so the panel can populate its model picker.
 */
export function OllamaStatus({
  onModels,
}: {
  onModels?: (models: string[]) => void;
}) {
  const [status, setStatus] = useState<Status>("checking");

  // Keep the latest `onModels` in a ref so `check` stays stable — otherwise the
  // effect below would re-run on every parent render (the parent recreates the
  // callback), causing an infinite setState loop.
  const onModelsRef = useRef(onModels);
  useEffect(() => {
    onModelsRef.current = onModels;
  }, [onModels]);

  const check = useCallback(async () => {
    setStatus("checking");
    try {
      const res = await fetch(OLLAMA_TAGS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: { models?: { name: string }[] } = await res.json();
      onModelsRef.current?.(data.models?.map((m) => m.name) ?? []);
      setStatus("online");
    } catch {
      setStatus("offline");
    }
  }, []);

  // Ping once on mount; the "Riprova" button re-runs `check` manually.
  useEffect(() => {
    void check();
  }, [check]);

  if (status === "online") return null;

  return (
    <div
      className={cn(
        "mx-3 mb-2 rounded-lg border p-3 text-xs",
        status === "offline"
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-border bg-muted/40",
      )}
    >
      {status === "checking" ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Connessione a Ollama…
        </p>
      ) : (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-3.5" />
            Ollama non attivo
          </p>
          <p className="text-muted-foreground">
            Avvia Ollama in locale per usare l&apos;assistente AI.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void check()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition-colors hover:bg-accent"
            >
              <Plug className="size-3" />
              Riprova
            </button>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Documentazione
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
