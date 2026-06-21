"use client";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Copy,
  CornerUpRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteNoteAtom,
  duplicateNoteAtom,
  moveNoteAtom,
  notebooksAtom,
  updateNoteAtom,
} from "@/lib/store/atoms";
import { SyncStatus } from "@/components/sidebar/sync-status";
import { SubjectGlyph } from "@/components/sidebar/subject-glyph";

/**
 * A note leaf in the sidebar tree. Click to open; kebab menu exposes rename,
 * duplicate, delete (export will be added with the PDF engine). Touch target
 * is ≥ 36px tall for iPad use. `dragHandle` is injected by the sortable wrapper.
 */
export function NoteItem({
  note,
  dragHandle,
}: {
  note: Note;
  dragHandle?: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const isActive = params?.id === note.id;

  const notebooks = useAtomValue(notebooksAtom);
  const update = useSetAtom(updateNoteAtom);
  const duplicate = useSetAtom(duplicateNoteAtom);
  const move = useSetAtom(moveNoteAtom);
  const remove = useSetAtom(deleteNoteAtom);

  function handleRename() {
    const next = window.prompt("Rinomina nota", note.title);
    if (next && next.trim()) update({ id: note.id, title: next.trim() });
  }

  function handleDuplicate() {
    const id = duplicate(note.id);
    if (id) {
      toast.success("Nota duplicata");
      router.push(`/note/${id}`);
    }
  }

  function handleDelete() {
    remove(note.id);
    toast.success("Nota eliminata");
    if (isActive) router.push("/app");
  }

  function handleMove(notebookId: string | null) {
    if (notebookId === note.notebookId) return;
    move({ id: note.id, notebookId });
    toast.success("Lezione spostata");
  }

  const otherSubjects = notebooks.filter((nb) => nb.id !== note.notebookId);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
      )}
    >
      {dragHandle}
      <button
        onClick={() => router.push(`/note/${note.id}`)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <FileText className="size-3.5 shrink-0 opacity-70" />
        <span className="truncate">{note.title}</span>
      </button>

      <SyncStatus
        status={note.syncStatus}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Azioni nota"
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={handleRename}>
            <Pencil className="size-4" /> Rinomina
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDuplicate}>
            <Copy className="size-4" /> Duplica
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CornerUpRight className="size-4" /> Sposta in
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {otherSubjects.length === 0 && note.notebookId === null ? (
                <DropdownMenuItem disabled>Nessuna materia</DropdownMenuItem>
              ) : (
                <>
                  {otherSubjects.map((nb) => (
                    <DropdownMenuItem
                      key={nb.id}
                      onSelect={() => handleMove(nb.id)}
                    >
                      <SubjectGlyph color={nb.color} icon={nb.icon} />
                      <span className="truncate">{nb.name}</span>
                    </DropdownMenuItem>
                  ))}
                  {note.notebookId !== null && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleMove(null)}>
                        Senza materia
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
