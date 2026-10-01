// Update-only service worker: no offline caching, exists solely so the app
// can detect a new deployment and prompt the user to reload into it.
// SW_VERSION is stamped in automatically by next.config.ts on every
// `next build` (see resolveBuildId there) — the browser diffs these file
// bytes to notice a new deploy, so do not hand-edit this value.
const SW_VERSION = "aebbf10-mupf3z8v";

self.addEventListener("install", () => {
  // Stay in "waiting" until the client explicitly asks to activate, so an
  // update never swaps out a page a user is actively reading mid-session.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
