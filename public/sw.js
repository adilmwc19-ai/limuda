// Update-only service worker: no offline caching, exists solely so the app
// always runs the latest deployed version. SW_VERSION is stamped in
// automatically by next.config.ts on every `next build` (see resolveBuildId
// there) — the browser diffs these file bytes to notice a new deploy, so do
// not hand-edit this value.
const SW_VERSION = "e6687d7-muphgcbz";

self.addEventListener("install", () => {
  // Activate the new worker immediately instead of waiting — the update is
  // downloaded silently in the background and takes effect on the user's
  // next visit, with no in-page prompt or forced reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
