"use client";

import type { WritableAtom, createStore } from "jotai";
import { getSupabase } from "@/lib/supabase/client";
import { flashcardsAtom, notebooksAtom, notesAtom } from "@/lib/store/atoms";

/**
 * Local-first sync engine.
 *
 * Notebooks, notes and flashcards are mirrored to a single `sync_items` table
 * as JSON blobs. Conflict resolution is last-write-wins on `updated_at`:
 *   - push: on every (debounced) local change, upsert rows whose version we
 *     haven't already synced, plus soft-delete rows that disappeared locally.
 *   - pull: on startup, fetch all rows and merge the newer side into the store.
 *   - realtime: a postgres_changes subscription applies remote edits live.
 *
 * A persisted `versions` map (id → last-synced updated_at) both decides what to
 * push and suppresses the echo of our own writes coming back over realtime, so
 * there's no feedback loop. Snapshots are intentionally local-only.
 */

type JotaiStore = ReturnType<typeof createStore>;
type Kind = "notebook" | "note" | "flashcard";

interface SyncRow {
  id: string;
  owner_id: string;
  kind: Kind;
  data: Record<string, unknown>;
  updated_at: string;
  deleted: boolean;
}

// Minimal shape the engine needs from every synced entity.
type Entity = { id: string; updatedAt: string };
type ArrAtom = WritableAtom<Entity[], [Entity[]], void>;

// The three synced collections, behind a common array-atom type.
const ATOMS: Record<Kind, ArrAtom> = {
  notebook: notebooksAtom as unknown as ArrAtom,
  note: notesAtom as unknown as ArrAtom,
  flashcard: flashcardsAtom as unknown as ArrAtom,
};

interface Versioned {
  v: string;
  kind: Kind;
  deleted?: boolean;
}

const VERSIONS_KEY = "mattnotes:sync-versions";

// Versions are scoped per owner: switching identity (sign in/out) uses a fresh
// map so all local items re-sync into the new owner's bucket.
function versionsKey(owner: string): string {
  return `${VERSIONS_KEY}:${owner}`;
}

function loadVersions(owner: string): Record<string, Versioned> {
  try {
    return JSON.parse(localStorage.getItem(versionsKey(owner)) || "{}");
  } catch {
    return {};
  }
}

function saveVersions(owner: string, v: Record<string, Versioned>) {
  localStorage.setItem(versionsKey(owner), JSON.stringify(v));
}

interface LocalItem {
  id: string;
  kind: Kind;
  updated_at: string;
  data: Record<string, unknown>;
}

/** Snapshot the three collections as flat sync items. `syncStatus` is stripped
 *  from notes — it's local UI state and shouldn't round-trip through the cloud. */
function localItems(store: JotaiStore): LocalItem[] {
  const out: LocalItem[] = [];
  for (const nb of store.get(notebooksAtom)) {
    out.push({
      id: nb.id,
      kind: "notebook",
      updated_at: nb.updatedAt,
      data: nb as unknown as Record<string, unknown>,
    });
  }
  for (const n of store.get(notesAtom)) {
    const data: Record<string, unknown> = { ...n };
    delete data.syncStatus; // local UI state; never round-trips through the cloud
    out.push({ id: n.id, kind: "note", updated_at: n.updatedAt, data });
  }
  for (const f of store.get(flashcardsAtom)) {
    out.push({
      id: f.id,
      kind: "flashcard",
      updated_at: f.updatedAt,
      data: f as unknown as Record<string, unknown>,
    });
  }
  return out;
}

let pushing = false;
let pushPending = false;

/** Upsert changed rows and soft-delete removed ones. Coalesces concurrent runs. */
async function pushChanges(store: JotaiStore, owner: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (pushing) {
    pushPending = true;
    return;
  }
  pushing = true;
  try {
    const versions = loadVersions(owner);
    const items = localItems(store);
    const present = new Set(items.map((i) => i.id));
    const rows: SyncRow[] = [];

    // Changed / new entities.
    for (const it of items) {
      const known = versions[it.id];
      if (!known || known.v !== it.updated_at || known.deleted) {
        rows.push({
          id: it.id,
          owner_id: owner,
          kind: it.kind,
          data: it.data,
          updated_at: it.updated_at,
          deleted: false,
        });
      }
    }

    // Entities we synced before that no longer exist locally → soft delete.
    const now = new Date().toISOString();
    for (const [id, known] of Object.entries(versions)) {
      if (!present.has(id) && !known.deleted) {
        rows.push({
          id,
          owner_id: owner,
          kind: known.kind,
          data: {},
          updated_at: now,
          deleted: true,
        });
      }
    }

    if (rows.length === 0) return;
    const { error } = await sb.from("sync_items").upsert(rows, { onConflict: "id" });
    if (error) return; // leave versions untouched so it retries later

    for (const r of rows) {
      versions[r.id] = { v: r.updated_at, kind: r.kind, deleted: r.deleted };
    }
    saveVersions(owner, versions);
    markNotesSynced(store, rows);
  } finally {
    pushing = false;
    if (pushPending) {
      pushPending = false;
      void pushChanges(store, owner);
    }
  }
}

