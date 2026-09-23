// Daily study-completion tracking, stored client-side in localStorage.
// Independent of the Firestore-backed "current day/chapter" progress —
// this only records whether a track was marked done for today's date.

const STORAGE_PREFIX = "limuda:completedToday:";

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function storageKey(trackId: string): string {
  return `${STORAGE_PREFIX}${trackId}`;
}

export function isTrackCompletedToday(trackId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(trackId)) === todayDateString();
  } catch {
    return false;
  }
}

export function toggleTrackCompletionToday(trackId: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = storageKey(trackId);
    if (window.localStorage.getItem(key) === todayDateString()) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, todayDateString());
    }
  } catch {
    // localStorage unavailable (private browsing, disabled storage, etc.) — no-op
  }
}
