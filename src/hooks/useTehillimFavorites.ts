"use client";

import { useCallback, useEffect, useState } from "react";

const FAVORITES_STORAGE_KEY = "limuda_psalms_favorites";

function readFavorites(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: number[]) {
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // localStorage unavailable (private browsing, disabled storage, etc.) — no-op
  }
}

/**
 * Manages the reader's favorited Tehillim chapters, persisted client-side in
 * localStorage under `limuda_psalms_favorites`. No account is required — this
 * is distinct from the Firestore-backed "עצרתי כאן" bookmark, which tracks a
 * single reading position per signed-in user.
 */
export function useTehillimFavorites() {
  // Server and first client render both start empty, so there's no hydration
  // mismatch; the effect below catches state up to localStorage once mounted.
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  const toggleFavorite = useCallback((psalmNumber: number) => {
    setFavorites((prev) => {
      const next = prev.includes(psalmNumber)
        ? prev.filter((n) => n !== psalmNumber)
        : [...prev, psalmNumber];
      writeFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (psalmNumber: number) => favorites.includes(psalmNumber),
    [favorites]
  );

  return { favorites, isFavorite, toggleFavorite };
}
