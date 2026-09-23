"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import { HEADER_BUTTON_CLASS, HEADER_ICON_BUTTON_CLASS, HEADER_BADGE_CLASS } from "@/components/studyHeaderStyles";
import { getDayInfo, getDayFromBookChapter, getNakhBooks, TOTAL_DAYS } from "@/lib/tanakhMapping";
import { PARSHIYOT, getBookHebrewName } from "@/lib/tanakhStructure";
import { fetchChapterWithCommentaries, type ChapterData } from "@/lib/sefaria";
import { getCommentators } from "@/lib/commentators";

// ─── Hebrew numeral helper ────────────────────────────────────────────────────

const HUNDREDS = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
const TENS     = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const ONES     = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];

function toHebrew(num: number): string {
  if (num <= 0 || num > 999) return String(num);
  const h = Math.floor(num / 100);
  const r = num % 100;
  let to = r === 15 ? "טו" : r === 16 ? "טז" : TENS[Math.floor(r / 10)] + ONES[r % 10];
  const letters = HUNDREDS[h] + to;
  if (!letters) return String(num);
  return letters.length === 1 ? letters + "׳" : letters.slice(0, -1) + "״" + letters.slice(-1);
}

// ─── Commentary text formatter ───────────────────────────────────────────────

function formatCommentaryText(text: string): ReactNode {
  // HTML bold tags (defensive — sefaria.ts currently strips HTML)
  if (/<b\b|<strong\b/i.test(text)) {
    const match = text.match(/<(?:b|strong)\b[^>]*>(.*?)<\/(?:b|strong)>/i);
    if (match) {
      const dh = match[1].replace(/<[^>]*>/g, "").trim();
      const rest = text
        .replace(/<(?:b|strong)\b[^>]*>.*?<\/(?:b|strong)>/gi, "")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
        .replace(/&[a-zA-Z0-9#]+;/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      return (
        <>
          <strong className="font-bold text-gray-900">{dh}</strong>
          {rest && <> {rest}</>}
        </>
      );
    }
  }

  // En-dash or em-dash (include separator in bold per spec)
  const dashMatch = text.match(/^(.{1,60}?[–—])\s*(.+)/);
  if (dashMatch) {
    return (
      <>
        <strong className="font-bold text-gray-900">{dashMatch[1]}</strong>
        {" "}
        {dashMatch[2]}
      </>
    );
  }

  // Period after 1–5 words (DH includes the period)
  const dotMatch = text.match(/^((?:\S+\s+){0,4}\S+\.)\s+(.+)/);
  if (dotMatch && dotMatch[1].length <= 60) {
    return (
      <>
        <strong className="font-bold text-gray-900">{dotMatch[1]}</strong>
        {" "}
        {dotMatch[2]}
      </>
    );
  }

  // Hyphen or Hebrew maqaf with surrounding spaces
  const hyphenMatch = text.match(/^(.{1,60}?\s[-־])\s(.+)/);
  if (hyphenMatch) {
    return (
      <>
        <strong className="font-bold text-gray-900">{hyphenMatch[1]}</strong>
        {" "}
        {hyphenMatch[2]}
      </>
    );
  }

  return text;
}

// ─── TOC Modal ────────────────────────────────────────────────────────────────

const NAKH_BOOKS = getNakhBooks();

interface TocModalProps {
  viewingDay: number;
  initialTab: "torah" | "nakh";
  initialParasha: string | null;
  initialBook: string | null;
  onSelectDay: (day: number) => void;
  onClose: () => void;
}

function TocModal({ viewingDay, initialTab, initialParasha, initialBook, onSelectDay, onClose }: TocModalProps) {
  const [tab, setTab] = useState<"torah" | "nakh">(initialTab);
  const [expandedParasha, setExpandedParasha] = useState<string | null>(initialParasha);
  const [expandedBook, setExpandedBook] = useState<string | null>(initialBook);

  // Close on Escape + lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function handleSelectDay(day: number) {
    onSelectDay(day);
    onClose();
  }

  const chapterBtn = (bookEn: string, ch: number) => {
    const day = getDayFromBookChapter(bookEn, ch);
    const isCurrent = day === viewingDay;
    return (
      <button
        key={ch}
        onClick={() => handleSelectDay(day)}
        title={`יום ${day}`}
        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
          isCurrent
            ? "bg-blue-950 text-white shadow"
            : "bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-950"
        }`}
      >
        {toHebrew(ch)}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="תוכן עניינים"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים</h2>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(["torah", "nakh"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                tab === t
                  ? "border-b-2 border-blue-950 text-blue-950"
                  : "text-slate-500 hover:text-blue-800"
              }`}
            >
              {t === "torah" ? "תורה" : 'נ"ך'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {/* ── Torah tab ── */}
          {tab === "torah" && (
            <div className="space-y-1" dir="rtl">
              {PARSHIYOT.map((p) => {
                const open = expandedParasha === p.nameHe;
                return (
                  <div key={p.nameHe} className="rounded-xl border border-slate-100">
                    <button
                      onClick={() => setExpandedParasha(open ? null : p.nameHe)}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-right hover:bg-slate-50 transition"
                    >
                      <span className="font-semibold text-blue-950">פרשת {p.nameHe}</span>
                      <span className="text-xs text-slate-400">
                        {getBookHebrewName(p.bookEn)} {toHebrew(p.startChapter)}
                        {p.endChapter > p.startChapter && `–${toHebrew(p.endChapter)}`}
                        <span className="mr-2 text-slate-300">{open ? "▲" : "▼"}</span>
                      </span>
                    </button>
                    {open && (
                      <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
                        {Array.from({ length: p.endChapter - p.startChapter + 1 }, (_, i) =>
                          chapterBtn(p.bookEn, p.startChapter + i)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Nakh tab ── */}
          {tab === "nakh" && (
            <div className="space-y-1" dir="rtl">
              {NAKH_BOOKS.map((book) => {
                const open = expandedBook === book.sefariaName;
                return (
                  <div key={book.sefariaName} className="rounded-xl border border-slate-100">
                    <button
                      onClick={() => setExpandedBook(open ? null : book.sefariaName)}
                      className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-right hover:bg-slate-50 transition"
                    >
                      <span className="font-semibold text-blue-950">{book.hebrewName}</span>
                      <span className="text-xs text-slate-400">
                        {book.chapters} פרקים
                        <span className="mr-2 text-slate-300">{open ? "▲" : "▼"}</span>
                      </span>
                    </button>
                    {open && (
                      <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
                        {Array.from({ length: book.chapters }, (_, i) =>
                          chapterBtn(book.sefariaName, i + 1)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudyTanakhClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [viewingDay, setViewingDay] = useState(0);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [expandedVerses, setExpandedVerses] = useState<Set<number>>(new Set());
  const [showAllCommentaries, setShowAllCommentaries] = useState(false);
  const [activeCommentator, setActiveCommentator] = useState("rashi");
  const [tocOpen, setTocOpen] = useState(false);
  const [tocInitialTab, setTocInitialTab] = useState<"torah" | "nakh">("torah");
  const [tocInitialParasha, setTocInitialParasha] = useState<string | null>(null);
  const [tocInitialBook, setTocInitialBook] = useState<string | null>(null);
  const [activeBookmark, setActiveBookmark] = useState<{ day: number; verse: number } | null>(null);

  // Auth + load user day
  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) { router.replace("/"); return; }
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (cancelled) return;
      const userDay = (snap.data()?.tanakh929Day as number | undefined) ?? 1;
      const savedBookmark = snap.data()?.tanakhBookmark as { day: number; verse: number } | undefined;
      setUser(fbUser);
      setActiveDay(userDay);
      setViewingDay(userDay);
      setActiveBookmark(savedBookmark ?? null);
      setPageLoading(false);
    });
    return () => { cancelled = true; unsub(); };
  }, [router]);

  // Auto-scroll to the bookmarked verse once its chapter has finished loading
  useEffect(() => {
    if (!chapterData || chapterLoading) return;
    if (!activeBookmark || activeBookmark.day !== viewingDay) return;
    const el = document.getElementById(`tanakh-verse-${activeBookmark.verse}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [chapterData, chapterLoading, activeBookmark, viewingDay]);

  // Fetch chapter on viewing day change
  useEffect(() => {
    if (!user || viewingDay === 0) return;
    let cancelled = false;
    const dayInfo = getDayInfo(viewingDay);
    setChapterLoading(true);
    setFetchError(false);
    setChapterData(null);
    setExpandedVerses(new Set());
    setShowAllCommentaries(false);

    fetchChapterWithCommentaries(dayInfo.book.sefariaName, dayInfo.chapter)
      .then((d) => { if (!cancelled) setChapterData(d); })
      .catch((err: unknown) => {
        console.error("[study] fetch failed:", err instanceof Error ? err.message : err);
        if (!cancelled) setFetchError(true);
      })
      .finally(() => { if (!cancelled) setChapterLoading(false); });

    return () => { cancelled = true; };
  }, [user, viewingDay]);

  // Reset commentator if not available in current book
  useEffect(() => {
    if (!chapterData) return;
    const ids = new Set(chapterData.commentators.map((c) => c.id));
    if (!ids.has(activeCommentator)) setActiveCommentator("rashi");
  }, [chapterData, activeCommentator]);

  function toggleVerse(num: number) {
    setExpandedVerses((prev) => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  }

  function toggleBookmark(verseNumber: number) {
    if (!user) return;
    const isActive = activeBookmark?.day === viewingDay && activeBookmark?.verse === verseNumber;
    const next = isActive ? null : { day: viewingDay, verse: verseNumber };
    setActiveBookmark(next);
    updateDoc(doc(db, "users", user.uid), { tanakhBookmark: next }).catch((err: unknown) => {
      console.error("[study] bookmark save failed:", err instanceof Error ? err.message : err);
    });
  }

  async function handleComplete() {
    if (!user || viewingDay !== activeDay) return;
    setCompleting(true);
    const nextDay = Math.min(activeDay + 1, TOTAL_DAYS);
    await updateDoc(doc(db, "users", user.uid), { tanakh929Day: nextDay });
    setActiveDay(nextDay);
    setViewingDay(nextDay);
    setCompleting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleOpenToc() {
    if (!dayInfo) { setTocOpen(true); return; }
    const { isTorah } = getCommentators(dayInfo.book.sefariaName);
    if (isTorah) {
      const parasha = PARSHIYOT.find(
        (p) =>
          p.bookEn === dayInfo.book.sefariaName &&
          dayInfo.chapter >= p.startChapter &&
          dayInfo.chapter <= p.endChapter
      );
      setTocInitialTab("torah");
      setTocInitialParasha(parasha?.nameHe ?? null);
      setTocInitialBook(null);
    } else {
      setTocInitialTab("nakh");
      setTocInitialBook(dayInfo.book.sefariaName);
      setTocInitialParasha(null);
    }
    setTocOpen(true);
  }

  const dayInfo = viewingDay > 0 ? getDayInfo(viewingDay) : null;
  const isCurrentDay = viewingDay === activeDay;

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      {dayInfo && (
        <StudyHeader
          headerActions={
            <>
              <button
                onClick={handleOpenToc}
                title="תוכן עניינים"
                className={HEADER_ICON_BUTTON_CLASS}
                aria-label="תוכן עניינים"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setShowAllCommentaries((p) => !p)}
                title={showAllCommentaries ? "הסתר פירושים" : "הצג פירושים"}
                aria-label={showAllCommentaries ? "הסתר פירושים" : "הצג פירושים"}
                className={HEADER_BUTTON_CLASS}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="hidden md:inline">{showAllCommentaries ? "הסתר פירושים" : "הצג פירושים"}</span>
              </button>
            </>
          }
        />
      )}

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Chapter title + TOC button */}
        {dayInfo && (
          <div className="mb-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <h1 className="text-3xl font-bold text-blue-950 dark:text-blue-100">{dayInfo.book.hebrewName}</h1>
              {!isCurrentDay && <span className={HEADER_BADGE_CLASS}>צפייה</span>}
            </div>
            <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xl font-semibold text-blue-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-blue-300">
              פרק {dayInfo.chapter}
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {dayInfo.book.sefariaName} {dayInfo.chapter} &bull; יום {viewingDay} מתוך {TOTAL_DAYS}
            </p>
            <button
              onClick={handleOpenToc}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-950 shadow-sm hover:bg-blue-50 transition"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              בחר פרק / תוכן עניינים
            </button>
          </div>
        )}

        {chapterLoading && (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        )}

        {fetchError && !chapterLoading && (
          <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">
            שגיאה בטעינת הפרק. אנא בדוק חיבור לאינטרנט ונסה שנית.
          </div>
        )}

        {/* Verse list */}
        {chapterData && !chapterLoading && (
          <div className="space-y-4">
            {chapterData.verses.map((verse) => {
              const hasAnyContent = Object.values(verse.commentaries).some((a) => a.length > 0);
              const commentaryOpen = hasAnyContent && (showAllCommentaries || expandedVerses.has(verse.verseNumber));
              const isBookmarked = activeBookmark?.day === viewingDay && activeBookmark?.verse === verse.verseNumber;
              return (
                <div
                  key={verse.verseNumber}
                  id={`tanakh-verse-${verse.verseNumber}`}
                  className={`scroll-mt-20 overflow-hidden rounded-2xl border shadow-sm transition ${
                    isBookmarked
                      ? "border-slate-200 border-r-4 border-r-blue-600 bg-blue-50/40 dark:border-r-blue-400 dark:bg-blue-950/30"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div
                    className={`p-4 ${hasAnyContent ? "cursor-pointer hover:bg-slate-50 active:bg-slate-100" : ""}`}
                    onClick={() => hasAnyContent && toggleVerse(verse.verseNumber)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-2 shrink-0 text-sm font-bold text-blue-400" dir="rtl">
                        {toHebrew(verse.verseNumber)}
                      </span>
                      <p
                        className="flex-1 text-right font-serif text-xl font-medium leading-loose text-slate-800 antialiased md:text-2xl"
                        dir="rtl"
                        dangerouslySetInnerHTML={{ __html: verse.text }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(verse.verseNumber); }}
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
                    {hasAnyContent && (
                      <div className="mt-1 text-left">
                        <span className="text-xs text-blue-400">
                          {commentaryOpen ? "▲ הסתר פירוש" : "▼ פירוש"}
                        </span>
                      </div>
                    )}
                  </div>

                  {commentaryOpen && (
                    <div className="border-t border-amber-200 bg-amber-50" onClick={(e) => e.stopPropagation()}>
                      {/* Commentator tabs */}
                      <div className="flex gap-1 overflow-x-auto border-b border-amber-200 px-3 pt-2">
                        {chapterData.commentators.map((c) => {
                          const hasContent = (verse.commentaries[c.id]?.length ?? 0) > 0;
                          const isActive = activeCommentator === c.id;
                          return (
                            <button
                              key={c.id}
                              onClick={() => setActiveCommentator(c.id)}
                              className={`shrink-0 rounded-t-lg px-3 py-1.5 text-xs font-medium transition ${
                                isActive
                                  ? "bg-white text-amber-900 shadow-sm ring-1 ring-amber-200"
                                  : hasContent
                                  ? "text-amber-700 hover:bg-amber-100"
                                  : "text-amber-300"
                              }`}
                            >
                              {c.nameHe}
                            </button>
                          );
                        })}
                      </div>
                      <div className="p-4">
                        {(verse.commentaries[activeCommentator] ?? []).length === 0 ? (
                          <p className="text-right text-sm text-amber-400" dir="rtl">
                            אין פירוש לפסוק זה
                          </p>
                        ) : (
                          <div>
                            {(verse.commentaries[activeCommentator] ?? []).map((comment, i) => (
                              <p key={i} className="mb-2 last:mb-0 text-right text-sm leading-7 text-amber-900" dir="rtl">
                                {formatCommentaryText(comment)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom controls */}
        {chapterData && !chapterLoading && (
          <div className="my-12 flex flex-col items-center gap-6">
            {isCurrentDay && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="rounded-2xl bg-blue-950 px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
              >
                {completing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    שומר התקדמות...
                  </span>
                ) : activeDay >= TOTAL_DAYS ? (
                  'סיימתי את כל התנ"ך!'
                ) : (
                  "סיימתי את הלימוד היומי"
                )}
              </button>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewingDay((d) => Math.max(1, d - 1))}
                disabled={viewingDay <= 1}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-950 shadow-sm transition hover:bg-blue-50 disabled:opacity-40"
              >
                &larr; היום הקודם
              </button>
              <span className="min-w-[4rem] text-center text-sm text-slate-400">יום {viewingDay}</span>
              <button
                onClick={() => setViewingDay((d) => Math.min(TOTAL_DAYS, d + 1))}
                disabled={viewingDay >= TOTAL_DAYS}
                className="flex min-h-[44px] items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-950 shadow-sm transition hover:bg-blue-50 disabled:opacity-40"
              >
                היום הבא &rarr;
              </button>
            </div>
          </div>
        )}

        <footer className="mt-4 border-t border-slate-200 py-6 text-center">
          <p className="text-sm text-slate-400">
            טקסטים באדיבות{" "}
            <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              ספריא (Sefaria)
            </a>
          </p>
        </footer>
      </div>

      {/* TOC Modal */}
      {tocOpen && (
        <TocModal
          viewingDay={viewingDay}
          initialTab={tocInitialTab}
          initialParasha={tocInitialParasha}
          initialBook={tocInitialBook}
          onSelectDay={setViewingDay}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
