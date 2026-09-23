"use client";

import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import StudyTitleHeader from "@/components/StudyTitleHeader";
import { PEREK_SHIRAH_SECTIONS } from "@/lib/perekShirahStructure";
import { fetchFullPerekShirah, type PerekShirahData } from "@/lib/sefaria";

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
            <div className="flex flex-wrap justify-center gap-1.5">
              {PEREK_SHIRAH_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="flex min-h-[44px] items-center justify-center rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-900 shadow-sm transition hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700"
                >
                  {NAV_LABELS[s.id] ?? s.title}
                </button>
              ))}
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
                  <div className="space-y-4 text-lg font-medium leading-relaxed text-gray-800 lg:text-xl">
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
