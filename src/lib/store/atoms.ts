/**
 * Jotai store — the single source of truth for the workspace.
 *
 * Local-first: notebooks and notes are persisted to `localStorage` so the app
 * is fully usable offline. Write actions are exposed as write-only atoms so
 * components never mutate state directly; this keeps the optimistic-write /
 * background-sync seam in one place for when Supabase is wired in.
 */
"use client";

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type {
  Flashcard,
  Grade,
  Note,
  Notebook,
  NoteSnapshot,
  PdfDocument,
  PdfHighlight,
  SnapshotKind,
  SyncStatus,
} from "@/lib/types";
import { colorForIndex } from "@/lib/subjects";
import { applySm2, initialSchedule } from "@/lib/sm2";

// v2: the Notebook shape gained `color`/`icon`. Bumping the key reseeds rather
// than rendering pre-v2 notebooks that have no colour.
const STORAGE_KEY = "mattnotes:workspace:v2";

function now(): string {
  return new Date().toISOString();
}

/** `crypto.randomUUID` is available in every browser we target (Safari 16.4+). */
function uid(): string {
  return crypto.randomUUID();
}

// --- Base persisted atoms ---------------------------------------------------

// Local storage is a per-account CACHE (the app is account-based — see
// SyncProvider, which clears it on account switch). Defaults are empty: a brand
// new account is seeded with a single welcome notebook (see `lib/welcome.ts`),
// not sample data.
//
// `getOnInit: true` so the stored value is read synchronously on first render
// (the app is client-mount-gated). Without it, components that snapshot state in
// a `useState` initializer (e.g. the review deck) would see the default value.
export const notebooksAtom = atomWithStorage<Notebook[]>(
  `${STORAGE_KEY}:notebooks`,
  [],
  undefined,
  { getOnInit: true },
);

export const notesAtom = atomWithStorage<Note[]>(
  `${STORAGE_KEY}:notes`,
  [],
  undefined,
  { getOnInit: true },
);

export const flashcardsAtom = atomWithStorage<Flashcard[]>(
  `${STORAGE_KEY}:flashcards`,
  [],
  undefined,
  { getOnInit: true },
);

export const snapshotsAtom = atomWithStorage<NoteSnapshot[]>(
  `${STORAGE_KEY}:snapshots`,
  [],
  undefined,
  { getOnInit: true },
);

export const pdfDocumentsAtom = atomWithStorage<PdfDocument[]>(
  `${STORAGE_KEY}:pdfs`,
  [],
  undefined,
  { getOnInit: true },
);

// --- AI provider + model selection -----------------------------------------

/** Which AI backend to use. `gemini` is BYOK (the user's own free API key,
 *  called directly from the browser — see `lib/gemini.ts`) and is the
 *  default; `ollama` runs locally on the user's machine. */
export type AiProvider = "gemini" | "ollama";

export const aiProviderAtom = atomWithStorage<AiProvider>(
  "mattnotes:ai-provider",
  "gemini",
  undefined,
  { getOnInit: true },
);

/** Gemini models offered in the picker (free tier). */
export const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;

/** Selected Gemini model; persisted. */
export const geminiModelAtom = atomWithStorage<string>(
  "mattnotes:gemini-model",
  GEMINI_MODELS[0],
  undefined,
  { getOnInit: true },
);

/**
 * BYOK: the user's own Gemini API key, persisted in their browser only. Sent
 * directly from the browser to Google (`generativelanguage.googleapis.com`,
 * which allows CORS) — it never touches our server, so nobody shares anyone
 * else's quota. Get a free one at https://aistudio.google.com/apikey.
 */
export const geminiApiKeyAtom = atomWithStorage<string>(
  "mattnotes:gemini-api-key",
  "",
  undefined,
  { getOnInit: true },
);

/** Currently selected Ollama model; persisted so it's remembered. */
export const selectedModelAtom = atomWithStorage<string>(
  "mattnotes:ai-model",
  "",
  undefined,
  { getOnInit: true },
);

/** Live list of installed Ollama models (from `/api/tags`). Not persisted. */
export const ollamaModelsAtom = atom<string[]>([]);

