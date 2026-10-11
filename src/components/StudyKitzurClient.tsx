"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import StudyHeader from "@/components/StudyHeader";
import StudyTitleHeader, { StudyBottomNav } from "@/components/StudyTitleHeader";
import DailyCompletionButton from "@/components/DailyCompletionButton";
import { HEADER_ICON_BUTTON_CLASS, CHIP_PRIMARY_CLASS, CHIP_SECONDARY_CLASS } from "@/components/studyHeaderStyles";
import { TOTAL_KITZUR_SIMANIM, getKitzurSimanInfo } from "@/lib/kitzurStructure";
import { fetchKitzurSiman, type KitzurSimanData } from "@/lib/sefaria";
import { useScrollPositionRestore } from "@/hooks/useScrollPositionRestore";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

const DEFAULT_SIMAN = 1;

// ─── TOC Modal ────────────────────────────────────────────────────────────────

interface TocModalProps {
  currentSiman: number;
  onSelect: (siman: number) => void;
  onClose: () => void;
}

function TocModal({ currentSiman, onSelect, onClose }: TocModalProps) {
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
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים — קיצור שולחן ערוך</h2>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4" dir="rtl">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: TOTAL_KITZUR_SIMANIM }, (_, i) => {
              const num = i + 1;
              const isCurrent = num === currentSiman;
              return (
                <button
                  key={num}
                  onClick={() => {
                    onSelect(num);
                    onClose();
                  }}
                  className={`min-w-[2.5rem] rounded-lg px-2.5 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 ${
                    isCurrent
                      ? "bg-blue-900 font-bold text-white"
                      : "bg-white text-blue-900 hover:bg-blue-100 border border-blue-100"
                  }`}
                >
                  {num}
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

export default function StudyKitzurClient() {
  const [user, setUser]                   = useState<User | null>(null);
  const [authLoading, setAuthLoading]     = useState(true);
  const [personalSiman, setPersonalSiman] = useState<number>(DEFAULT_SIMAN); // Firestore kitzurSiman
  const [viewingSiman, setViewingSiman]   = useState<number>(DEFAULT_SIMAN);
  const [simanData, setSimanData]         = useState<KitzurSimanData | null>(null);
  const [itemLoading, setItemLoading]     = useState(false);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [completing, setCompleting]       = useState(false);
  const [settingItem, setSettingItem]     = useState(false);
  const [setItemMsg, setSetItemMsg]       = useState<string | null>(null);
  const [tocOpen, setTocOpen]             = useState(false);
  const [activeBookmark, setActiveBookmark] = useState<{ siman: number | string; seifIndex: number } | null>(null);

  // ── Auth + Firestore (personal progress) ────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let personalStart = DEFAULT_SIMAN;
        let savedBookmark: { siman: number | string; seifIndex: number } | null = null;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.kitzurSiman === "number" ? data.kitzurSiman : DEFAULT_SIMAN;
          if (typeof data.kitzurSiman !== "number") {
            await updateDoc(ref, { kitzurSiman: DEFAULT_SIMAN });
          }
          savedBookmark = (data.kitzurBookmark as { siman: number | string; seifIndex: number } | undefined) ?? null;
        } else {
          await setDoc(ref, { kitzurSiman: DEFAULT_SIMAN }, { merge: true });
        }
        setPersonalSiman(personalStart);
        setViewingSiman(personalStart);
        setActiveBookmark(savedBookmark);
      } else {
        setPersonalSiman(DEFAULT_SIMAN);
        setViewingSiman(DEFAULT_SIMAN);
        setActiveBookmark(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Auto-scroll to the bookmarked seif once its siman has finished loading
  useEffect(() => {
    if (!simanData || itemLoading) return;
    if (!activeBookmark) return;
    const { siman: currentSiman } = getKitzurSimanInfo(viewingSiman);
    if (activeBookmark.siman !== currentSiman) return;
    const el = document.getElementById(`kitzur-seif-${activeBookmark.seifIndex}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [simanData, itemLoading, activeBookmark, viewingSiman]);

  // ── Fetch siman on viewing index change ─────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const { siman } = getKitzurSimanInfo(viewingSiman);
    setSimanData(null);
    setFetchError(null);
    setItemLoading(true);

    fetchKitzurSiman(siman)
      .then((data) => { if (!cancelled) setSimanData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "שגיאה בטעינה");
      })
      .finally(() => { if (!cancelled) setItemLoading(false); });

    return () => { cancelled = true; };
  }, [viewingSiman, authLoading]);

  // Silently remember/restore scroll position within each siman. An explicit
  // "עצרתי כאן" bookmark takes priority when one targets this siman.
  const { resetScroll } = useScrollPositionRestore({
    trackId: "kitzur",
    itemId: viewingSiman,
    ready: !itemLoading && !!simanData,
    skipRestore: !!activeBookmark && activeBookmark.siman === viewingSiman,
  });

  function goToPrevSiman() {
    resetScroll();
    setViewingSiman((d) => Math.max(1, d - 1));
  }

  function goToNextSiman() {
    resetScroll();
    setViewingSiman((d) => Math.min(TOTAL_KITZUR_SIMANIM, d + 1));
  }

  const swipeHandlers = useSwipeNavigation({
    onSwipeNext: goToNextSiman,
    onSwipePrev: goToPrevSiman,
    enabled: !tocOpen,
  });

  // ── Set current siman as personal starting point ────────────────────────────

  async function handleSetAsSiman() {
    if (!user || settingItem) return;
    setSettingItem(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { kitzurSiman: viewingSiman });
      setPersonalSiman(viewingSiman);
      setSetItemMsg("הסימן עודכן כנקודת הלימוד שלך ✓");
      setTimeout(() => setSetItemMsg(null), 3000);
    } finally {
      setSettingItem(false);
    }
  }

  // ── Toggle bookmark on a seif ("עצרתי כאן") ──────────────────────────────────

  function toggleBookmark(seifIndex: number) {
    if (!user) return;
    const { siman: currentSiman } = getKitzurSimanInfo(viewingSiman);
    const isActive = activeBookmark?.siman === currentSiman && activeBookmark?.seifIndex === seifIndex;
    const next = isActive ? null : { siman: currentSiman, seifIndex };
    setActiveBookmark(next);
    updateDoc(doc(db, "users", user.uid), { kitzurBookmark: next }).catch((err: unknown) => {
      console.error("[study] kitzur bookmark save failed:", err instanceof Error ? err.message : err);
    });
  }

  // ── Mark finished — advance personal progress ────────────────────────────────

  async function handleFinished() {
    if (!user || completing) return;
    const nextSiman = Math.min(personalSiman + 1, TOTAL_KITZUR_SIMANIM);
    setCompleting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { kitzurSiman: nextSiman });
      setPersonalSiman(nextSiman);
      setViewingSiman(nextSiman);
      resetScroll("smooth");
    } finally {
      setCompleting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
      </div>
    );
  }

  const { siman, titleHebrew: simanHebrewNumber } = getKitzurSimanInfo(viewingSiman);
  const isCurrent = viewingSiman === personalSiman;

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
          unitLabel={simanHebrewNumber}
          bookLabel="קיצור שולחן ערוך"
          pagination={{
            current: siman,
            total: TOTAL_KITZUR_SIMANIM,
            onPrev: goToPrevSiman,
            onNext: goToNextSiman,
            prevDisabled: siman <= 1,
            nextDisabled: siman >= TOTAL_KITZUR_SIMANIM,
          }}
          chips={
            <>
              {user && !isCurrent && (
                <button
                  onClick={handleSetAsSiman}
                  disabled={settingItem}
                  className={CHIP_PRIMARY_CLASS}
                >
                  {settingItem ? "שומר..." : "📌 קבע כסימן הלימוד שלי"}
                </button>
              )}
              {!isCurrent && (
                <button
                  onClick={() => setViewingSiman(personalSiman)}
                  className={CHIP_SECONDARY_CLASS}
                >
                  חזור לנקודת הלימוד שלי
                </button>
              )}
            </>
          }
        />

        {simanData?.titleHebrew && (
          <p className="-mt-4 mb-6 text-center text-sm text-slate-500">{simanData.titleHebrew}</p>
        )}

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : itemLoading || !simanData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            {simanData.paragraphs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">אין טקסט זמין עבור סימן זה</p>
            ) : (
              <div className="space-y-3">
                {simanData.paragraphs.map((p, i) => {
                  const isBookmarked = activeBookmark?.siman === siman && activeBookmark?.seifIndex === i;
                  return (
                    <div
                      key={i}
                      id={`kitzur-seif-${i}`}
                      className={`scroll-mt-20 flex items-start gap-2 rounded-xl border p-3 transition ${
                        isBookmarked
                          ? "border-slate-200 border-r-4 border-r-blue-600 bg-blue-50/40 dark:border-r-blue-400 dark:bg-blue-950/30"
                          : "border-transparent"
                      }`}
                    >
                      <p className="flex-1 font-study text-[length:var(--reading-font-size,2.375rem)] font-normal leading-[1.7] text-slate-900 antialiased dark:text-slate-100 md:text-[length:var(--reading-font-size-md,2.875rem)]">
                        <span className="ml-1.5 font-bold text-blue-900">{i + 1}.</span> {p}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(i); }}
                        title="עצרתי כאן"
                        aria-label={isBookmarked ? "בטל סימנייה" : "סמן כמקום שעצרתי"}
                        className={`flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 ${
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

        {/* "Set as my point" confirmation message */}
        {user && setItemMsg && (
          <div className="flex justify-center pt-8">
            <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
              {setItemMsg}
            </p>
          </div>
        )}

        <DailyCompletionButton
          trackId="kitzur-shulchan-aruch"
          onAdvance={user && isCurrent && siman < TOTAL_KITZUR_SIMANIM ? handleFinished : undefined}
        />

        <StudyBottomNav
          pagination={{
            current: siman,
            total: TOTAL_KITZUR_SIMANIM,
            onPrev: goToPrevSiman,
            onNext: goToNextSiman,
            prevDisabled: siman <= 1,
            nextDisabled: siman >= TOTAL_KITZUR_SIMANIM,
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
          currentSiman={siman}
          onSelect={setViewingSiman}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
