import { PdfStudyView } from "@/components/pdfs/pdf-study-view";

/** Single-PDF route. Same async-params pattern as `note/[id]/page.tsx`. */
export default async function PdfPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PdfStudyView pdfId={id} />;
}
