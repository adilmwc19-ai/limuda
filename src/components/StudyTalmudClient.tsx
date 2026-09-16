"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  TALMUD_MASECHTOT,
  TALMUD_SEDARIM,
  TOTAL_TALMUD_DAYS,
  getDafInfo,
  getDayFromDaf,
  getCurrentDafYomiDay,
  type DafInfo,
} from "@/lib/talmudStructure";
import {
  fetchTalmudDaf,
  stripTalmudPunctuation,
  type TalmudDafData,
  type TalmudAmudData,
} from "@/lib/sefaria";

// ─── Hebrew numerals ──────────────────────────────────────────────────────────

function toHebrew(n: number): string {
  if (n <= 0 || n > 1200) return String(n);
  const thousands: string[] = ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳", "ח׳", "ט׳", "י׳", "יא׳", "יב׳"];
  if (n >= 1000) return (thousands[Math.floor(n / 1000)] || "") + toHebrew(n % 1000 || 1000);
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const tens     = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const ones     = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  let h = Math.floor(n / 100);
  let t = Math.floor((n % 100) / 10);
  let o = n % 10;
  if (t === 1 && o === 5) { t = 0; o = 0; return hundreds[h] + (h ? "" : "") + "טו" + (n > 15 ? "״" : "׳"); }
  if (t === 1 && o === 6) { t = 0; o = 0; return hundreds[h] + "טז" + (n > 16 ? "״" : "׳"); }
  let result = hundreds[h] + tens[t] + ones[o];
  if (result.length > 1) result = result.slice(0, -1) + "״" + result.slice(-1);
  else result += "׳";
  return result;
}

// Daf numeral: e.g. daf 2 → "ב"
function dafLabel(n: number): string {
  return toHebrew(n);
}

// ─── Commentary formatter ─────────────────────────────────────────────────────

