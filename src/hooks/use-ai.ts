"use client";

import { useCallback, useRef, useState } from "react";
import { chatSystemPrompt } from "@/lib/ai/prompts";
import { getOllamaUrl } from "@/lib/ollama";
import { streamGeminiChat } from "@/lib/gemini";
import type { AiProvider } from "@/lib/store/atoms";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = "idle" | "streaming" | "error";

/**
 * Streaming chat, two providers, both called directly from the browser
 * (BYOK — no server in the middle, no key of ours to share or leak):
 *  - `gemini`: the user's own API key, straight to Google (`lib/gemini.ts`);
 *  - `ollama`: the user's local Ollama (`lib/ollama.ts`).
 * The conversation history is sent on every turn; `context()` supplies the
 * current note text, evaluated lazily at send time so it's always fresh.
 */
export function useAI({
  provider,
  model,
  apiKey,
  context,
}: {
  provider: AiProvider;
  model?: string;
  apiKey?: string;
  context?: () => string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !model || status === "streaming") return;
      if (provider === "gemini" && !apiKey) {
        setError("Inserisci la tua chiave API Gemini nelle impostazioni dell'assistente.");
        setStatus("error");
        return;
      }

      setError(null);
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const assistantId = crypto.randomUUID();
      const history = [...messages, userMsg];
      setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
      setStatus("streaming");

      const controller = new AbortController();
      abortRef.current = controller;

      const ctx = context?.() ?? "";
      const plain = history.map(({ role, content }) => ({ role, content }));

      function appendToken(token: string) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + token } : m,
          ),
        );
      }

      try {
        if (provider === "gemini") {
          for await (const token of streamGeminiChat({
            apiKey: apiKey!,
            model,
            context: ctx,
            messages: plain,
            signal: controller.signal,
          })) {
            appendToken(token);
          }
        } else {
          const res = await fetch(`${getOllamaUrl()}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              model,
              stream: true,
              messages: [
                { role: "system", content: chatSystemPrompt(ctx) },
                ...plain,
              ],
            }),
          });

          if (!res.ok || !res.body) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
              data.error || "Ollama non è raggiungibile. Avvialo e riprova.",
            );
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          // Ollama streams NDJSON: one `{ message: { content }, done }` per line.
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const s = line.trim();
              if (!s) continue;
              let json: { message?: { content?: string }; error?: string };
              try {
                json = JSON.parse(s);
              } catch {
                continue;
              }
              if (json.error) throw new Error(json.error);
              const token = json.message?.content;
              if (token) appendToken(token);
            }
          }
        }
        setStatus("idle");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("idle");
          return;
        }
        // A failed fetch to localhost Ollama (down, or CORS not allowing this
        // origin) surfaces as a TypeError — give an actionable message.
        const msg =
          err instanceof TypeError && provider === "ollama"
            ? "Impossibile raggiungere Ollama. Avvialo e consenti questo sito (OLLAMA_ORIGINS)."
            : err instanceof Error
              ? err.message
              : "Errore sconosciuto.";
        setError(msg);
        setStatus("error");
        // Drop the empty assistant placeholder on failure.
        setMessages((prev) =>
          prev.filter((m) => !(m.id === assistantId && m.content === "")),
        );
      } finally {
        abortRef.current = null;
      }
    },
    [provider, apiKey, messages, model, status, context],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    setStatus("idle");
  }, []);

  return { messages, status, error, send, stop, clear };
}
