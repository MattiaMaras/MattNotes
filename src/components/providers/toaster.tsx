"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Toaster as Sonner } from "sonner";

/**
 * Sonner toaster wired to the active next-themes value so toasts match
 * light/dark mode. All non-blocking errors in the app surface through here.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "system"}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "bg-popover text-popover-foreground border-border shadow-lg backdrop-blur-md",
        },
      }}
    />
  );
}
