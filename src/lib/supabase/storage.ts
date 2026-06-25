"use client";

import { getSupabase } from "@/lib/supabase/client";

/** Private bucket created by `supabase/migrations/0003_pdf_storage.sql`. */
const BUCKET = "pdfs";

/** Storage object path for a PDF: `{ownerId}/{pdfId}.pdf`. RLS checks that
 *  the first path segment matches the caller's Clerk user id. */
export function pdfStoragePath(ownerId: string, pdfId: string): string {
  return `${ownerId}/${pdfId}.pdf`;
}

/** Upload a PDF binary to its storage path. Throws on failure (caller shows
 *  the error — there's nothing useful to do automatically). */
export async function uploadPdf(file: File, storagePath: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase non configurato.");
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
}

/** Short-lived signed URL for viewing — the bucket is private, so the
 *  viewer fetches a fresh one each time it opens a document. */
export async function getSignedPdfUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Delete the binary. Best-effort — if this fails the metadata record is
 *  still removed by the caller; an orphaned object isn't visible to anyone
 *  (RLS) and costs negligible storage. */
export async function deletePdfObject(storagePath: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.storage.from(BUCKET).remove([storagePath]);
}
