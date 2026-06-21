"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import { History, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  createSnapshotAtom,
  deleteSnapshotAtom,
  restoreSnapshotAtom,
  snapshotsForNoteAtom,
} from "@/lib/store/atoms";
import type { NoteSnapshot, SnapshotKind } from "@/lib/types";
import { blocksToPlainText } from "@/lib/note-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const KIND_LABEL: Record<SnapshotKind, string> = {
  manual: "Manuale",
  auto: "Automatica",
  restore: "Pre-ripristino",
};

/** Relative time like "2 min fa", falling back to a date for older snapshots. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "adesso";
  if (min < 60) return `${min} min fa`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? "ora" : "ore"} fa`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "giorno" : "giorni"} fa`;
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

function preview(snap: NoteSnapshot): string {
  const text = blocksToPlainText(snap.content ?? []).replace(/\s+/g, " ").trim();
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

/**
 * Version-history dialog for a note. Lets the user save a named checkpoint,
 * browse automatic/manual snapshots, and restore one (the live state is backed
 * up first, so a restore is itself undoable). `onRestored` lets the parent
 * remount the editor so the restored content is shown immediately.
 */
export function NoteHistory({
  noteId,
  onRestored,
}: {
  noteId: string;
  onRestored?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const snapshots = useAtomValue(snapshotsForNoteAtom)(noteId);
  const createSnapshot = useSetAtom(createSnapshotAtom);
  const restoreSnapshot = useSetAtom(restoreSnapshotAtom);
  const deleteSnapshot = useSetAtom(deleteSnapshotAtom);

  function handleSave() {
    const id = createSnapshot({ noteId, kind: "manual" });
    if (id) toast.success("Versione salvata");
  }

  function handleRestore(snap: NoteSnapshot) {
    if (restoreSnapshot(snap.id)) {
      onRestored?.();
      setOpen(false);
      toast.success("Versione ripristinata", {
        description: "Lo stato precedente è stato salvato nella cronologia.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <History className="size-4" />
          Cronologia
          {snapshots.length > 0 && (
            <span className="ml-0.5 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
              {snapshots.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cronologia versioni</DialogTitle>
          <DialogDescription>
            Le versioni sono salvate solo sul tuo dispositivo. Ripristinandone
            una, lo stato attuale viene comunque conservato.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {snapshots.length} {snapshots.length === 1 ? "versione" : "versioni"}
          </p>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="size-4" />
            Salva versione
          </Button>
        </div>

        <div className="max-h-[55vh] space-y-1.5 overflow-y-auto">
          {snapshots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nessuna versione salvata.
              <br />
              Le versioni automatiche compaiono mentre scrivi.
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {relativeTime(snap.createdAt)}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {KIND_LABEL[snap.kind]}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {snap.title || "Senza titolo"}
                  </p>
                  {preview(snap) && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                      {preview(snap)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(snap)}
                    className="h-8 gap-1.5 px-2 text-xs"
                  >
                    <RotateCcw className="size-3.5" />
                    Ripristina
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSnapshot(snap.id)}
                    className="size-8 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    title="Elimina versione"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