function formatCommentaryText(text: string): ReactNode {
  if (/<b\b|<strong\b/i.test(text)) {
    const parts = text.split(/(<b>.*?<\/b>|<strong>.*?<\/strong>)/i);
    return (
      <>
        {parts.map((p, i) =>
          /^<b>|^<strong>/i.test(p) ? (
            <strong key={i} className="font-bold text-gray-900">
              {p.replace(/<\/?(?:b|strong)[^>]*>/gi, "")}
            </strong>
          ) : (
            p
          )
        )}
      </>
    );
  }
  const dashMatch = text.match(/^(.{1,60}?[–—])\s*(.+)/);
  if (dashMatch)
    return (
      <>
        <strong className="font-bold text-gray-900">{dashMatch[1]}</strong>{" "}
        {dashMatch[2]}
      </>
    );
  const dotMatch = text.match(/^((?:\S+\s+){0,4}\S+\.)\s+(.+)/);
  if (dotMatch && dotMatch[1].length <= 60)
    return (
      <>
        <strong className="font-bold text-gray-900">{dotMatch[1]}</strong>{" "}
        {dotMatch[2]}
      </>
    );
  const hyphenMatch = text.match(/^(.{1,60}?\s[-־])\s(.+)/);
  if (hyphenMatch)
    return (
      <>
        <strong className="font-bold text-gray-900">{hyphenMatch[1]}</strong>{" "}
        {hyphenMatch[2]}
      </>
    );
  return text;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CommentatorKey = "rashi" | "tosafot";
type DisplayMode = "nikud" | "vilna";

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudyTalmudClient() {
  const [user, setUser]       = useState<User | null>(null);
  const [activeDay, setActiveDay]   = useState<number>(1);
  const [viewingDay, setViewingDay] = useState<number>(1);
  const [dafData, setDafData]       = useState<TalmudDafData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [commentator, setCommentator] = useState<CommentatorKey>("rashi");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("nikud");
  const [isTocOpen, setIsTocOpen]     = useState(false);
  const [finishing, setFinishing]     = useState(false);

  // TOC accordion state
  const [openSeder, setOpenSeder] = useState<string | null>(null);
  const [openMasechet, setOpenMasechet] = useState<string | null>(null);

  // ── Auth + Firestore ────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let day = getCurrentDafYomiDay();
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          if (typeof data.talmudDafYomiDay === "number") {
            day = data.talmudDafYomiDay;
          } else {
            await updateDoc(ref, { talmudDafYomiDay: day });
          }
        } else {
          await setDoc(ref, { talmudDafYomiDay: day }, { merge: true });
        }
        setActiveDay(day);
        setViewingDay(day);
      } else {
        const day = getCurrentDafYomiDay();
        setActiveDay(day);
        setViewingDay(day);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Fetch daf when viewingDay changes ──────────────────────────────────────

  const loadDaf = useCallback(async (day: number) => {
    setDafData(null);
    setFetchError(null);
    const info = getDafInfo(day);
    try {
      const data = await fetchTalmudDaf(info.sefariaName, info.dafNumber);
      setDafData(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "שגיאה בטעינת הדף");
    }
  }, []);

  useEffect(() => {
    if (!loading) loadDaf(viewingDay);
  }, [viewingDay, loading, loadDaf]);

  // ── Mark finished ──────────────────────────────────────────────────────────

  async function handleFinished() {
    if (!user || finishing) return;
    const nextDay = viewingDay < TOTAL_TALMUD_DAYS ? viewingDay + 1 : viewingDay;
    setFinishing(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { talmudDafYomiDay: nextDay });
      setActiveDay(nextDay);
      setViewingDay(nextDay);
    } finally {
      setFinishing(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
      </div>
    );
  }

  const info = getDafInfo(viewingDay);
  const isToday = viewingDay === activeDay;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-blue-950 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <a href="/" className="text-sm text-blue-300 hover:text-white transition">→ ראשי</a>
          <h1 className="text-lg font-bold tracking-wide text-white">
            {info.masechetHe} {dafLabel(info.dafNumber)}
          </h1>
          <button
            onClick={() => setIsTocOpen(true)}
            className="rounded-lg bg-blue-800 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700"
          >
            תוכן עניינים
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-[52px] z-10 border-b border-blue-100 bg-white/90 px-4 py-2 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          {/* Display mode toggle */}
          <div className="flex rounded-lg overflow-hidden border border-blue-200">
            {(["nikud", "vilna"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDisplayMode(mode)}
                className={`px-3 py-1 text-sm transition ${
                  displayMode === mode
                    ? "bg-blue-900 text-white"
                    : "bg-white text-blue-900 hover:bg-blue-50"
                }`}
              >
                {mode === "nikud" ? "עם ניקוד" : "וילנא"}
              </button>
            ))}
          </div>

          {/* Commentator tabs */}
          <div className="flex rounded-lg overflow-hidden border border-blue-200">
            {(["rashi", "tosafot"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCommentator(c)}
                className={`px-3 py-1 text-sm transition ${
                  commentator === c
                    ? "bg-blue-900 text-white"
                    : "bg-white text-blue-900 hover:bg-blue-50"
                }`}
              >
                {c === "rashi" ? "רש״י" : "תוספות"}
              </button>
            ))}
          </div>

          {/* Day navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewingDay((d) => Math.max(1, d - 1))}
              disabled={viewingDay <= 1}
              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
            >
              ←
            </button>
            {!isToday && (
              <button
                onClick={() => setViewingDay(activeDay)}
                className="rounded-lg bg-amber-100 border border-amber-300 px-2.5 py-1 text-xs text-amber-800 transition hover:bg-amber-200"
              >
                חזור להיום
              </button>
            )}
            <button
              onClick={() => setViewingDay((d) => Math.min(TOTAL_TALMUD_DAYS, d + 1))}
              disabled={viewingDay >= TOTAL_TALMUD_DAYS}
              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 space-y-8">
        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">{fetchError}</div>
        ) : !dafData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <>
            <AmudSection
              amud={dafData.amudAlef}
              label={`${dafLabel(dafData.dafNumber)} ע"א`}
              commentator={commentator}
              displayMode={displayMode}
            />
            <AmudSection
              amud={dafData.amudBet}
              label={`${dafLabel(dafData.dafNumber)} ע"ב`}
              commentator={commentator}
              displayMode={displayMode}
            />

            {/* Finish button */}
            {user && isToday && viewingDay < TOTAL_TALMUD_DAYS && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleFinished}
                  disabled={finishing}
                  className="rounded-xl bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
                >
                  {finishing ? "שומר..." : "סיימתי את הדף ←"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* TOC Modal */}
      {isTocOpen && (
        <TocModal
          currentDay={viewingDay}
          openSeder={openSeder}
          setOpenSeder={setOpenSeder}
          openMasechet={openMasechet}
          setOpenMasechet={setOpenMasechet}
          onSelect={(day) => {
            setViewingDay(day);
            setIsTocOpen(false);
          }}
          onClose={() => setIsTocOpen(false)}
        />
      )}
    </main>
  );
}

