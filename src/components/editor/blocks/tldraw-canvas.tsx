"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useTheme } from "@/components/providers/theme-provider";

/** Tools for which we enforce pen-only input (palm rejection). */
const DRAW_TOOLS = new Set(["draw", "highlight", "laser"]);

interface TldrawCanvasProps {
  /** Serialized tldraw snapshot (JSON string) or "" for a blank canvas. */
  initialSnapshot: string;
  /** When true, touch input is ignored while a drawing tool is active. */
  palmRejection: boolean;
  /** Called (debounced) with a fresh snapshot whenever the user edits. */
  onSnapshot: (snapshot: string) => void;
}

/**
 * Tldraw surface for a CanvasBlock. Loaded only on demand (see CanvasBlock).
 * Persistence: document-scoped, user-sourced store changes are debounced and
 * pushed back to the block as a JSON snapshot. Palm rejection is implemented at
 * the pointer-capture level so the Apple Pencil draws but a resting palm
 * (a `touch` pointer) doesn't.
 */
export function TldrawCanvas({
  initialSnapshot,
  palmRejection,
  onSnapshot,
}: TldrawCanvasProps) {
  const editorRef = useRef<Editor | null>(null);
  const { resolvedTheme } = useTheme();

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      if (initialSnapshot) {
        try {
          loadSnapshot(editor.store, JSON.parse(initialSnapshot));
        } catch {
          // Corrupt snapshot → start blank rather than crashing the editor.
        }
      }

      editor.user.updateUserPreferences({
        colorScheme: resolvedTheme === "dark" ? "dark" : "light",
      });
    },
    [initialSnapshot, resolvedTheme],
  );

  // Keep tldraw's color scheme in sync with the app theme.
  useEffect(() => {
    editorRef.current?.user.updateUserPreferences({
      colorScheme: resolvedTheme === "dark" ? "dark" : "light",
    });
  }, [resolvedTheme]);

  // Subscribe to document changes and persist a debounced snapshot.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = editor.store.listen(
      () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          onSnapshot(JSON.stringify(getSnapshot(editor.store)));
        }, 800);
      },
      { scope: "document", source: "user" },
    );
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
    // Re-bind if the editor instance changes (it won't after mount, but this
    // keeps the effect honest). `onSnapshot` is stable from the parent.
  }, [onSnapshot]);

  // Palm rejection: swallow touch input during drawing tools, in the capture
  // phase before tldraw sees it. Pen and mouse pass through untouched.
  const handlePointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      const editor = editorRef.current;
      if (!palmRejection || !editor) return;
      if (e.pointerType === "touch" && DRAW_TOOLS.has(editor.getCurrentToolId())) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [palmRejection],
  );

  return (
    <div
      className="absolute inset-0"
      onPointerDownCapture={handlePointerDownCapture}
    >
      <Tldraw onMount={handleMount} />
    </div>
  );
}
