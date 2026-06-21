import { cn } from "@/lib/utils";

/**
 * A subject's visual marker: its emoji if set, otherwise a coloured dot.
 * Shared between the sidebar, breadcrumb and dashboard for consistency.
 */
export function SubjectGlyph({
  color,
  icon,
  className,
}: {
  color: string;
  icon?: string;
  className?: string;
}) {
  if (icon) {
    return (
      <span className={cn("inline-flex items-center justify-center leading-none", className)}>
        {icon}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{ backgroundColor: color }}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
    />
  );
}
