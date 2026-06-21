"use client";

import { useCallback, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { BlockNoteDocument } from "@/lib/types";
import { notesAtom, updateNoteAtom } from "@/lib/store/atoms";

/**
 * Read/write access to a single note. Writes go through the `updateNoteAtom`
 * action (optimistic local write + `syncStatus: "local"`), which is the seam
 * the Supabase sync layer will hook into later.
 */
export function useNote(noteId: string) {
  const notes = useAtomValue(notesAtom);
  const update = useSetAtom(updateNoteAtom);

  const note = useMemo(
    () => notes.find((n) => n.id === noteId) ?? null,
    [notes, noteId],
  );

  const setContent = useCallback(
    (content: BlockNoteDocument) => update({ id: noteId, content }),
    [noteId, update],
  );

  const setTitle = useCallback(
    (title: string) => update({ id: noteId, title }),
    [noteId, update],
  );

  return { note, setContent, setTitle };
}
