"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  DEFAULT_REMINDER_HOUR,
  REMINDER_HOURS,
  disableDailyReminders,
  enableDailyReminders,
  getDailyReminderStatus,
  getPermissionState,
  getReminderHour,
  isPushSupported,
  setReminderHour,
} from "@/lib/notifications";

const ERROR_MESSAGES: Record<string, string> = {
  unsupported: "הדפדפן שלך אינו תומך בהתראות.",
  denied: "ההתראות חסומות. ניתן לאפשר אותן בהגדרות הדפדפן.",
  "no-token": "לא ניתן היה להפעיל התראות במכשיר זה.",
  error: "אירעה שגיאה. נסה שוב מאוחר יותר.",
};

export default function PushReminderToggle() {
  const [user, setUser] = useState<User | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hour, setHour] = useState(DEFAULT_REMINDER_HOUR);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let cancelled = false;
    isPushSupported().then((ok) => {
      if (!cancelled) setSupported(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || !supported) return;
    let cancelled = false;
    getDailyReminderStatus(user.uid)
      .then((on) => {
        if (!cancelled) setEnabled(on);
      })
      .catch(() => {});
    getReminderHour(user.uid)
      .then((h) => {
        if (!cancelled) setHour(h);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, supported]);

  if (!user || supported === null) return null;

  async function handleToggle() {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (enabled) {
        await disableDailyReminders(user.uid);
        setEnabled(false);
      } else {
        const result = await enableDailyReminders(user.uid, hour);
        if (result.ok) setEnabled(true);
        else setError(ERROR_MESSAGES[result.reason]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleHourChange(next: number) {
    if (!user) return;
    const previous = hour;
    setHour(next);
    setError(null);
    try {
      await setReminderHour(user.uid, next);
    } catch {
      setHour(previous);
      setError(ERROR_MESSAGES.error);
    }
  }

  const blocked =supported && getPermissionState() === "denied" && !enabled;
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  return (
    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-slate-600 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-950 dark:text-blue-200">התראת לימוד יומית</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            תזכורת יומית בשעה שנבחרה אם עוד לא סיימת את הלימוד להיום.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="התראת לימוד יומית"
          disabled={!supported || busy || blocked}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 ${
            enabled ? "bg-blue-900" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-all ${
              enabled ? "right-0.5" : "right-[1.375rem]"
            } absolute`}
          />
        </button>
      </div>
      {enabled && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <label htmlFor="reminder-hour" className="text-xs text-slate-600 dark:text-slate-300">
            שעת התזכורת
          </label>
          <select
            id="reminder-hour"
            value={hour}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-sm text-blue-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {REMINDER_HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      )}
      {blocked ? (
        <div className="mt-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ההתראות חסומות במכשיר ולכן לא נוכל לשלוח תזכורת.
          </p>
          <button
            type="button"
            aria-expanded={showHelp}
            aria-controls="push-help"
            onClick={() => setShowHelp((v) => !v)}
            className="mt-1 text-xs font-semibold text-blue-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 dark:text-blue-300"
          >
            איך מתקנים את זה? 💡
          </button>
          {showHelp && (
            <ol
              id="push-help"
              className="mt-2 list-inside list-decimal space-y-1 rounded-lg border border-blue-200 bg-white/70 p-3 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200"
            >
              {isStandalone ? (
                <>
                  <li>צאו למסך הבית של הטלפון.</li>
                  <li>לחצו לחיצה ארוכה על סמל האפליקציה לימודא ובחרו בפרטי יישום (סמל ⓘ).</li>
                  <li>היכנסו ל&quot;התראות&quot;, אפשרו אותן ופתחו מחדש את האפליקציה.</li>
                </>
              ) : (
                <>
                  <li>לחצו על סמל המנעול או ההגדרות בשורת הכתובת למעלה.</li>
                  <li>בחרו ב&quot;הרשאות&quot; או &quot;הגדרות אתר&quot;.</li>
                  <li>שנו את &quot;התראות&quot; ל-מאופשר (Allow) ורעננו את הדף.</li>
                </>
              )}
            </ol>
          )}
          {error && error !== ERROR_MESSAGES.denied && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{error}</p>
          )}
        </div>
      ) : (
        (!supported || error) && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {error ?? ERROR_MESSAGES.unsupported}
          </p>
        )
      )}
    </div>
  );
}
