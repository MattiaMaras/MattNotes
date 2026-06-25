"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  File,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PdfHighlight } from "@/lib/types";

// Must be set in the same module that renders <Document>/<Page> (per
// react-pdf's docs); Turbopack resolves the worker's .mjs URL at build time.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const HIGHLIGHT_COLORS = [
  { id: "yellow", value: "#fde047" },
  { id: "green", value: "#86efac" },
  { id: "pink", value: "#f9a8d4" },
  { id: "blue", value: "#93c5fd" },
] as const;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Measures a container's width with ResizeObserver, so pages always fit
 *  whatever the split-pane gives this panel (resizing, collapsing, etc). */
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/** One rendered page plus its highlight overlay and selection capture. */
function PdfPage({
  pageNumber,
  width,
  highlights,
  onSelect,
  onRemoveHighlight,
}: {
  pageNumber: number;
  width: number;
  highlights: PdfHighlight[];
  onSelect: (page: number, rects: Rect[]) => void;
  onRemoveHighlight: (highlightId: string) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [renderedSize, setRenderedSize] = useState<{ w: number; h: number } | null>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !pageRef.current) return;
    const range = selection.getRangeAt(0);
    const pageBox = pageRef.current.getBoundingClientRect();
    if (pageBox.width === 0 || pageBox.height === 0) return;

    const rects = Array.from(range.getClientRects())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({
        x: (r.left - pageBox.left) / pageBox.width,
        y: (r.top - pageBox.top) / pageBox.height,
        width: r.width / pageBox.width,
        height: r.height / pageBox.height,
      }));
    if (rects.length === 0) return;

    onSelect(pageNumber, rects);
    selection.removeAllRanges();
  }, [pageNumber, onSelect]);

  return (
    <div ref={pageRef} className="relative" onMouseUp={handleMouseUp}>
      <Page
        pageNumber={pageNumber}
        width={width}
        onRenderSuccess={(page) =>
          setRenderedSize({ w: page.width, h: page.height })
        }
        loading={
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      />
      {/* Highlight overlay — normalized rects scaled to the current render
          size, so they stay aligned across width changes / spread mode. */}
      {renderedSize &&
        highlights
          .filter((h) => h.page === pageNumber)
          .map((h) => (
            <div key={h.id} className="absolute inset-0 pointer-events-none">
              {h.rects.map((r, i) => (
                <div
                  key={i}
                  onClick={() => onRemoveHighlight(h.id)}
                  title="Clicca per rimuovere"
                  className="absolute cursor-pointer pointer-events-auto mix-blend-multiply"
                  style={{
                    left: r.x * renderedSize.w,
                    top: r.y * renderedSize.h,
                    width: r.width * renderedSize.w,
                    height: r.height * renderedSize.h,
                    backgroundColor: h.color,
                  }}
                />
              ))}
            </div>
          ))}
    </div>
  );
}

/**
 * PDF viewer: single page or two-page spread, prev/next, highlight-on-select
 * (native text selection → normalized overlay rects, click a highlight to
 * remove it). `onLoadSuccess`/`onAddHighlight`/`onRemoveHighlight` are wired
 * to the PdfDocument atoms by the parent page.
 */
export function PdfViewer({
  fileUrl,
  pageCount,
  highlights,
  onLoadSuccess,
  onAddHighlight,
  onRemoveHighlight,
}: {
  fileUrl: string;
  pageCount: number | null;
  highlights: PdfHighlight[];
  onLoadSuccess: (pageCount: number) => void;
  onAddHighlight: (page: number, color: string, rects: Rect[]) => void;
  onRemoveHighlight: (highlightId: string) => void;
}) {
  const [view, setView] = useState<"single" | "spread">("single");
  const [pageNumber, setPageNumber] = useState(1);
  const [color, setColor] = useState<string>(HIGHLIGHT_COLORS[0].value);
  const { ref: containerRef, width } = useContainerWidth();

  const step = view === "spread" ? 2 : 1;
  const pageWidth = view === "spread" ? Math.max(0, width / 2 - 8) : width;

  function goPrev() {
    setPageNumber((p) => Math.max(1, p - step));
  }
  function goNext() {
    setPageNumber((p) => Math.min(pageCount ?? p, p + step));
  }

  return (
    <div className="flex h-full flex-col bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          {(["single", "spread"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "single" ? (
                <File className="size-3" />
              ) : (
                <BookOpen className="size-3" />
              )}
              {v === "single" ? "Singola" : "Doppia"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setColor(c.value)}
              aria-label={`Colore evidenziatore ${c.id}`}
              className={cn(
                "size-5 rounded-full border-2 transition-transform",
                color === c.value
                  ? "scale-110 border-foreground"
                  : "border-transparent",
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button
            onClick={goPrev}
            disabled={pageNumber <= 1}
            aria-label="Pagina precedente"
            className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular-nums">
            {pageNumber}
            {view === "spread" && pageCount && pageNumber < pageCount
              ? `–${pageNumber + 1}`
              : ""}
            {" / "}
            {pageCount ?? "…"}
          </span>
          <button
            onClick={goNext}
            disabled={Boolean(pageCount) && pageNumber >= (pageCount ?? 0)}
            aria-label="Pagina successiva"
            className="rounded-md p-1 hover:bg-accent disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        {width > 0 && (
          <Document
            file={fileUrl}
            onLoadSuccess={(pdf) => onLoadSuccess(pdf.numPages)}
            loading={
              <div className="flex h-96 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <div className="flex justify-center gap-4">
              <PdfPage
                pageNumber={pageNumber}
                width={pageWidth}
                highlights={highlights}
                onSelect={(page, rects) => onAddHighlight(page, color, rects)}
                onRemoveHighlight={onRemoveHighlight}
              />
              {view === "spread" && pageCount && pageNumber + 1 <= pageCount && (
                <PdfPage
                  pageNumber={pageNumber + 1}
                  width={pageWidth}
                  highlights={highlights}
                  onSelect={(page, rects) => onAddHighlight(page, color, rects)}
                  onRemoveHighlight={onRemoveHighlight}
                />
              )}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
