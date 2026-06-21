"use client";

import { useMemo } from "react";
import { TldrawImage } from "tldraw";
import "tldraw/tldraw.css";
import { useTheme } from "@/components/providers/theme-provider";

/**
 * Read-only canvas rendering: `TldrawImage` paints just the drawing as a static
 * SVG — no toolbar, no menus, no grid. Used when the canvas block isn't being
 * edited (and it prints cleanly, unlike the live editor).
 */
export function CanvasPreview({ snapshot }: { snapshot: string }) {
  const { resolvedTheme } = useTheme();

  const parsed = useMemo(() => {
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  }, [snapshot]);

  if (!parsed) return null;

  return (
    <div className="flex h-full w-full items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full [&_svg]:object-contain">
      <TldrawImage
        snapshot={parsed}
        background={false}
        darkMode={resolvedTheme === "dark"}
        padding={16}
        // Never distort the drawing when the box aspect ratio differs.
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
}
