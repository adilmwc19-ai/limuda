"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import CalendarReminderModal, { CalendarReminderButton } from "@/components/CalendarReminderModal";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { isTrackCompletedToday, todayDateString } from "@/lib/progress";
import { TOTAL_DAYS } from "@/lib/tanakhMapping";
import { TOTAL_MISHNAH_DAYS } from "@/lib/mishnahStructure";
import { TOTAL_TALMUD_DAYS, getCurrentDafYomiDay } from "@/lib/talmudStructure";
import { TOTAL_RAMBAM_CHAPTERS } from "@/lib/rambamStructure";
import { TOTAL_SEFER_HAMITZVOT_ITEMS, getGlobalIndex } from "@/lib/seferHaMitzvotStructure";
import { TOTAL_TEHILLIM_DAYS, getCurrentHebrewDayOfMonth } from "@/lib/tehillimStructure";
import { TOTAL_KITZUR_SIMANIM } from "@/lib/kitzurStructure";
import { TOTAL_CHOFETZ_CHAIM_UNITS, getChofetzChaimDailyUnit } from "@/lib/chofetzChaimStructure";
import { useAutoHideHeader } from "@/hooks/useAutoHideHeader";

const SEFER_HAMITZVOT_DEFAULT_INDEX = getGlobalIndex("positive", 1); // 15

interface UserProgress {
  tanakh929Day: number;
  mishnah525Day: number;
  talmudDafYomiDay: number;
  talmudPersonalInitialized: boolean;
  rambamChapter: number;
  seferHaMitzvotIndex: number;
  tehillimDay: number;
  kitzurSiman: number;
  chofetzChaimUnit: number;
  lastPerekShirahDate: string | null;
  perekShirahStreak: number;
  activeTracks: string[];
  createdAt: string;
  tanakhBookmark?: { day: number; verse: number } | null;
  mishnahBookmark?: { day: number; mishnahIndex: number } | null;
  kitzurBookmark?: { siman: number | string; seifIndex: number } | null;
  rambamBookmark?: { bookId: "rambam"; chapterIndex: number; halakhahNumber: number } | null;
  tehillimBookmark?: { bookId: "tehillim"; day: number; psalmNumber: number } | null;
}

// Small Hebrew-letter numeral, e.g. 1 -> "א׳", 15 -> "ט״ו" (used for verse labels only).
function toHebrewVerseNumeral(n: number): string {
  if (n <= 0 || n > 999) return String(n);
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (t === 1 && o === 5) return hundreds[h] + "ט״ו";
  if (t === 1 && o === 6) return hundreds[h] + "ט״ז";
  let result = hundreds[h] + tens[t] + ones[o];
  if (result.length > 1) result = result.slice(0, -1) + "״" + result.slice(-1);
  else result += "׳";
  return result;
}

