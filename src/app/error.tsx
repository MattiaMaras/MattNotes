"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root-level fallback for routes outside the `(app)` group (landing page,
 * dashboard, onboarding, sign-in/up). Without this, an uncaught render error
 * anywhere unmounts the whole tree to a blank page — this is the only thing
 * standing between that and a recoverable error card.
 */
export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="size-8 text-amber-500" />
      <p className="text-sm font-medium">Qualcosa è andato storto.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Riprova — se il problema persiste, ricarica la pagina.
      </p>
      <Button onClick={() => unstable_retry()} size="sm" className="gap-1.5">
        <RotateCcw className="size-3.5" />
        Riprova
      </Button>
    </div>
  );
}
