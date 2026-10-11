"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import StudyTitleHeader, { StudyBottomNav } from "@/components/StudyTitleHeader";
import DailyCompletionButton from "@/components/DailyCompletionButton";
import {
  HEADER_BUTTON_CLASS,
  HEADER_BADGE_CLASS,
  CHIP_PRIMARY_CLASS,
  CHIP_SECONDARY_CLASS,
} from "@/components/studyHeaderStyles";
import {
  TALMUD_MASECHTOT,
  TALMUD_SEDARIM,
  TOTAL_TALMUD_DAYS,
  getDafInfo,
  getDayFromDaf,
  getCurrentDafYomiDay,
} from "@/lib/talmudStructure";
import {
  fetchTalmudDaf,
  stripTalmudPunctuation,
  type TalmudDafData,
  type TalmudAmudData,
} from "@/lib/sefaria";
import { useScrollPositionRestore } from "@/hooks/useScrollPositionRestore";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

// ─── Hebrew numerals ──────────────────────────────────────────────────────────

function toHebrew(n: number): string {
  if (n <= 0 || n > 1200) return String(n);
  const thousands = ["", "א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ז׳", "ח׳", "ט׳", "י׳", "יא׳", "יב׳"];
  if (n >= 1000) return (thousands[Math.floor(n / 1000)] || "") + toHebrew(n % 1000 || 1000);
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const tens     = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const ones     = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  let h = Math.floor(n / 100);
  let t = Math.floor((n % 100) / 10);
  let o = n % 10;
  if (t === 1 && o === 5) { t = 0; o = 0; return hundreds[h] + "טו" + (n > 15 ? "״" : "׳"); }
  if (t === 1 && o === 6) { t = 0; o = 0; return hundreds[h] + "טז" + (n > 16 ? "״" : "׳"); }
  let result = hundreds[h] + tens[t] + ones[o];
  if (result.length > 1) result = result.slice(0, -1) + "״" + result.slice(-1);
  else result += "׳";
  return result;
}

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
          ) : p
        )}
      </>
    );
  }
  const dashMatch = text.match(/^(.{1,60}?[–—])\s*(.+)/);
  if (dashMatch)
    return (<><strong className="font-bold text-gray-900">{dashMatch[1]}</strong>{" "}{dashMatch[2]}</>);
  const dotMatch = text.match(/^((?:\S+\s+){0,4}\S+\.)\s+(.+)/);
  if (dotMatch && dotMatch[1].length <= 60)
    return (<><strong className="font-bold text-gray-900">{dotMatch[1]}</strong>{" "}{dotMatch[2]}</>);
  const hyphenMatch = text.match(/^(.{1,60}?\s[-־])\s(.+)/);
  if (hyphenMatch)
    return (<><strong className="font-bold text-gray-900">{hyphenMatch[1]}</strong>{" "}{hyphenMatch[2]}</>);
  return text;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PaceMode     = "global" | "personal";
type LayoutMode   = "tabs" | "columns";
type CommentatorKey = "rashi" | "tosafot";
type DisplayMode  = "nikud" | "vilna";