export default function HomeClient() {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const headerHidden = useAutoHideHeader();

  // Check LocalStorage on the client only, to avoid SSR hydration mismatch.
  useEffect(() => {
    setCompletedToday(new Set(ALL_TRACK_IDS.filter((id) => isTrackCompletedToday(id))));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await ensureUserDoc(firebaseUser);
      } else {
        setProgress(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function ensureUserDoc(firebaseUser: User) {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const defaultData: UserProgress = {
        tanakh929Day: 1,
        mishnah525Day: 1,
        talmudDafYomiDay: 1,
        talmudPersonalInitialized: true,
        rambamChapter: 1,
        seferHaMitzvotIndex: SEFER_HAMITZVOT_DEFAULT_INDEX,
        tehillimDay: 1,
        kitzurSiman: 1,
        chofetzChaimUnit: 1,
        lastPerekShirahDate: null,
        perekShirahStreak: 0,
        activeTracks: ALL_TRACK_IDS,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, defaultData);
      setProgress(defaultData);
    } else {
      const data = snap.data() as Partial<UserProgress>;
      const patch: Partial<UserProgress> = {};
      if (data.mishnah525Day === undefined) patch.mishnah525Day = 1;
      if (data.rambamChapter === undefined) patch.rambamChapter = 1;
      if (data.seferHaMitzvotIndex === undefined) patch.seferHaMitzvotIndex = SEFER_HAMITZVOT_DEFAULT_INDEX;
      if (data.tehillimDay === undefined) patch.tehillimDay = 1;
      if (data.kitzurSiman === undefined) patch.kitzurSiman = 1;
      if (data.chofetzChaimUnit === undefined) patch.chofetzChaimUnit = 1;
      if (data.perekShirahStreak === undefined) patch.perekShirahStreak = 0;
      if (data.activeTracks === undefined) patch.activeTracks = ALL_TRACK_IDS;
      // Always reset talmudDafYomiDay to 1 when not yet properly initialized
      // (covers users who got getCurrentDafYomiDay() written by the old migration)
      if (!data.talmudPersonalInitialized) {
        patch.talmudDafYomiDay = 1;
        patch.talmudPersonalInitialized = true;
      }
      if (Object.keys(patch).length > 0) await updateDoc(ref, patch);
      setProgress({
        tanakh929Day: 1,
        mishnah525Day: 1,
        talmudDafYomiDay: 1,
        talmudPersonalInitialized: true,
        rambamChapter: 1,
        seferHaMitzvotIndex: SEFER_HAMITZVOT_DEFAULT_INDEX,
        tehillimDay: 1,
        kitzurSiman: 1,
        chofetzChaimUnit: 1,
        lastPerekShirahDate: null,
        perekShirahStreak: 0,
        activeTracks: ALL_TRACK_IDS,
        createdAt: "",
        ...data,
        ...patch,
      });
    }
  }

  async function updateActiveTracks(newActiveTracks: string[]) {
    if (!user || newActiveTracks.length === 0) return;
    const ref = doc(db, "users", user.uid);
    await updateDoc(ref, { activeTracks: newActiveTracks });
    setProgress((prev) => (prev ? { ...prev, activeTracks: newActiveTracks } : prev));
  }

  const validActiveTracks = (progress?.activeTracks ?? []).filter((id) => VALID_TRACK_IDS.has(id));
  const activeTrackIds = validActiveTracks.length > 0 ? validActiveTracks : ALL_TRACK_IDS;

  function renderTrackCard(id: string) {
    switch (id) {
      case "tanakh": {
        const bookmark = progress?.tanakhBookmark;
        return (
          <StudyCard
            key={id}
            emoji="📖"
            title='תנ"ך (929)'
            description='פרק יומי עם שכבות מקראות גדולות ומפרשים'
            currentDay={progress?.tanakh929Day ?? 1}
            totalDays={TOTAL_DAYS}
            href="/study/tanakh"
            bookmarkLabel={
              bookmark ? `המשך מפסוק ${toHebrewVerseNumeral(bookmark.verse)}` : undefined
            }
            completedToday={completedToday.has(id)}
          />
        );
      }
      case "mishnah": {
        const mishnahBookmark = progress?.mishnahBookmark;
        return (
          <StudyCard
            key={id}
            emoji="📜"
            title="משנה יומית"
            description='פרק ביום מתוך ששת סדרי משנה עם ביאור ברטנורא ורמב"ם'
            currentDay={progress?.mishnah525Day ?? 1}
            totalDays={TOTAL_MISHNAH_DAYS}
            href="/study/mishnah"
            bookmarkLabel={
              mishnahBookmark
                ? `המשך ממשנה ${toHebrewVerseNumeral(mishnahBookmark.mishnahIndex)}`
                : undefined
            }
            completedToday={completedToday.has(id)}
          />
        );
      }
      case "talmud":
        return (
          <StudyCard
            key={id}
            emoji="🕯️"
            title="דף יומי"
            description='דף גמרא ביום עם רש"י ותוספות'
            currentDay={progress?.talmudDafYomiDay ?? getCurrentDafYomiDay()}
            totalDays={TOTAL_TALMUD_DAYS}
            href="/study/talmud"
            completedToday={completedToday.has(id)}
          />
        );
      case "rambam": {
        const rambamBookmark = progress?.rambamBookmark;
        return (
          <StudyCard
            key={id}
            emoji="⚖️"
            title='משנה תורה לרמב"ם'
            description="פרק ביום מתוך י״ד ספרי הרמב״ם בקצב אישי"
            currentDay={progress?.rambamChapter ?? 1}
            totalDays={TOTAL_RAMBAM_CHAPTERS}
            href="/study/rambam"
            bookmarkLabel={
              rambamBookmark
                ? `המשך מהלכה ${toHebrewVerseNumeral(rambamBookmark.halakhahNumber)}`
                : undefined
            }
            completedToday={completedToday.has(id)}
          />
        );
      }
      case "sefer-hamitzvot":
        return (
          <StudyCard
            key={id}
            emoji="📜"
            title='ספר המצוות לרמב"ם'
            description="י״ד השורשים ותרי״ג מצוות בקצב אישי"
            currentDay={progress?.seferHaMitzvotIndex ?? SEFER_HAMITZVOT_DEFAULT_INDEX}
            totalDays={TOTAL_SEFER_HAMITZVOT_ITEMS}
            href="/study/sefer-hamitzvot"
            completedToday={completedToday.has(id)}
          />
        );
      case "tehillim": {
        const tehillimBookmark = progress?.tehillimBookmark;
        return (
          <StudyCard
            key={id}
            emoji="📖"
            title="תהלים יומי"
            description={`לפי חלוקת ל' ימי החודש העברי — היום יום ${getCurrentHebrewDayOfMonth().day} בחודש`}
            currentDay={progress?.tehillimDay ?? 1}
            totalDays={TOTAL_TEHILLIM_DAYS}
            href="/study/tehillim"
            bookmarkLabel={
              tehillimBookmark
                ? `המשך ממזמור ${toHebrewVerseNumeral(tehillimBookmark.psalmNumber)}`
                : undefined
            }
            completedToday={completedToday.has(id)}
          />
        );
      }
      case "kitzur-shulchan-aruch": {
        const kitzurBookmark = progress?.kitzurBookmark;
        return (
          <StudyCard
            key={id}
            emoji="📚"
            title="קיצור שולחן ערוך"
            description="רכ״א סימנים — הלכות היום־יום בקצב אישי"
            currentDay={progress?.kitzurSiman ?? 1}
            totalDays={TOTAL_KITZUR_SIMANIM}
            href="/study/kitzur-shulchan-aruch"
            bookmarkLabel={
              kitzurBookmark
                ? `המשך מסעיף ${toHebrewVerseNumeral(kitzurBookmark.seifIndex)}`
                : undefined
            }
            completedToday={completedToday.has(id)}
          />
        );
      }
      case "chofetz-chaim":
        return (
          <StudyCard
            key={id}
            emoji="🕊️"
            title="חפץ חיים"
            description={`שתי הלכות ביום — היום יחידה ${getChofetzChaimDailyUnit()}`}
            currentDay={progress?.chofetzChaimUnit ?? 1}
            totalDays={TOTAL_CHOFETZ_CHAIM_UNITS}
            href="/study/chofetz-chaim"
            completedToday={completedToday.has(id)}
          />
        );
      case "perek-shirah":
        return (
          <PerekShirahCard
            key={id}
            completedToday={progress?.lastPerekShirahDate === todayDateString()}
            streak={progress?.perekShirahStreak ?? 0}
          />
        );
      default:
        return null;
    }
  }

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent dark:border-blue-300" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 bg-blue-950 px-6 shadow-md transition-transform duration-300 ease-in-out dark:bg-slate-900 ${
          headerHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between md:h-16">
          <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">לימודא</h1>
          {user && (
            <div className="flex items-center gap-3">
              <CalendarReminderButton onClick={() => setReminderOpen(true)} />
              <span className="text-sm text-blue-200">{user.displayName}</span>
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-blue-800 px-4 py-1.5 text-sm text-white transition hover:bg-blue-700 active:scale-95"
              >
                התנתק
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-4 py-16 sm:px-6">
        {!user ? (
          /* ── Not signed in ── */
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-blue-950 dark:text-white">ברוך הבא ללימודא</h2>
              <p className="text-lg text-slate-700 dark:text-slate-200">פלטפורמה אישית ללימוד תורה יומי בקצב שלך</p>
            </div>

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-3 rounded-xl bg-blue-950 px-8 py-3 text-lg font-medium text-white shadow-lg transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
            >
              {signingIn ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <GoogleIcon />
              )}
              התחבר עם Google
            </button>

            {/* Track previews for non-signed-in users */}
            <div className="mt-2 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {TRACKS.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-right dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <span className="mt-0.5 text-2xl" aria-hidden="true">{t.emoji}</span>
                  <div>
                    <p className="font-semibold text-blue-950 dark:text-white">{t.title}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-200">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Signed in ── */
          <div className="flex w-full flex-col gap-8">
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between" dir="rtl">
              <div>
                <h2 className="text-2xl font-bold text-blue-950 dark:text-white">
                  שלום, {user.displayName?.split(" ")[0]}!
                </h2>
                <p className="text-slate-700 dark:text-slate-200">בחר מסלול לימוד להמשיך</p>
              </div>
              <button
                onClick={() => setShowTrackSelector(true)}
                className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow active:scale-95 md:px-6 md:py-3 md:text-base dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <SlidersHorizontal className="h-4.5 w-4.5 shrink-0 md:h-5 md:w-5" aria-hidden="true" />
                התאמת המסלולים
              </button>
            </div>

            {/* Top: daily study hub — only the user's active tracks */}
            <div dir="rtl">
              <h3 className="mb-4 text-lg font-bold text-blue-950 dark:text-white">הסדר היומי שלי</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeTrackIds.map((id) => renderTrackCard(id))}
              </div>
            </div>

            {/* Bottom: quick access to all tracks, collapsed by default */}
            <details className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <summary
                className="cursor-pointer select-none text-sm font-semibold text-slate-700 transition hover:text-blue-900 dark:text-slate-200 dark:hover:text-white"
                dir="rtl"
              >
                כל מסלולי הלימוד
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" dir="rtl">
                {TRACKS.map((t) => renderTrackCard(t.id))}
              </div>
            </details>
          </div>
        )}
      </section>

      {showTrackSelector && progress && (
        <TrackSelectorModal
          activeTracks={activeTrackIds}
          onSave={async (next) => {
            await updateActiveTracks(next);
            setShowTrackSelector(false);
          }}
          onClose={() => setShowTrackSelector(false)}
        />
      )}

      <CalendarReminderModal open={reminderOpen} onClose={() => setReminderOpen(false)} />
    </main>
  );
}

// ─── Study card ───────────────────────────────────────────────────────────────

interface StudyCardProps {
  emoji: string;
  title: string;
  description: string;
  currentDay: number;
  totalDays: number;
  href: string;
  bookmarkLabel?: string;
  completedToday?: boolean;
}

function StudyCard({ emoji, title, description, currentDay, totalDays, href, bookmarkLabel, completedToday }: StudyCardProps) {
  const pct = Math.round((currentDay / totalDays) * 100);

  return (
    <Link
      href={href}
      className="group flex h-full flex-col justify-between rounded-2xl border border-blue-100 bg-white p-6 font-sans shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      {completedToday && (
        <div className="mb-3 flex justify-end" dir="rtl">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            הושלם היום ✓
          </span>
        </div>
      )}

      {/* Icon + title */}
      <div className="mb-3 flex items-center gap-3" dir="rtl">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl dark:bg-blue-900/40">
          {emoji}
        </span>
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-auto space-y-2">
        <div className="flex items-baseline justify-between" dir="rtl">
          <span className="text-2xl font-bold text-blue-950 dark:text-blue-200">יום {currentDay}</span>
          <span className="text-sm text-slate-700 dark:text-slate-200">מתוך {totalDays}</span>
        </div>
        {bookmarkLabel && (
          <div
            className="flex w-fit items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
            dir="rtl"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75V21l-6-3.6L6 21V3.75Z" />
            </svg>
            <span>{bookmarkLabel}</span>
          </div>
        )}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-700 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-blue-950 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-900"
          dir="rtl"
        >
          המשך לימוד
          <span aria-hidden="true">&larr;</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Perek Shirah card (status badge instead of a day-counter progress bar) ──

interface PerekShirahCardProps {
  completedToday: boolean;
  streak: number;
}

function PerekShirahCard({ completedToday, streak }: PerekShirahCardProps) {
  return (
    <Link
      href="/study/perek-shirah"
      className="group flex h-full flex-col justify-between rounded-2xl border border-blue-100 bg-white p-6 font-sans shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      {/* Icon + title */}
      <div className="mb-3 flex items-center gap-3" dir="rtl">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl dark:bg-blue-900/40">
          🕊️
        </span>
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">פרק שירה יומי</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">כל פרק שירה, מדי יום — ללא חלוקה לימים</p>
        </div>
      </div>

      {/* Status */}
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between" dir="rtl">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              completedToday
                ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
            }`}
          >
            {completedToday ? "נקרא היום ✓" : "טרם נקרא היום"}
          </span>
          {streak > 0 && <span className="text-sm text-slate-600 dark:text-slate-400">רצף {streak} ימים</span>}
        </div>
        <div
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-blue-950 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-900"
          dir="rtl"
        >
          המשך לימוד
          <span aria-hidden="true">&larr;</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Track metadata (used in non-signed-in preview) ──────────────────────────

const TRACKS = [
  {
    id: "tanakh",
    emoji: "📖",
    title: 'תנ"ך (929)',
    description: "פרק יומי עם מקראות גדולות ומפרשים",
  },
  {
    id: "mishnah",
    emoji: "📜",
    title: "משנה יומית",
    description: 'פרק ביום עם ביאור ברטנורא ורמב"ם',
  },
  {
    id: "talmud",
    emoji: "🕯️",
    title: "דף יומי",
    description: 'דף גמרא ביום עם רש"י ותוספות',
  },
  {
    id: "rambam",
    emoji: "⚖️",
    title: 'משנה תורה לרמב"ם',
    description: "פרק ביום מתוך י״ד ספרי הרמב״ם בקצב אישי",
  },
  {
    id: "sefer-hamitzvot",
    emoji: "📜",
    title: 'ספר המצוות לרמב"ם',
    description: "י״ד השורשים ותרי״ג מצוות בקצב אישי",
  },
  {
    id: "tehillim",
    emoji: "📖",
    title: "תהלים יומי",
    description: "לפי חלוקת ל' ימי החודש העברי",
  },
  {
    id: "perek-shirah",
    emoji: "🕊️",
    title: "פרק שירה יומי",
    description: "כל פרק שירה, מדי יום",
  },
  {
    id: "kitzur-shulchan-aruch",
    emoji: "📚",
    title: "קיצור שולחן ערוך",
    description: "רכ״א סימנים — הלכות היום־יום בקצב אישי",
  },
  {
    id: "chofetz-chaim",
    emoji: "🕊️",
    title: "חפץ חיים",
    description: "שתי הלכות ביום — הלכות לשון הרע ורכילות",
  },
];

const ALL_TRACK_IDS: string[] = TRACKS.map((t) => t.id);
const VALID_TRACK_IDS = new Set(ALL_TRACK_IDS);

// ─── Track selector modal ─────────────────────────────────────────────────────

interface TrackSelectorModalProps {
  activeTracks: string[];
  onSave: (newActiveTracks: string[]) => void | Promise<void>;
  onClose: () => void;
}

function TrackSelectorModal({ activeTracks, onSave, onClose }: TrackSelectorModalProps) {
  const [selected, setSelected] = useState<string[]>(activeTracks);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least one active track
        return prev.filter((t) => t !== id);
      }
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave(selected);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          התאמת המסלולים שלי
        </h3>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-6">
          בחרי אילו מסלולים יופיעו ב&quot;הסדר היומי שלי&quot; בדף הבית (חובה לבחור לפחות מסלול אחד).
        </p>

        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto scrollbar-thin">
          {TRACKS.map((t) => {
            const checked = selected.includes(t.id);
            const isLastChecked = checked && selected.length === 1;
            return (
              <label
                key={t.id}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border border-transparent transition-all cursor-pointer ${
                  isLastChecked
                    ? "opacity-60"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl md:text-2xl" aria-hidden="true">{t.emoji}</span>
                  <span className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-100">
                    {t.title}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isLastChecked}
                  onChange={() => toggle(t.id)}
                  className="w-5 h-5 rounded text-blue-900 accent-blue-900 cursor-pointer"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="rounded-lg bg-blue-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#fff"
        d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.7 20-21 0-1.3-.2-2.7-.5-4z"
      />
    </svg>
  );
}
