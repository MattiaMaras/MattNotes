"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (production only — a caching SW would serve stale
 * chunks and break HMR during `next dev`). Renders nothing.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Registration failures are non-fatal — the app works without offline.
      });
  }, []);

  return null;
}
