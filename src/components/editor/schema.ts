import { BlockNoteSchema, defaultBlockSpecs, defaultStyleSpecs } from "@blocknote/core";
import { latexBlock } from "@/components/editor/blocks/latex-block";
import { canvasBlock } from "@/components/editor/blocks/canvas-block";
import { codeBlock } from "@/components/editor/blocks/code-block";
import { fontFamilyStyle, fontSizeStyle } from "@/components/editor/styles/font-styles";

// Schema = default blocks + our custom LaTeX, Canvas and Code blocks, plus the
// default text styles (bold/italic/color/...) + our custom font family/size
// styles. The block factories are invoked here (the 0.51 `createReactBlockSpec`
// returns a factory). The built-in (non-runnable) `codeBlock` is dropped so our
// runnable Python cell is the only code option in the slash menu.
// Pulled into its own module (rather than living in block-note-editor.tsx) so
// the formatting toolbar's font selects can import it without a cycle.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { codeBlock: _builtinCodeBlock, ...baseBlockSpecs } = defaultBlockSpecs;

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...baseBlockSpecs,
    latex: latexBlock(),
    canvas: canvasBlock(),
    codeCell: codeBlock(),
  },
  styleSpecs: {
    ...defaultStyleSpecs,
    fontFamily: fontFamilyStyle,
    fontSize: fontSizeStyle,
  },
});

export type AppEditor = typeof schema.BlockNoteEditor;
