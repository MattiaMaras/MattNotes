/**
 * Domain model for MattNotes.
 *
 * The app is local-first: every entity lives in `localStorage` (via Jotai's
 * `atomWithStorage`) and is mirrored to Supabase in the background once the
 * sync layer is wired up. Keeping these types free of any editor/runtime
 * imports lets them be shared by server code (export, future API routes)
 * without dragging client-only dependencies into the bundle.
 */

/** Per-note synchronisation state surfaced in the sidebar. */
export type SyncStatus = "synced" | "syncing" | "offline" | "local";

/**
 * A BlockNote document is an array of blocks serialised to JSON. We keep it
 * opaque (`BlockNoteDocument`) here so this module never imports the editor.
 * The editor casts to its concrete `Block[]` / `PartialBlock[]` types.
 */
export type BlockNoteDocument = unknown[];

/**
 * A subject ("materia") in the sidebar tree — the folder that groups lessons.
 * Notebooks can still be nested via `parentId` for future sub-topics.
 */
export interface Notebook {
  id: string;
  name: string;
  /** Accent colour (raw oklch/hex value, see `lib/subjects`). */
  color: string;
  /** Optional emoji shown instead of the colour dot. */
  icon?: string;
  /** `null` for top-level notebooks. */
  parentId: string | null;
  /** Sort order among siblings. */
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** A single note (leaf in the tree). */
export interface Note {
  id: string;
  notebookId: string | null;
  title: string;
  /** BlockNote document JSON. `null` until first opened/edited. */
  content: BlockNoteDocument | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

/** Shape persisted to localStorage as a single blob. */
export interface WorkspaceState {
  notebooks: Notebook[];
  notes: Note[];
}

/** How a {@link NoteSnapshot} came to exist. */
export type SnapshotKind =
  /** User explicitly clicked "Salva versione". */
  | "manual"
  /** Throttled background snapshot taken while editing. */
  | "auto"
  /** Automatic backup taken right before a restore (so it's undoable). */
  | "restore";

/**
 * A point-in-time copy of a note's title + content. Snapshots are immutable and
 * local-first (persisted alongside notes); restoring one overwrites the live
 * note after first backing up its current state.
 */
export interface NoteSnapshot {
  id: string;
  noteId: string;
  title: string;
  content: BlockNoteDocument | null;
  kind: SnapshotKind;
  createdAt: string;
}

/** Review grade for spaced repetition (mapped to SM-2 quality scores). */
export type Grade = "again" | "hard" | "good" | "easy";

/** A spaced-repetition flashcard, generated from a note by the AI. */
export interface Flashcard {
  id: string;
  /** Source note / subject, for grouping and "review by subject" later. */
  noteId: string | null;
  notebookId: string | null;
  question: string;
  answer: string;
  // --- SM-2 state ---
  /** Consecutive correct recalls. */
  repetitions: number;
  /** Current inter-repetition interval, in days. */
  interval: number;
  /** Ease factor (>= 1.3), starts at 2.5. */
  easeFactor: number;
  /** When the card is next due (ISO). */
  dueAt: string;
  createdAt: string;
  updatedAt: string;
}