/**
 * Ollama endpoint, configurable at runtime (persisted). Empty → use the default
 * (`NEXT_PUBLIC_OLLAMA_URL` or `http://localhost:11434`). On the public site,
 * the user pastes their HTTPS tunnel URL here so the browser can reach their
 * Ollama (a public page can't call `http://localhost`). See `lib/ollama.ts`.
 */
export const ollamaUrlAtom = atomWithStorage<string>(
  "mattnotes:ollama-url",
  "",
  undefined,
  { getOnInit: true },
);

// --- UI-only atoms (not persisted) -----------------------------------------

/** Zen mode hides the sidebar and AI panel (⌘⇧Z). */
export const zenModeAtom = atom(false);

/** Whether the ⌘K command palette is open. */
export const commandPaletteOpenAtom = atom(false);

/** Controls the create/edit-subject dialog. `editingId === null` ⇒ create. */
export const subjectDialogAtom = atom<{ open: boolean; editingId: string | null }>(
  { open: false, editingId: null },
);

/** Whether the user dismissed the "how to use the AI assistant" guide. */
export const aiGuideDismissedAtom = atomWithStorage<boolean>(
  "mattnotes:ai-guide-dismissed",
  false,
);

/**
 * Whether the first-run onboarding has been completed. `getOnInit` so returning
 * users don't see a flash of the welcome dialog before storage is read.
 */
export const onboardingDoneAtom = atomWithStorage<boolean>(
  "mattnotes:onboarding-done",
  false,
  undefined,
  { getOnInit: true },
);

// --- Derived selectors ------------------------------------------------------

/** Notes belonging to a notebook, sorted by `order`. */
export const notesByNotebookAtom = atom((get) => {
  const notes = get(notesAtom);
  return (notebookId: string | null) =>
    notes
      .filter((n) => n.notebookId === notebookId)
      .sort((a, b) => a.order - b.order);
});

// --- Write actions ----------------------------------------------------------

/** Create a subject (notebook) and return its id. */
export const createNotebookAtom = atom(
  null,
  (
    get,
    set,
    payload: { name?: string; color?: string; icon?: string } = {},
  ): string => {
    const ts = now();
    const notebooks = get(notebooksAtom);
    const notebook: Notebook = {
      id: uid(),
      name: payload.name?.trim() || "Nuova materia",
      color: payload.color ?? colorForIndex(notebooks.length),
      icon: payload.icon,
      parentId: null,
      order: notebooks.length,
      createdAt: ts,
      updatedAt: ts,
    };
    set(notebooksAtom, [...notebooks, notebook]);
    return notebook.id;
  },
);

/** Patch a subject (name / colour / icon). */
export const updateNotebookAtom = atom(
  null,
  (
    get,
    set,
    patch: { id: string; name?: string; color?: string; icon?: string },
  ): void => {
    set(
      notebooksAtom,
      get(notebooksAtom).map((nb) =>
        nb.id === patch.id
          ? {
              ...nb,
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.color !== undefined ? { color: patch.color } : {}),
              ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
              updatedAt: now(),
            }
          : nb,
      ),
    );
  },
);

/** Delete a subject and every lesson inside it (and their version history). */
export const deleteNotebookAtom = atom(null, (get, set, id: string): void => {
  const doomed = new Set(
    get(notesAtom)
      .filter((n) => n.notebookId === id)
      .map((n) => n.id),
  );
  set(
    notebooksAtom,
    get(notebooksAtom).filter((nb) => nb.id !== id),
  );
  set(
    notesAtom,
    get(notesAtom).filter((n) => n.notebookId !== id),
  );
  set(
    snapshotsAtom,
    get(snapshotsAtom).filter((s) => !doomed.has(s.noteId)),
  );
});

/** Reorder subjects from a fully-ordered list of ids (drag & drop). */
export const reorderNotebooksAtom = atom(
  null,
  (get, set, orderedIds: string[]): void => {
    const rank = new Map(orderedIds.map((id, i) => [id, i]));
    set(
      notebooksAtom,
      get(notebooksAtom).map((nb) =>
        rank.has(nb.id) ? { ...nb, order: rank.get(nb.id)!, updatedAt: now() } : nb,
      ),
    );
  },
);

