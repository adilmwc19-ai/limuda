// Update-only service worker: no offline caching, exists solely so the app
// can detect a new deployment. Desktop clients get a toast with a manual
// "update now" (see PwaUpdatePrompt.tsx); mobile stays silent and simply
// picks up the new worker once no old tabs are left open. SW_VERSION is
// stamped in automatically by next.config.ts on every `next build` (see
// resolveBuildId there) — the browser diffs these file bytes to notice a
// new deploy, so do not hand-edit this value.
const SW_VERSION = "0589b2d-muwlyp18";

self.addEventListener("install", () => {
  // Stay in "waiting" until a client explicitly asks to activate (desktop's
  // update toast) or the browser activates it on its own once no old
  // clients remain (mobile's silent path) — never swap out a page a user
  // is actively reading mid-session.
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

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