// ─── Segmented control helper ─────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudyTalmudClient() {
  const [user, setUser]             = useState<User | null>(null);
  const [paceMode, setPaceMode]     = useState<PaceMode>("global");
  const [personalDay, setPersonalDay] = useState<number>(1);   // Firestore value
  const [viewingDay, setViewingDay] = useState<number>(1);
  const [dafData, setDafData]       = useState<TalmudDafData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [commentator, setCommentator] = useState<CommentatorKey>("rashi");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("nikud");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("tabs");
  const [isTocOpen, setIsTocOpen]     = useState(false);
  const [finishing, setFinishing]     = useState(false);
  const [settingDaf, setSettingDaf]   = useState(false);
  const [setDafMsg, setSetDafMsg]     = useState<string | null>(null);

  // TOC accordion state
  const [openSeder, setOpenSeder]       = useState<string | null>(null);
  const [openMasechet, setOpenMasechet] = useState<string | null>(null);

  // Derived "today" based on pace mode
  const globalDay = getCurrentDafYomiDay();
  const activeDay = paceMode === "global" ? globalDay : personalDay;

  // ── Auth + Firestore ────────────────────────────────────────────────────────

  useEffect(() => {
    const globalNow = getCurrentDafYomiDay();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let personalStart = 1;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          if (data.talmudPersonalInitialized === true && typeof data.talmudDafYomiDay === "number") {
            // Trusted value: user has an explicitly initialized personal progress
            personalStart = data.talmudDafYomiDay;
          } else {
            // Flag absent → either first visit OR wrong migration value (getCurrentDafYomiDay).
            // Reset to 1 and mark as properly initialized.
            await updateDoc(ref, { talmudDafYomiDay: 1, talmudPersonalInitialized: true });
            personalStart = 1;
          }
        } else {
          await setDoc(ref, { talmudDafYomiDay: 1, talmudPersonalInitialized: true }, { merge: true });
          personalStart = 1;
        }
        setPersonalDay(personalStart);
        setViewingDay(globalNow);
      } else {
        setPersonalDay(1);
        setViewingDay(globalNow);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Explicit handler: set both states synchronously so no stale-closure issue
  function handlePaceModeChange(mode: PaceMode) {
    setPaceMode(mode);
    setViewingDay(mode === "personal" ? (personalDay || 1) : getCurrentDafYomiDay());
  }

  // ── Fetch daf ──────────────────────────────────────────────────────────────

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

  // Silently remember/restore scroll position within each daf.
  const { resetScroll } = useScrollPositionRestore({
    trackId: "talmud",
    itemId: viewingDay,
    ready: !loading && !!dafData,
  });

  function goToPrevDay() {
    resetScroll();
    setViewingDay((d) => Math.max(1, d - 1));
  }

  function goToNextDay() {
    resetScroll();
    setViewingDay((d) => Math.min(TOTAL_TALMUD_DAYS, d + 1));
  }

  const swipeHandlers = useSwipeNavigation({
    onSwipeNext: goToNextDay,
    onSwipePrev: goToPrevDay,
    enabled: !isTocOpen,
  });

  // ── Set current daf as personal starting point ─────────────────────────────

  async function handleSetAsDaf() {
    if (!user || settingDaf) return;
    setSettingDaf(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        talmudDafYomiDay: viewingDay,
        talmudPersonalInitialized: true,
      });
      setPersonalDay(viewingDay);
      setSetDafMsg("הדף עודכן כנקודת הלימוד שלך ✓");
      setTimeout(() => setSetDafMsg(null), 3000);
    } finally {
      setSettingDaf(false);
    }
  }

  // ── Mark finished (personal mode only) ────────────────────────────────────

  async function handleFinished() {
    if (!user || finishing || paceMode !== "personal") return;
    const nextDay = viewingDay < TOTAL_TALMUD_DAYS ? viewingDay + 1 : viewingDay;
    setFinishing(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { talmudDafYomiDay: nextDay, talmudPersonalInitialized: true });
      setPersonalDay(nextDay);
      setViewingDay(nextDay);
      resetScroll("smooth");
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
    <main
      className="flex min-h-screen flex-col bg-slate-50"
      dir="rtl"
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchEnd={swipeHandlers.onTouchEnd}
      onTouchCancel={swipeHandlers.onTouchCancel}
    >
      {/* ── Header ── */}
      <StudyHeader
        maxWidthClassName="max-w-5xl"
        headerActions={
          <button
            onClick={() => setIsTocOpen(true)}
            title="תוכן עניינים"
            aria-label="תוכן עניינים"
            className={HEADER_BUTTON_CLASS}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span className="hidden md:inline">תוכן עניינים</span>
          </button>
        }
      />

      {/* ── Content ── */}
      <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 space-y-8">
        <StudyTitleHeader
          unitLabel={`${info.masechetHe} ${dafLabel(info.dafNumber)}`}
          bookLabel="דף יומי"
          maxWidthClassName="max-w-5xl"
          badge={
            paceMode === "global" && <span className={HEADER_BADGE_CLASS}>עולמי</span>
          }
          toolbar={
            <>
              <SegControl<PaceMode>
                options={[
                  { value: "global",   label: "דף יומי עולמי" },
                  { value: "personal", label: "בקצב שלי" },
                ]}
                value={paceMode}
                onChange={handlePaceModeChange}
              />
              <SegControl<DisplayMode>
                options={[
                  { value: "nikud", label: "עם ניקוד" },
                  { value: "vilna", label: "וילנא" },
                ]}
                value={displayMode}
                onChange={setDisplayMode}
              />
              <SegControl<LayoutMode>
                options={[
                  { value: "tabs",    label: "כרטיסיות" },
                  { value: "columns", label: "עמודות וילנא" },
                ]}
                value={layoutMode}
                onChange={setLayoutMode}
              />
              {layoutMode === "tabs" && (
                <SegControl<CommentatorKey>
                  options={[
                    { value: "rashi",   label: 'רש"י' },
                    { value: "tosafot", label: "תוספות" },
                  ]}
                  value={commentator}
                  onChange={setCommentator}
                />
              )}
            </>
          }
          pagination={{
            current: viewingDay,
            total: TOTAL_TALMUD_DAYS,
            onPrev: goToPrevDay,
            onNext: goToNextDay,
            prevDisabled: viewingDay <= 1,
            nextDisabled: viewingDay >= TOTAL_TALMUD_DAYS,
          }}
          chips={
            <>
              {user && paceMode === "personal" && !isToday && (
                <button
                  onClick={handleSetAsDaf}
                  disabled={settingDaf}
                  className={CHIP_PRIMARY_CLASS}
                >
                  {settingDaf ? "שומר..." : "📌 קבע כנקודת הלימוד שלי"}
                </button>
              )}
              {!isToday && (
                <button
                  onClick={() => setViewingDay(activeDay)}
                  className={CHIP_SECONDARY_CLASS}
                >
                  חזור להיום
                </button>
              )}
            </>
          }
        />

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : !dafData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Amud Alef */}
            <AmudSection
              amud={dafData.amudAlef}
              label={`${dafLabel(dafData.dafNumber)} ע"א`}
              commentator={commentator}
              displayMode={displayMode}
              layoutMode={layoutMode}
            />
            {/* Amud Bet */}
            <AmudSection
              amud={dafData.amudBet}
              label={`${dafLabel(dafData.dafNumber)} ע"ב`}
              commentator={commentator}
              displayMode={displayMode}
              layoutMode={layoutMode}
            />

            {/* "Set as my point" confirmation message — personal mode only */}
            {user && paceMode === "personal" && setDafMsg && (
              <div className="flex justify-center pt-2">
                <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
                  {setDafMsg}
                </p>
              </div>
            )}

            <DailyCompletionButton
              trackId="talmud"
              onAdvance={
                user && paceMode === "personal" && isToday && viewingDay < TOTAL_TALMUD_DAYS
                  ? handleFinished
                  : undefined
              }
            />

            <StudyBottomNav
              pagination={{
                current: viewingDay,
                total: TOTAL_TALMUD_DAYS,
                onPrev: goToPrevDay,
                onNext: goToNextDay,
                prevDisabled: viewingDay <= 1,
                nextDisabled: viewingDay >= TOTAL_TALMUD_DAYS,
              }}
            />
          </>
        )}
      </section>

      {/* ── TOC Modal ── */}
      {isTocOpen && (
        <TocModal
          currentDay={viewingDay}
          openSeder={openSeder}
          setOpenSeder={setOpenSeder}
          openMasechet={openMasechet}
          setOpenMasechet={setOpenMasechet}
          onSelect={(day) => { setViewingDay(day); setIsTocOpen(false); }}
          onClose={() => setIsTocOpen(false)}
        />
      )}
    </main>
  );
}