/**
 * Apply a drag & drop arrangement of lessons: each entry sets a note's
 * containing subject and sort order. Only listed notes are touched; ones whose
 * subject actually changed are flipped back to `local` (pending sync).
 */
export const applyNotesOrderAtom = atom(
  null,
  (
    get,
    set,
    updates: { id: string; notebookId: string | null; order: number }[],
  ): void => {
    const byId = new Map(updates.map((u) => [u.id, u]));
    set(
      notesAtom,
      get(notesAtom).map((n) => {
        const u = byId.get(n.id);
        if (!u) return n;
        const moved = u.notebookId !== n.notebookId;
        return {
          ...n,
          notebookId: u.notebookId,
          order: u.order,
          ...(moved
            ? { updatedAt: now(), syncStatus: "local" as SyncStatus }
            : {}),
        };
      }),
    );
  },
);

/** Move a lesson to another subject (appended at the end of the target). */
export const moveNoteAtom = atom(
  null,
  (get, set, payload: { id: string; notebookId: string | null }): void => {
    const notes = get(notesAtom);
    const target = notes.filter((n) => n.notebookId === payload.notebookId);
    set(
      notesAtom,
      notes.map((n) =>
        n.id === payload.id
          ? {
              ...n,
              notebookId: payload.notebookId,
              order: target.length,
              updatedAt: now(),
              syncStatus: "local" as SyncStatus,
            }
          : n,
      ),
    );
  },
);

/** Create a note (optionally inside a notebook) and return its id. */
export const createNoteAtom = atom(
  null,
  (get, set, notebookId: string | null = null): string => {
    const ts = now();
    const notes = get(notesAtom);
    const siblings = notes.filter((n) => n.notebookId === notebookId);
    const note: Note = {
      id: uid(),
      notebookId,
      title: "Senza titolo",
      content: null,
      order: siblings.length,
      createdAt: ts,
      updatedAt: ts,
      syncStatus: "local",
    };
    set(notesAtom, [...notes, note]);
    return note.id;
  },
);

/** Patch a note. Bumps `updatedAt` and flips status to `local` (pending sync). */
export const updateNoteAtom = atom(
  null,
  (
    get,
    set,
    patch: Partial<Omit<Note, "id">> & { id: string },
  ): void => {
    const notes = get(notesAtom);
    set(
      notesAtom,
      notes.map((n) =>
        n.id === patch.id
          ? { ...n, ...patch, updatedAt: now(), syncStatus: "local" as SyncStatus }
          : n,
      ),
    );
  },
);

/** Duplicate a note in place. */
export const duplicateNoteAtom = atom(
  null,
  (get, set, id: string): string | null => {
    const notes = get(notesAtom);
    const source = notes.find((n) => n.id === id);
    if (!source) return null;
    const ts = now();
    const copy: Note = {
      ...source,
      id: uid(),
      title: `${source.title} (copia)`,
      order: source.order + 1,
      createdAt: ts,
      updatedAt: ts,
      syncStatus: "local",
    };
    set(notesAtom, [...notes, copy]);
    return copy.id;
  },
);

/** Delete a note and its version history. */
export const deleteNoteAtom = atom(null, (get, set, id: string): void => {
  set(
    notesAtom,
    get(notesAtom).filter((n) => n.id !== id),
  );
  set(
    snapshotsAtom,
    get(snapshotsAtom).filter((s) => s.noteId !== id),
  );
});

// --- Flashcards -------------------------------------------------------------

/** Bulk-create flashcards (from AI generation) with fresh SM-2 state. */
export const createFlashcardsAtom = atom(
  null,
  (
    get,
    set,
    payload: {
      noteId: string | null;
      notebookId: string | null;
      cards: { question: string; answer: string }[];
    },
  ): number => {
    const ts = now();
    const created: Flashcard[] = payload.cards.map((c) => ({
      id: uid(),
      noteId: payload.noteId,
      notebookId: payload.notebookId,
      question: c.question.trim(),
      answer: c.answer.trim(),
      ...initialSchedule(),
      createdAt: ts,
      updatedAt: ts,
    }));
    set(flashcardsAtom, [...get(flashcardsAtom), ...created]);
    return created.length;
  },
);

