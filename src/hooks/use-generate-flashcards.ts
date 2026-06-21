"use client";

import { useCallback, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import {
  createFlashcardsAtom,
  notesAtom,
  selectedModelAtom,
} from "@/lib/store/atoms";
import { blocksToPlainText } from "@/lib/note-text";
import { generateFlashcards } from "@/lib/ollama";

/**
 * Generates flashcards for a note via the local AI and saves them. Surfaces
 * progress through toasts; returns how many cards were created (0 on failure).
 */
export function useGenerateFlashcards() {
  const model = useAtomValue(selectedModelAtom);
  const notes = useAtomValue(notesAtom);
  const createCards = useSetAtom(createFlashcardsAtom);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(
    async (noteId: string): Promise<number> => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return 0;
      if (!model) {
        toast.error("Seleziona un modello AI (avvia Ollama) nel pannello Assistente.");
        return 0;
      }

      const context = `Titolo: ${note.title}\n\n${blocksToPlainText(note.content)}`;
      if (context.trim().length < 10) {
        toast.error("La nota è troppo corta per generare flashcard.");
        return 0;
      }

      setGenerating(true);
      const toastId = toast.loading("Genero le flashcard…");
      try {
        const cards = await generateFlashcards(model, context);
        if (cards.length === 0) throw new Error("Nessuna flashcard generata.");

        const n = createCards({
          noteId: note.id,
          notebookId: note.notebookId,
          cards,
        });
        toast.success(`${n} flashcard create`, { id: toastId });
        return n;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore sconosciuto.", {
          id: toastId,
        });
        return 0;
      } finally {
        setGenerating(false);
      }
    },
    [model, notes, createCards],
  );

  return { generate, generating };
}