// ─── Amud section (tabs + columns) ───────────────────────────────────────────

interface AmudSectionProps {
  amud: TalmudAmudData;
  label: string;
  commentator: CommentatorKey;
  displayMode: DisplayMode;
  layoutMode: LayoutMode;
}

function AmudSection({ amud, label, commentator, displayMode, layoutMode }: AmudSectionProps) {
  const gemara = displayMode === "vilna"
    ? amud.text.map(stripTalmudPunctuation)
    : amud.text;
  const rashiComments   = displayMode === "vilna" ? amud.rashi.map(stripTalmudPunctuation)   : amud.rashi;
  const tosafotComments = displayMode === "vilna" ? amud.tosafot.map(stripTalmudPunctuation) : amud.tosafot;

  const GemaraBlock = () => (
    <div
      className="space-y-2 font-study font-normal text-slate-900 antialiased dark:text-slate-100"
      style={{ fontSize: "var(--reading-font-size, 38px)", lineHeight: "1.7" }}
    >
      {gemara.length === 0 ? (
        <p className="text-sm text-slate-400 text-center">הטקסט לא זמין</p>
      ) : (
        gemara.map((seg, i) => <p key={i} dangerouslySetInnerHTML={{ __html: seg }} />)
      )}
    </div>
  );

  const CommentBlock = ({ comments, title }: { comments: string[]; title: string }) => (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-700">{title}</h3>
      {comments.length === 0 ? (
        <p className="text-sm text-slate-400">אין פירוש לעמוד זה</p>
      ) : (
        <ul className="space-y-2 text-sm leading-relaxed text-gray-700">
          {comments.map((c, i) => (
            <li key={i} className="mb-2 last:mb-0">{formatCommentaryText(c)}</li>
          ))}
        </ul>
      )}
    </div>
  );

  // ── Vilna columns layout (lg+) ─────────────────────────────────────────────
  if (layoutMode === "columns") {
    return (
      <article className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-5 py-2.5">
          <h2 className="text-sm font-semibold tracking-wide text-white">{label}</h2>
        </div>
        {/* On lg+: 3-column Vilna layout (original order: Rashi | Gemara | Tosafot).
            Below lg: stacked sections, reordered so Gemara appears first. */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:divide-x lg:divide-x-reverse lg:divide-blue-100">
          {/* Right: Rashi (3/12) — mobile order-2 */}
          <div className="order-2 lg:order-none border-t border-blue-50 lg:border-t-0 px-4 py-4 lg:col-span-3 bg-amber-50/40">
            <CommentBlock comments={rashiComments} title='רש"י' />
          </div>
          {/* Center: Gemara (6/12) — mobile order-1 */}
          <div className="order-1 lg:order-none px-5 py-4 lg:col-span-6">
            <GemaraBlock />
          </div>
          {/* Left: Tosafot (3/12) — mobile order-3 */}
          <div className="order-3 lg:order-none border-t border-blue-50 lg:border-t-0 px-4 py-4 lg:col-span-3 bg-sky-50/40">
            <CommentBlock comments={tosafotComments} title="תוספות" />
          </div>
        </div>
      </article>
    );
  }

  // ── Tabs layout ────────────────────────────────────────────────────────────
  const comments = commentator === "rashi" ? rashiComments : tosafotComments;

  return (
    <article className="rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
      <div className="bg-blue-900 px-5 py-2.5">
        <h2 className="text-sm font-semibold tracking-wide text-white">{label}</h2>
      </div>

      {/* Gemara */}
      <div className="border-b border-blue-50 px-5 py-4">
        <GemaraBlock />
      </div>

      {/* Commentary */}
      <div className="bg-slate-50/60 px-5 py-4">
        <CommentBlock
          comments={comments}
          title={commentator === "rashi" ? 'רש"י' : "תוספות"}
        />
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
  openSeder, setOpenSeder,
  openMasechet, setOpenMasechet,
  onSelect, onClose,
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
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים</h2>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {TALMUD_SEDARIM.map((seder) => {
            const masechtot = TALMUD_MASECHTOT.filter((m) => m.sederHe === seder.nameHe);
            const isOpen = openSeder === seder.nameHe;
            return (
              <div key={seder.nameHe} className="mb-1">
                <button
                  onClick={() => setOpenSeder(isOpen ? null : seder.nameHe)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-right font-semibold text-blue-950 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-inset"
                >
                  <span>{seder.nameHe}</span>
                  <span className="text-xs text-slate-400">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="mb-1 pl-2 pr-1">
                    {masechtot.map((m) => {
                      const isMOpen = openMasechet === m.sefariaName;
                      const firstDay = getDayFromDaf(m.sefariaName, 2);
                      return (
                        <div key={m.sefariaName} className="mb-0.5">
                          <button
                            onClick={() => setOpenMasechet(isMOpen ? null : m.sefariaName)}
                            aria-expanded={isMOpen}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-inset"
                          >
                            <span>{m.nameHe}</span>
                            <span className="text-xs text-slate-400">{isMOpen ? "▲" : "▼"}</span>
                          </button>

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
                                    className={`rounded-lg px-2.5 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 ${
                                      isCurrent
                                        ? "bg-blue-900 font-bold text-white"
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
