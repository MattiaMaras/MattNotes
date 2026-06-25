"use client";

import { useActiveStyles, useBlockNoteEditor } from "@blocknote/react";
import { schema } from "@/components/editor/schema";

const FONT_FAMILIES = [
  { value: "", label: "Predefinito" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "Verdana, sans-serif", label: "Verdana" },
] as const;

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"] as const;

/** Word-style font family select. Lives only in the floating formatting
 *  toolbar (selection-triggered), never a standing toolbar control. */
export function FontFamilySelect() {
  const editor = useBlockNoteEditor(schema);
  const value = useActiveStyles(editor).fontFamily ?? "";

  function apply(next: string) {
    if (next) editor.addStyles({ fontFamily: next });
    else editor.removeStyles({ fontFamily: "" });
    editor.focus();
  }

  return (
    <select
      value={value}
      onChange={(e) => apply(e.target.value)}
      aria-label="Famiglia font"
      data-print-hide
      className="h-7 rounded-md border border-transparent bg-transparent px-1.5 text-xs outline-none transition-colors hover:border-border hover:bg-background focus:border-border"
    >
      {FONT_FAMILIES.map((f) => (
        <option key={f.label} value={f.value}>
          {f.label}
        </option>
      ))}
    </select>
  );
}

/** Word-style font size select (same lifecycle/safety notes as above). */
export function FontSizeSelect() {
  const editor = useBlockNoteEditor(schema);
  const value = useActiveStyles(editor).fontSize ?? "";

  function apply(next: string) {
    if (next) editor.addStyles({ fontSize: next });
    else editor.removeStyles({ fontSize: "" });
    editor.focus();
  }

  return (
    <select
      value={value}
      onChange={(e) => apply(e.target.value)}
      aria-label="Dimensione testo"
      data-print-hide
      className="h-7 w-16 rounded-md border border-transparent bg-transparent px-1.5 text-xs outline-none transition-colors hover:border-border hover:bg-background focus:border-border"
    >
      <option value="">--</option>
      {FONT_SIZES.map((s) => (
        <option key={s} value={s}>
          {s.replace("px", "")}
        </option>
      ))}
    </select>
  );
}
