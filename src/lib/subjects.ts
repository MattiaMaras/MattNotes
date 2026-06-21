/**
 * Subject (notebook) colour palette. Colours are stored on the notebook as a
 * raw value so they render identically in light and dark mode and don't depend
 * on Tailwind class generation. Each entry pairs a human label with an oklch
 * value chosen to stay legible as a small dot or a translucent accent.
 */
export interface SubjectColor {
  name: string;
  value: string;
}

export const SUBJECT_COLORS: SubjectColor[] = [
  { name: "Rosso", value: "oklch(0.637 0.208 25.3)" },
  { name: "Arancio", value: "oklch(0.705 0.191 47.6)" },
  { name: "Ambra", value: "oklch(0.769 0.166 70.7)" },
  { name: "Verde", value: "oklch(0.723 0.183 149.6)" },
  { name: "Teal", value: "oklch(0.704 0.122 182.5)" },
  { name: "Blu", value: "oklch(0.623 0.188 259.8)" },
  { name: "Indaco", value: "oklch(0.585 0.214 277.1)" },
  { name: "Viola", value: "oklch(0.606 0.25 292.7)" },
  { name: "Rosa", value: "oklch(0.656 0.241 354.3)" },
];

export const DEFAULT_SUBJECT_COLOR = SUBJECT_COLORS[5].value; // Blu

/** Deterministically pick a palette colour, cycling by index. */
export function colorForIndex(index: number): string {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length].value;
}
