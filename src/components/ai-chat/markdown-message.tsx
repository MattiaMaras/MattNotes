"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Renders an assistant reply as Markdown with GitHub-flavoured extensions and
 * KaTeX math ($...$ / $$...$$). Memoised so streaming only re-parses when the
 * text actually changes. Styling stays compact to fit the AI panel; `prose`
 * isn't available, so element styles are set inline via Tailwind classes.
 */
export const MarkdownMessage = memo(function MarkdownMessage({
  content,
}: {
  content: string;
}) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc [&_p]:my-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Inline vs block code: block gets a scrollable mono panel.
          code({ className, children, ...props }) {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <pre className="my-2 overflow-x-auto rounded-md bg-background p-3 text-xs">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code
                className="rounded bg-background px-1 py-0.5 font-mono text-[0.85em]"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="my-2 overflow-x-auto">
                <table className="w-full border-collapse text-xs">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-border px-2 py-1 text-left font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border border-border px-2 py-1">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
