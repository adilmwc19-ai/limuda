"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Star } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import StudyTitleHeader, { StudyBottomNav } from "@/components/StudyTitleHeader";
import DailyCompletionButton from "@/components/DailyCompletionButton";
import TehillimChapterModal from "@/components/TehillimChapterModal";
import {
  HEADER_BADGE_CLASS,
  HEADER_ICON_BUTTON_CLASS,
  CHIP_PRIMARY_CLASS,
  CHIP_SECONDARY_CLASS,
} from "@/components/studyHeaderStyles";
import {
  TEHILLIM_DAYS,
  TOTAL_TEHILLIM_DAYS,
  getTehillimDayInfo,
  getCurrentHebrewDayOfMonth,
  toHebrewNumeral,
} from "@/lib/tehillimStructure";
import {
  fetchTehillimDay,
  fetchTehillimChapter,
  type TehillimDayData,
  type TehillimPsalmData,
  type TehillimVerse,
} from "@/lib/sefaria";
import { useReading } from "@/context/ReadingContext";
import { useScrollPositionRestore } from "@/hooks/useScrollPositionRestore";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useTehillimFavorites } from "@/hooks/useTehillimFavorites";

// ─── Psalm 119 verse grouping (8 verses per letter of the alef-bet) ───────────

const HEBREW_ALEFBET = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ", "ק", "ר", "ש", "ת"];

interface Psalm119Group {
  letter: string;
  verses: TehillimVerse[];
}

