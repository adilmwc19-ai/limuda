"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

// Only re-check for updates this often when the tab regains focus, so
// switching tabs repeatedly doesn't flood the network with HEAD requests.
const VISIBILITY_CHECK_THROTTLE_MS = 5 * 60 * 1000;

// Matches Tailwind's `md` breakpoint. Desktop users tend to leave tabs open
// for days, so they get a toast with a manual reload; below this width the
// update just stays silent and takes effect on the browser's own schedule
// (the waiting worker activates once no old tabs are left open).
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

// Baked in at build time (see next.config.ts). Registering with it in the
// query string forces a distinct request per deploy, as a second line of
// defense alongside sw.js's own no-cache headers and its embedded SW_VERSION.
const SW_URL = `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`;

// iPadOS reports a Mac-like UA and a desktop-width viewport, so the media
// query alone can't tell an iPad from an actual desktop browser. A touch
// surface never belongs to a "real" desktop here, so it's excluded outright.
const isTouchDevice = () =>
  typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

// If controllerchange doesn't fire promptly after SKIP_WAITING (observed on
// iOS/iPadOS Safari), force the reload anyway rather than leaving the user
// stuck on the old page with a toast that silently did nothing.
const CONTROLLER_CHANGE_FALLBACK_MS = 500;

// Once the user has acted on the prompt (updated or closed it) this tab
// shouldn't ask again until it's closed — without this, a reload that lands
// on a worker which is still (briefly) non-current would otherwise re-show
// the same prompt in a loop.
const SESSION_SUPPRESS_KEY = "pwa-update-prompt-handled";

function readSuppressedFlag() {
  try {
    return sessionStorage.getItem(SESSION_SUPPRESS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSuppressedFlag() {
  try {
    sessionStorage.setItem(SESSION_SUPPRESS_KEY, "1");
  } catch {
    // Private browsing / storage disabled — worst case the prompt can
    // reappear, which is no worse than not having the flag at all.
  }
}

export default function PwaUpdatePrompt() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(readSuppressedFlag);
  const lastCheckRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (isTouchDevice()) {
      setIsDesktop(false);
      return;
    }
    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    setIsDesktop(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;

    function handleWaitingWorker(worker: ServiceWorker | null) {
      if (!cancelled && worker) setWaitingWorker(worker);
    }

    // A worker can sit in `reg.waiting` transiently while the browser is
    // mid-handoff, or if it already won control before we got here. Only
    // treat it as "an update is available" once there's an active
    // controller that is a genuinely different worker.
    function isGenuineUpdate(worker: ServiceWorker) {
      const controller = navigator.serviceWorker.controller;
      return !!controller && controller !== worker;
    }

    function trackInstallingWorker(worker: ServiceWorker) {
      worker.addEventListener("statechange", () => {
        // "installed" + an existing controller means this is an update to an
        // already-active app, not the very first install — that's the only
        // case worth prompting for.
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          handleWaitingWorker(worker);
        }
      });
    }

    navigator.serviceWorker
      .register(SW_URL)
      .then((reg) => {
        if (cancelled) return;
        registration = reg;

        if (reg.waiting && isGenuineUpdate(reg.waiting)) handleWaitingWorker(reg.waiting);

        reg.addEventListener("updatefound", () => {
          if (reg.installing) trackInstallingWorker(reg.installing);
        });
      })
      .catch(() => {
        // Registration failing shouldn't break the app — it just means no
        // update prompts, same as a browser without service worker support.
      });

    // Force an immediate update check against the server for every worker
    // already registered for this origin, so a client sitting on a stale
    // worker from before this check existed doesn't have to wait for the
    // next visibilitychange to notice a new deploy.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.update());
    });

    function handleControllerChange() {
      // Shared with the 500ms fallback timeout in handleUpdate() below —
      // whichever fires first wins, and the other becomes a no-op. Without
      // this guard a stray second firing (seen on iOS/iPadOS) would reload
      // the page twice, which is what produced the infinite prompt loop.
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible" || !registration) return;
      const now = Date.now();
      if (now - lastCheckRef.current < VISIBILITY_CHECK_THROTTLE_MS) return;
      lastCheckRef.current = now;
      registration.update().catch(() => {});
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // Mobile and touch devices (including iPad, which otherwise passes the
  // desktop media query) stay completely silent: the worker still updates
  // in the background, it just never surfaces a toast here.
  if (!isDesktop || !waitingWorker || dismissed) return null;

  function handleUpdate() {
    const worker = waitingWorker;
    // Hide the toast immediately so it can't reappear from stale state, and
    // remember that this tab already acted so a reload landing mid-handoff
    // doesn't re-show the same prompt.
    setWaitingWorker(null);
    writeSuppressedFlag();
    worker?.postMessage({ type: "SKIP_WAITING" });
    // Normally 'controllerchange' (registered above) drives the reload. If
    // it doesn't fire promptly — seen on iOS/iPadOS — force it anyway.
    window.setTimeout(() => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    }, CONTROLLER_CHANGE_FALLBACK_MS);
  }

  function handleDismiss() {
    writeSuppressedFlag();
    setDismissed(true);
  }

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed bottom-6 right-6 z-50 flex w-fit max-w-xs items-center gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-right shadow-2xl backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
        <RefreshCw className="h-4.5 w-4.5" aria-hidden="true" />
      </span>

      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">גרסה חדשה זמינה</span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleUpdate}
          className="whitespace-nowrap rounded-lg bg-blue-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
        >
          רענן כעת
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="סגור"
          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
