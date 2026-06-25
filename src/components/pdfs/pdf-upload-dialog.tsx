"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSetAtom } from "jotai";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPdfDocumentAtom } from "@/lib/store/atoms";
import { pdfStoragePath, uploadPdf } from "@/lib/supabase/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_BYTES = 50 * 1024 * 1024;

/** Upload a PDF: drag-drop or file picker, then straight into Storage and
 *  the viewer. Mirrors `subject-dialog.tsx`'s controlled-Dialog pattern. */
export function PdfUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { userId } = useAuth();
  const router = useRouter();
  const createPdfDocument = useSetAtom(createPdfDocumentAtom);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!userId) return;
    if (file.type !== "application/pdf") {
      toast.error("Seleziona un file PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Il file supera i 50MB.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Caricamento PDF…");
    try {
      // Generated upfront: the storage path needs the id before the metadata
      // record exists (see createPdfDocumentAtom's `id` override).
      const pdfId = crypto.randomUUID();
      const storagePath = pdfStoragePath(userId, pdfId);
      await uploadPdf(file, storagePath);
      const title = file.name.replace(/\.pdf$/i, "");
      const doc = createPdfDocument({ id: pdfId, title, storagePath });
      toast.success("PDF caricato", { id: toastId });
      onOpenChange(false);
      router.push(`/pdfs/${doc.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Caricamento non riuscito.",
        { id: toastId },
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica un PDF</DialogTitle>
          <DialogDescription>
            Massimo 50MB. Potrai sfogliarlo, evidenziarlo e prendere note a
            fianco.
          </DialogDescription>
        </DialogHeader>

        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-accent/30",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Caricamento…
            </>
          ) : (
            <>
              <FileUp className="size-5" />
              Trascina un PDF qui o clicca per scegliere
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
