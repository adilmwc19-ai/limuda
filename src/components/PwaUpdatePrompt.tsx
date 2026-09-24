"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

// Only re-check for updates this often when the tab regains focus, so
// switching tabs repeatedly doesn't flood the network with HEAD requests.
const VISIBILITY_CHECK_THROTTLE_MS = 5 * 60 * 1000;

export default function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;
    let refreshing = false;

    function handleWaitingWorker(worker: ServiceWorker | null) {
      if (!cancelled && worker) setWaitingWorker(worker);
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
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;
        registration = reg;

        if (reg.waiting) handleWaitingWorker(reg.waiting);

        reg.addEventListener("updatefound", () => {
          if (reg.installing) trackInstallingWorker(reg.installing);
        });
      })
      .catch(() => {
        // Registration failing shouldn't break the app — it just means no
        // update prompts, same as a browser without service worker support.
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

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
    };
  }, []);

  if (!waitingWorker || dismissed) return null;

  function handleUpdate() {
    setUpdating(true);
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed bottom-4 inset-x-4 z-50 mx-auto flex w-fit max-w-sm items-center gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-right shadow-2xl backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
        <RefreshCw className={`h-4.5 w-4.5 ${updating ? "animate-spin" : ""}`} aria-hidden="true" />
      </span>

      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">גרסה חדשה זמינה</span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={updating}
          className="whitespace-nowrap rounded-lg bg-blue-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-900 active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
        >
          {updating ? "מעדכן..." : "עדכן כעת"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          disabled={updating}
          aria-label="סגור"
          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 disabled:opacity-60 dark:hover:bg-stone-800 dark:hover:text-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
