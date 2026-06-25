"use client";

import { useMemo } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { type PartialBlock } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
  type FormattingToolbarProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { FunctionSquare, PenLine, Terminal } from "lucide-react";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "katex/dist/katex.min.css";

import type { BlockNoteDocument } from "@/lib/types";
import { schema, type AppEditor } from "@/components/editor/schema";
import {
  FontFamilySelect,
  FontSizeSelect,
} from "@/components/editor/toolbar/font-toolbar-items";

/** Default toolbar (bold/italic/color/...) plus our font family/size selects.
 *  Only ever rendered while text is selected — never a standing control —
 *  and the selects are marked `data-print-hide` so they can't leak into a PDF
 *  export even if a selection happened to be live at click time. */
function CustomFormattingToolbar(props: FormattingToolbarProps) {
  return (
    <FormattingToolbar {...props}>
      {getFormattingToolbarItems()}
      <FontFamilySelect key="fontFamilySelect" />
      <FontSizeSelect key="fontSizeSelect" />
    </FormattingToolbar>
  );
}

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
      title: "Blocco di codice",
      subtext: "Evidenzia la sintassi; esecuzione Python via Pyodide",
      aliases: ["code", "codice", "python", "py", "esegui", "run", "javascript", "java", "c++"],
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
      formattingToolbar={false}
      onChange={() => onChange(editor.document as BlockNoteDocument)}
      className="min-h-full"
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={getSlashItems}
      />
      <FormattingToolbarController formattingToolbar={CustomFormattingToolbar} />
    </BlockNoteView>
  );
}
