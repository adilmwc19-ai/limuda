"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import StudyTitleHeader, { StudyBottomNav } from "@/components/StudyTitleHeader";
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
import { fetchTehillimDay, type TehillimDayData, type TehillimVerse } from "@/lib/sefaria";

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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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

interface TehillimBookmark {
  bookId: "tehillim";
  day: number;          // day-in-month the bookmark was saved from
  psalmNumber: number;  // whole psalm/chapter — never a verse
}

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
  const [activeBookmark, setActiveBookmark] = useState<TehillimBookmark | null>(null);
  const [highlightedPsalm, setHighlightedPsalm] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

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
    const isActive =
      activeBookmark?.day === viewingDay && activeBookmark?.psalmNumber === psalmNumber;
    const next: TehillimBookmark | null = isActive
      ? null
      : { bookId: "tehillim", day: viewingDay, psalmNumber };
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

  const info = getTehillimDayInfo(viewingDay);
  const isCurrent = viewingDay === activeDay;
  const showDeficientNote =
    paceMode === "global" && viewingDay === 29 && currentHebrew.combineWithDay30;

  // "בחודש העברי" when synced to (or coinciding with) today's real Hebrew date;
  // "בסבב הלימוד החודשי" when browsing personal progress that doesn't match today.
  const matchesHebrewToday = viewingDay === currentHebrew.day;
  const dayModeLabel =
    paceMode === "global" || matchesHebrewToday
      ? `יום ${viewingDay} בחודש העברי`
      : `יום ${viewingDay} בסבב הלימוד החודשי`;

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
          unitLabel={info.description}
          bookLabel="תהלים יומי"
          badge={
            paceMode === "global" && <span className={HEADER_BADGE_CLASS}>לפי יום בחודש</span>
          }
          toolbar={
            <SegControl<PaceMode>
              options={[
                { value: "global", label: "לפי יום בחודש" },
                { value: "personal", label: "בקצב שלי" },
              ]}
              value={paceMode}
              onChange={handlePaceModeChange}
            />
          }
          pagination={{
            current: viewingDay,
            total: TOTAL_TEHILLIM_DAYS,
            onPrev: () => setViewingDay((d) => Math.max(1, d - 1)),
            onNext: () => setViewingDay((d) => Math.min(TOTAL_TEHILLIM_DAYS, d + 1)),
            prevDisabled: viewingDay <= 1,
            nextDisabled: viewingDay >= TOTAL_TEHILLIM_DAYS,
          }}
          chips={
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
                  onClick={() => setViewingDay(activeDay)}
                  className={CHIP_SECONDARY_CLASS}
                >
                  {paceMode === "global" ? "חזור להיום" : "חזור לנקודת הלימוד שלי"}
                </button>
              )}
            </>
          }
        />

        <p className="-mt-4 mb-6 text-center text-sm text-slate-400">{dayModeLabel}</p>

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
              dayData.psalms.map((psalm) => {
                const isBookmarked =
                  activeBookmark?.day === viewingDay && activeBookmark?.psalmNumber === psalm.number;
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
                    {user && (
                      <button
                        onClick={() => toggleBookmark(psalm.number)}
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
                    )}
                  </div>
                  {psalm.number === 119 ? (
                    <div className="space-y-6">
                      {groupPsalm119Verses(psalm.verses).map((group, gi) => (
                        <div key={`${group.letter}-${gi}`}>
                          <h4 className="mb-2 text-center text-xs font-semibold tracking-wide text-blue-400">
                            — אות {group.letter}׳ —
                          </h4>
                          <div className="space-y-2 text-lg font-medium leading-relaxed text-gray-800 lg:text-xl">
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
                    <div className="space-y-2 text-lg font-medium leading-relaxed text-gray-800 lg:text-xl">
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
              })
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

        <StudyBottomNav
          pagination={{
            current: viewingDay,
            total: TOTAL_TEHILLIM_DAYS,
            onPrev: () => setViewingDay((d) => Math.max(1, d - 1)),
            onNext: () => setViewingDay((d) => Math.min(TOTAL_TEHILLIM_DAYS, d + 1)),
            prevDisabled: viewingDay <= 1,
            nextDisabled: viewingDay >= TOTAL_TEHILLIM_DAYS,
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
          currentDay={viewingDay}
          onSelect={setViewingDay}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
