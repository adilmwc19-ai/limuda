"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  RAMBAM_BOOKS,
  TOTAL_RAMBAM_CHAPTERS,
  getRambamChapterByGlobalIndex,
  getRambamLocationInfo,
  findTreatiseBySefariaName,
  type RambamLocation,
} from "@/lib/rambamStructure";
import { fetchRambamChapter, getDailyRambamRef, type RambamChapterData } from "@/lib/sefaria";

// ─── Hebrew numerals (chapter / halakhah numbers) ─────────────────────────────

function toHebrew(n: number): string {
  if (n <= 0 || n > 1200) return String(n);
  const thousands = ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳", "ח׳", "ט׳", "י׳", "יא׳", "יב׳"];
  if (n >= 1000) return (thousands[Math.floor(n / 1000)] || "") + toHebrew(n % 1000 || 1000);
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const tens     = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const ones     = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (t === 1 && o === 5) return hundreds[h] + "טו" + (n > 15 ? "״" : "׳");
  if (t === 1 && o === 6) return hundreds[h] + "טז" + (n > 16 ? "״" : "׳");
  let result = hundreds[h] + tens[t] + ones[o];
  if (result.length > 1) result = result.slice(0, -1) + "״" + result.slice(-1);
  else result += "׳";
  return result;
}

// ─── Segmented control helper (shared visual language with the Talmud track) ─

function SegControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; disabled?: boolean; title?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-blue-200">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => !o.disabled && onChange(o.value)}
          disabled={o.disabled}
          title={o.title}
          className={`px-3 py-1 text-sm transition ${
            value === o.value
              ? "bg-blue-900 text-white"
              : o.disabled
              ? "bg-white text-slate-300 cursor-not-allowed"
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
  currentGlobalIndex: number;
  initialBookId: string | null;
  initialTreatiseId: string | null;
  onSelect: (globalIndex: number) => void;
  onClose: () => void;
}

function TocModal({ currentGlobalIndex, initialBookId, initialTreatiseId, onSelect, onClose }: TocModalProps) {
  const [openBook, setOpenBook] = useState<string | null>(initialBookId);
  const [openTreatise, setOpenTreatise] = useState<string | null>(initialTreatiseId);

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
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים — משנה תורה</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3" dir="rtl">
          {RAMBAM_BOOKS.map((book) => {
            const bookOpen = openBook === book.id;
            const totalChapters = book.treatises.reduce((s, t) => s + t.chapters, 0);
            return (
              <div key={book.id} className="mb-1">
                <button
                  onClick={() => setOpenBook(bookOpen ? null : book.id)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-right font-semibold text-blue-950 transition hover:bg-blue-50"
                >
                  <span>{book.nameHe}</span>
                  <span className="text-xs text-slate-400">
                    {totalChapters} פרקים
                    <span className="mr-2 text-slate-300">{bookOpen ? "▲" : "▼"}</span>
                  </span>
                </button>

                {bookOpen && (
                  <div className="mb-1 space-y-0.5 pl-2 pr-1">
                    {book.treatises.map((treatise) => {
                      const treatiseOpen = openTreatise === treatise.id;
                      return (
                        <div key={treatise.id} className="rounded-lg bg-slate-50/50">
                          <button
                            onClick={() => setOpenTreatise(treatiseOpen ? null : treatise.id)}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm text-blue-800 transition hover:bg-blue-50"
                          >
                            <span>{treatise.nameHe}</span>
                            <span className="text-xs text-slate-400">
                              {treatise.chapters} פרקים
                              <span className="mr-2 text-slate-300">{treatiseOpen ? "▲" : "▼"}</span>
                            </span>
                          </button>

                          {treatiseOpen && (
                            <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1">
                              {Array.from({ length: treatise.chapters }, (_, i) => {
                                const ch = i + 1;
                                const loc = getRambamLocationInfo(book.id, treatise.id, ch);
                                const isCurrent = loc?.globalIndex === currentGlobalIndex;
                                return (
                                  <button
                                    key={ch}
                                    onClick={() => {
                                      if (loc) onSelect(loc.globalIndex);
                                      onClose();
                                    }}
                                    className={`rounded-lg px-2.5 py-1 text-sm transition ${
                                      isCurrent
                                        ? "bg-blue-900 font-bold text-white"
                                        : "bg-white text-blue-900 hover:bg-blue-100 border border-blue-100"
                                    }`}
                                  >
                                    {toHebrew(ch)}
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

// ─── Main component ───────────────────────────────────────────────────────────

type PaceMode = "global" | "personal";

export default function StudyRambamClient() {
  const [user, setUser]                 = useState<User | null>(null);
  const [paceMode, setPaceMode]         = useState<PaceMode>("global");
  const [personalIndex, setPersonalIndex] = useState<number>(1); // Firestore rambamChapter
  const [viewingIndex, setViewingIndex] = useState<number>(1);
  const [chapterData, setChapterData]   = useState<RambamChapterData | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [completing, setCompleting]     = useState(false);
  const [settingChapter, setSettingChapter] = useState(false);
  const [setChapterMsg, setSetChapterMsg]   = useState<string | null>(null);
  const [tocOpen, setTocOpen]           = useState(false);

  // Global "Daily Rambam" sync (Sefaria calendar API)
  const [dailyGlobalIndex, setDailyGlobalIndex] = useState<number | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError]     = useState<string | null>(null);

  const [authLoading, setAuthLoading]   = useState(true);
  const [initialized, setInitialized]   = useState(false);

  // ── Auth + Firestore (personal progress) ────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let personalStart = 1;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.rambamChapter === "number" ? data.rambamChapter : 1;
          if (typeof data.rambamChapter !== "number") {
            await updateDoc(ref, { rambamChapter: 1 });
          }
        } else {
          await setDoc(ref, { rambamChapter: 1 }, { merge: true });
        }
        setPersonalIndex(personalStart);
      } else {
        setPersonalIndex(1);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Global Daily Rambam sync (Sefaria calendar API) ─────────────────────────

  useEffect(() => {
    let cancelled = false;
    getDailyRambamRef()
      .then((ref) => {
        const found = findTreatiseBySefariaName(ref.sefariaTreatise);
        if (!found) throw new Error(`לא נמצאה ההלכה "${ref.sefariaTreatise}" במבנה הרמב"ם המקומי`);
        const loc = getRambamLocationInfo(found.book.id, found.treatise.id, ref.chapter);
        if (!loc) throw new Error("שגיאה בחישוב מיקום הרמב\"ם היומי");
        if (!cancelled) setDailyGlobalIndex(loc.globalIndex);
      })
      .catch((e: unknown) => {
        if (!cancelled) setDailyError(e instanceof Error ? e.message : "שגיאה בטעינת הרמב\"ם היומי העולמי");
      })
      .finally(() => { if (!cancelled) setDailyLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Resolve the initial viewingIndex once both auth + the daily calendar have
  // settled, based on the default pace mode ("global"). If the calendar fetch
  // failed, fall back to personal mode so the page never gets stuck.
  useEffect(() => {
    if (initialized || authLoading || dailyLoading) return;
    if (dailyGlobalIndex !== null) {
      setViewingIndex(dailyGlobalIndex);
    } else {
      setPaceMode("personal");
      setViewingIndex(personalIndex);
    }
    setInitialized(true);
  }, [initialized, authLoading, dailyLoading, dailyGlobalIndex, personalIndex]);

  const activeIndex = paceMode === "global" ? (dailyGlobalIndex ?? personalIndex) : personalIndex;

  // Explicit handler: update pace mode + viewing index together, synchronously,
  // so the switch never leaves a stale chapter on screen.
  function handlePaceModeChange(mode: PaceMode) {
    setPaceMode(mode);
    if (mode === "personal") {
      setViewingIndex(personalIndex);
    } else if (dailyGlobalIndex !== null) {
      setViewingIndex(dailyGlobalIndex);
    }
  }

  // ── Fetch chapter on viewing index change ──────────────────────────────────

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    const loc = getRambamChapterByGlobalIndex(viewingIndex);
    setChapterData(null);
    setFetchError(null);
    setChapterLoading(true);

    fetchRambamChapter(loc.treatise.sefariaTreatise, loc.chapter)
      .then((data) => { if (!cancelled) setChapterData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "שגיאה בטעינת הפרק");
      })
      .finally(() => { if (!cancelled) setChapterLoading(false); });

    return () => { cancelled = true; };
  }, [viewingIndex, initialized]);

  // ── Set current chapter as personal starting point ─────────────────────────

  async function handleSetAsChapter() {
    if (!user || settingChapter) return;
    setSettingChapter(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { rambamChapter: viewingIndex });
      setPersonalIndex(viewingIndex);
      setSetChapterMsg("הפרק עודכן כנקודת הלימוד שלך ✓");
      setTimeout(() => setSetChapterMsg(null), 3000);
    } finally {
      setSettingChapter(false);
    }
  }

  // ── Mark finished — advance personal progress (personal mode only) ─────────

  async function handleFinished() {
    if (!user || completing || paceMode !== "personal") return;
    const nextIndex = Math.min(personalIndex + 1, TOTAL_RAMBAM_CHAPTERS);
    setCompleting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { rambamChapter: nextIndex });
      setPersonalIndex(nextIndex);
      setViewingIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setCompleting(false);
    }
  }

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
      </div>
    );
  }

  const loc: RambamLocation = getRambamChapterByGlobalIndex(viewingIndex);
  const isCurrent = viewingIndex === activeIndex;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-blue-950 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link href="/" className="text-sm text-blue-300 transition hover:text-white">→ ראשי</Link>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wide text-white">
              {loc.treatise.nameHe} &middot; פרק {toHebrew(loc.chapter)}
              {paceMode === "global" && (
                <span className="mr-2 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-normal">עולמי</span>
              )}
            </h1>
            <p className="text-xs text-blue-300">{loc.book.nameHe}</p>
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
                {
                  value: "global",
                  label: "רמב״ם יומי עולמי",
                  disabled: dailyGlobalIndex === null,
                  title: dailyGlobalIndex === null ? dailyError ?? "לא זמין" : undefined,
                },
                { value: "personal", label: "בקצב שלי" },
              ]}
              value={paceMode}
              onChange={handlePaceModeChange}
            />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewingIndex((d) => Math.max(1, d - 1))}
                disabled={viewingIndex <= 1}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                ←
              </button>
              <button
                onClick={() => setViewingIndex((d) => Math.min(TOTAL_RAMBAM_CHAPTERS, d + 1))}
                disabled={viewingIndex >= TOTAL_RAMBAM_CHAPTERS}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                →
              </button>
              <span className="mr-1 text-xs text-slate-400">
                פרק {viewingIndex} מתוך {TOTAL_RAMBAM_CHAPTERS}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {user && paceMode === "personal" && !isCurrent && (
              <button
                onClick={handleSetAsChapter}
                disabled={settingChapter}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
              >
                {settingChapter ? "שומר..." : "📌 קבע כפרק הלימוד שלי"}
              </button>
            )}
            {!isCurrent && (
              <button
                onClick={() => setViewingIndex(activeIndex)}
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
              {loc.book.nameHe} <span className="text-blue-300">◄</span> {loc.treatise.nameHe}{" "}
              <span className="text-blue-300">◄</span> פרק {toHebrew(loc.chapter)}
            </span>
          </button>
        </div>

        <div className="mb-6 text-center">
          <SegSummary loc={loc} />
        </div>

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : chapterLoading || !chapterData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            {chapterData.halakhot.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">אין טקסט זמין לפרק זה</p>
            ) : (
              <div className="space-y-4 leading-relaxed text-gray-800 text-base">
                {chapterData.halakhot.map((h) => (
                  <p key={h.number}>
                    <span className="ml-2 font-bold text-blue-700">{toHebrew(h.number)}.</span>
                    {h.text}
                  </p>
                ))}
              </div>
            )}
          </article>
        )}

        {/* Action row — personal mode only; hidden entirely in global mode */}
        {user && paceMode === "personal" && (
          <div className="flex flex-col items-center gap-2 pt-8">
            {isCurrent && viewingIndex < TOTAL_RAMBAM_CHAPTERS && (
              <button
                onClick={handleFinished}
                disabled={completing}
                className="rounded-xl bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
              >
                {completing ? "שומר..." : "סיימתי פרק זה ←"}
              </button>
            )}
            {setChapterMsg && (
              <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
                {setChapterMsg}
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
          currentGlobalIndex={viewingIndex}
          initialBookId={loc.book.id}
          initialTreatiseId={loc.treatise.id}
          onSelect={setViewingIndex}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}

function SegSummary({ loc }: { loc: RambamLocation }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-950">{loc.treatise.nameHe}</h2>
      <p className="mt-1 text-lg text-blue-700">פרק {toHebrew(loc.chapter)}</p>
      <p className="mt-1 text-sm text-slate-400">{loc.book.nameHe}</p>
    </div>
  );
}
