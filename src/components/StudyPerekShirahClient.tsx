"use client";

import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import StudyTitleHeader from "@/components/StudyTitleHeader";
import { PEREK_SHIRAH_SECTIONS } from "@/lib/perekShirahStructure";
import { fetchFullPerekShirah, type PerekShirahData } from "@/lib/sefaria";
import { useScrollPositionRestore } from "@/hooks/useScrollPositionRestore";

// ─── Date helpers (local calendar day, not UTC) ───────────────────────────────

function dateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayDateString(): string {
  return dateString(new Date());
}
function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateString(d);
}

// ─── Line formatter — bolds the leading "<creature> אומר/אומרת:" phrase ──────

const CREATURE_SAYS_RE = /^(.{1,40}?(?:אוֹמְרִים|אוֹמְרוֹת|אוֹמֵר|אוֹמֶרֶת))[.:׃]?\s*(.*)$/;

function formatPerekLine(text: string): ReactNode {
  const match = text.match(CREATURE_SAYS_RE);
  if (match && match[2]) {
    return (
      <>
        <strong className="font-bold text-blue-900">{match[1]}</strong>{" "}
        {match[2]}
      </>
    );
  }
  return text;
}

// ─── Sub-nav short labels ──────────────────────────────────────────────────

const NAV_LABELS: Record<string, string> = {
  intro: "הקדמה",
  perek1: "א",
  perek2: "ב",
  perek3: "ג",
  perek4: "ד",
  perek5: "ה",
  perek6: "ו",
  prayer: "תפילה",
};

function scrollToSection(id: string) {
  document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const NAV_BTN_BASE =
  "flex items-center justify-center rounded-xl text-sm font-semibold transition md:text-base";
const NAV_BTN_ACTIVE = "bg-blue-900 text-white shadow-sm dark:bg-blue-700";
const NAV_BTN_INACTIVE =
  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const NAV_BTN_LETTER = "h-10 min-w-[42px] md:h-11 md:min-w-[46px]";
const NAV_BTN_WORD = "h-10 px-4 md:h-11 md:px-5";

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudyPerekShirahClient() {
  const [user, setUser]                     = useState<User | null>(null);
  const [loading, setLoading]               = useState(true);
  const [perekData, setPerekData]           = useState<PerekShirahData | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [fetchError, setFetchError]         = useState<string | null>(null);

  const [lastDate, setLastDate]   = useState<string | null>(null);
  const [streak, setStreak]       = useState(0);
  const [completing, setCompleting] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const completedToday = lastDate === todayDateString();

  // ── Auth + Firestore (daily streak tracking) ────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          setLastDate(typeof data.lastPerekShirahDate === "string" ? data.lastPerekShirahDate : null);
          setStreak(typeof data.perekShirahStreak === "number" ? data.perekShirahStreak : 0);
        } else {
          await setDoc(ref, { lastPerekShirahDate: null, perekShirahStreak: 0 }, { merge: true });
          setLastDate(null);
          setStreak(0);
        }
      } else {
        setLastDate(null);
        setStreak(0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Fetch the full Perek Shirah once ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setContentLoading(true);
    setFetchError(null);

    fetchFullPerekShirah()
      .then((data) => { if (!cancelled) setPerekData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "שגיאה בטעינת פרק שירה");
      })
      .finally(() => { if (!cancelled) setContentLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Silently remember/restore scroll position on the page (content is the
  // same every day, so a single constant item id is enough).
  useScrollPositionRestore({
    trackId: "perekshirah",
    itemId: "full",
    ready: !contentLoading && !!perekData,
  });

  // ── Track which section is in view, to highlight the matching nav button ────

  useEffect(() => {
    if (!perekData) return;

    const elements = PEREK_SHIRAH_SECTIONS
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
        setActiveSection(topMost.target.id.replace("section-", ""));
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [perekData]);

  // ── Mark today's reading complete ───────────────────────────────────────────

  async function handleMarkComplete() {
    if (!user || completing || completedToday) return;
    setCompleting(true);
    try {
      const today = todayDateString();
      const newStreak = lastDate === yesterdayDateString() ? streak + 1 : 1;
      await updateDoc(doc(db, "users", user.uid), {
        lastPerekShirahDate: today,
        perekShirahStreak: newStreak,
      });
      setLastDate(today);
      setStreak(newStreak);
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

  return (
    <main className="flex min-h-screen flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <StudyHeader />

      {/* ── Content ── */}
      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <StudyTitleHeader
          unitLabel="פרק שירה יומי"
          toolbar={
            <div className="flex flex-wrap justify-center gap-2 md:gap-2.5">
              {PEREK_SHIRAH_SECTIONS.map((s) => {
                const isLetter = s.id.startsWith("perek");
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`${NAV_BTN_BASE} ${isLetter ? NAV_BTN_LETTER : NAV_BTN_WORD} ${isActive ? NAV_BTN_ACTIVE : NAV_BTN_INACTIVE}`}
                  >
                    {NAV_LABELS[s.id] ?? s.title}
                  </button>
                );
              })}
            </div>
          }
        />

        {/* Completion banner / status */}
        {user && (
          completedToday ? (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700">
              קראת היום פרק שירה! כל הכבוד 🕊️
              {streak > 1 && <span className="mr-1 font-normal text-green-600">(רצף של {streak} ימים)</span>}
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-blue-100 bg-white px-4 py-3 text-center text-sm text-slate-500 shadow-sm">
              עוד לא סימנת שקראת היום — הכפתור בתחתית העמוד ✨
            </div>
          )
        )}

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : contentLoading || !perekData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-8">
            {perekData.sections.map((section) => (
              <article
                key={section.id}
                id={`section-${section.id}`}
                className="scroll-mt-32 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-lg font-bold text-blue-950 dark:border-slate-700 dark:bg-slate-800/60 dark:text-blue-100">
                  {section.title}
                </div>
                {section.lines.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">אין טקסט זמין</p>
                ) : (
                  <div className="space-y-4 font-study text-2xl font-normal leading-[1.7] text-slate-900 antialiased dark:text-slate-100 md:text-3xl">
                    {section.lines.map((line, i) => (
                      <p key={i}>{formatPerekLine(line)}</p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Bottom completion action */}
        {user && !completedToday && (
          <div className="flex justify-center pt-8">
            <button
              onClick={handleMarkComplete}
              disabled={completing}
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-blue-950 px-8 py-3 text-base font-semibold text-white shadow transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
            >
              {completing ? "שומר..." : "סיימתי לקרוא פרק שירה היום ✨"}
            </button>
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
    </main>
  );
}
