"use client";

import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Brain } from "lucide-react";
import { dueFlashcardsAtom, flashcardsAtom } from "@/lib/store/atoms";

/**
 * Dashboard "Da ripassare oggi" surface. Hidden when there are no flashcards;
 * shows an all-caught-up note when there's nothing due.
 */
export function DueToday() {
  const router = useRouter();
  const due = useAtomValue(dueFlashcardsAtom);
  const total = useAtomValue(flashcardsAtom).length;

  if (total === 0) return null;

  const count = due.length;

  return (
    <button
      onClick={() => count > 0 && router.push("/review")}
      disabled={count === 0}
      className="mb-8 flex w-full items-center gap-4 rounded-xl border border-border p-5 text-left transition-colors enabled:hover:border-ring enabled:hover:bg-accent/30 disabled:cursor-default"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Brain className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Da ripassare oggi</p>
        <p className="text-sm text-muted-foreground">
          {count > 0
            ? `${count} ${count === 1 ? "carta" : "carte"} in attesa · ${total} totali`
            : `Tutto ripassato! ${total} carte in totale.`}
        </p>
      </div>
      {count > 0 && (
        <span className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Ripassa
        </span>
      )}
    </button>
  );
}
