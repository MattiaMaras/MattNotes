"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createReactBlockSpec } from "@blocknote/react";
import { Loader2, Play, Trash2 } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { getPhase, onPhaseChange, runPython } from "@/lib/pyodide/client";

// Monaco owns the DOM and `window`; load it client-side only. The loader UI
// keeps the block at a stable height while the editor chunk arrives.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> Caricamento editor…
    </div>
  ),
});

interface RenderProps {
  block: { id: string; props: { code: string; language: string } };
  editor: {
    updateBlock: (
      block: { id: string },
      update: { props?: Partial<{ code: string; language: string }> },
    ) => void;
  };
}

const PLACEHOLDER = "# Scrivi Python e premi Esegui\nprint('Ciao, MattNotes!')\n";

function CodeComponent({ block, editor }: RenderProps) {
  const { resolvedTheme } = useTheme();
  const [code, setCode] = useState(block.props.code);
  const [running, setRunning] = useState(false);
  // `loading` tracks the one-time Pyodide WASM download (shared across blocks).
  const [loading, setLoading] = useState(getPhase() === "loading");
  const [result, setResult] = useState<{ stdout: string; stderr: string; error: string | null } | null>(
    null,
  );
  // Auto-grow the editor with its content (Monaco needs an explicit height).
  const [height, setHeight] = useState(160);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => onPhaseChange((p) => setLoading(p === "loading")), []);

  function commit(next: string) {
    setCode(next);
    editor.updateBlock({ id: block.id }, { props: { code: next } });
  }

  async function execute() {
    setRunning(true);
    setResult(null);
    try {
      const r = await runPython(codeRef.current || "");
      setResult(r);
    } catch (err) {
      setResult({
        stdout: "",
        stderr: "",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(false);
    }
  }

  const hasOutput =
    result !== null &&
    (result.stdout.trim() !== "" ||
      result.stderr.trim() !== "" ||
      result.error !== null);

  return (
    <div className="my-1 w-full overflow-hidden rounded-lg border border-border bg-muted/20 print:break-inside-avoid">
      {/* Header: language label + run button */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">Python</span>
        <div className="ml-auto flex items-center gap-1">
          {result && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setResult(null)}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              title="Pulisci output"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={execute}
            disabled={running || loading}
            className="h-7 gap-1.5 px-2 text-xs"
          >
            {running || loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            {loading ? "Avvio runtime…" : running ? "In esecuzione…" : "Esegui"}
          </Button>
        </div>
      </div>

      {/* Monaco editor */}
      <div className="bg-[var(--bn-colors-editor-background,transparent)]">
        <MonacoEditor
          language="python"
          value={code}
          onChange={(v) => commit(v ?? "")}
          theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          height={height}
          onMount={(monacoEditor) => {
            // Grow the block to fit its content (clamped), so it never scrolls
            // internally for short snippets nor grows unbounded for long ones.
            const update = () =>
              setHeight(
                Math.min(Math.max(monacoEditor.getContentHeight(), 80), 480),
              );
            monacoEditor.onDidContentSizeChange(update);
            update();
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            scrollbar: { alwaysConsumeMouseWheel: false },
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            tabSize: 4,
            placeholder: PLACEHOLDER,
          }}
        />
      </div>

      {/* Terminal output */}
      {hasOutput && (
        <div className="max-h-52 overflow-auto border-t border-border bg-background/60 px-3 py-2 font-mono text-xs">
          {result!.stdout && (
            <pre className="whitespace-pre-wrap text-foreground">
              {result!.stdout.replace(/\n$/, "")}
            </pre>
          )}
          {result!.stderr && (
            <pre className="whitespace-pre-wrap text-amber-600 dark:text-amber-400">
              {result!.stderr.replace(/\n$/, "")}
            </pre>
          )}
          {result!.error && (
            <pre className="whitespace-pre-wrap text-destructive">
              {result!.error}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Custom BlockNote block: a runnable Python cell. Source is stored in
 * `props.code`; execution happens in a shared Pyodide Web Worker. Call the
 * returned factory when building the schema: `codeBlock()`.
 */
export const codeBlock = createReactBlockSpec(
  {
    // Type is `codeCell`, not `code`: `code` collides with TipTap's built-in
    // inline `code` mark and corrupts the ProseMirror schema.
    type: "codeCell",
    propSchema: {
      code: { default: "" },
      language: { default: "python" },
    },
    content: "none",
  },
  {
    render: CodeComponent as never,
  },
);
