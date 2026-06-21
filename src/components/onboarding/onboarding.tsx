"use client";

import { useState } from "react";
import { useAtom } from "jotai";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  NotebookPen,
  PenLine,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { onboardingDoneAtom } from "@/lib/store/atoms";

interface Slide {
  icon: React.ElementType;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: NotebookPen,
    title: "Benvenuto in MattNotes",
    body: "Appunti pensati per le materie STEM: testo, formule, disegni a mano e codice, tutto in un unico documento.",
  },
  {
    icon: Sparkles,
    title: "Scrivi con precisione",
    body: "Formule LaTeX con anteprima KaTeX in tempo reale e blocchi di testo ricchi. Digita «/» per inserire formule, canvas e altro.",
  },
  {
    icon: PenLine,
    title: "Disegna a mano libera",
    body: "Il canvas supporta Apple Pencil con palm rejection: schizzi, schemi e dimostrazioni accanto al testo. A riposo mostra solo il disegno.",
  },
  {
    icon: Terminal,
    title: "Esegui codice Python",
    body: "Le celle di codice girano direttamente nel browser con Pyodide. Premi «Esegui» e vedi subito output ed errori, senza configurare nulla.",
  },
  {
    icon: Brain,
    title: "AI locale e ripasso",
    body: "L'assistente (Ollama) spiega e genera flashcard con ripetizione spaziata. Tutto resta sul tuo dispositivo: nessun dato lascia il computer.",
  },
];

/**
 * First-run welcome carousel. Shown until completed/skipped (persisted via
 * `onboardingDoneAtom`), and re-openable from the command palette.
 */
export function Onboarding() {
  const [done, setDone] = useAtom(onboardingDoneAtom);
  const [index, setIndex] = useState(0);
  // Direction drives the slide animation (1 = forward, -1 = back).
  const [direction, setDirection] = useState(1);

  const open = !done;
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  function go(next: number) {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  }

  function finish() {
    setDone(true);
    // Reset so re-opening from the palette starts at the first slide.
    setIndex(0);
    setDirection(1);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && finish()}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden sm:max-w-md"
      >
        <DialogTitle className="sr-only">{slide.title}</DialogTitle>
        <DialogDescription className="sr-only">{slide.body}</DialogDescription>

        <div className="relative h-44 overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={index}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col items-center text-center"
            >
              <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-7" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight">
                {slide.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{slide.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Vai alla schermata ${i + 1}`}
              onClick={() => go(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          {index > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => go(index - 1)} className="gap-1.5">
              <ArrowLeft className="size-4" />
              Indietro
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={finish}>
              Salta
            </Button>
          )}

          {isLast ? (
            <Button size="sm" onClick={finish} className="gap-1.5">
              Inizia
            </Button>
          ) : (
            <Button size="sm" onClick={() => go(index + 1)} className="gap-1.5">
              Avanti
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
