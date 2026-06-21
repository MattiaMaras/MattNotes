"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the Supabase env vars are present; the app stays fully local-first
 *  (no network) when they're not. */
export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

// Supplies the current user's auth token (Clerk session JWT) for every request.
// Set by SyncProvider once Clerk is ready; returns null when signed out, so
// requests fall back to the anon role (which RLS denies on `sync_items`).
let tokenProvider: (() => Promise<string | null>) | null = null;

export function setSupabaseAccessToken(
  fn: (() => Promise<string | null>) | null,
): void {
  tokenProvider = fn;
}

/** Lazily-created singleton Supabase client (or null when not configured).
 *  `accessToken` forwards the Clerk session token so Supabase RLS sees the user
 *  (`auth.jwt()->>'sub'`). */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      accessToken: async () => (tokenProvider ? await tokenProvider() : null),
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
