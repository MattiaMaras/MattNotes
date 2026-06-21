"use client";

import Link from "next/link";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronRight, Home } from "lucide-react";
import { toast } from "sonner";
import type { Note } from "@/lib/types";
import { moveNoteAtom, notebooksAtom } from "@/lib/store/atoms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubjectGlyph } from "@/components/sidebar/subject-glyph";

/**
 * Context breadcrumb above the lesson title: Dashboard › [Materia ▾]. The
 * subject is a dropdown so a lesson can be reassigned to another subject
 * without leaving the editor.
 */
export function NoteBreadcrumb({ note }: { note: Note }) {
  const notebooks = useAtomValue(notebooksAtom);
  const move = useSetAtom(moveNoteAtom);
  const subject = notebooks.find((nb) => nb.id === note.notebookId) ?? null;

  function handleMove(notebookId: string | null) {
    if (notebookId === note.notebookId) return;
    move({ id: note.id, notebookId });
    toast.success("Lezione spostata");
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
      >
        <Home className="size-3.5" />
      </Link>
      <ChevronRight className="size-3.5 opacity-50" />

      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 outline-none hover:bg-accent hover:text-foreground data-[state=open]:bg-accent">
          {subject ? (
            <>
              <SubjectGlyph color={subject.color} icon={subject.icon} />
              <span className="max-w-48 truncate">{subject.name}</span>
            </>
          ) : (
            <span>Senza materia</span>
          )}
          <ChevronRight className="size-3 rotate-90 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {notebooks.map((nb) => (
            <DropdownMenuItem key={nb.id} onSelect={() => handleMove(nb.id)}>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
