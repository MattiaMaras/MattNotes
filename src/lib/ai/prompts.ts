/**
 * Shared AI prompts (no "use client" — used by both the client Ollama path and
 * the server-side Gemini routes).
 */

export const MAX_CONTEXT_CHARS = 6000;

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

export const FLASHCARD_SYSTEM_PROMPT =
  "Sei un assistente che crea flashcard di studio per studenti STEM. " +
  "Dato il contenuto di una nota, genera da 4 a 8 flashcard concise sui " +
  "concetti chiave. Ogni flashcard ha una domanda e una risposta brevi, in " +
  "italiano. Usa LaTeX tra $...$ per le formule. Rispondi ESCLUSIVAMENTE con " +
  'JSON nel formato: {"cards":[{"question":"...","answer":"..."}]}';

export function flashcardUserPrompt(context: string): string {
  return `Contenuto della nota:\n"""\n${context.slice(0, MAX_CONTEXT_CHARS)}\n"""`;
}

/** Parse the model's JSON output into clean flashcards. */
export function parseFlashcards(jsonText: string): { question: string; answer: string }[] {
  const parsed = JSON.parse(jsonText || "{}");
  const raw = Array.isArray(parsed) ? parsed : parsed.cards;
  return (Array.isArray(raw) ? raw : [])
    .filter(
      (c): c is { question: string; answer: string } =>
        !!c && typeof c.question === "string" && typeof c.answer === "string",
    )
    .map((c) => ({ question: c.question.trim(), answer: c.answer.trim() }));
}
