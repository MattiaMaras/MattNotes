"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import katex from "katex";
import { createReactBlockSpec } from "@blocknote/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MathToolbar } from "@/components/editor/math-toolbar";

/** Renders LaTeX to HTML. KaTeX shows syntax errors inline in red rather than
 *  throwing, so a malformed formula never breaks the editor. */
function renderKatex(code: string, display: boolean): string {
  return katex.renderToString(code, {
    displayMode: display,
    throwOnError: false,
    errorColor: "var(--destructive)",
  });
}

interface RenderProps {
  block: { id: string; props: { code: string; display: boolean } };
  editor: {
    updateBlock: (
      block: { id: string },
      update: { props?: Partial<{ code: string; display: boolean }> },
    ) => void;
  };
}

function LatexComponent({ block, editor }: RenderProps) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(block.props.code);
  const [display, setDisplay] = useState(block.props.display);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Caret position to restore after a programmatic insertion.
  const pendingCaret = useRef<number | null>(null);

  // Keep local state in sync if the block is updated elsewhere.
  useEffect(() => {
    setCode(block.props.code);
    setDisplay(block.props.display);
  }, [block.props.code, block.props.display]);

  // Focus the textarea when entering edit mode.
  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  // Restore caret after an insertion (state update is async).
  useLayoutEffect(() => {
    if (pendingCaret.current !== null && textareaRef.current) {
      const pos = pendingCaret.current;
      textareaRef.current.setSelectionRange(pos, pos);
      pendingCaret.current = null;
    }
  });

  function commit(nextCode: string, nextDisplay: boolean) {
    editor.updateBlock(
      { id: block.id },
      { props: { code: nextCode, display: nextDisplay } },
    );
  }

  function handleChange(value: string) {
    setCode(value);
    commit(value, display);
  }

  function insert(text: string, caretOffset?: number) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? code.length;
    const end = el?.selectionEnd ?? code.length;
    const next = code.slice(0, start) + text + code.slice(end);
    pendingCaret.current = start + (caretOffset ?? text.length);
    setCode(next);
    commit(next, display);
    el?.focus();
  }

  function toggleDisplay() {
    const next = !display;
    setDisplay(next);
    commit(code, next);
  }

  if (editing) {
    return (
      <div className="my-1 w-full rounded-lg border border-ring bg-muted/30 p-2">
        <div className="mb-2 flex items-center gap-2">
          <MathToolbar onInsert={insert} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleDisplay}
            className="h-7 px-2 text-xs"
          >
            {display ? "Display ($$)" : "Inline ($)"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            className="ml-auto h-7 gap-1 px-2 text-xs"
          >
            <Check className="size-3.5" /> Fatto
          </Button>
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || (e.key === "Enter" && e.metaKey)) {
              e.preventDefault();
              setEditing(false);
            }
          }}
          rows={Math.max(2, code.split("\n").length)}
          spellCheck={false}
          placeholder="\int_0^\infty e^{-x}\,dx"
          className="w-full resize-y bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground"
        />
        {code.trim() && (
          <div
            className="mt-2 overflow-x-auto border-t border-border pt-2"
            dangerouslySetInnerHTML={{ __html: renderKatex(code, display) }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      className={cn(
        "my-1 cursor-text rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/30 print:break-inside-avoid",
        display ? "w-full text-center" : "inline-block text-left",
      )}
    >
      {code.trim() ? (
        <div
          className="overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: renderKatex(code, display) }}
        />
      ) : (
        <span className="text-sm text-muted-foreground">
          Doppio clic per scrivere una formula LaTeX
        </span>
      )}
    </div>
  );
}

/**
 * Custom BlockNote block for LaTeX. Source is stored in `props.code`; the live
 * preview is rendered with KaTeX. Call the returned factory when building the
 * schema: `latexBlock()`.
 */
export const latexBlock = createReactBlockSpec(
  {
    type: "latex",
    propSchema: {
      code: { default: "" },
      display: { default: true },
    },
    content: "none",
  },
  {
    // BlockNote's generics for custom blocks are looser than our local props
    // type; the cast keeps this component readable without fighting them.
    render: LatexComponent as never,
  },
);
