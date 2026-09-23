"use client";

import { useEffect, useState } from "react";
import { isTrackCompletedToday, toggleTrackCompletionToday } from "@/lib/progress";

interface DailyCompletionButtonProps {
  trackId: string;
}

export default function DailyCompletionButton({ trackId }: DailyCompletionButtonProps) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(isTrackCompletedToday(trackId));
  }, [trackId]);

  function handleToggle() {
    toggleTrackCompletionToday(trackId);
    setCompleted((prev) => !prev);
  }

  return (
    <div className="mt-8 flex justify-center border-t border-slate-200 pt-8 dark:border-slate-700" dir="rtl">
      <button
        onClick={handleToggle}
        className={`flex min-h-[44px] items-center justify-center rounded-2xl px-10 py-4 text-lg font-bold shadow-sm transition active:scale-95 ${
          completed
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-blue-900 text-white shadow-lg hover:bg-blue-800"
        }`}
      >
        {completed ? "הושלם להיום ✓" : "סיימתי את הלימוד להיום ✓"}
      </button>
    </div>
  );
}
