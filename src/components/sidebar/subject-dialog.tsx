"use client";

import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECT_COLORS } from "@/lib/subjects";
import {
  createNotebookAtom,
  notebooksAtom,
  subjectDialogAtom,
  updateNotebookAtom,
} from "@/lib/store/atoms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Create/edit a subject. Driven by `subjectDialogAtom` so it can be opened from
 * the sidebar, the command palette, or the dashboard. Rendered once in the
 * AppShell. `editingId === null` ⇒ create mode.
 */
export function SubjectDialog() {
  const [dialog, setDialog] = useAtom(subjectDialogAtom);
  const notebooks = useAtomValue(notebooksAtom);
  const createNotebook = useSetAtom(createNotebookAtom);
  const updateNotebook = useSetAtom(updateNotebookAtom);

  const editing = dialog.editingId
    ? notebooks.find((nb) => nb.id === dialog.editingId)
    : null;

  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0].value);
  const [icon, setIcon] = useState("");

  // Reset form whenever the dialog opens (prefilling in edit mode).
  useEffect(() => {
    if (!dialog.open) return;
    setName(editing?.name ?? "");
    setColor(editing?.color ?? SUBJECT_COLORS[0].value);
    setIcon(editing?.icon ?? "");
    // Only re-run when the dialog opens / target changes.
  }, [dialog.open, dialog.editingId, editing?.name, editing?.color, editing?.icon]);

  function close() {
    setDialog({ open: false, editingId: null });
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Keep at most one emoji/glyph as the icon.
    const cleanIcon = [...icon.trim()][0] ?? "";
    if (editing) {
      updateNotebook({ id: editing.id, name: trimmed, color, icon: cleanIcon });
    } else {
      createNotebook({ name: trimmed, color, icon: cleanIcon });
    }
    close();
  }

  return (
    <Dialog open={dialog.open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifica materia" : "Nuova materia"}</DialogTitle>
          <DialogDescription>
            Dai un nome alla materia, scegli un colore e (opzionale) un&apos;emoji.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📓"
              aria-label="Emoji"
              className="w-14 text-center text-lg"
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Es. Algebra Lineare"
              aria-label="Nome materia"
              autoFocus
              className="flex-1"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Colore</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                    color === c.value && "ring-2 ring-ring",
                  )}
                >
                  {color === c.value && (
                    <Check className="size-4 text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Annulla
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            {editing ? "Salva" : "Crea materia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
