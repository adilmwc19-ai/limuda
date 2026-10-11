"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

const DISMISS_KEY = "pwa-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private browsing / storage disabled — worst case the card can
    // reappear, which is no worse than not having the flag at all.
  }
}

function isStandaloneDisplay() {
  return typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
}

// Safari on iOS never fires beforeinstallprompt, so it needs its own
// share-sheet instructions instead of the native prompt() flow.
function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 0);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

export default function PwaInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setIsIos(isIosSafari());

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setStandalone(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || dismissed) return null;
  if (!deferredEvent && !isIos) return null;

  async function handleInstall() {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
  }

  function handleDismiss() {
    writeDismissed();
    setDismissed(true);
  }

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed bottom-6 left-6 z-40 flex w-[calc(100%-3rem)] max-w-sm items-center gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-right shadow-2xl backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
        <Download className="h-4.5 w-4.5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-200">התקינו את לימודא</p>
        {deferredEvent ? (
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">גישה מהירה ישירות ממסך הבית</p>
        ) : (
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            להתקנה: לחצו על כפתור השיתוף ובחרו &quot;הוסף למסך הבית&quot;
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {deferredEvent && (
          <button
            type="button"
            onClick={handleInstall}
            className="whitespace-nowrap rounded-lg bg-blue-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            התקנת האפליקציה
          </button>
        )}
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
