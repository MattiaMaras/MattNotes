/**
 * Gemini flashcard generation (server-side, JSON output). Free-tier cloud AI;
 * the API key stays on the server.
 */
import {
  FLASHCARD_SYSTEM_PROMPT,
  flashcardUserPrompt,
  parseFlashcards,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "AI cloud non configurata (GEMINI_API_KEY mancante)." },
      { status: 503 },
    );
  }

  let body: { model?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const { model = "gemini-2.5-flash", context = "" } = body;
  if (context.trim().length < 10) {
    return Response.json(
      { error: "La nota è troppo corta per generare flashcard." },
      { status: 400 },
    );
  }

  const payload = {
    systemInstruction: { parts: [{ text: FLASHCARD_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: flashcardUserPrompt(context) }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  };

  let upstream: Response;
  try {
    upstream = await fetch(
      `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    return Response.json({ error: "Gemini non raggiungibile." }, { status: 502 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: detail || "Errore dal servizio Gemini." },
      { status: upstream.status || 502 },
    );
  }

  try {
    const data = (await upstream.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "";
    return Response.json({ cards: parseFlashcards(text) });
  } catch {
    return Response.json(
      { error: "Risposta del modello non valida. Riprova." },
      { status: 502 },
    );
  }
}
