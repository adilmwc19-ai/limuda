"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import PushReminderToggle from "@/components/PushReminderToggle";
import {
  DEFAULT_REMINDER_TIME,
  downloadICSReminder,
  openGoogleCalendarReminder,
} from "@/lib/calendarReminder";

export function CalendarReminderButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="תזכורת יומית ליומן"
      aria-label="תזכורת יומית ליומן"
      className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-blue-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      <Bell className="h-4.5 w-4.5" aria-hidden="true" />
    </button>
  );
}

export default function CalendarReminderModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(DEFAULT_REMINDER_TIME);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleGoogleCalendar() {
    openGoogleCalendarReminder(time);
    onClose();
  }

  function handleDownloadICS() {
    downloadICSReminder(time);
    onClose();
  }

  if (!mounted || !open) return null;

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
        className="my-auto max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 text-right shadow-2xl dark:bg-slate-800"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">תזכורת יומית ללימוד</h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <PushReminderToggle />

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
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600/50 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleGoogleCalendar}
            className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            הוספה ליומן Google
          </button>
          <button
            onClick={handleDownloadICS}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            הורדת קובץ ליומן Apple / כללי
          </button>
        </div>

        <p className="mt-3 text-center text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          התזכורת מתווספת ישירות לאפליקציית היומן במכשירך. לשינוי השעה או לביטול התזכורת, ניתן לערוך או למחוק את האירוע ישירות מתוך אפליקציית היומן.
        </p>
      </div>
    </div>,
    document.body
  );
}
