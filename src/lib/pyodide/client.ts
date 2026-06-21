/**
 * Main-thread client for the Pyodide Web Worker.
 *
 * A single worker is shared across every CodeBlock on the page (the runtime is
 * heavy — one instance is plenty and keeps imported packages warm). Runs are
 * serialised by `id` so concurrent "Esegui" clicks don't cross their output.
 */
"use client";

export interface RunResult {
  stdout: string;
  stderr: string;
  error: string | null;
}

type Phase = "idle" | "loading" | "ready";

let worker: Worker | null = null;
let phase: Phase = "idle";
let runId = 0;

const pending = new Map<number, (r: RunResult) => void>();
const phaseListeners = new Set<(p: Phase) => void>();

function notifyPhase(p: Phase) {
  phase = p;
  phaseListeners.forEach((fn) => fn(p));
}

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker("/pyodide-worker.js");
  worker.onmessage = (e: MessageEvent) => {
    const data = e.data as
      | { type: "loading" | "ready" }
      | ({ type: "result"; id: number } & RunResult);

    if (data.type === "loading") {
      notifyPhase("loading");
    } else if (data.type === "ready") {
      notifyPhase("ready");
    } else if (data.type === "result") {
      const resolve = pending.get(data.id);
      if (resolve) {
        pending.delete(data.id);
        resolve({ stdout: data.stdout, stderr: data.stderr, error: data.error });
      }
    }
  };
  return worker;
}

/** Current runtime phase (idle → loading → ready). */
export function getPhase(): Phase {
  return phase;
}

/** Subscribe to runtime phase changes; returns an unsubscribe function. */
export function onPhaseChange(fn: (p: Phase) => void): () => void {
  phaseListeners.add(fn);
  return () => phaseListeners.delete(fn);
}

/** Run a Python snippet. Loads Pyodide on first call (~once per session). */
export function runPython(code: string): Promise<RunResult> {
  const w = ensureWorker();
  const id = ++runId;
  return new Promise<RunResult>((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ type: "run", id, code });
  });
}
