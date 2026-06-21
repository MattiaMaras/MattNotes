"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { ArrowLeft, FileDown, Layers, Loader2 } from "lucide-react";
import { useNote } from "@/hooks/use-note";
import { useGenerateFlashcards } from "@/hooks/use-generate-flashcards";
import type { BlockNoteDocument } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncStatus } from "@/components/sidebar/sync-status";
import { NoteBreadcrumb } from "@/components/editor/note-breadcrumb";
import { NoteHistory } from "@/components/editor/note-history";
import { maybeAutoSnapshotAtom } from "@/lib/store/atoms";
import { downloadNotePdf, printNoteToPdf } from "@/lib/export/print-note";

// The editor is client-only and heavy; load it lazily with a skeleton.
const BlockNoteEditor = dynamic(
  () =>
    import("@/components/editor/block-note-editor").then(
      (m) => m.BlockNoteEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 px-2 py-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-40 w-full" />
      </div>
    ),
  },
);

export function NoteView({ noteId }: { noteId: string }) {
  const { note, setContent, setTitle } = useNote(noteId);
  const router = useRouter();
  const { generate, generating } = useGenerateFlashcards();
  const maybeAutoSnapshot = useSetAtom(maybeAutoSnapshotAtom);

  // Bumped on restore to force the (initial-content-only) editor to remount and
  // pick up the restored document.
  const [revision, setRevision] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Local title state for a snappy input; persisted on a short debounce.
  const [title, setLocalTitle] = useState(note?.title ?? "");
  useEffect(() => setLocalTitle(note?.title ?? ""), [note?.title]);

  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced content persistence so rapid keystrokes don't thrash storage.
  // Before applying the new document, ask the store for a throttled automatic
  // snapshot — it captures the *previous* saved state for the version history.
  const handleContentChange = useCallback(
    (document: BlockNoteDocument) => {
      if (contentTimer.current) clearTimeout(contentTimer.current);
      contentTimer.current = setTimeout(() => {
        maybeAutoSnapshot(noteId);
        setContent(document);
      }, 500);
    },
    [noteId, setContent, maybeAutoSnapshot],
  );

  function handleTitleChange(value: string) {
    setLocalTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => setTitle(value || "Senza titolo"), 400);
  }

  useEffect(
    () => () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (contentTimer.current) clearTimeout(contentTimer.current);
    },
    [],
  );

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Questa nota non esiste o è stata eliminata.
        </p>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Torna alla dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-8 print:h-auto print:py-0">
      {/* Toolbar: hidden in the printed PDF. */}
      <div className="mb-2 flex items-center justify-between gap-2 print:hidden">
        <NoteBreadcrumb note={note} />
        <div className="flex items-center gap-1">
          <SyncStatus status={note.syncStatus} />
          <NoteHistory
            noteId={noteId}
            onRestored={() => setRevision((r) => r + 1)}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={generating}
            onClick={async () => {
              const n = await generate(noteId);
              if (n > 0) router.push("/review");
            }}
            className="gap-1.5"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Layers className="size-4" />
            )}
            Genera flashcard
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                // Prefer the server-side (Puppeteer) PDF; fall back to the
                // browser print dialog if it's unavailable.
                const ok = await downloadNotePdf();
                if (!ok && !printNoteToPdf()) {
                  toast.error("Impossibile esportare il PDF.");
                }
              } finally {
                setExporting(false);
              }
            }}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Esporta PDF
          </Button>
        </div>
      </div>

      {/* The printable region — only this is shown when exporting to PDF. */}
      <div id="note-printable" className="flex flex-1 flex-col">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Senza titolo"
          aria-label="Titolo della nota"
          className="mb-2 w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground"
        />

        {/* The `key` remounts the editor when switching notes — and when a
            restore bumps `revision` — so the document is re-read as initial
            content (BlockNote only reads `initialContent` on mount). */}
        <div className="flex-1">
          <BlockNoteEditor
            key={`${noteId}:${revision}`}
            initialContent={note.content}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
