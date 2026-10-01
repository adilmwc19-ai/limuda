"use client";

import { useEffect } from "react";

// Baked in at build time (see next.config.ts). Registering with it in the
// query string forces a distinct request per deploy, as a second line of
// defense alongside sw.js's own no-cache headers and its embedded SW_VERSION.
const SW_URL = `/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`;

export default function PwaUpdatePrompt() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register(SW_URL).catch(() => {
      // Registration failing shouldn't break the app — the next visit will
      // simply keep using whatever version is already running.
    });

    // Foregrounding the app (coming back from the background/another tab)
    // doesn't otherwise trigger a fetch of sw.js, so without this a user who
    // keeps the PWA open for days never sees registration.update() run.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return null;
}
