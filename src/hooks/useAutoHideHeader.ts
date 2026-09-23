"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks scroll direction to drive a "smart" auto-hide header: hides on
 * scroll down, reappears on scroll up or near the top. `threshold` filters
 * out tiny/jittery scroll deltas (e.g. rubber-banding, trackpad noise).
 */
export function useAutoHideHeader(threshold = 12) {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let ticking = false;

    function handleScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;

        if (currentY < 10) {
          setHidden(false);
        } else {
          const delta = currentY - lastScrollY.current;
          if (delta > threshold) setHidden(true);
          else if (delta < -threshold) setHidden(false);
        }

        lastScrollY.current = currentY;
        ticking = false;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return hidden;
}
