"use client";

import { useCallback, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import {
  aiProviderAtom,
  createFlashcardsAtom,
  geminiModelAtom,
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
  const provider = useAtomValue(aiProviderAtom);
  const ollamaModel = useAtomValue(selectedModelAtom);
  const geminiModel = useAtomValue(geminiModelAtom);
  const model = provider === "gemini" ? geminiModel : ollamaModel;
  const notes = useAtomValue(notesAtom);
  const createCards = useSetAtom(createFlashcardsAtom);
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(
    async (noteId: string): Promise<number> => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return 0;
      if (!model) {
        toast.error("Seleziona un modello AI nel pannello Assistente.");
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
        let cards: { question: string; answer: string }[];
        if (provider === "gemini") {
          const res = await fetch("/api/ai/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, context }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Errore di generazione.");
          cards = (data.cards ?? []) as { question: string; answer: string }[];
        } else {
          cards = await generateFlashcards(model, context);
        }
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
    [provider, model, notes, createCards],
  );

  return { generate, generating };
}
