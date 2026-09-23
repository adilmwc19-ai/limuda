"use client";

import { useCallback, useRef, type TouchEvent } from "react";

// Ignore touches starting this close to the screen edge — they're almost
// always the browser/OS back-navigation gesture, not a page-turn swipe.
const EDGE_DEADZONE_PX = 25;
const MIN_DISTANCE_X_PX = 60;
const MAX_DISTANCE_Y_PX = 50;
const MIN_DIRECTION_RATIO = 2; // |deltaX| must exceed |deltaY| by this factor
const MAX_DURATION_MS = 450;

interface UseSwipeNavigationOptions {
  /** Called when the reader swipes to advance (RTL: finger moves right → left). */
  onSwipeNext: () => void;
  /** Called when the reader swipes to go back (RTL: finger moves left → right). */
  onSwipePrev: () => void;
  /** Temporarily disable gesture handling, e.g. while a modal is open. */
  enabled?: boolean;
}

interface TouchStart {
  x: number;
  y: number;
  time: number;
}

/**
 * Detects deliberate horizontal swipe gestures for paging between
 * days/chapters on mobile, filtered aggressively to avoid false positives
 * from vertical scrolling, text selection, or the browser's edge-swipe
 * back gesture. Spread the returned handlers onto the touchable container.
 *
 * RTL layout: a swipe toward the left (finger moving right-to-left) means
 * "forward" (onSwipeNext); a swipe toward the right means "back" (onSwipePrev).
 */
export function useSwipeNavigation({
  onSwipeNext,
  onSwipePrev,
  enabled = true,
}: UseSwipeNavigationOptions) {
  const startRef = useRef<TouchStart | null>(null);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      startRef.current = null;
      if (!enabled || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const nearEdge =
        touch.clientX < EDGE_DEADZONE_PX ||
        touch.clientX > window.innerWidth - EDGE_DEADZONE_PX;
      if (nearEdge) return;

      startRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    },
    [enabled]
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      if (!enabled || !start) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const duration = Date.now() - start.time;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (duration > MAX_DURATION_MS) return;
      if (absX < MIN_DISTANCE_X_PX) return;
      if (absY > MAX_DISTANCE_Y_PX) return;
      if (absX <= absY * MIN_DIRECTION_RATIO) return;
      if (window.getSelection?.()?.toString().length) return;

      if (deltaX < 0) {
        onSwipeNext();
      } else {
        onSwipePrev();
      }
    },
    [enabled, onSwipeNext, onSwipePrev]
  );

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