/** Apply a review grade to a card (updates SM-2 schedule). */
export const reviewFlashcardAtom = atom(
  null,
  (get, set, payload: { id: string; grade: Grade }): void => {
    set(
      flashcardsAtom,
      get(flashcardsAtom).map((c) =>
        c.id === payload.id ? { ...c, ...applySm2(c, payload.grade) } : c,
      ),
    );
  },
);

/** Delete a flashcard. */
export const deleteFlashcardAtom = atom(null, (get, set, id: string): void => {
  set(
    flashcardsAtom,
    get(flashcardsAtom).filter((c) => c.id !== id),
  );
});

/** Cards due for review now (dueAt <= now), oldest-due first. */
export const dueFlashcardsAtom = atom((get) => {
  const nowMs = Date.now();
  return get(flashcardsAtom)
    .filter((c) => new Date(c.dueAt).getTime() <= nowMs)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
});

// --- PDF documents -----------------------------------------------------------

/** Create a PDF document record + its companion side-notes note (a normal,
 *  top-level Note — gives the side panel the full BlockNote editor for free).
 *  The caller is expected to have already uploaded the binary to Storage. */
export const createPdfDocumentAtom = atom(
  null,
  (get, set, payload: { title: string; storagePath: string }): PdfDocument => {
    const ts = now();
    const noteId = set(createNoteAtom, null);
    const doc: PdfDocument = {
      id: uid(),
      title: payload.title,
      storagePath: payload.storagePath,
      pageCount: null,
      noteId,
      highlights: [],
      createdAt: ts,
      updatedAt: ts,
    };
    set(pdfDocumentsAtom, [...get(pdfDocumentsAtom), doc]);
    return doc;
  },
);

/** Patch a PDF document (title, or page count once react-pdf reports it). */
export const updatePdfDocumentAtom = atom(
  null,
  (get, set, patch: Partial<Omit<PdfDocument, "id">> & { id: string }): void => {
    set(
      pdfDocumentsAtom,
      get(pdfDocumentsAtom).map((d) =>
        d.id === patch.id ? { ...d, ...patch, updatedAt: now() } : d,
      ),
    );
  },
);

/** Add a highlight (selection rects already normalized 0–1 by the caller). */
export const addPdfHighlightAtom = atom(
  null,
  (
    get,
    set,
    payload: { pdfId: string; page: number; color: string; rects: PdfHighlight["rects"] },
  ): void => {
    const highlight: PdfHighlight = {
      id: uid(),
      page: payload.page,
      color: payload.color,
      rects: payload.rects,
      createdAt: now(),
    };
    set(
      pdfDocumentsAtom,
      get(pdfDocumentsAtom).map((d) =>
        d.id === payload.pdfId
          ? { ...d, highlights: [...d.highlights, highlight], updatedAt: now() }
          : d,
      ),
    );
  },
);

/** Remove a highlight. */
export const removePdfHighlightAtom = atom(
  null,
  (get, set, payload: { pdfId: string; highlightId: string }): void => {
    set(
      pdfDocumentsAtom,
      get(pdfDocumentsAtom).map((d) =>
        d.id === payload.pdfId
          ? {
              ...d,
              highlights: d.highlights.filter((h) => h.id !== payload.highlightId),
              updatedAt: now(),
            }
          : d,
      ),
    );
  },
);

/** Delete a PDF document record and its companion note (local state only —
 *  the caller removes the Storage binary first, see `lib/supabase/storage.ts`,
 *  since that's a network call and atoms here stay network-free). */
export const deletePdfDocumentAtom = atom(null, (get, set, id: string): void => {
  const doc = get(pdfDocumentsAtom).find((d) => d.id === id);
  if (!doc) return;
  set(deleteNoteAtom, doc.noteId);
  set(
    pdfDocumentsAtom,
    get(pdfDocumentsAtom).filter((d) => d.id !== id),
  );
});

// --- Version history (snapshots) -------------------------------------------

/** Most snapshots kept per note; the oldest auto-snapshots are pruned first so
 *  manual/restore versions survive. */
const MAX_SNAPSHOTS_PER_NOTE = 40;
/** Minimum gap between automatic snapshots of the same note. */
const AUTO_SNAPSHOT_INTERVAL_MS = 3 * 60 * 1000;

