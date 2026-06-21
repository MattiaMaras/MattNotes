import type { Flashcard, Grade } from "@/lib/types";

/** SM-2 quality score (0–5) for each review grade. */
const QUALITY: Record<Grade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

/** SM-2 defaults for a freshly created card (due immediately). */
export function initialSchedule(): Pick<
  Flashcard,
  "repetitions" | "interval" | "easeFactor" | "dueAt"
> {
  return {
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    dueAt: new Date().toISOString(),
  };
}

/**
 * The SM-2 spaced-repetition algorithm. Given a card's current state and a
 * review grade, returns the updated scheduling fields. A failing grade
 * ("again", q < 3) resets the streak and re-queues the card within ~a minute;
 * passing grades grow the interval by the ease factor.
 */
export function applySm2(
  card: Pick<Flashcard, "repetitions" | "interval" | "easeFactor">,
  grade: Grade,
): Pick<Flashcard, "repetitions" | "interval" | "easeFactor" | "dueAt" | "updatedAt"> {
  const q = QUALITY[grade];
  let { repetitions, interval, easeFactor } = card;

  if (q < 3) {
    repetitions = 0;
    interval = 0;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }

  // Update the ease factor (clamped to a sane minimum).
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  const due = new Date();
  if (interval > 0) due.setDate(due.getDate() + interval);
  else due.setMinutes(due.getMinutes() + 1); // re-queue this session

  const nowIso = new Date().toISOString();
  return {
    repetitions,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    dueAt: due.toISOString(),
    updatedAt: nowIso,
  };
}
