"use client";

import {
  FLASHCARD_SYSTEM_PROMPT,
  chatSystemPrompt,
  flashcardUserPrompt,
  parseFlashcards,
} from "@/lib/ai/prompts";

/**
 * Client-side Gemini integration (BYOK). The browser calls Google directly
 * with the user's own API key — `generativelanguage.googleapis.com` allows
 * CORS from any origin, and the key never passes through our server, so
 * there's no shared quota and no key to leak from a serverless function.
 */
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeneratedCard {
  question: string;
  answer: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function geminiErrorMessage(status: number, detail: string): string {
  if (status === 400 || status === 403) {
    return "Chiave API Gemini non valida o senza permessi. Controllala nelle impostazioni dell'assistente.";
  }
  if (status === 429) {
    return "Hai raggiunto il limite gratuito di Gemini per ora. Riprova più tardi.";
  }
  try {
    const parsed = JSON.parse(detail);
    return parsed?.error?.message || "Errore dal servizio Gemini.";
  } catch {
    return "Errore dal servizio Gemini.";
  }
}

/** Streams a chat reply from Gemini, yielding text chunks as they arrive. */
export async function* streamGeminiChat(opts: {
  apiKey: string;
  model: string;
  context: string;
  messages: ChatMsg[];
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const { apiKey, model, context, messages, signal } = opts;
  const res = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: chatSystemPrompt(context) }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.7 },
      }),
    },
  );

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(geminiErrorMessage(res.status, detail));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith("data:")) continue;
      const data = s.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const parts = json?.candidates?.[0]?.content?.parts;
        const text = Array.isArray(parts)
          ? parts.map((p: { text?: string }) => p?.text ?? "").join("")
          : "";
        if (text) yield text;
      } catch {
        /* ignore partial / non-JSON lines */
      }
    }
  }
}

/** Generate flashcards from note text via Gemini's JSON mode (non-streaming). */
export async function generateGeminiFlashcards(
  apiKey: string,
  model: string,
  context: string,
): Promise<GeneratedCard[]> {
  const res = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: FLASHCARD_SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: flashcardUserPrompt(context) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(geminiErrorMessage(res.status, detail));
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return parseFlashcards(text);
}
