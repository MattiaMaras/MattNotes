"use client";

import { useEffect, useRef } from "react";
import { useStore } from "jotai";
import { useAuth } from "@clerk/nextjs";
import { startSync } from "@/lib/sync/engine";
import { setSupabaseAccessToken } from "@/lib/supabase/client";
import { maybeSeedWelcome } from "@/lib/welcome";
import {
  flashcardsAtom,
  notebooksAtom,
  notesAtom,
  snapshotsAtom,
} from "@/lib/store/atoms";

// Which account the local cache currently belongs to. Used to wipe stale data
// when a different user signs in on the same browser (no cross-account leaks).
const CACHE_OWNER_KEY = "mattnotes:cache-owner";

/**
 * Account-based sync. The workspace requires sign-in, so the owner is always the
 * Clerk user id. On a different account (or first login on this device) the
 * local cache is cleared and refilled from the cloud; a brand-new account is
 * seeded with the welcome notebook after the first pull.
 */
export function SyncProvider() {
  const store = useStore();
  const { isLoaded, userId, getToken } = useAuth();

  // Held in a ref so the sync effect doesn't restart when `getToken`'s identity
  // changes between renders.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !userId) {
      setSupabaseAccessToken(null);
      return;
    }

    // Forward the Clerk session token to Supabase so RLS sees the user. Must be
    // set before startSync fires any requests.
    setSupabaseAccessToken(async () => (await getTokenRef.current()) ?? null);

    // Account switch / first login here → drop the previous account's cache so
    // the pull repopulates with the right user's data.
    if (localStorage.getItem(CACHE_OWNER_KEY) !== userId) {
      store.set(notebooksAtom, []);
      store.set(notesAtom, []);
      store.set(flashcardsAtom, []);
      store.set(snapshotsAtom, []);
      localStorage.setItem(CACHE_OWNER_KEY, userId);
    }

    return startSync(store, userId, {
      onAfterPull: () => maybeSeedWelcome(store),
    });
  }, [store, isLoaded, userId]);

  return null;
}
