// Update-only service worker: no offline caching, exists solely so the app
// always runs the latest deployed version. SW_VERSION is stamped in
// automatically by next.config.ts on every `next build` (see resolveBuildId
// there) — the browser diffs these file bytes to notice a new deploy, so do
// not hand-edit this value.
const SW_VERSION = "b60fec6-mupimrsf";

self.addEventListener("install", () => {
  // Activate the new worker immediately instead of waiting — the update is
  // downloaded silently in the background and takes effect on the user's
  // next visit, with no in-page prompt or forced reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // This worker never writes to the Cache API itself, but wipe any caches
  // left behind by an older installed worker (or anything else same-origin)
  // before taking over clients, so a stale entry can never shadow a fresh
  // network request.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