/** Reflect a successful push in the note sidebar indicators (no `updatedAt`
 *  bump, so this doesn't trigger another push). */
function markNotesSynced(store: JotaiStore, rows: SyncRow[]) {
  const ids = new Set(
    rows.filter((r) => r.kind === "note" && !r.deleted).map((r) => r.id),
  );
  if (ids.size === 0) return;
  const notes = store.get(notesAtom);
  let changed = false;
  const next = notes.map((n) => {
    if (ids.has(n.id) && n.syncStatus !== "synced") {
      changed = true;
      return { ...n, syncStatus: "synced" as const };
    }
    return n;
  });
  if (changed) store.set(notesAtom, next);
}

/** Merge one remote row into the store using last-write-wins. */
function applyRemoteRow(store: JotaiStore, owner: string, row: SyncRow) {
  const versions = loadVersions(owner);
  const known = versions[row.id];
  // Our own echo or an already-applied change.
  if (known && known.v === row.updated_at && !!known.deleted === !!row.deleted) {
    return;
  }

  const atom = ATOMS[row.kind];
  if (!atom) return;
  const list = store.get(atom);
  const idx = list.findIndex((x) => x.id === row.id);
  const local = idx >= 0 ? list[idx] : null;

  if (row.deleted) {
    if (!local || local.updatedAt <= row.updated_at) {
      if (idx >= 0) store.set(atom, list.filter((x) => x.id !== row.id));
    } else {
      return; // local is newer — keep it; our next push will win
    }
  } else {
    if (local && local.updatedAt >= row.updated_at) return; // local newer/equal
    const incoming = (
      row.kind === "note" ? { ...row.data, syncStatus: "synced" } : row.data
    ) as unknown as Entity;
    store.set(
      atom,
      idx >= 0 ? list.map((x) => (x.id === row.id ? incoming : x)) : [...list, incoming],
    );
  }

  versions[row.id] = { v: row.updated_at, kind: row.kind, deleted: row.deleted };
  saveVersions(owner, versions);
}

/** Fetch every row for this owner and merge it in. */
async function pullAll(store: JotaiStore, owner: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("sync_items")
    .select("*")
    .eq("owner_id", owner);
  if (error || !data) return;
  for (const row of data as SyncRow[]) applyRemoteRow(store, owner, row);
}

/**
 * Start syncing: pull, then push local-newer, subscribe to local changes and to
 * realtime. Returns a cleanup function. No-op when Supabase isn't configured.
 */
export function startSync(
  store: JotaiStore,
  owner: string,
  opts: { onAfterPull?: () => void } = {},
): () => void {
  const sb = getSupabase();
  if (!sb || !owner) return () => {};

  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedulePush = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!disposed) void pushChanges(store, owner);
    }, 800);
  };

  const channel = sb
    .channel(`sync:${owner}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sync_items",
        filter: `owner_id=eq.${owner}`,
      },
      (payload) => {
        const row = payload.new as SyncRow | undefined;
        if (row && row.id) applyRemoteRow(store, owner, row);
      },
    )
    .subscribe();

  const unsubs = [notebooksAtom, notesAtom, flashcardsAtom].map((a) =>
    store.sub(a, schedulePush),
  );

  void (async () => {
    await pullAll(store, owner);
    if (disposed) return;
    // After the first pull the store reflects the account; let the caller seed a
    // welcome notebook if it's a brand-new (empty) account, then push.
    opts.onAfterPull?.();
    if (!disposed) await pushChanges(store, owner);
  })();

  return () => {
    disposed = true;
    if (timer) clearTimeout(timer);
    unsubs.forEach((u) => u());
    void sb.removeChannel(channel);
  };
}
