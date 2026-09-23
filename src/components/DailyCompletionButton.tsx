"use client";

import { useEffect, useState } from "react";
import { isTrackCompletedToday, toggleTrackCompletionToday } from "@/lib/progress";

interface DailyCompletionButtonProps {
  trackId: string;
  /** Advances the Firestore-backed day/item, when the viewer is on their current study point. */
  onAdvance?: () => Promise<void> | void;
}

export default function DailyCompletionButton({ trackId, onAdvance }: DailyCompletionButtonProps) {
  const [completed, setCompleted] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    setCompleted(isTrackCompletedToday(trackId));
  }, [trackId]);

  async function handleToggle() {
    const wasCompleted = completed;
    toggleTrackCompletionToday(trackId);
    setCompleted(!wasCompleted);

    if (!wasCompleted && onAdvance) {
      setAdvancing(true);
      try {
        await onAdvance();
      } finally {
        setAdvancing(false);
      }
    }
  }

  return (
    <div className="my-6 flex justify-center" dir="rtl">
      <button
        onClick={handleToggle}
        disabled={advancing}
        className={`flex min-h-[44px] items-center justify-center rounded-2xl px-10 py-4 text-lg font-bold shadow-sm transition active:scale-95 disabled:opacity-60 ${
          completed
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-blue-900 text-white shadow-lg hover:bg-blue-800"
        }`}
      >
        {advancing ? "שומר..." : completed ? "הושלם להיום ✓" : "סיימתי את הלימוד להיום ✓"}
      </button>
    </div>
  );
}
