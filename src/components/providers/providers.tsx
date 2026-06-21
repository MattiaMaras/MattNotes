"use client";

import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/providers/toaster";
import { RegisterSW } from "@/components/pwa/register-sw";
import { SyncProvider } from "@/components/providers/sync-provider";

/**
 * Single client boundary that hosts every global provider. Rendered as deep as
 * possible (inside `<body>`, wrapping `{children}`) so the rest of the document
 * stays a Server Component, per the Next.js 16 guidance on context providers.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster />
        <RegisterSW />
        <SyncProvider />
      </ThemeProvider>
    </JotaiProvider>
  );
}
