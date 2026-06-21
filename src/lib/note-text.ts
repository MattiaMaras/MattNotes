import type { BlockNoteDocument } from "@/lib/types";

interface InlineContent {
  type?: string;
  text?: string;
}

interface BlockLike {
  type?: string;
  props?: { code?: string; language?: string };
  content?: InlineContent[] | unknown;
}

/**
 * Flattens a BlockNote document to plain text for use as AI context.
 * Text blocks contribute their inline text; LaTeX blocks contribute their
 * source wrapped in `$$`; code blocks contribute a fenced snippet; canvas
 * blocks are skipped (not textual).
 */
export function blocksToPlainText(doc: BlockNoteDocument | null): string {
  if (!doc) return "";
  const out: string[] = [];

  for (const raw of doc as BlockLike[]) {
    if (!raw || typeof raw !== "object") continue;

    if (raw.type === "latex" && raw.props?.code) {
      out.push(`$$${raw.props.code}$$`);
      continue;
    }
    if (raw.type === "codeCell" && raw.props?.code?.trim()) {
      out.push(`\`\`\`${raw.props.language ?? "python"}\n${raw.props.code}\n\`\`\``);
      continue;
    }
    if (Array.isArray(raw.content)) {
      const text = raw.content
        .map((c) => (typeof c?.text === "string" ? c.text : ""))
        .join("");
      if (text.trim()) out.push(text);
    }
  }

  return out.join("\n\n");
}
