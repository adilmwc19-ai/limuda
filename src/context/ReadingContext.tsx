"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FontSize = "normal" | "large" | "xlarge";
export type FontFamily = "modern" | "traditional";
export type Theme = "light" | "dark";

interface ReadingPrefs {
  fontSize: FontSize;
  fontFamily: FontFamily;
  theme: Theme;
}

export const READING_PREFS_STORAGE_KEY = "limuda_reading_prefs_v2";

const DEFAULT_PREFS: ReadingPrefs = {
  fontSize: "xlarge",
  fontFamily: "modern",
  theme: "light",
};

function readStoredPrefs(): ReadingPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(READING_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReadingPrefs>;
    return {
      fontSize:
        parsed.fontSize === "large" || parsed.fontSize === "xlarge"
          ? parsed.fontSize
          : "normal",
      fontFamily: parsed.fontFamily === "traditional" ? "traditional" : "modern",
      theme: parsed.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface ReadingContextValue extends ReadingPrefs {
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: FontFamily) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ReadingContext = createContext<ReadingContextValue | null>(null);

export function ReadingProvider({ children }: { children: ReactNode }) {
  // Server and first client render must agree, so state always starts at the
  // defaults here. The inline head script (see layout.tsx) already applies the
  // real stored values to <html> before first paint, so there's no visual flash;
  // this state catches up to localStorage in the effect below, once mounted.
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readStoredPrefs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", prefs.theme);
    root.setAttribute("data-font-size", prefs.fontSize);
    root.setAttribute("data-font-family", prefs.fontFamily);
    try {
      window.localStorage.setItem(READING_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // localStorage unavailable (private browsing, etc.) — preference just won't persist
    }
  }, [prefs, hydrated]);

  const setFontSize = useCallback(
    (fontSize: FontSize) => setPrefs((p) => ({ ...p, fontSize })),
    []
  );
  const setFontFamily = useCallback(
    (fontFamily: FontFamily) => setPrefs((p) => ({ ...p, fontFamily })),
    []
  );
  const setTheme = useCallback((theme: Theme) => setPrefs((p) => ({ ...p, theme })), []);
  const toggleTheme = useCallback(
    () => setPrefs((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" })),
    []
  );

  return (
    <ReadingContext.Provider
      value={{ ...prefs, setFontSize, setFontFamily, setTheme, toggleTheme }}
    >
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading(): ReadingContextValue {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error("useReading must be used within a ReadingProvider");
  return ctx;
}
