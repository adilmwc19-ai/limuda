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
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

// Neither iOS Safari nor other iOS browsers fire beforeinstallprompt, so
// iOS always needs its own share-sheet instructions.
function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setIsIos(isIosDevice());
    setIsAndroid(isAndroidDevice());

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

  // Guaranteed render: the card always shows unless the app is already
  // installed (standalone) or the user explicitly closed it. We never
  // bail out just because beforeinstallprompt never fired — plenty of
  // desktop/guest-profile/first-visit cases never get that event.
  if (standalone || dismissed) return null;

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

  const instructionText = deferredEvent
    ? "גישה מהירה ישירות ממסך הבית"
    : isIos
      ? 'להתקנה: לחצו על כפתור השיתוף (⎋) ובחרו "הוסף למסך הבית"'
      : isAndroid
        ? 'להתקנה: פתחו את תפריט הדפדפן (⋮) ובחרו "התקן אפליקציה"'
        : "להתקנה למחשב: לחצו על סמל ההתקנה (⊞) בשורת הכתובת של הדפדפן";

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed bottom-6 left-6 z-40 flex w-[calc(100%-3rem)] max-w-sm items-center gap-3 overflow-x-hidden rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-right shadow-2xl backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
        <Download className="h-4.5 w-4.5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-200">התקינו את לימודא</p>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          {instructionText}
        </p>
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
