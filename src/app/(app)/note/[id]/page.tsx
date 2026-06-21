import { NoteView } from "@/components/editor/note-view";

/**
 * Single-note route. In Next.js 16 `params` is a Promise and must be awaited
 * (synchronous access was removed). We await here in the Server Component and
 * hand the plain `id` to the client editor.
 */
export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NoteView noteId={id} />;
}
