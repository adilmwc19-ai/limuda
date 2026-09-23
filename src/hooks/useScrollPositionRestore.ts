"use client";

import { useCallback, useEffect, useRef } from "react";

const SCROLL_SAVE_DEBOUNCE_MS = 250;
// How long (and how often) to keep retrying a restore while the page's
// content is still growing to its final height (fonts swapping in,
// commentaries rendering, etc.) before we give up and clamp to whatever
// max scroll is currently available.
const RESTORE_RETRY_DELAY_MS = 50;
const RESTORE_MAX_ATTEMPTS = 40; // ~2s worst case
const RESTORE_TOLERANCE_PX = 2;

function buildScrollKey(trackId: string, itemId: string | number): string {
  return `limuda_scroll_${trackId}_${itemId}`;
}

function getMaxScrollY(): number {
  const doc = document.documentElement;
  return Math.max(0, doc.scrollHeight - window.innerHeight);
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
 *
 * Scrolling in every study page happens on `window` (the reading area has no
 * inner overflow container), so this hook always saves/restores
 * `window.scrollY`.
 */
export function useScrollPositionRestore({
  trackId,
  itemId,
  ready,
  skipRestore = false,
}: UseScrollPositionRestoreOptions) {
  const restoredKeyRef = useRef<string | null>(null);
  const key = itemId === null ? null : buildScrollKey(trackId, itemId);

  // Prevent the browser's own history scroll restoration from fighting our
  // manual restore (e.g. Next.js/browser snapping back to 0 or to a stale
  // position on back/forward navigation into this page).
  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  // Restore once the item's content has finished rendering. Content height
  // can still be growing at this point (web font swap, commentary blocks
  // mounting, etc.), so we retry until the page is tall enough to actually
  // hold the saved position, or we run out of attempts.
  useEffect(() => {
    if (!key || !ready) return;
    if (restoredKeyRef.current === key) return;
    restoredKeyRef.current = key;

    if (skipRestore) return;

    let saved: number | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        const y = Number(raw);
        if (Number.isFinite(y) && y > 0) saved = y;
      }
    } catch {
      // localStorage unavailable (private mode, disabled, quota, etc.)
    }

    if (saved === null) return;
    const target = saved;

    let cancelled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function attemptRestore() {
      if (cancelled) return;
      attempts += 1;
      const maxScrollY = getMaxScrollY();
      const tallEnough = maxScrollY >= target - RESTORE_TOLERANCE_PX;

      if (tallEnough || attempts >= RESTORE_MAX_ATTEMPTS) {
        const finalTarget = Math.min(target, maxScrollY);
        window.scrollTo({ top: finalTarget });
        return;
      }

      timeoutId = setTimeout(() => {
        requestAnimationFrame(attemptRestore);
      }, RESTORE_RETRY_DELAY_MS);
    }

    // Double rAF: let the initial commit paint before we start measuring.
    requestAnimationFrame(() => requestAnimationFrame(attemptRestore));

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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
