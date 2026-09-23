"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  DEFAULT_REMINDER_TIME,
  downloadICSReminder,
  openGoogleCalendarReminder,
} from "@/lib/calendarReminder";

export default function CalendarReminderButton() {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(DEFAULT_REMINDER_TIME);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleGoogleCalendar() {
    openGoogleCalendarReminder(time);
    setOpen(false);
  }

  function handleDownloadICS() {
    downloadICSReminder(time);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="תזכורת יומית ליומן"
        aria-label="תזכורת יומית ליומן"
        aria-expanded={open}
        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-blue-200 transition hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-4.5 w-4.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute end-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">תזכורת יומית ללימוד</h3>
            <button
              onClick={() => setOpen(false)}
              aria-label="סגור"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            קבל תזכורת יומית קבועה ביומן שלך, בשעה שנוחה לך.
          </p>

          <div className="mb-4">
            <label
              htmlFor="reminder-time"
              className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              שעת תזכורת
            </label>
            <input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleGoogleCalendar}
              className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              הוספה ליומן Google
            </button>
            <button
              onClick={handleDownloadICS}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700"
            >
              הורדת קובץ ליומן Apple / כללי
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
