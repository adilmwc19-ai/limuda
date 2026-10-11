"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useReading, type FontSize } from "@/context/ReadingContext";
import { HEADER_ICON_BUTTON_CLASS } from "@/components/studyHeaderStyles";

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; textClass: string }[] = [
  { value: "normal", label: "A-", textClass: "text-xs" },
  { value: "large", label: "A", textClass: "text-sm" },
  { value: "xlarge", label: "A+", textClass: "text-base" },
];

const SEG_BASE =
  "flex-1 py-1.5 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2";
const SEG_ACTIVE = "bg-blue-900 text-white";
const SEG_INACTIVE =
  "bg-white text-blue-900 hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700";

interface ReadingSettingsButtonProps {
  /** Override the button's accessible name (defaults to "הגדרות תצוגה"). */
  ariaLabel?: string;
}

export default function ReadingSettingsButton({
  ariaLabel = "הגדרות תצוגה",
}: ReadingSettingsButtonProps) {
  const { fontSize, fontFamily, theme, setFontSize, setFontFamily, setTheme } = useReading();
  const [open, setOpen] = useState(false);
  // Portals need document.body, which doesn't exist during SSR/first paint.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title={ariaLabel}
        aria-label={ariaLabel}
        aria-expanded={open}
        translate="no"
        className={`${HEADER_ICON_BUTTON_CLASS} notranslate text-base font-bold`}
      >
        Aa
      </button>

      {/* Rendered via a portal straight onto <body>: both the home header and
          the study header animate with a CSS transform (auto-hide on scroll),
          and a transformed ancestor becomes the containing block for any
          `fixed` descendant — without the portal this panel would be pinned
          to (and clipped by) the header instead of the viewport. */}
      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
            onClick={() => setOpen(false)}
          >
            <div
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-xl dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">הגדרות קריאה</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="סגור"
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
                >
                  ✕
                </button>
              </div>

              {/* Font size */}
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">גודל טקסט</p>
                <div className="flex overflow-hidden rounded-lg border border-blue-200 dark:border-slate-600">
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value)}
                      className={`${SEG_BASE} ${opt.textClass} ${
                        fontSize === opt.value ? SEG_ACTIVE : SEG_INACTIVE
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font family */}
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">גופן</p>
                <div className="flex overflow-hidden rounded-lg border border-blue-200 dark:border-slate-600">
                  <button
                    onClick={() => setFontFamily("modern")}
                    className={`${SEG_BASE} font-modern text-sm ${
                      fontFamily === "modern" ? SEG_ACTIVE : SEG_INACTIVE
                    }`}
                  >
                    מודרני
                  </button>
                  <button
                    onClick={() => setFontFamily("traditional")}
                    className={`${SEG_BASE} font-traditional text-sm ${
                      fontFamily === "traditional" ? SEG_ACTIVE : SEG_INACTIVE
                    }`}
                  >
                    תורני
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">מצב תצוגה</p>
                <div className="flex overflow-hidden rounded-lg border border-blue-200 dark:border-slate-600">
                  <button
                    onClick={() => setTheme("light")}
                    className={`${SEG_BASE} text-sm ${theme === "light" ? SEG_ACTIVE : SEG_INACTIVE}`}
                  >
                    ☀️ יום
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`${SEG_BASE} text-sm ${theme === "dark" ? SEG_ACTIVE : SEG_INACTIVE}`}
                  >
                    🌙 לילה
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