// ─── Amud section ─────────────────────────────────────────────────────────────

interface AmudSectionProps {
  amud: TalmudAmudData;
  label: string;
  commentator: CommentatorKey;
  displayMode: DisplayMode;
}

function AmudSection({ amud, label, commentator, displayMode }: AmudSectionProps) {
  const gemara = displayMode === "vilna"
    ? amud.text.map(stripTalmudPunctuation)
    : amud.text;
  const comments = commentator === "rashi" ? amud.rashi : amud.tosafot;

  return (
    <article className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-blue-900 px-5 py-2.5">
        <h2 className="text-sm font-semibold tracking-wide text-white">{label}</h2>
      </div>

      {/* Gemara text */}
      <div className="px-5 py-4 border-b border-blue-50">
        {gemara.length === 0 ? (
          <p className="text-sm text-slate-400 text-center">הטקסט לא זמין</p>
        ) : (
          <div className="space-y-2 leading-relaxed text-gray-800 text-base">
            {gemara.map((seg, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: seg }} />
            ))}
          </div>
        )}
      </div>

      {/* Commentary */}
      <div className="px-5 py-4 bg-slate-50/60">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700">
          {commentator === "rashi" ? 'רש"י' : "תוספות"}
        </h3>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">אין פירוש לאמוד זה</p>
        ) : (
          <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
            {comments.map((c, i) => (
              <li key={i} className="mb-2 last:mb-0">
                {formatCommentaryText(c)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

// ─── TOC Modal ────────────────────────────────────────────────────────────────

interface TocModalProps {
  currentDay: number;
  openSeder: string | null;
  setOpenSeder: (s: string | null) => void;
  openMasechet: string | null;
  setOpenMasechet: (s: string | null) => void;
  onSelect: (day: number) => void;
  onClose: () => void;
}

function TocModal({
  currentDay,
  openSeder,
  setOpenSeder,
  openMasechet,
  setOpenMasechet,
  onSelect,
  onClose,
}: TocModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Seder list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {TALMUD_SEDARIM.map((seder) => {
            const masechtot = TALMUD_MASECHTOT.filter((m) => m.sederHe === seder.nameHe);
            const isOpen = openSeder === seder.nameHe;
            return (
              <div key={seder.nameHe} className="mb-1">
                {/* Seder accordion trigger */}
                <button
                  onClick={() => setOpenSeder(isOpen ? null : seder.nameHe)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-right font-semibold text-blue-950 transition hover:bg-blue-50"
                >
                  <span>{seder.nameHe}</span>
                  <span className="text-slate-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="mb-1 pl-2 pr-1">
                    {masechtot.map((m) => {
                      const isMOpen = openMasechet === m.sefariaName;
                      const firstDay = getDayFromDaf(m.sefariaName, 2);
                      return (
                        <div key={m.sefariaName} className="mb-0.5">
                          {/* Masechet trigger */}
                          <button
                            onClick={() => setOpenMasechet(isMOpen ? null : m.sefariaName)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm text-blue-800 transition hover:bg-blue-50"
                          >
                            <span>{m.nameHe}</span>
                            <span className="text-slate-400 text-xs">{isMOpen ? "▲" : "▼"}</span>
                          </button>

                          {/* Daf grid */}
                          {isMOpen && (
                            <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1">
                              {Array.from({ length: m.lastDaf - 1 }, (_, i) => {
                                const d = i + 2;
                                const day = firstDay + i;
                                const isCurrent = day === currentDay;
                                return (
                                  <button
                                    key={d}
                                    onClick={() => onSelect(day)}
                                    className={`rounded-lg px-2.5 py-1 text-sm transition ${
                                      isCurrent
                                        ? "bg-blue-900 text-white font-bold"
                                        : "bg-blue-50 text-blue-900 hover:bg-blue-100"
                                    }`}
                                  >
                                    {dafLabel(d)}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
