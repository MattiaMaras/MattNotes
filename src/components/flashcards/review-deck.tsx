"use client";

import { useState } from "react";
import Link from "next/link";
import { useAtomValue, useSetAtom } from "jotai";
import { motion } from "framer-motion";
import { ArrowLeft, PartyPopper } from "lucide-react";
import type { Flashcard, Grade } from "@/lib/types";
import { dueFlashcardsAtom, reviewFlashcardAtom } from "@/lib/store/atoms";
import { Button } from "@/components/ui/button";
import { MarkdownMessage } from "@/components/ai-chat/markdown-message";

const GRADES: { grade: Grade; label: string; className: string }[] = [
  { grade: "again", label: "Da rivedere", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
  { grade: "hard", label: "Difficile", className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400" },
  { grade: "good", label: "Bene", className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400" },
  { grade: "easy", label: "Facile", className: "bg-primary/10 text-primary hover:bg-primary/20" },
];

/**
 * Spaced-repetition review session. The due cards are snapshotted into a local
 * queue at mount so grading (which reschedules cards via SM-2) doesn't reshuffle
 * the deck mid-session; a "Da rivedere" card is re-queued to the end.
 */
export function ReviewDeck() {
  const due = useAtomValue(dueFlashcardsAtom);
  const review = useSetAtom(reviewFlashcardAtom);

  const [queue, setQueue] = useState<Flashcard[]>(() => due);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const card = queue[index];
  const done = index >= queue.length;

  function grade(g: Grade) {
    if (!card) return;
    review({ id: card.id, grade: g });
    setReviewed((r) => r + 1);
    if (g === "again") setQueue((q) => [...q, card]); // see it again this session
    setIndex((i) => i + 1);
    setFlipped(false);
  }

  if (queue.length === 0) {
    return (
      <EmptyState
        title="Nessuna carta da ripassare"
        subtitle="Genera flashcard da una nota con il pulsante “Genera flashcard”."
      />
    );
  }

  if (done) {
    return (
      <EmptyState
        icon
        title="Ripasso completato!"
        subtitle={`Hai ripassato ${reviewed} ${reviewed === 1 ? "carta" : "carte"}. A domani 👋`}
      />
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <span className="text-sm text-muted-foreground">
          {index + 1} / {queue.length}
        </span>
      </div>

      {/* Flip card */}
      <div className="[perspective:1200px]">
        <motion.button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4 }}
          className="relative h-80 w-full [transform-style:preserve-3d]"
          aria-label="Gira la carta"
        >
          <CardFace>
            <span className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Domanda
            </span>
            <MarkdownMessage content={card.question} />
            <span className="mt-4 text-xs text-muted-foreground">
              Tocca per vedere la risposta
            </span>
          </CardFace>
          <CardFace back>
            <span className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Risposta
            </span>
            <MarkdownMessage content={card.answer} />
          </CardFace>
        </motion.button>
      </div>

      {/* Controls */}
      <div className="mt-6">
        {flipped ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g.grade}
                onClick={() => grade(g.grade)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${g.className}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        ) : (
          <Button onClick={() => setFlipped(true)} className="w-full">
            Mostra risposta
          </Button>
        )}
      </div>
    </div>
  );
}

/** A single face of the flip card. `back` is pre-rotated 180°. */
function CardFace({
  children,
  back,
}: {
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center overflow-auto rounded-2xl border border-border bg-card p-8 text-center shadow-sm [backface-visibility:hidden] ${
        back ? "[transform:rotateY(180deg)]" : ""
      }`}
    >
      {children}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon?: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      {icon && <PartyPopper className="size-10 text-primary" />}
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/app">Torna alla dashboard</Link>
      </Button>
    </div>
  );
}