/** Snapshots of a note, newest first. */
export const snapshotsForNoteAtom = atom((get) => {
  const snapshots = get(snapshotsAtom);
  return (noteId: string) =>
    snapshots
      .filter((s) => s.noteId === noteId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

/** Prune a note's snapshots to the cap, evicting oldest auto-snapshots first
 *  (then oldest of any kind) so explicit/manual versions are kept longest. */
function prune(snapshots: NoteSnapshot[], noteId: string): NoteSnapshot[] {
  const mine = snapshots.filter((s) => s.noteId === noteId);
  const excess = mine.length - MAX_SNAPSHOTS_PER_NOTE;
  if (excess <= 0) return snapshots;

  const others = snapshots.filter((s) => s.noteId !== noteId);
  const oldestFirst = [...mine].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  // Eviction priority: oldest autos, then oldest of any other kind.
  const evictionOrder = [
    ...oldestFirst.filter((s) => s.kind === "auto"),
    ...oldestFirst.filter((s) => s.kind !== "auto"),
  ];
  const evicted = new Set(evictionOrder.slice(0, excess));
  return [...others, ...mine.filter((s) => !evicted.has(s))];
}

function snapshotOf(note: Note, kind: SnapshotKind): NoteSnapshot {
  return {
    id: uid(),
    noteId: note.id,
    title: note.title,
    content: note.content,
    kind,
    createdAt: now(),
  };
}

/** Capture the current state of a note as a snapshot. Returns its id (or null
 *  if the note no longer exists). */
export const createSnapshotAtom = atom(
  null,
  (get, set, payload: { noteId: string; kind?: SnapshotKind }): string | null => {
    const note = get(notesAtom).find((n) => n.id === payload.noteId);
    if (!note) return null;
    const snap = snapshotOf(note, payload.kind ?? "manual");
    set(snapshotsAtom, prune([...get(snapshotsAtom), snap], note.id));
    return snap.id;
  },
);

/**
 * Take an automatic snapshot, but only if enough time has passed since the last
 * snapshot of this note and the content actually changed. Returns the new
 * snapshot id, or null when skipped. Cheap to call on every (debounced) edit.
 */
export const maybeAutoSnapshotAtom = atom(
  null,
  (get, set, noteId: string): string | null => {
    const note = get(notesAtom).find((n) => n.id === noteId);
    if (!note) return null;

    const mine = get(snapshotsAtom)
      .filter((s) => s.noteId === noteId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = mine[0];

    if (latest) {
      const since = Date.now() - new Date(latest.createdAt).getTime();
      if (since < AUTO_SNAPSHOT_INTERVAL_MS) return null;
      // Skip if nothing changed since the last snapshot.
      if (
        latest.title === note.title &&
        JSON.stringify(latest.content) === JSON.stringify(note.content)
      ) {
        return null;
      }
    } else if (note.content == null) {
      // Don't start the history with an empty baseline.
      return null;
    }

    const snap = snapshotOf(note, "auto");
    set(snapshotsAtom, prune([...get(snapshotsAtom), snap], noteId));
    return snap.id;
  },
);

/**
 * Restore a note to a snapshot. The note's current state is first captured as a
 * `restore` snapshot so the operation can be undone from the history.
 */
export const restoreSnapshotAtom = atom(
  null,
  (get, set, snapshotId: string): boolean => {
    const snap = get(snapshotsAtom).find((s) => s.id === snapshotId);
    if (!snap) return false;
    const note = get(notesAtom).find((n) => n.id === snap.noteId);
    if (!note) return false;

    // Back up the live state first (so restore is reversible).
    const backup = snapshotOf(note, "restore");

    set(
      notesAtom,
      get(notesAtom).map((n) =>
        n.id === note.id
          ? {
              ...n,
              title: snap.title,
              content: snap.content,
              updatedAt: now(),
              syncStatus: "local" as SyncStatus,
            }
          : n,
      ),
    );
    set(snapshotsAtom, prune([...get(snapshotsAtom), backup], note.id));
    return true;
  },
);

/** Delete a single snapshot. */
export const deleteSnapshotAtom = atom(null, (get, set, id: string): void => {
  set(
    snapshotsAtom,
    get(snapshotsAtom).filter((s) => s.id !== id),
  );
});
