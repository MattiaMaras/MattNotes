"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  KeyRound,
  ListChecks,
  PanelRightClose,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  GEMINI_MODELS,
  aiGuideDismissedAtom,
  aiProviderAtom,
  geminiApiKeyAtom,
  geminiModelAtom,
  notesAtom,
  ollamaModelsAtom,
  selectedModelAtom,
} from "@/lib/store/atoms";
import { blocksToPlainText } from "@/lib/note-text";
import { useAI } from "@/hooks/use-ai";
import { OllamaStatus } from "@/components/ai-chat/ollama-status";
import { GeminiStatus } from "@/components/ai-chat/gemini-status";
import { AiGuide } from "@/components/ai-chat/ai-guide";
import { MarkdownMessage } from "@/components/ai-chat/markdown-message";

const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    label: "Spiega questo",
    prompt:
      "Spiega gli argomenti di questa nota in modo semplice, con esempi concreti.",
  },
  {
    icon: ListChecks,
    label: "Genera esercizi",
    prompt:
      "Genera 3 esercizi (con soluzione passo-passo) basati sul contenuto di questa nota.",
  },
  {
    icon: BookOpen,
    label: "Crea flashcard",
    prompt:
      "Crea 5 flashcard in formato 'Domanda / Risposta' dai concetti chiave di questa nota.",
  },
] as const;

/**
 * Local AI assistant: streamed chat against Ollama via `/api/ai`. The current
 * note is injected as context, so quick actions and questions are grounded in
 * what the student is viewing.
 */
export function ChatPanel({ onCollapse }: { onCollapse?: () => void }) {
  const [provider, setProvider] = useAtom(aiProviderAtom);
  const [models, setModels] = useAtom(ollamaModelsAtom);
  const [model, setModel] = useAtom(selectedModelAtom);
  const [geminiModel, setGeminiModel] = useAtom(geminiModelAtom);
  const geminiApiKey = useAtomValue(geminiApiKeyAtom);
  const [manageKey, setManageKey] = useState(false);
  const [guideDismissed, setGuideDismissed] = useAtom(aiGuideDismissedAtom);
  const [showGuide, setShowGuide] = useState(!guideDismissed);
  const [input, setInput] = useState("");

  const params = useParams<{ id?: string }>();
  const notes = useAtomValue(notesAtom);
  const getContext = useCallback(() => {
    const note = notes.find((n) => n.id === params?.id);
    return note ? `Titolo: ${note.title}\n\n${blocksToPlainText(note.content)}` : "";
  }, [notes, params?.id]);

  // Active model + readiness depend on the provider: Gemini needs the user's
  // own key (BYOK), Ollama needs a model discovered from the local server.
  const activeModel = provider === "gemini" ? geminiModel : model;
  const { messages, status, error, send, stop, clear } = useAI({
    provider,
    model: activeModel,
    apiKey: geminiApiKey,
    context: getContext,
  });

  const streaming = status === "streaming";
  const ready = Boolean(activeModel) && (provider !== "gemini" || Boolean(geminiApiKey));

  const handleModels = useCallback(
    (list: string[]) => {
      setModels(list);
      // Keep the persisted choice if still installed, else default to the first.
      setModel((cur) => (cur && list.includes(cur) ? cur : list[0] || ""));
    },
    [setModels, setModel],
  );

  function submit() {
    if (!input.trim() || !ready || streaming) return;
    send(input);
    setInput("");
  }

  // Keep the conversation pinned to the latest message while it streams.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-medium">MattIA</h2>
        <div className="ml-auto flex items-center gap-1">
          {messages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Nuova conversazione"
                  onClick={clear}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nuova conversazione</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Come usare l'assistente"
                onClick={() => setShowGuide((s) => !s)}
              >
                <HelpCircle className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Come usare MattIA</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Nascondi MattIA"
                onClick={onCollapse}
              >
                <PanelRightClose className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Nascondi MattIA · ⌘J</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Provider + model selector */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          {(["gemini", "ollama"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={cn(
                "rounded px-2 py-0.5 capitalize transition-colors",
                provider === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "gemini" ? "Gemini" : "Ollama"}
            </button>
          ))}
        </div>

        {provider === "gemini" ? (
          <>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="ml-auto max-w-32 rounded-md border border-border bg-transparent px-2 py-1 text-xs"
              aria-label="Modello Gemini"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setManageKey((s) => !s)}
                  aria-label="Gestisci chiave API Gemini"
                  className={cn(
                    "rounded-md border p-1.5 transition-colors",
                    geminiApiKey
                      ? "border-border text-muted-foreground hover:text-foreground"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400",
                  )}
                >
                  <KeyRound className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {geminiApiKey ? "Cambia chiave API" : "Inserisci la chiave API"}
              </TooltipContent>
            </Tooltip>
          </>
        ) : models.length > 0 ? (
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="ml-auto max-w-40 rounded-md border border-border bg-transparent px-2 py-1 text-xs"
            aria-label="Modello Ollama"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <span className="ml-auto text-xs text-muted-foreground">
            nessun modello
          </span>
        )}
      </div>

      {provider === "gemini" ? (
        <GeminiStatus forceOpen={manageKey} onSaved={() => setManageKey(false)} />
      ) : (
        <OllamaStatus onModels={handleModels} />
      )}

      {showGuide && (
        <AiGuide
          provider={provider}
          onDismiss={() => {
            setGuideDismissed(true);
            setShowGuide(false);
          }}
        />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="px-1 pb-1 text-xs text-muted-foreground">
              Azioni rapide sulla nota corrente:
            </p>
            {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
              <Button
                key={label}
                variant="outline"
                disabled={!ready || streaming}
                onClick={() => send(prompt)}
                className="h-auto justify-start gap-2 py-2 text-sm"
              >
                <Icon className="size-4" />
                {label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="max-w-[88%] self-end rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground"
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={m.id}
                  className="max-w-[88%] self-start rounded-lg bg-muted px-3 py-2 text-foreground"
                >
                  {m.content ? (
                    <MarkdownMessage content={m.content} />
                  ) : streaming ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current" />
                    </span>
                  ) : null}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {status === "error" && error && (
          <p className="mb-2 text-xs text-destructive">{error}</p>
        )}
        <div className="flex items-end gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={!ready}
            rows={1}
            placeholder={
              ready
                ? "Chiedi a MattIA…"
                : provider === "gemini"
                  ? "Inserisci la chiave API Gemini per iniziare"
                  : "Seleziona un modello per iniziare"
            }
            className="max-h-32 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          {streaming ? (
            <Button
              size="icon"
              variant="secondary"
              onClick={stop}
              aria-label="Interrompi"
              className="size-8 shrink-0"
            >
              <Square className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={submit}
              disabled={!ready || !input.trim()}
              aria-label="Invia"
              className="size-8 shrink-0"
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
