"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toHebrewNumeral } from "@/lib/tehillimStructure";

const TOTAL_CHAPTERS = 150;

// Strips punctuation so "קיט", "קי״ט" and "119" can all be compared loosely.
function normalizeQuery(s: string): string {
  return s.replace(/[״׳'"\-\s]/g, "");
}

function chapterMatchesFilter(chapter: number, filter: string): boolean {
  const trimmed = filter.trim();
  if (!trimmed) return true;
  if (/^\d+$/.test(trimmed)) {
    return String(chapter).includes(trimmed);
  }
  return normalizeQuery(toHebrewNumeral(chapter)).includes(normalizeQuery(trimmed));
}

interface TehillimChapterModalProps {
  /** Inclusive range of the chapter(s) currently being studied, for highlighting. */
  currentChapterFrom: number;
  currentChapterTo: number;
  onSelect: (chapter: number) => void;
  onClose: () => void;
}

export default function TehillimChapterModal({
  currentChapterFrom,
  currentChapterTo,
  onSelect,
  onClose,
}: TehillimChapterModalProps) {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chapters = useMemo(() => {
    const all = Array.from({ length: TOTAL_CHAPTERS }, (_, i) => i + 1);
    return all.filter((c) => chapterMatchesFilter(c, filter));
  }, [filter]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir="rtl"
        className="flex w-full max-w-md flex-col rounded-2xl bg-white p-6 text-right shadow-2xl max-h-[85vh] dark:bg-stone-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-blue-950 dark:text-blue-200">בחירת פרק בתהלים</h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          inputMode="numeric"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="חיפוש לפי מספר או אות (למשל 119 או קיט)"
          autoFocus
          className="mb-4 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600/50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />

        <div className="flex-1 overflow-y-auto">
          {chapters.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">לא נמצאו פרקים תואמים</p>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {chapters.map((c) => {
                const isCurrent = c >= currentChapterFrom && c <= currentChapterTo;
                return (
                  <button
                    key={c}
                    onClick={() => onSelect(c)}
                    className={`rounded-lg py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 ${
                      isCurrent
                        ? "bg-blue-900 text-white"
                        : "bg-slate-50 text-blue-950 hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {toHebrewNumeral(c)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
