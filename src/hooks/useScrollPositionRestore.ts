"use client";

import { useCallback, useEffect, useRef } from "react";

const SCROLL_SAVE_DEBOUNCE_MS = 250;

function buildScrollKey(trackId: string, itemId: string | number): string {
  return `limuda_scroll_${trackId}_${itemId}`;
}

interface UseScrollPositionRestoreOptions {
  /** Study track identifier, e.g. "tanakh", "talmud", "mishnah". */
  trackId: string;
  /** Identifier of the day/chapter/item currently being viewed, or null while it's still unknown. */
  itemId: string | number | null;
  /** Whether this item's content has finished loading and is in the DOM. */
  ready: boolean;
  /**
   * Skip the automatic restore for the current item (e.g. an explicit
   * "עצרתי כאן" bookmark is about to scroll to its own position and should
   * take priority over the passive scroll memory).
   */
  skipRestore?: boolean;
}

/**
 * Silently remembers how far the reader scrolled into a study item (keyed by
 * trackId + itemId in localStorage) and restores it once that item's content
 * is ready, so the reader lands back exactly where they stopped reading.
 */
export function useScrollPositionRestore({
  trackId,
  itemId,
  ready,
  skipRestore = false,
}: UseScrollPositionRestoreOptions) {
  const restoredKeyRef = useRef<string | null>(null);
  const key = itemId === null ? null : buildScrollKey(trackId, itemId);

  // Restore once the item's content has finished rendering.
  useEffect(() => {
    if (!key || !ready) return;
    if (restoredKeyRef.current === key) return;
    restoredKeyRef.current = key;
    if (skipRestore) return;

    try {
      const saved = window.localStorage.getItem(key);
      if (saved === null) return;
      const y = Number(saved);
      if (!Number.isFinite(y) || y <= 0) return;
      requestAnimationFrame(() => window.scrollTo({ top: y }));
    } catch {
      // localStorage unavailable (private mode, disabled, quota, etc.)
    }
  }, [key, ready, skipRestore]);

  // Save scroll position as the reader scrolls, lightly debounced.
  useEffect(() => {
    if (!key) return;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function handleScroll() {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          window.localStorage.setItem(key as string, String(window.scrollY));
        } catch {
          // ignore
        }
      }, SCROLL_SAVE_DEBOUNCE_MS);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [key]);

  const resetScroll = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (key) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
      }
      window.scrollTo({ top: 0, behavior });
    },
    [key]
  );

  return { resetScroll };
}
