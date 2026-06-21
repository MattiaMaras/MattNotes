/**
 * Gemini chat (server-side, streaming). Runs on Vercel — the `GEMINI_API_KEY`
 * stays on the server and is never exposed to the browser. Gemini's SSE is
 * translated to the same NDJSON shape Ollama emits (`{"message":{"content"}}`),
 * so the client's `useAI` parser is shared across both providers.
 */
import { chatSystemPrompt } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface InMsg {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "AI cloud non configurata (GEMINI_API_KEY mancante)." },
      { status: 503 },
    );
  }

  let body: { model?: string; messages?: InMsg[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const { model = "gemini-2.5-flash", messages, context = "" } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Nessun messaggio." }, { status: 400 });
  }

  const payload = {
    systemInstruction: { parts: [{ text: chatSystemPrompt(context) }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { temperature: 0.7 },
  };

  let upstream: Response;
  try {
    upstream = await fetch(
      `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    return Response.json({ error: "Gemini non raggiungibile." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: detail || "Errore dal servizio Gemini." },
      { status: upstream.status || 502 },
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
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
                if (text) {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({ message: { content: text } }) + "\n",
                    ),
                  );
                }
              } catch {
                /* ignore partial / non-JSON lines */
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      })();
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
