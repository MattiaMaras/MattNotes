"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { FileText, FolderPlus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createNoteAtom,
  notebooksAtom,
  notesAtom,
  subjectDialogAtom,
} from "@/lib/store/atoms";
import { SubjectGlyph } from "@/components/sidebar/subject-glyph";
import { DueToday } from "@/components/flashcards/due-today";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Home dashboard organised by subject: a grid of subject cards (click to
 * filter) above the recent lessons, each lesson tagged with its subject's
 * colour. The "Da ripassare oggi" surface arrives with the flashcard engine.
 */
export function Dashboard() {
  const router = useRouter();
  const notes = useAtomValue(notesAtom);
  const notebooks = useAtomValue(notebooksAtom);
  const createNote = useSetAtom(createNoteAtom);
  const openSubjectDialog = useSetAtom(subjectDialogAtom);

  const [filter, setFilter] = useState<string | null>(null);

  const subjects = useMemo(
    () => [...notebooks].sort((a, b) => a.order - b.order),
    [notebooks],
  );
  const subjectById = useMemo(
    () => new Map(notebooks.map((nb) => [nb.id, nb])),
    [notebooks],
  );
  const countBySubject = useMemo(() => {
    const m = new Map<string, number>();
    notes.forEach((n) => {
      if (n.notebookId) m.set(n.notebookId, (m.get(n.notebookId) ?? 0) + 1);
    });
    return m;
  }, [notes]);

  const lessons = useMemo(() => {
    const list = filter ? notes.filter((n) => n.notebookId === filter) : notes;
    return [...list]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 18);
  }, [notes, filter]);

  function handleNewLesson() {
    const id = createNote(filter ?? subjects[0]?.id ?? null);
    router.push(`/note/${id}`);
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">I tuoi appunti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {notes.length} lezioni · {notebooks.length} materie
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => openSubjectDialog({ open: true, editingId: null })}
            className="gap-2"
          >
            <FolderPlus className="size-4" />
            Materia
          </Button>
          <Button onClick={handleNewLesson} className="gap-2">
            <Plus className="size-4" />
            Nuova lezione
          </Button>
        </div>
      </header>

      <DueToday />

      {/* Subjects */}
      {subjects.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Materie
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {subjects.map((subject) => {
              const active = filter === subject.id;
              return (
                <button
                  key={subject.id}
                  onClick={() => setFilter(active ? null : subject.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-ring bg-accent/50"
                      : "border-border hover:bg-accent/30",
                  )}
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ backgroundColor: `${subject.color}1f` }}
                  >
                    <SubjectGlyph
                      color={subject.color}
                      icon={subject.icon}
                      className="text-lg"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {countBySubject.get(subject.id) ?? 0} lezioni
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Lessons */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {filter
              ? `Lezioni · ${subjectById.get(filter)?.name ?? ""}`
              : "Lezioni recenti"}
          </h2>
          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="text-xs text-primary hover:underline"
            >
              Mostra tutte
            </button>
          )}
        </div>

        {lessons.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nessuna lezione qui. Creane una per iniziare.
            </p>
            <Button variant="outline" onClick={handleNewLesson} className="gap-2">
              <Plus className="size-4" />
              Nuova lezione
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lessons.map((note, i) => {
              const subject = note.notebookId
                ? subjectById.get(note.notebookId)
                : null;
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                >
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/note/${note.id}`)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && router.push(`/note/${note.id}`)
                    }
                    className="flex h-36 cursor-pointer flex-col p-5 transition-colors hover:border-ring hover:bg-accent/40"
                    style={
                      subject
                        ? { borderLeft: `3px solid ${subject.color}` }
                        : undefined
                    }
                  >
                    {subject && (
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <SubjectGlyph color={subject.color} icon={subject.icon} />
                        <span className="truncate">{subject.name}</span>
                      </div>
                    )}
                    <h3 className="line-clamp-2 font-medium">{note.title}</h3>
                    <p className="mt-auto pt-4 text-xs text-muted-foreground">
                      {formatDate(note.updatedAt)}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
