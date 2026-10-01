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
  }, []);

  return null;
}
