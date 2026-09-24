// Update-only service worker: no offline caching, exists solely so the app
// can detect a new deployment and prompt the user to reload into it.
// Bump this on every deploy that should be treated as a new version — the
// browser diffs the file bytes, so any change here (including just this
// comment) is enough to trigger an update check.
const SW_VERSION = "1";

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
