/**
 * Client-side PDF export.
 *
 * Printing the live app in place is unreliable: the resizable-panel flex/overflow
 * chain makes the browser scale and stretch the output. Instead we clone just the
 * note (`#note-printable`) into a dedicated, chrome-free window, copy the app's
 * stylesheets so KaTeX/Tailwind/fonts render identically, force a light A4 page,
 * and print that. The result is a clean A4 PDF with no stretching.
 *
 * The server-side Puppeteer pipeline (spec §E) remains the planned upgrade for
 * pixel-perfect, high-DPI exports.
 */
"use client";

/** Builds the full HTML document for the print window. Pure + testable.
 *  Pass `baseHref` (for the server-side PDF route) so the copied app-relative
 *  stylesheet `<link>`s resolve when the HTML is rendered outside the page. */
export function buildPrintDocument(
  opts: { baseHref?: string } = {},
): { title: string; html: string } | null {
  const source = document.getElementById("note-printable");
  if (!source) return null;

  const titleInput = source.querySelector("input");
  const title =
    (titleInput as HTMLInputElement | null)?.value?.trim() || "Senza titolo";

  const clone = source.cloneNode(true) as HTMLElement;

  // The title is an <input>; its typed value isn't part of innerHTML — swap it
  // for a heading so it appears in the PDF.
  const clonedInput = clone.querySelector("input");
  if (clonedInput) {
    const h1 = document.createElement("h1");
    h1.textContent = title;
    h1.className = "print-note-title";
    clonedInput.replaceWith(h1);
  }

  // Static document: drop edit affordances and force the light theme so the PDF
  // is always dark-on-white regardless of the in-app theme.
  clone
    .querySelectorAll("[contenteditable]")
    .forEach((el) => el.setAttribute("contenteditable", "false"));
  clone
    .querySelectorAll("[data-color-scheme]")
    .forEach((el) => el.setAttribute("data-color-scheme", "light"));
  clone.querySelectorAll("[data-print-hide]").forEach((el) => el.remove());

  // Copy every stylesheet (Tailwind, KaTeX, tldraw, next/font @font-face).
  const headStyles = [
    ...document.querySelectorAll('style, link[rel="stylesheet"]'),
  ]
    .map((n) => n.outerHTML)
    .join("\n");

  const baseTag = opts.baseHref ? `<base href="${escapeHtml(opts.baseHref)}" />` : "";

  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  ${baseTag}
  <title>${escapeHtml(title)}</title>
  ${headStyles}
  <style>
    @page { size: A4; margin: 1.6cm; }
    html, body { background: #fff !important; margin: 0; padding: 0; height: auto; overflow: visible; }
    #print-root { width: 100%; max-width: none; }
    .print-note-title { font-size: 1.9rem; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 1rem; }
    /* Keep formulas, drawings and images from being split across pages. */
    .bn-block-content, .katex-display, #print-root svg, #print-root img {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    /* tldraw drawings: never distort the aspect ratio. */
    #print-root svg { max-width: 100%; height: auto; }
  </style>
</head>
<body><div id="print-root">${clone.innerHTML}</div></body>
</html>`;

  return { title, html };
}

/** Opens the print window and triggers the browser's print/Save-as-PDF dialog. */
export function printNoteToPdf(): boolean {
  const doc = buildPrintDocument();
  if (!doc) return false;

  const win = window.open("", "_blank", "width=860,height=1100");
  if (!win) return false; // popup blocked

  win.document.open();
  win.document.write(doc.html);
  win.document.close();

  let printed = false;
  const go = () => {
    if (printed) return;
    printed = true;
    win.focus();
    win.print();
  };
  // Print once styles, fonts and the tldraw SVG have settled.
  win.onload = () => window.setTimeout(go, 350);
  // Fallback in case `onload` doesn't fire for a written document.
  window.setTimeout(go, 1200);

  return true;
}

/**
 * Server-side export: render the note to a real A4 PDF via the `/api/pdf`
 * (Puppeteer) route and download it — no popup or browser print dialog. Returns
 * false on any failure so the caller can fall back to {@link printNoteToPdf}.
 */
export async function downloadNotePdf(): Promise<boolean> {
  const doc = buildPrintDocument({ baseHref: `${window.location.origin}/` });
  if (!doc) return false;
  try {
    const res = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: doc.html, filename: doc.title }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    if (blob.type !== "application/pdf") return false;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title || "nota"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
