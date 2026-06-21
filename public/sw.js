/* eslint-disable */
/**
 * MattNotes service worker — offline support for a local-first app.
 *
 * The app's data already lives in localStorage, so making it work offline is
 * just a matter of caching the shell + built assets. Strategy:
 *   - navigations → network-first (fresh HTML when online), falling back to the
 *     cached page, then to the app shell ("/").
 *   - built assets (/_next/**, fonts, images) → stale-while-revalidate.
 *   - /api/** and cross-origin (Ollama, the Pyodide/Monaco CDNs) → never cached.
 *
 * Bump VERSION to invalidate old caches on the next activation.
 */
const VERSION = "v1";
const SHELL_CACHE = `mattnotes-shell-${VERSION}`;
const RUNTIME_CACHE = `mattnotes-runtime-${VERSION}`;
const PRECACHE = ["/", "/app", "/review", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Don't fail the whole install if one URL 404s.
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Leave cross-origin (CDNs, Ollama) and the API alone.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, falling back to cache then the app shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          // Offline: prefer the exact cached page, then the right app shell
          // (workspace routes fall back to /app, everything else to /).
          const isApp = /^\/(app|note|review)/.test(url.pathname);
          return (
            (await caches.match(req)) ||
            (await caches.match(isApp ? "/app" : "/")) ||
            (await caches.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Built assets: stale-while-revalidate.
  const isAsset =
    url.pathname.startsWith("/_next/") ||
    /\.(?:css|js|woff2?|ttf|otf|svg|png|jpe?g|gif|webp|ico)$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, res.clone()));
            }
            return res;
          })
          .catch(() => null);
        return cached || (await network) || fetch(req);
      })(),
    );
  }
});
