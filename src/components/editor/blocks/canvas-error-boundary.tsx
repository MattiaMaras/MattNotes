"use client";

import { unstable_catchError, type ErrorInfo } from "next/error";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Contains a crash to just this canvas block instead of the whole app going
 * blank (no boundary anywhere else caught it — a tldraw error during a long
 * drawing session used to take down the entire page). The last snapshot saved
 * before the crash is untouched (it lives in the BlockNote document, not in
 * the crashed component), so "Riprova" just remounts the canvas from it.
 */
function CanvasCrashFallback(_props: object, { unstable_retry }: ErrorInfo) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      <AlertTriangle className="size-5 text-amber-500" />
      <p>Il canvas ha avuto un problema. L&apos;ultimo disegno salvato è al sicuro.</p>
      <button
        onClick={() => unstable_retry()}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 transition-colors hover:bg-accent"
      >
        <RotateCcw className="size-3.5" />
        Riprova
      </button>
    </div>
  );
}

export const CanvasErrorBoundary = unstable_catchError(CanvasCrashFallback);
