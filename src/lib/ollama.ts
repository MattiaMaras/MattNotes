"use client";

/**
 * Client-side Ollama integration.
 *
 * The browser talks to Ollama DIRECTLY (not through a Next route), so the app
 * works the same whether it's served locally or from the cloud: requests always
 * go to the user's own machine. Browsers treat `http://localhost` as a secure
 * context, so this is allowed even from an https page — but Ollama must permit
 * the page's origin via `OLLAMA_ORIGINS` (CORS).
 *
 * Override the target with `NEXT_PUBLIC_OLLAMA_URL` if Ollama runs elsewhere.
 */
export const OLLAMA_URL = (
  process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434"
).replace(/\/+$/, "");

const MAX_CONTEXT_CHARS = 6000;

/** System prompt for the study-assistant chat, with the current note injected. */
export function chatSystemPrompt(context: string): string {
  const base =
    "Sei l'assistente di studio di MattNotes per studenti universitari STEM " +
    "(ingegneria, informatica, matematica). Rispondi in italiano, in modo " +
    "chiaro e conciso. Usa LaTeX tra $...$ o $$...$$ per le formule e blocchi " +
    "di codice quando utile.";
  const trimmed = context.slice(0, MAX_CONTEXT_CHARS).trim();
  if (!trimmed) return base;
  return `${base}\n\nContesto della nota corrente dello studente:\n"""\n${trimmed}\n"""`;
}

const FLASHCARD_SYSTEM_PROMPT =
  "Sei un assistente che crea flashcard di studio per studenti STEM. " +
  "Dato il contenuto di una nota, genera da 4 a 8 flashcard concise sui " +
  "concetti chiave. Ogni flashcard ha una domanda e una risposta brevi, in " +
  "italiano. Usa LaTeX tra $...$ per le formule. Rispondi ESCLUSIVAMENTE con " +
  'JSON nel formato: {"cards":[{"question":"...","answer":"..."}]}';

export interface GeneratedCard {
  question: string;
  answer: string;
}

/** Generate flashcards from note text via Ollama's JSON mode (non-streaming). */
export async function generateFlashcards(
  model: string,
  context: string,
): Promise<GeneratedCard[]> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: FLASHCARD_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Contenuto della nota:\n"""\n${context.slice(0, MAX_CONTEXT_CHARS)}\n"""`,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error((await res.text().catch(() => "")) || "Errore dal modello.");
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const parsed = JSON.parse(data.message?.content ?? "{}");
  const raw = Array.isArray(parsed) ? parsed : parsed.cards;
  return (Array.isArray(raw) ? raw : [])
    .filter(
      (c): c is GeneratedCard =>
        !!c && typeof c.question === "string" && typeof c.answer === "string",
    )
    .map((c) => ({ question: c.question.trim(), answer: c.answer.trim() }));
}
