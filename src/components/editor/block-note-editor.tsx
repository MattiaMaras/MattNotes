"use client";

import { useMemo } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { FunctionSquare, PenLine, Terminal } from "lucide-react";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "katex/dist/katex.min.css";

import type { BlockNoteDocument } from "@/lib/types";
import { latexBlock } from "@/components/editor/blocks/latex-block";
import { canvasBlock } from "@/components/editor/blocks/canvas-block";
import { codeBlock } from "@/components/editor/blocks/code-block";

// Schema = default blocks + our custom LaTeX, Canvas and Code blocks. The block
// factories are invoked here (the 0.51 `createReactBlockSpec` returns a factory).
// The built-in (non-runnable) `codeBlock` is dropped so our runnable Python cell
// is the only code option in the slash menu.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { codeBlock: _builtinCodeBlock, ...baseBlockSpecs } = defaultBlockSpecs;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...baseBlockSpecs,
    latex: latexBlock(),
    canvas: canvasBlock(),
    codeCell: codeBlock(),
  },
});

type AppEditor = typeof schema.BlockNoteEditor;

/** Slash-menu entries for our custom blocks, merged with the defaults. */
function customSlashItems(editor: AppEditor): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Formula LaTeX",
      subtext: "Equazione con rendering KaTeX",
      aliases: ["latex", "math", "formula", "katex", "equazione"],
      group: "Avanzati",
      icon: <FunctionSquare className="size-4" />,
      onItemClick: () => {
        const current = editor.getTextCursorPosition().block;
        editor.insertBlocks([{ type: "latex" }], current, "after");
      },
    },
    {
      title: "Canvas",
      subtext: "Disegno a mano libera (Apple Pencil)",
      aliases: ["canvas", "draw", "disegno", "tldraw", "lavagna"],
      group: "Avanzati",
      icon: <PenLine className="size-4" />,
      onItemClick: () => {
        const current = editor.getTextCursorPosition().block;
        editor.insertBlocks([{ type: "canvas" }], current, "after");
      },
    },
    {
      title: "Codice Python",
      subtext: "Cella Python eseguibile (Pyodide)",
      aliases: ["code", "codice", "python", "py", "esegui", "run"],
      group: "Avanzati",
      icon: <Terminal className="size-4" />,
      onItemClick: () => {
        const current = editor.getTextCursorPosition().block;
        editor.insertBlocks([{ type: "codeCell" }], current, "after");
      },
    },
  ];
}

/**
 * The live BlockNote editor. Always rendered on the client (it owns its own
 * ProseMirror instance), so its parent loads it with `ssr: false`.
 */
export function BlockNoteEditor({
  initialContent,
  onChange,
}: {
  initialContent: BlockNoteDocument | null;
  onChange: (document: BlockNoteDocument) => void;
}) {
  const { resolvedTheme } = useTheme();

  // `useCreateBlockNote` memoises the editor for the component's lifetime; we
  // pass a stable initial document (the note is remounted by key when it
  // changes, see NoteView).
  const editor = useCreateBlockNote({
    schema,
    initialContent:
      (initialContent as PartialBlock[] | null)?.length
        ? (initialContent as PartialBlock[])
        : undefined,
  });

  // Merge default slash items with ours, memoised per editor instance.
  const getSlashItems = useMemo(
    () => async (query: string) =>
      filterSuggestionItems(
        [...getDefaultReactSlashMenuItems(editor), ...customSlashItems(editor)],
        query,
      ),
    [editor],
  );

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      slashMenu={false}
      onChange={() => onChange(editor.document as BlockNoteDocument)}
      className="min-h-full"
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={getSlashItems}
      />
    </BlockNoteView>
  );
}
