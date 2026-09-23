"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import StudyTitleHeader, { StudyBottomNav } from "@/components/StudyTitleHeader";
import DailyCompletionButton from "@/components/DailyCompletionButton";
import {
  HEADER_BADGE_CLASS,
  HEADER_ICON_BUTTON_CLASS,
  CHIP_PRIMARY_CLASS,
  CHIP_SECONDARY_CLASS,
} from "@/components/studyHeaderStyles";
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
          className={`px-3.5 py-2 text-sm font-medium transition md:px-4.5 md:py-2.5 md:text-base ${
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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

interface RambamBookmark {
  bookId: "rambam";
  chapterIndex: number;   // global chapter index (matches getRambamChapterByGlobalIndex)
  halakhahNumber: number;
}

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
  const [activeBookmark, setActiveBookmark] = useState<RambamBookmark | null>(null);
  const [highlightedHalakhah, setHighlightedHalakhah] = useState<number | null>(null);

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
        let savedBookmark: RambamBookmark | null = null;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.rambamChapter === "number" ? data.rambamChapter : 1;
          if (typeof data.rambamChapter !== "number") {
            await updateDoc(ref, { rambamChapter: 1 });
          }
          savedBookmark = (data.rambamBookmark as RambamBookmark | undefined) ?? null;
        } else {
          await setDoc(ref, { rambamChapter: 1 }, { merge: true });
        }
        setPersonalIndex(personalStart);
        setActiveBookmark(savedBookmark);
      } else {
        setPersonalIndex(1);
        setActiveBookmark(null);
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
  // settled. A saved bookmark takes priority — it's how "continue reading"
  // from the home card lands the reader straight back on their halakhah,
  // regardless of the global/personal pace default. If the calendar fetch
  // failed, fall back to personal mode so the page never gets stuck.
  useEffect(() => {
    if (initialized || authLoading || dailyLoading) return;
    if (activeBookmark) {
      setPaceMode("personal");
      setViewingIndex(activeBookmark.chapterIndex);
    } else if (dailyGlobalIndex !== null) {
      setViewingIndex(dailyGlobalIndex);
    } else {
      setPaceMode("personal");
      setViewingIndex(personalIndex);
    }
    setInitialized(true);
  }, [initialized, authLoading, dailyLoading, dailyGlobalIndex, personalIndex, activeBookmark]);

  // Auto-scroll to the bookmarked halakhah once its chapter has finished
  // loading, with a brief fading highlight so the reader's eye lands on it.
  useEffect(() => {
    if (!chapterData || chapterLoading) return;
    if (!activeBookmark || activeBookmark.chapterIndex !== viewingIndex) return;
    const el = document.getElementById(`rambam-halakhah-${activeBookmark.halakhahNumber}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedHalakhah(activeBookmark.halakhahNumber);
    const timer = setTimeout(() => setHighlightedHalakhah(null), 1500);
    return () => clearTimeout(timer);
  }, [chapterData, chapterLoading, activeBookmark, viewingIndex]);

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

  // ── Toggle bookmark on a halakhah ("עצרתי כאן") ──────────────────────────────

  function toggleBookmark(halakhahNumber: number) {
    if (!user) return;
    const isActive =
      activeBookmark?.chapterIndex === viewingIndex && activeBookmark?.halakhahNumber === halakhahNumber;
    const next: RambamBookmark | null = isActive
      ? null
      : { bookId: "rambam", chapterIndex: viewingIndex, halakhahNumber };
    setActiveBookmark(next);
    updateDoc(doc(db, "users", user.uid), { rambamBookmark: next }).catch((err: unknown) => {
      console.error("[rambam] bookmark save failed:", err instanceof Error ? err.message : err);
    });
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
      <StudyHeader
        headerActions={
          <button
            onClick={() => setTocOpen(true)}
            title="תוכן עניינים"
            aria-label="תוכן עניינים"
            className={HEADER_ICON_BUTTON_CLASS}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        }
      />

      {/* ── Content ── */}
      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <StudyTitleHeader
          unitLabel={`${loc.treatise.nameHe} פרק ${toHebrew(loc.chapter)}`}
          bookLabel={loc.book.nameHe}
          badge={
            paceMode === "global" && <span className={HEADER_BADGE_CLASS}>עולמי</span>
          }
          toolbar={
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
          }
          pagination={{
            current: viewingIndex,
            total: TOTAL_RAMBAM_CHAPTERS,
            onPrev: () => setViewingIndex((d) => Math.max(1, d - 1)),
            onNext: () => setViewingIndex((d) => Math.min(TOTAL_RAMBAM_CHAPTERS, d + 1)),
            prevDisabled: viewingIndex <= 1,
            nextDisabled: viewingIndex >= TOTAL_RAMBAM_CHAPTERS,
          }}
          chips={
            <>
              {user && paceMode === "personal" && !isCurrent && (
                <button
                  onClick={handleSetAsChapter}
                  disabled={settingChapter}
                  className={CHIP_PRIMARY_CLASS}
                >
                  {settingChapter ? "שומר..." : "📌 קבע כפרק הלימוד שלי"}
                </button>
              )}
              {!isCurrent && (
                <button
                  onClick={() => setViewingIndex(activeIndex)}
                  className={CHIP_SECONDARY_CLASS}
                >
                  {paceMode === "global" ? "חזור להיום" : "חזור לנקודת הלימוד שלי"}
                </button>
              )}
            </>
          }
        />

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
              <div className="space-y-3">
                {chapterData.halakhot.map((h) => {
                  const isBookmarked =
                    activeBookmark?.chapterIndex === viewingIndex && activeBookmark?.halakhahNumber === h.number;
                  const isHighlighted = highlightedHalakhah === h.number;
                  return (
                    <div
                      key={h.number}
                      id={`rambam-halakhah-${h.number}`}
                      className={`scroll-mt-24 flex items-start gap-2 rounded-xl border p-2 font-study text-2xl font-normal leading-[1.7] text-slate-900 antialiased transition-colors dark:text-slate-100 md:text-3xl ${
                        isBookmarked
                          ? "border-slate-200 border-r-4 border-r-blue-600 bg-blue-50/40 dark:border-r-blue-400 dark:bg-blue-950/30"
                          : "border-transparent"
                      } ${isHighlighted ? "study-highlight-pulse" : ""}`}
                    >
                      <p className="flex-1">
                        <span className="ml-2 font-bold text-blue-700 dark:text-blue-400">{toHebrew(h.number)}.</span>
                        {h.text}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(h.number); }}
                        title="עצרתי כאן"
                        aria-label={isBookmarked ? "בטל סימנייה" : "סמן כמקום שעצרתי"}
                        className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2.5 transition ${
                          isBookmarked
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-300 hover:text-blue-400"
                        }`}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={isBookmarked ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75V21l-6-3.6L6 21V3.75Z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        )}

        {/* "Set as my point" confirmation message — personal mode only */}
        {user && paceMode === "personal" && setChapterMsg && (
          <div className="flex justify-center pt-8">
            <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
              {setChapterMsg}
            </p>
          </div>
        )}

        <DailyCompletionButton
          trackId="rambam"
          onAdvance={
            user && paceMode === "personal" && isCurrent && viewingIndex < TOTAL_RAMBAM_CHAPTERS
              ? handleFinished
              : undefined
          }
        />

        <StudyBottomNav
          pagination={{
            current: viewingIndex,
            total: TOTAL_RAMBAM_CHAPTERS,
            onPrev: () => setViewingIndex((d) => Math.max(1, d - 1)),
            onNext: () => setViewingIndex((d) => Math.min(TOTAL_RAMBAM_CHAPTERS, d + 1)),
            prevDisabled: viewingIndex <= 1,
            nextDisabled: viewingIndex >= TOTAL_RAMBAM_CHAPTERS,
          }}
        />

        <footer className="mt-6 border-t border-slate-200 py-6 text-center">
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
