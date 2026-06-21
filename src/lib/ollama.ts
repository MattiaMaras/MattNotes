"use client";

import {
  FLASHCARD_SYSTEM_PROMPT,
  flashcardUserPrompt,
  parseFlashcards,
} from "@/lib/ai/prompts";

/**
 * Client-side Ollama integration.
 *
 * The browser talks to Ollama DIRECTLY (not through a Next route), so the app
 * works the same whether it's served locally or from the cloud: requests always
 * go to the user's own machine. Browsers treat `http://localhost` as a secure
 * context, so this is allowed even from an https page — but Ollama must permit
 * the page's origin via `OLLAMA_ORIGINS` (CORS).
 *
 * The endpoint is resolved at RUNTIME (not baked into the build): the user's
 * saved value (`ollamaUrlAtom` → localStorage) wins, else `NEXT_PUBLIC_OLLAMA_URL`,
 * else `http://localhost:11434`. This lets the deployed site point at an HTTPS
 * tunnel without a rebuild — and a public page can't call `http://localhost`.
 */
const OLLAMA_URL_STORAGE_KEY = "mattnotes:ollama-url";
const DEFAULT_OLLAMA_URL = (
  process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434"
).replace(/\/+$/, "");

/** Current Ollama base URL (no trailing slash), resolved at call time. */
export function getOllamaUrl(): string {
  if (typeof window !== "undefined") {
    try {
      // atomWithStorage persists JSON, so the stored value is a quoted string.
      const stored = JSON.parse(
        localStorage.getItem(OLLAMA_URL_STORAGE_KEY) || '""',
      );
      if (typeof stored === "string" && stored.trim()) {
        return stored.trim().replace(/\/+$/, "");
      }
    } catch {
      /* fall through to default */
    }
  }
  return DEFAULT_OLLAMA_URL;
}

export interface GeneratedCard {
  question: string;
  answer: string;
}

/** Generate flashcards from note text via Ollama's JSON mode (non-streaming). */
export async function generateFlashcards(
  model: string,
  context: string,
): Promise<GeneratedCard[]> {
  const res = await fetch(`${getOllamaUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: FLASHCARD_SYSTEM_PROMPT },
        { role: "user", content: flashcardUserPrompt(context) },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error((await res.text().catch(() => "")) || "Errore dal modello.");
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return parseFlashcards(data.message?.content ?? "{}");
}