// Psalm 119 is built as 8 verses per letter of the Hebrew alphabet (176 = 22 × 8).
function groupPsalm119Verses(verses: TehillimVerse[]): Psalm119Group[] {
  const groups: Psalm119Group[] = [];
  for (const v of verses) {
    const letter = HEBREW_ALEFBET[Math.floor((v.verse - 1) / 8)] ?? "";
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) {
      last.verses.push(v);
    } else {
      groups.push({ letter, verses: [v] });
    }
  }
  return groups;
}

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
          className={`px-3.5 py-2 text-sm font-medium transition md:px-4.5 md:py-2.5 md:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-inset ${
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
            aria-label="סגור"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
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
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-inset ${
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

// Reverse lookup: which day contains a given psalm number. Psalm 119 spans
// two days (25, 26) — selecting it resolves to the first of the two.
function findDayForPsalm(psalmNumber: number): number {
  const range = TEHILLIM_DAYS.find((d) => psalmNumber >= d.fromPsalm && psalmNumber <= d.toPsalm);
  return range?.day ?? 1;
}

// ─── Main component ───────────────────────────────────────────────────────────

type PaceMode = "global" | "personal";
type ViewMode = "day" | "chapter";
const TOTAL_TEHILLIM_CHAPTERS = 150;

interface TehillimBookmark {
  bookId: "tehillim";
  day: number;          // day-in-month the bookmark was saved from
  psalmNumber: number;  // whole psalm/chapter — never a verse
}

export default function StudyTehillimClient() {
  const { fontSizeClass } = useReading();
  const [user, setUser]             = useState<User | null>(null);
  const [paceMode, setPaceMode]     = useState<PaceMode>("global");
  const [personalDay, setPersonalDay] = useState<number>(1); // Firestore tehillimDay
  const [viewingDay, setViewingDay] = useState<number>(1);
  const [dayData, setDayData]       = useState<TehillimDayData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewMode, setViewMode]           = useState<ViewMode>("day");
  const [viewingChapter, setViewingChapter] = useState<number>(1);
  const [chapterData, setChapterData]     = useState<TehillimPsalmData | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterFetchError, setChapterFetchError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [settingDay, setSettingDay] = useState(false);
  const [setDayMsg, setSetDayMsg]   = useState<string | null>(null);
  const [tocOpen, setTocOpen]       = useState(false);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [chapterModalInitialTab, setChapterModalInitialTab] = useState<"all" | "favorites">("all");
  const [activeBookmark, setActiveBookmark] = useState<TehillimBookmark | null>(null);
  const [highlightedPsalm, setHighlightedPsalm] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { favorites, isFavorite, toggleFavorite } = useTehillimFavorites();

  // Derived "today" based on the Hebrew calendar (pure/synchronous — no network call)
  const currentHebrew = getCurrentHebrewDayOfMonth();
  const activeDay = paceMode === "global" ? currentHebrew.day : personalDay;

  // ── Auth + Firestore (personal progress + saved bookmark) ──────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let personalStart = 1;
        let savedBookmark: TehillimBookmark | null = null;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.tehillimDay === "number" ? data.tehillimDay : 1;
          if (typeof data.tehillimDay !== "number") {
            await updateDoc(ref, { tehillimDay: 1 });
          }
          savedBookmark = (data.tehillimBookmark as TehillimBookmark | undefined) ?? null;
        } else {
          await setDoc(ref, { tehillimDay: 1 }, { merge: true });
        }
        setPersonalDay(personalStart);
        setActiveBookmark(savedBookmark);
      } else {
        setPersonalDay(1);
        setActiveBookmark(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Resolve the initial viewingDay once auth has settled. A saved bookmark
  // takes priority — it's how "continue reading" from the home card lands
  // the reader straight back on their psalm, regardless of the global/
  // personal pace default.
  useEffect(() => {
    if (initialized || loading) return;
    if (activeBookmark) {
      setPaceMode("personal");
      setViewingDay(activeBookmark.day);
    } else {
      setViewingDay(getCurrentHebrewDayOfMonth().day);
    }
    setInitialized(true);
  }, [initialized, loading, activeBookmark]);

  // Auto-scroll to the bookmarked psalm once its day has finished loading,
  // with a brief fading highlight so the reader's eye lands on it.
  useEffect(() => {
    if (!dayData || dayLoading) return;
    if (!activeBookmark || activeBookmark.day !== viewingDay) return;
    const el = document.getElementById(`psalm-${activeBookmark.psalmNumber}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedPsalm(activeBookmark.psalmNumber);
    const timer = setTimeout(() => setHighlightedPsalm(null), 1500);
    return () => clearTimeout(timer);
  }, [dayData, dayLoading, activeBookmark, viewingDay]);

  // Explicit handler: set both states synchronously so no stale-closure issue
  function handlePaceModeChange(mode: PaceMode) {
    setPaceMode(mode);
    setViewingDay(mode === "personal" ? (personalDay || 1) : getCurrentHebrewDayOfMonth().day);
  }

  // ── Fetch day on viewing day change ─────────────────────────────────────────

  useEffect(() => {
    if (!initialized) return;
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
  }, [viewingDay, initialized]);

  // ── Fetch a single chapter when browsing in single-chapter mode ─────────────

  useEffect(() => {
    if (!initialized || viewMode !== "chapter") return;
    let cancelled = false;
    setChapterData(null);
    setChapterFetchError(null);
    setChapterLoading(true);

    fetchTehillimChapter(viewingChapter)
      .then((data) => { if (!cancelled) setChapterData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setChapterFetchError(e instanceof Error ? e.message : "שגיאה בטעינת הפרק");
      })
      .finally(() => { if (!cancelled) setChapterLoading(false); });

    return () => { cancelled = true; };
  }, [viewingChapter, viewMode, initialized]);

  // Silently remember/restore scroll position within each day or single
  // chapter. An explicit "עצרתי כאן" bookmark takes priority when one
  // targets the day currently being viewed.
  const { resetScroll } = useScrollPositionRestore({
    trackId: "tehillim",
    itemId: !initialized ? null : viewMode === "day" ? viewingDay : `chapter-${viewingChapter}`,
    ready: viewMode === "day" ? !dayLoading && !!dayData : !chapterLoading && !!chapterData,
    skipRestore: !!activeBookmark && activeBookmark.day === viewingDay,
  });

  function goToPrevDay() {
    resetScroll();
    setViewingDay((d) => Math.max(1, d - 1));
  }

  function goToNextDay() {
    resetScroll();
    setViewingDay((d) => Math.min(TOTAL_TEHILLIM_DAYS, d + 1));
  }

  function goToPrevChapter() {
    resetScroll();
    setViewingChapter((c) => Math.max(1, c - 1));
  }

  function goToNextChapter() {
    resetScroll();
    setViewingChapter((c) => Math.min(TOTAL_TEHILLIM_CHAPTERS, c + 1));
  }

  function goToPrev() {
    if (viewMode === "chapter") goToPrevChapter();
    else goToPrevDay();
  }

  function goToNext() {
    if (viewMode === "chapter") goToNextChapter();
    else goToNextDay();
  }

  const swipeHandlers = useSwipeNavigation({
    onSwipeNext: goToNext,
    onSwipePrev: goToPrev,
    enabled: !tocOpen && !chapterModalOpen,
  });

  // ── Quick chapter selector ──────────────────────────────────────────────────
  // Selecting a specific psalm from the full 1–150 grid switches into
  // single-chapter mode, showing only that psalm — not its whole daily group.

  function openChapterModal(tab: "all" | "favorites") {
    setChapterModalInitialTab(tab);
    setChapterModalOpen(true);
  }

  function handleSelectChapter(psalmNumber: number) {
    resetScroll();
    setViewMode("chapter");
    setViewingChapter(psalmNumber);
    setChapterModalOpen(false);
  }

  // Leaves single-chapter mode and returns to the daily-group reading view.
  function handleBackToDailyView() {
    resetScroll();
    setViewMode("day");
  }

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

  // ── Toggle bookmark on a psalm/chapter ("עצרתי כאן") ────────────────────────

  function toggleBookmark(psalmNumber: number) {
    if (!user) return;
    // In single-chapter mode there's no "viewingDay" for this psalm — resolve
    // the daily-cycle day it actually belongs to, so the bookmark still
    // round-trips correctly into the daily view.
    const bookmarkDay = viewMode === "day" ? viewingDay : findDayForPsalm(psalmNumber);
    const isActive =
      activeBookmark?.day === bookmarkDay && activeBookmark?.psalmNumber === psalmNumber;
    const next: TehillimBookmark | null = isActive
      ? null
      : { bookId: "tehillim", day: bookmarkDay, psalmNumber };
    setActiveBookmark(next);
    updateDoc(doc(db, "users", user.uid), { tehillimBookmark: next }).catch((err: unknown) => {
      console.error("[tehillim] bookmark save failed:", err instanceof Error ? err.message : err);
    });
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
      resetScroll("smooth");
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

  const info = getTehillimDayInfo(viewingDay);
  const isCurrent = viewingDay === activeDay;
  const showDeficientNote =
    viewMode === "day" && paceMode === "global" && viewingDay === 29 && currentHebrew.combineWithDay30;

  // "בחודש העברי" when synced to (or coinciding with) today's real Hebrew date;
  // "בסבב הלימוד החודשי" when browsing personal progress that doesn't match today.
  const matchesHebrewToday = viewingDay === currentHebrew.day;
  const dayModeLabel =
    paceMode === "global" || matchesHebrewToday
      ? `יום ${toHebrewNumeral(viewingDay)} בחודש העברי`
      : `יום ${toHebrewNumeral(viewingDay)} בסבב הלימוד החודשי`;

  // Renders one psalm/chapter article — shared between the daily-group view
  // (a list of these) and single-chapter mode (exactly one of these).
  function renderPsalmArticle(psalm: TehillimPsalmData) {
    const bookmarkDay = viewMode === "day" ? viewingDay : findDayForPsalm(psalm.number);
    const isBookmarked =
      activeBookmark?.day === bookmarkDay && activeBookmark?.psalmNumber === psalm.number;
    const isHighlighted = highlightedPsalm === psalm.number;
    return (
      <article
        key={psalm.number}
        id={`psalm-${psalm.number}`}
        className={`scroll-mt-24 rounded-2xl border p-5 shadow-sm transition-colors ${
          isBookmarked
            ? "border-slate-200 border-r-4 border-r-blue-600 bg-blue-50/40 dark:border-r-blue-400 dark:bg-blue-950/30"
            : "border-blue-100 bg-white"
        } ${isHighlighted ? "study-highlight-pulse" : ""}`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-blue-900">תהלים פרק {toHebrewNumeral(psalm.number)}</h3>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => toggleFavorite(psalm.number)}
              title={isFavorite(psalm.number) ? "הסר ממועדפים" : "הוסף למועדפים"}
              aria-label={isFavorite(psalm.number) ? "הסר ממועדפים" : "הוסף למועדפים"}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 ${
                isFavorite(psalm.number)
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-slate-300 hover:text-amber-400"
              }`}
            >
              <Star
                width={18}
                height={18}
                strokeWidth={2}
                fill={isFavorite(psalm.number) ? "currentColor" : "none"}
              />
            </button>
            {user && (
              <button
                onClick={() => toggleBookmark(psalm.number)}
                title="עצרתי כאן"
                aria-label={isBookmarked ? "בטל סימנייה" : "סמן כמקום שעצרתי"}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 ${
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
            )}
          </div>
        </div>
        {psalm.number === 119 ? (
          <div className="space-y-6">
            {groupPsalm119Verses(psalm.verses).map((group, gi) => (
              <div key={`${group.letter}-${gi}`}>
                <h4 className="mb-2 text-center text-xs font-semibold tracking-wide text-blue-400">
                  — אות {group.letter}׳ —
                </h4>
                <div
                  className={`space-y-2 font-study font-normal text-slate-900 antialiased dark:text-slate-100 ${fontSizeClass}`}
                >
                  {group.verses.map((v) => (
                    <p key={v.verse}>
                      <span className="ml-2 text-xs font-bold text-blue-500 align-super">{v.verse}</span>
                      {v.text}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`space-y-2 font-study font-normal text-slate-900 antialiased dark:text-slate-100 ${fontSizeClass}`}
          >
            {psalm.verses.map((v) => (
              <p key={v.verse}>
                <span className="ml-2 text-xs font-bold text-blue-500 align-super">{v.verse}</span>
                {v.text}
              </p>
            ))}
          </div>
        )}
      </article>
    );
  }

  const paginationProps =
    viewMode === "day"
      ? {
          current: viewingDay,
          total: TOTAL_TEHILLIM_DAYS,
          onPrev: goToPrevDay,
          onNext: goToNextDay,
          prevDisabled: viewingDay <= 1,
          nextDisabled: viewingDay >= TOTAL_TEHILLIM_DAYS,
        }
      : {
          current: viewingChapter,
          total: TOTAL_TEHILLIM_CHAPTERS,
          onPrev: goToPrevChapter,
          onNext: goToNextChapter,
          prevDisabled: viewingChapter <= 1,
          nextDisabled: viewingChapter >= TOTAL_TEHILLIM_CHAPTERS,
        };

  return (
    <main
      className="flex min-h-screen flex-col bg-slate-50"
      dir="rtl"
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchEnd={swipeHandlers.onTouchEnd}
      onTouchCancel={swipeHandlers.onTouchCancel}
    >
      {/* ── Header ── */}
      <StudyHeader
        headerActions={
          <>
            <button
              onClick={() => openChapterModal("favorites")}
              title="פרקים מועדפים"
              aria-label={`פרקים מועדפים${favorites.length > 0 ? ` (${favorites.length})` : ""}`}
              className={`relative ${HEADER_ICON_BUTTON_CLASS}`}
            >
              <Star width={16} height={16} strokeWidth={2} aria-hidden="true" />
              {favorites.length > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-blue-950"
                >
                  {favorites.length}
                </span>
              )}
            </button>
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
          </>
        }
      />

      {/* ── Content ── */}
      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <StudyTitleHeader
          unitLabel={viewMode === "day" ? info.description : `פרק ${toHebrewNumeral(viewingChapter)}`}
          bookLabel={viewMode === "day" ? "תהלים יומי" : "תהלים"}
          badge={
            viewMode === "chapter" ? (
              <span className={HEADER_BADGE_CLASS}>לפי פרק</span>
            ) : (
              paceMode === "global" && <span className={HEADER_BADGE_CLASS}>לפי יום בחודש</span>
            )
          }
          onTitleClick={() => openChapterModal("all")}
          titleClickLabel="בחירת פרק"
          toolbar={
            viewMode === "day" && (
              <SegControl<PaceMode>
                options={[
                  { value: "global", label: "לפי יום בחודש" },
                  { value: "personal", label: "בקצב שלי" },
                ]}
                value={paceMode}
                onChange={handlePaceModeChange}
              />
            )
          }
          pagination={paginationProps}
          chips={
            viewMode === "chapter" ? (
              <button onClick={handleBackToDailyView} className={CHIP_SECONDARY_CLASS}>
                חזרה ללימוד היומי
              </button>
            ) : (
              <>
                {user && !isCurrent && (
                  <button
                    onClick={handleSetAsDay}
                    disabled={settingDay}
                    className={CHIP_PRIMARY_CLASS}
                  >
                    {settingDay ? "שומר..." : "📌 קבע כיום הלימוד שלי"}
                  </button>
                )}
                {!isCurrent && (
                  <button
                    onClick={() => { setViewMode("day"); setViewingDay(activeDay); }}
                    className={CHIP_SECONDARY_CLASS}
                  >
                    {paceMode === "global" ? "חזור להיום" : "חזור לנקודת הלימוד שלי"}
                  </button>
                )}
              </>
            )
          }
        />

        {favorites.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
            <h2 className="mb-2.5 flex items-center justify-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-300">
              <Star width={14} height={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
              פרקים מועדפים
            </h2>
            <div className="flex flex-wrap justify-center gap-2" role="list">
              {favorites
                .slice()
                .sort((a, b) => a - b)
                .map((n) => (
                  <button
                    key={n}
                    role="listitem"
                    onClick={() => handleSelectChapter(n)}
                    aria-label={`קרא פרק ${toHebrewNumeral(n)}`}
                    className="min-h-[36px] rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
                  >
                    {toHebrewNumeral(n)}
                  </button>
                ))}
            </div>
          </div>
        )}

        {viewMode === "day" && (
          <p className="-mt-4 mb-6 text-center text-sm text-slate-400">{dayModeLabel}</p>
        )}

        {showDeficientNote && (
          <div className="mb-6 flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
            <p>החודש העברי הנוכחי חסר (כ״ט ימים) — נהוג לקרוא היום גם את תהלים של יום ל׳.</p>
            <button
              onClick={() => setViewingDay(30)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
            >
              עבור ליום ל׳ ({getTehillimDayInfo(30).label})
            </button>
          </div>
        )}

        {viewMode === "chapter" ? (
          chapterFetchError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
              {chapterFetchError}
            </div>
          ) : chapterLoading || !chapterData ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">{renderPsalmArticle(chapterData)}</div>
          )
        ) : fetchError ? (
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
              dayData.psalms.map((psalm) => renderPsalmArticle(psalm))
            )}
          </div>
        )}

        {/* "Set as my point" confirmation message — personal mode only */}
        {user && paceMode === "personal" && setDayMsg && (
          <div className="flex justify-center pt-8">
            <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
              {setDayMsg}
            </p>
          </div>
        )}

        <DailyCompletionButton
          trackId="tehillim"
          onAdvance={
            viewMode === "day" && user && paceMode === "personal" && isCurrent ? handleFinished : undefined
          }
        />

        <StudyBottomNav pagination={paginationProps} />

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
          currentDay={viewingDay}
          onSelect={(day) => { setViewMode("day"); setViewingDay(day); }}
          onClose={() => setTocOpen(false)}
        />
      )}

      {/* ── Quick Chapter Selector Modal ── */}
      {chapterModalOpen && (
        <TehillimChapterModal
          currentChapterFrom={viewMode === "chapter" ? viewingChapter : info.fromPsalm}
          currentChapterTo={viewMode === "chapter" ? viewingChapter : info.toPsalm}
          favorites={favorites}
          initialTab={chapterModalInitialTab}
          onSelect={handleSelectChapter}
          onClose={() => setChapterModalOpen(false)}
        />
      )}
    </main>
  );
}
