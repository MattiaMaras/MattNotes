"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Catches crashes inside the app shell's content area (dashboard, note view,
 * review). The sidebar/header stay up — only this segment is replaced — so a
 * bug in, say, the editor doesn't take the whole page down to blank white.
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="size-8 text-amber-500" />
      <p className="text-sm font-medium">Qualcosa è andato storto.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Le tue note sono salvate in locale e non sono andate perse. Riprova —
        se il problema persiste, ricarica la pagina.
      </p>
      <Button onClick={() => unstable_retry()} size="sm" className="gap-1.5">
        <RotateCcw className="size-3.5" />
        Riprova
      </Button>
    </div>
  );
}
