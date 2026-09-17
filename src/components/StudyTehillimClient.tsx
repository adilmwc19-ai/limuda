"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  TEHILLIM_DAYS,
  TOTAL_TEHILLIM_DAYS,
  getTehillimDayInfo,
  getCurrentHebrewDayOfMonth,
} from "@/lib/tehillimStructure";
import { fetchTehillimDay, type TehillimDayData } from "@/lib/sefaria";

// ─── Segmented control helper (shared visual language with the other tracks) ─

function SegControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-blue-200">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-sm transition ${
            value === o.value
              ? "bg-blue-900 text-white"
              : "bg-white text-blue-900 hover:bg-blue-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── TOC Modal ────────────────────────────────────────────────────────────────

interface TocModalProps {
  currentDay: number;
  onSelect: (day: number) => void;
  onClose: () => void;
}

function TocModal({ currentDay, onSelect, onClose }: TocModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים — תהלים יומי</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3" dir="rtl">
          <div className="space-y-1">
            {TEHILLIM_DAYS.map((d) => {
              const info = getTehillimDayInfo(d.day);
              const isCurrent = d.day === currentDay;
              return (
                <button
                  key={d.day}
                  onClick={() => {
                    onSelect(d.day);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-right transition ${
                    isCurrent
                      ? "bg-blue-900 text-white"
                      : "text-blue-950 hover:bg-blue-50"
                  }`}
                >
                  <span className="font-semibold">יום {d.day}</span>
                  <span className={`text-sm ${isCurrent ? "text-blue-200" : "text-slate-400"}`}>
                    {info.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PaceMode = "global" | "personal";

export default function StudyTehillimClient() {
  const [user, setUser]             = useState<User | null>(null);
  const [paceMode, setPaceMode]     = useState<PaceMode>("global");
  const [personalDay, setPersonalDay] = useState<number>(1); // Firestore tehillimDay
  const [viewingDay, setViewingDay] = useState<number>(1);
  const [dayData, setDayData]       = useState<TehillimDayData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [settingDay, setSettingDay] = useState(false);
  const [setDayMsg, setSetDayMsg]   = useState<string | null>(null);
  const [tocOpen, setTocOpen]       = useState(false);

  // Derived "today" based on the Hebrew calendar (pure/synchronous — no network call)
  const currentHebrew = getCurrentHebrewDayOfMonth();
  const activeDay = paceMode === "global" ? currentHebrew.day : personalDay;

  // ── Auth + Firestore ────────────────────────────────────────────────────────

  useEffect(() => {
    const globalNow = getCurrentHebrewDayOfMonth().day;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let personalStart = 1;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.tehillimDay === "number" ? data.tehillimDay : 1;
          if (typeof data.tehillimDay !== "number") {
            await updateDoc(ref, { tehillimDay: 1 });
          }
        } else {
          await setDoc(ref, { tehillimDay: 1 }, { merge: true });
        }
        setPersonalDay(personalStart);
      } else {
        setPersonalDay(1);
      }
      setViewingDay(globalNow);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Explicit handler: set both states synchronously so no stale-closure issue
  function handlePaceModeChange(mode: PaceMode) {
    setPaceMode(mode);
    setViewingDay(mode === "personal" ? (personalDay || 1) : getCurrentHebrewDayOfMonth().day);
  }

  // ── Fetch day on viewing day change ─────────────────────────────────────────

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setDayData(null);
    setFetchError(null);
    setDayLoading(true);

    fetchTehillimDay(viewingDay)
      .then((data) => { if (!cancelled) setDayData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "שגיאה בטעינת תהלים");
      })
      .finally(() => { if (!cancelled) setDayLoading(false); });

    return () => { cancelled = true; };
  }, [viewingDay, loading]);

  // ── Set current day as personal starting point ──────────────────────────────

  async function handleSetAsDay() {
    if (!user || settingDay) return;
    setSettingDay(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { tehillimDay: viewingDay });
      setPersonalDay(viewingDay);
      setSetDayMsg("היום עודכן כנקודת הלימוד שלך ✓");
      setTimeout(() => setSetDayMsg(null), 3000);
    } finally {
      setSettingDay(false);
    }
  }

  // ── Mark finished — advance personal progress (wraps monthly: 30 → 1) ──────

  async function handleFinished() {
    if (!user || completing || paceMode !== "personal") return;
    const nextDay = personalDay >= TOTAL_TEHILLIM_DAYS ? 1 : personalDay + 1;
    setCompleting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { tehillimDay: nextDay });
      setPersonalDay(nextDay);
      setViewingDay(nextDay);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
      </div>
    );
  }

  const info = getTehillimDayInfo(viewingDay);
  const isCurrent = viewingDay === activeDay;
  const showDeficientNote =
    paceMode === "global" && viewingDay === 29 && currentHebrew.combineWithDay30;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-blue-950 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link href="/" className="text-sm text-blue-300 transition hover:text-white">→ ראשי</Link>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wide text-white">
              {info.description}
              {paceMode === "global" && (
                <span className="mr-2 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-normal">לפי יום בחודש</span>
              )}
            </h1>
            <p className="text-xs text-blue-300">יום {viewingDay} בחודש העברי</p>
          </div>
          <span className="w-[76px]" aria-hidden="true" />
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="sticky top-[52px] z-10 border-b border-blue-100 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <SegControl<PaceMode>
              options={[
                { value: "global", label: "לפי יום בחודש" },
                { value: "personal", label: "בקצב שלי" },
              ]}
              value={paceMode}
              onChange={handlePaceModeChange}
            />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewingDay((d) => Math.max(1, d - 1))}
                disabled={viewingDay <= 1}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                ←
              </button>
              <button
                onClick={() => setViewingDay((d) => Math.min(TOTAL_TEHILLIM_DAYS, d + 1))}
                disabled={viewingDay >= TOTAL_TEHILLIM_DAYS}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                →
              </button>
              <span className="mr-1 text-xs text-slate-400">
                יום {viewingDay} מתוך {TOTAL_TEHILLIM_DAYS}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {user && !isCurrent && (
              <button
                onClick={handleSetAsDay}
                disabled={settingDay}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
              >
                {settingDay ? "שומר..." : "📌 קבע כיום הלימוד שלי"}
              </button>
            )}
            {!isCurrent && (
              <button
                onClick={() => setViewingDay(activeDay)}
                className="rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs text-amber-800 transition hover:bg-amber-200"
              >
                {paceMode === "global" ? "חזור להיום" : "חזור לנקודת הלימוד שלי"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => setTocOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-950 shadow-sm transition hover:bg-blue-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>
              יום {viewingDay} <span className="text-blue-300">◄</span> {info.label}
            </span>
          </button>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-blue-950">{info.description}</h2>
          <p className="mt-1 text-sm text-slate-400">יום {viewingDay} בחודש העברי</p>
        </div>

        {showDeficientNote && (
          <div className="mb-6 flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
            <p>החודש העברי הנוכחי חסר (כ״ט ימים) — נהוג לקרוא היום גם את תהלים של יום ל׳.</p>
            <button
              onClick={() => setViewingDay(30)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
            >
              עבור ליום ל׳ ({getTehillimDayInfo(30).label})
            </button>
          </div>
        )}

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : dayLoading || !dayData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {dayData.psalms.length === 0 ? (
              <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <p className="py-8 text-center text-sm text-slate-400">אין טקסט זמין ליום זה</p>
              </article>
            ) : (
              dayData.psalms.map((psalm) => (
                <article key={psalm.number} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-lg font-bold text-blue-900">תהלים פרק {psalm.number}</h3>
                  <div className="space-y-2 leading-relaxed text-gray-800 text-base">
                    {psalm.verses.map((v) => (
                      <p key={v.verse}>
                        <span className="ml-2 text-xs font-bold text-blue-500 align-super">{v.verse}</span>
                        {v.text}
                      </p>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {/* Action row — personal mode only; hidden entirely in global mode */}
        {user && paceMode === "personal" && (
          <div className="flex flex-col items-center gap-2 pt-8">
            {isCurrent && (
              <button
                onClick={handleFinished}
                disabled={completing}
                className="rounded-xl bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
              >
                {completing ? "שומר..." : "סיימתי יום זה ←"}
              </button>
            )}
            {setDayMsg && (
              <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
                {setDayMsg}
              </p>
            )}
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 py-6 text-center">
          <p className="text-sm text-slate-400">
            טקסטים באדיבות{" "}
            <a
              href="https://www.sefaria.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              ספריא (Sefaria)
            </a>
          </p>
        </footer>
      </section>

      {/* ── TOC Modal ── */}
      {tocOpen && (
        <TocModal
          currentDay={viewingDay}
          onSelect={setViewingDay}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
