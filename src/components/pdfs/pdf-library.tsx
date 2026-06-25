"use client";

import { useState } from "react";
import Link from "next/link";
import { useAtomValue, useSetAtom } from "jotai";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { FilePlus2, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePdfDocumentAtom, pdfDocumentsAtom } from "@/lib/store/atoms";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { deletePdfObject } from "@/lib/supabase/storage";
import { PdfUploadDialog } from "@/components/pdfs/pdf-upload-dialog";

/** "I tuoi PDF" library: upload, browse, delete. Cloud-only — a multi-MB
 *  binary can't reasonably live in localStorage, so this needs an account. */
export function PdfLibrary() {
  const docs = useAtomValue(pdfDocumentsAtom);
  const deletePdfDocument = useSetAtom(deletePdfDocumentAtom);
  const { isLoaded, isSignedIn } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSupabaseConfigured || !isSignedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">I tuoi PDF richiedono un account</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Accedi per caricare PDF e studiarli con note ed evidenziazioni
          sincronizzate.
        </p>
      </div>
    );
  }

  async function handleDelete(id: string, storagePath: string) {
    setDeletingId(id);
    try {
      await deletePdfObject(storagePath);
      deletePdfDocument(id);
      toast.success("PDF eliminato");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">I tuoi PDF</h1>
        <Button onClick={() => setUploadOpen(true)} className="gap-1.5">
          <FilePlus2 className="size-4" />
          Carica PDF
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <FileText className="size-8" />
          <p className="text-sm">Nessun PDF caricato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="group relative rounded-lg border border-border p-4 transition-colors hover:bg-accent/30"
            >
              <Link href={`/pdfs/${doc.id}`} className="flex flex-col gap-2">
                <FileText className="size-8 text-primary" />
                <span className="line-clamp-2 text-sm font-medium">
                  {doc.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {doc.pageCount ? `${doc.pageCount} pagine` : "—"}
                </span>
              </Link>
              <button
                onClick={() => handleDelete(doc.id, doc.storagePath)}
                disabled={deletingId === doc.id}
                aria-label="Elimina"
                className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-100"
              >
                {deletingId === doc.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <PdfUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
