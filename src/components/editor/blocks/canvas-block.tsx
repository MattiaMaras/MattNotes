"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createReactBlockSpec } from "@blocknote/react";
import { Check, Hand, Loader2, Pencil, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Tldraw is heavy (~canvas engine), so it's loaded only when a CanvasBlock
// actually renders, with a skeleton in the meantime.
const TldrawCanvas = dynamic(
  () => import("./tldraw-canvas").then((m) => m.TldrawCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
        <Skeleton className="absolute inset-0" />
        <span className="z-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Caricamento canvas…
        </span>
      </div>
    ),
  },
);

// Static read-only rendering of the drawing (no tldraw UI). Also lazy.
const CanvasPreview = dynamic(
  () => import("./canvas-preview").then((m) => m.CanvasPreview),
  { ssr: false },
);

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 900;

interface RenderProps {
  block: { id: string; props: { snapshot: string; height: number } };
  editor: {
    updateBlock: (
      block: { id: string },
      update: { props?: Partial<{ snapshot: string; height: number }> },
    ) => void;
  };
}

function CanvasComponent({ block, editor }: RenderProps) {
  // Idle by default: the canvas shows only the drawing (no menus). Clicking
  // "Modifica" mounts the full tldraw editor.
  const [editing, setEditing] = useState(false);
  const [height, setHeight] = useState(block.props.height || 360);
  const [palmRejection, setPalmRejection] = useState(true);
  const dragState = useRef<{ startY: number; startH: number } | null>(null);

  const hasDrawing = block.props.snapshot.trim().length > 0;

  const handleSnapshot = useCallback(
    (snapshot: string) => {
      editor.updateBlock({ id: block.id }, { props: { snapshot } });
    },
    [editor, block.id],
  );

  // Vertical resize handle (auto-resize is user-driven for an infinite canvas).
  function onResizePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startH: height };
  }
  function onResizePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const next = Math.min(
      MAX_HEIGHT,
      Math.max(MIN_HEIGHT, dragState.current.startH + (e.clientY - dragState.current.startY)),
    );
    setHeight(next);
  }
  function onResizePointerUp(e: React.PointerEvent) {
    if (!dragState.current) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragState.current = null;
    editor.updateBlock({ id: block.id }, { props: { height } });
  }

  // --- Read-only view ------------------------------------------------------
  if (!editing) {
    return (
      <div className="group relative my-2 w-full overflow-hidden rounded-xl border border-border print:break-inside-avoid">
        <div
          className="relative w-full cursor-pointer"
          style={{ height }}
          onDoubleClick={() => setEditing(true)}
        >
          {hasDrawing ? (
            <CanvasPreview snapshot={block.props.snapshot} />
          ) : (
            <button
              data-print-hide
              onClick={() => setEditing(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-accent/30"
            >
              <PenLine className="size-6" />
              <span className="text-sm">Canvas vuoto — clicca per disegnare</span>
            </button>
          )}

          {hasDrawing && (
            <button
              onClick={() => setEditing(true)}
              className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition-opacity hover:text-foreground group-hover:opacity-100 print:hidden"
            >
              <Pencil className="size-3" /> Modifica
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Editing view --------------------------------------------------------
  return (
    <div className="my-2 w-full overflow-hidden rounded-xl border border-ring print:break-inside-avoid">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
        <Pencil className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Canvas</span>
        <button
          onClick={() => setPalmRejection((p) => !p)}
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
            palmRejection
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent",
          )}
          title="Palm rejection: disegna solo con la Apple Pencil"
        >
          <Hand className="size-3" />
          Palm rejection {palmRejection ? "ON" : "OFF"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition-colors hover:bg-primary/80"
        >
          <Check className="size-3" /> Fatto
        </button>
      </div>

      {/* `relative` so the absolutely-positioned tldraw surface fills it. */}
      <div className="relative w-full" style={{ height }}>
        <TldrawCanvas
          initialSnapshot={block.props.snapshot}
          palmRejection={palmRejection}
          onSnapshot={handleSnapshot}
        />
      </div>

      <div
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        className="flex h-3 cursor-ns-resize items-center justify-center border-t border-border bg-muted/40 hover:bg-accent"
        aria-label="Ridimensiona canvas"
      >
        <div className="h-0.5 w-8 rounded-full bg-border" />
      </div>
    </div>
  );
}

/**
 * Custom BlockNote block embedding a tldraw canvas between paragraphs.
 * Idle, it shows only the drawing (read-only); clicking "Modifica" opens the
 * full editor. Snapshot JSON lives in `props.snapshot`; height in
 * `props.height`. Call the returned factory when building the schema.
 */
export const canvasBlock = createReactBlockSpec(
  {
    type: "canvas",
    propSchema: {
      snapshot: { default: "" },
      height: { default: 360 },
    },
    content: "none",
  },
  {
    render: CanvasComponent as never,
  },
);
