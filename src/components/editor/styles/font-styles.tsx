"use client";

import { createReactStyleSpec } from "@blocknote/react";

/**
 * Custom inline text styles (TipTap marks under the hood): font family and
 * size, Word-style. Applied via the formatting toolbar's selects (see
 * `font-toolbar-items.tsx`) — never a permanent control, only shown while
 * text is selected. The chosen styling is plain inline CSS on the wrapped
 * `<span>`, so it survives the PDF export clone (`buildPrintDocument`)
 * exactly like bold/italic/color already do.
 */
export const fontFamilyStyle = createReactStyleSpec(
  { type: "fontFamily", propSchema: "string" },
  {
    render: function FontFamilyMark({ value, contentRef }) {
      return <span ref={contentRef} style={{ fontFamily: value }} />;
    },
  },
);

export const fontSizeStyle = createReactStyleSpec(
  { type: "fontSize", propSchema: "string" },
  {
    render: function FontSizeMark({ value, contentRef }) {
      return <span ref={contentRef} style={{ fontSize: value }} />;
    },
  },
);
