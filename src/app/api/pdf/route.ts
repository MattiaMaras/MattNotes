import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

// Puppeteer needs the Node runtime and a real (non-cached) render per request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Locate a Chrome/Chromium binary. We use `puppeteer-core` (no bundled browser)
 * and drive the browser already on the machine — set `PUPPETEER_EXECUTABLE_PATH`
 * to override on other platforms.
 */
function chromeExecutable(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  return candidates.find((p) => existsSync(p));
}

function safeName(name: unknown): string {
  const base = typeof name === "string" && name.trim() ? name.trim() : "nota";
  return base.replace(/[^\p{L}\p{N} _-]+/gu, "").slice(0, 80) || "nota";
}

/**
 * Server-side PDF export. The client sends a fully self-contained HTML document
 * (built by `buildPrintDocument`, including a `<base>` so its stylesheets
 * resolve), which we render to an A4 PDF with headless Chrome. The page's own
 * `@page { size: A4; margin }` is honoured via `preferCSSPageSize`.
 */
export async function POST(req: Request): Promise<Response> {
  let html: unknown;
  let filename: unknown;
  try {
    ({ html, filename } = await req.json());
  } catch {
    return Response.json({ error: "Body JSON non valido." }, { status: 400 });
  }
  if (typeof html !== "string" || !html) {
    return Response.json({ error: "Campo 'html' mancante." }, { status: 400 });
  }

  const executablePath = chromeExecutable();
  if (!executablePath) {
    return Response.json(
      { error: "Nessun browser Chrome/Chromium trovato sul server." },
      { status: 501 },
    );
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    // "load" waits for linked stylesheets/images; then wait for web fonts so
    // KaTeX and the UI fonts are ready before we snapshot the PDF.
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName(filename)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Errore di rendering." },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
