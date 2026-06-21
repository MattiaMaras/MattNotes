"use client";

import { useState } from "react";
import { Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A symbol/structure to insert. `caret` is the offset (from the start of
 * `insert`) where the cursor should land after insertion — e.g. `\frac{}{}`
 * places the caret inside the first pair of braces.
 */
interface Symbol {
  label: string;
  insert: string;
  caret?: number;
}

type TabKey = "greek" | "operators" | "structures";

const GREEK: Symbol[] = [
  "\\alpha",
  "\\beta",
  "\\gamma",
  "\\delta",
  "\\epsilon",
  "\\zeta",
  "\\eta",
  "\\theta",
  "\\iota",
  "\\kappa",
  "\\lambda",
  "\\mu",
  "\\nu",
  "\\xi",
  "\\pi",
  "\\rho",
  "\\sigma",
  "\\tau",
  "\\phi",
  "\\chi",
  "\\psi",
  "\\omega",
].map((insert) => ({ label: insert.slice(1), insert: `${insert} ` }));

const OPERATORS: Symbol[] = [
  { label: "∫", insert: "\\int " },
  { label: "∑", insert: "\\sum " },
  { label: "∏", insert: "\\prod " },
  { label: "∂", insert: "\\partial " },
  { label: "∇", insert: "\\nabla " },
  { label: "∞", insert: "\\infty " },
  { label: "±", insert: "\\pm " },
  { label: "×", insert: "\\times " },
  { label: "÷", insert: "\\div " },
];

const STRUCTURES: Symbol[] = [
  { label: "frac", insert: "\\frac{}{}", caret: 6 },
  { label: "√", insert: "\\sqrt{}", caret: 6 },
  { label: "x^n", insert: "^{}", caret: 2 },
  { label: "x_n", insert: "_{}", caret: 2 },
  {
    label: "matrix",
    insert: "\\begin{matrix}\n a & b \\\\\n c & d\n\\end{matrix}",
  },
  {
    label: "bmatrix",
    insert: "\\begin{bmatrix}\n a & b \\\\\n c & d\n\\end{bmatrix}",
  },
  {
    label: "cases",
    insert: "\\begin{cases}\n a & x > 0 \\\\\n b & x \\le 0\n\\end{cases}",
  },
];

const TABS: { key: TabKey; label: string; items: Symbol[] }[] = [
  { key: "greek", label: "Greche", items: GREEK },
  { key: "operators", label: "Operatori", items: OPERATORS },
  { key: "structures", label: "Strutture", items: STRUCTURES },
];

/**
 * Floating math toolbar. Renders a popover with tabbed symbol palettes; each
 * click calls `onInsert` with the snippet and an optional caret offset so the
 * LaTeX block can place the cursor precisely.
 */
export function MathToolbar({
  onInsert,
}: {
  onInsert: (text: string, caretOffset?: number) => void;
}) {
  const [tab, setTab] = useState<TabKey>("greek");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Sigma className="size-3.5" />
          Simboli
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        // Keep focus in the textarea so insertion targets the right caret.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-72 p-2"
      >
        <div className="mb-2 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs transition-colors",
                tab === t.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {active.items.map((s) => (
            <button
              key={s.label}
              title={s.insert.trim()}
              onClick={() => onInsert(s.insert, s.caret)}
              className="flex h-8 items-center justify-center rounded-md font-mono text-sm transition-colors hover:bg-accent"
            >
              {s.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
