"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addPdfHighlightAtom,
  pdfDocumentsAtom,
  removePdfHighlightAtom,
  updatePdfDocumentAtom,
} from "@/lib/store/atoms";
import { getSignedPdfUrl } from "@/lib/supabase/storage";
import { useNote } from "@/hooks/use-note";
import { PdfViewer } from "@/components/pdfs/pdf-viewer";
import type { BlockNoteDocument } from "@/lib/types";

const BlockNoteEditor = dynamic(
  () =>
    import("@/components/editor/block-note-editor").then(
      (m) => m.BlockNoteEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 px-4 py-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    ),
  },
);

/** Split view: PDF on the left, the companion note (text/LaTeX/canvas/code,
 *  the full existing editor) on the right. */
export function PdfStudyView({ pdfId }: { pdfId: string }) {
  const docs = useAtomValue(pdfDocumentsAtom);
  const updatePdfDocument = useSetAtom(updatePdfDocumentAtom);
  const addHighlight = useSetAtom(addPdfHighlightAtom);
  const removeHighlight = useSetAtom(removePdfHighlightAtom);
  const doc = docs.find((d) => d.id === pdfId) ?? null;

  const { note, setContent } = useNote(doc?.noteId ?? "");
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (contentTimer.current) clearTimeout(contentTimer.current);
  }, []);
  const handleContentChange = useCallback(
    (document: BlockNoteDocument) => {
      if (contentTimer.current) clearTimeout(contentTimer.current);
      contentTimer.current = setTimeout(() => setContent(document), 500);
    },
    [setContent],
  );

  // Keyed by docId so a stale response for a PDF the user already navigated
  // away from is never rendered (avoids a synchronous reset inside the
  // effect — `doc` is a fresh object every render, so depending on the whole
  // thing would refetch on every unrelated atom update, e.g. `pageCount`).
  const [urlState, setUrlState] = useState<{ docId: string; url: string } | null>(null);
  const [errorDocId, setErrorDocId] = useState<string | null>(null);
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    void getSignedPdfUrl(doc.storagePath).then((url) => {
      if (cancelled) return;
      if (url) setUrlState({ docId: doc.id, url });
      else setErrorDocId(doc.id);
    });
    return () => {
      cancelled = true;
    };
    // Intentionally NOT depending on the whole `doc` object — see comment
    // above the state declarations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.storagePath]);
  const fileUrl = urlState && urlState.docId === doc?.id ? urlState.url : null;
  const urlError = errorDocId === doc?.id && fileUrl === null;

  if (!doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Questo PDF non esiste o è stato eliminato.
        </p>
        <Link
          href="/pdfs"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />I tuoi PDF
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Link
          href="/pdfs"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />I tuoi PDF
        </Link>
        <span className="truncate text-sm font-medium">{doc.title}</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" id="mattnotes:pdf-study">
          <ResizablePanel id="pdf" defaultSize="55%" minSize="30%">
            {urlError ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Impossibile caricare il PDF. Riprova più tardi.
              </div>
            ) : !fileUrl ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PdfViewer
                fileUrl={fileUrl}
                pageCount={doc.pageCount}
                highlights={doc.highlights}
                onLoadSuccess={(pageCount) => {
                  if (doc.pageCount !== pageCount) {
                    updatePdfDocument({ id: doc.id, pageCount });
                  }
                }}
                onAddHighlight={(page, color, rects) =>
                  addHighlight({ pdfId: doc.id, page, color, rects })
                }
                onRemoveHighlight={(highlightId) =>
                  removeHighlight({ pdfId: doc.id, highlightId })
                }
              />
            )}
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel id="notes" defaultSize="45%" minSize="25%">
            <div className="h-full overflow-y-auto px-4 py-4">
              {note && (
                <BlockNoteEditor
                  key={note.id}
                  initialContent={note.content}
                  onChange={handleContentChange}
                />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
