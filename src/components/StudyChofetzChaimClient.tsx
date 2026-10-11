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
  CHOFETZ_CHAIM_GATES,
  TOTAL_CHOFETZ_CHAIM_UNITS,
  getChofetzChaimUnitInfo,
  getChofetzChaimDailyUnit,
  getPetichahUnits,
  getIllustrationUnits,
  getKlalGroups,
  getSeifHebrewLabel,
  type ChofetzChaimGate,
  type ChofetzChaimUnit,
} from "@/lib/chofetzChaimStructure";
import { fetchChofetzChaimUnit, type ChofetzChaimUnitData } from "@/lib/sefaria";
import { useScrollPositionRestore } from "@/hooks/useScrollPositionRestore";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

const DEFAULT_UNIT = 1;

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
  currentUnitIndex: number;
  initialGate: ChofetzChaimGate;
  onSelect: (unitIndex: number) => void;
  onClose: () => void;
}

function UnitButton({
  unit,
  label,
  isCurrent,
  onSelect,
}: {
  unit: ChofetzChaimUnit;
  label: string;
  isCurrent: boolean;
  onSelect: (unitIndex: number) => void;
}) {
  return (
    <button
      onClick={() => onSelect(unit.index)}
      className={`rounded-lg px-2.5 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2 ${
        isCurrent
          ? "bg-blue-900 font-bold text-white"
          : "bg-white text-blue-900 hover:bg-blue-100 border border-blue-100"
      }`}
    >
      {label}
    </button>
  );
}

function TocModal({ currentUnitIndex, initialGate, onSelect, onClose }: TocModalProps) {
  const [tab, setTab] = useState<ChofetzChaimGate>(initialGate);

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
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים — חפץ חיים</h2>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center gap-1.5 border-b border-slate-100 px-4 py-3" dir="rtl">
          {CHOFETZ_CHAIM_GATES.map((g) => (
            <button
              key={g.id}
              onClick={() => setTab(g.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 ${
                tab === g.id
                  ? "bg-blue-900 text-white"
                  : "bg-slate-50 text-blue-900 hover:bg-blue-50"
              }`}
            >
              {g.titleHebrew}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4" dir="rtl">
          {tab === "petichah" || tab === "illustrations" ? (
            <div className="flex flex-wrap gap-1.5">
              {(tab === "petichah" ? getPetichahUnits() : getIllustrationUnits()).map((unit) => (
                <UnitButton
                  key={unit.index}
                  unit={unit}
                  label={unit.titleHebrew}
                  isCurrent={unit.index === currentUnitIndex}
                  onSelect={(i) => { onSelect(i); onClose(); }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {getKlalGroups(tab).map((group) => (
                <div key={group.klal}>
                  <h3 className="mb-1.5 text-sm font-bold text-blue-950">{group.titleHebrew}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {group.units.map((unit) => (
                      <UnitButton
                        key={unit.index}
                        unit={unit}
                        label={unit.subtitleHebrew}
                        isCurrent={unit.index === currentUnitIndex}
                        onSelect={(i) => { onSelect(i); onClose(); }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PaceMode = "daily" | "personal";

export default function StudyChofetzChaimClient() {
  const [user, setUser]                   = useState<User | null>(null);
  const [authLoading, setAuthLoading]     = useState(true);
  const [paceMode, setPaceMode]           = useState<PaceMode>("daily");
  const [personalUnit, setPersonalUnit]   = useState<number>(DEFAULT_UNIT); // Firestore chofetzChaimUnit
  const [dailyUnit]                       = useState<number>(() => getChofetzChaimDailyUnit());
  const [viewingUnit, setViewingUnit]     = useState<number>(dailyUnit);
  const [unitData, setUnitData]           = useState<ChofetzChaimUnitData | null>(null);
  const [itemLoading, setItemLoading]     = useState(false);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [completing, setCompleting]       = useState(false);
  const [settingItem, setSettingItem]     = useState(false);
  const [setItemMsg, setSetItemMsg]       = useState<string | null>(null);
  const [tocOpen, setTocOpen]             = useState(false);

  // ── Auth + Firestore (personal progress) ────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let personalStart = DEFAULT_UNIT;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.chofetzChaimUnit === "number" ? data.chofetzChaimUnit : DEFAULT_UNIT;
          if (typeof data.chofetzChaimUnit !== "number") {
            await updateDoc(ref, { chofetzChaimUnit: DEFAULT_UNIT });
          }
        } else {
          await setDoc(ref, { chofetzChaimUnit: DEFAULT_UNIT }, { merge: true });
        }
        setPersonalUnit(personalStart);
      } else {
        setPersonalUnit(DEFAULT_UNIT);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const activeUnit = paceMode === "daily" ? dailyUnit : personalUnit;

  // Explicit handler: update pace mode + viewing unit together, synchronously,
  // so the switch never leaves a stale item on screen.
  function handlePaceModeChange(mode: PaceMode) {
    setPaceMode(mode);
    setViewingUnit(mode === "daily" ? dailyUnit : personalUnit);
  }

  // ── Fetch unit on viewing index change ───────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setUnitData(null);
    setFetchError(null);
    setItemLoading(true);

    fetchChofetzChaimUnit(viewingUnit)
      .then((data) => { if (!cancelled) setUnitData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "שגיאה בטעינה");
      })
      .finally(() => { if (!cancelled) setItemLoading(false); });

    return () => { cancelled = true; };
  }, [viewingUnit, authLoading]);

  // Silently remember/restore scroll position within each unit.
  const { resetScroll } = useScrollPositionRestore({
    trackId: "chofetz-chaim",
    itemId: viewingUnit,
    ready: !itemLoading && !!unitData,
  });

  function goToPrevUnit() {
    resetScroll();
    setViewingUnit((d) => Math.max(1, d - 1));
  }

  function goToNextUnit() {
    resetScroll();
    setViewingUnit((d) => Math.min(TOTAL_CHOFETZ_CHAIM_UNITS, d + 1));
  }

  const swipeHandlers = useSwipeNavigation({
    onSwipeNext: goToNextUnit,
    onSwipePrev: goToPrevUnit,
    enabled: !tocOpen,
  });

  // ── Set current unit as personal starting point ─────────────────────────────

  async function handleSetAsUnit() {
    if (!user || settingItem) return;
    setSettingItem(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { chofetzChaimUnit: viewingUnit });
      setPersonalUnit(viewingUnit);
      setSetItemMsg("היחידה עודכנה כנקודת הלימוד שלך ✓");
      setTimeout(() => setSetItemMsg(null), 3000);
    } finally {
      setSettingItem(false);
    }
  }

  // ── Mark finished — advance personal progress (personal mode only) ─────────

  async function handleFinished() {
    if (!user || completing || paceMode !== "personal") return;
    const nextUnit = Math.min(personalUnit + 1, TOTAL_CHOFETZ_CHAIM_UNITS);
    setCompleting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { chofetzChaimUnit: nextUnit });
      setPersonalUnit(nextUnit);
      setViewingUnit(nextUnit);
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

  const unit: ChofetzChaimUnit = getChofetzChaimUnitInfo(viewingUnit);
  const gateTitle = CHOFETZ_CHAIM_GATES.find((g) => g.id === unit.gate)?.titleHebrew ?? "";
  const isCurrent = viewingUnit === activeUnit;

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
          unitLabel={unit.titleHebrew}
          bookLabel={gateTitle}
          badge={
            paceMode === "daily" && <span className={HEADER_BADGE_CLASS}>יומי</span>
          }
          toolbar={
            <SegControl<PaceMode>
              options={[
                { value: "daily", label: "לפי לוח יומי" },
                { value: "personal", label: "בקצב שלי" },
              ]}
              value={paceMode}
              onChange={handlePaceModeChange}
            />
          }
          pagination={{
            current: viewingUnit,
            total: TOTAL_CHOFETZ_CHAIM_UNITS,
            onPrev: goToPrevUnit,
            onNext: goToNextUnit,
            prevDisabled: viewingUnit <= 1,
            nextDisabled: viewingUnit >= TOTAL_CHOFETZ_CHAIM_UNITS,
          }}
          chips={
            <>
              {user && !isCurrent && (
                <button
                  onClick={handleSetAsUnit}
                  disabled={settingItem}
                  className={CHIP_PRIMARY_CLASS}
                >
                  {settingItem ? "שומר..." : "📌 קבע כיחידת הלימוד שלי"}
                </button>
              )}
              {!isCurrent && (
                <button
                  onClick={() => setViewingUnit(activeUnit)}
                  className={CHIP_SECONDARY_CLASS}
                >
                  {paceMode === "daily" ? "חזור להיום" : "חזור לנקודת הלימוד שלי"}
                </button>
              )}
            </>
          }
        />

        {unit.subtitleHebrew && (
          <p className="-mt-4 mb-6 text-center text-sm text-slate-400">{unit.subtitleHebrew}</p>
        )}

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : itemLoading || !unitData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            {unitData.seifim ? (
              unitData.seifim.length === 0 || unitData.seifim.every((s) => s.paragraphs.length === 0) ? (
                <p className="py-8 text-center text-sm text-slate-400">אין טקסט זמין עבור יחידה זו</p>
              ) : (
                <div className="space-y-5">
                  {unitData.seifim.map((seif) => (
                    <div
                      key={seif.seif}
                      className="space-y-2 font-study font-normal text-slate-900 antialiased dark:text-slate-100"
                      style={{ fontSize: "var(--reading-font-size, 38px)", lineHeight: "1.7" }}
                    >
                      {seif.paragraphs.map((p, i) => (
                        <p key={i}>
                          {i === 0 && (
                            <span className="ml-1.5 font-bold text-blue-900">
                              {getSeifHebrewLabel(seif.seif)}.
                            </span>
                          )}{" "}
                          {p}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )
            ) : !unitData.paragraphs || unitData.paragraphs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">אין טקסט זמין עבור יחידה זו</p>
            ) : (
              <div
                className="space-y-4 font-study font-normal text-slate-900 antialiased dark:text-slate-100"
                style={{ fontSize: "var(--reading-font-size, 38px)", lineHeight: "1.7" }}
              >
                {unitData.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </article>
        )}

        {/* "Set as my point" confirmation message — personal mode only */}
        {user && paceMode === "personal" && setItemMsg && (
          <div className="flex justify-center pt-8">
            <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
              {setItemMsg}
            </p>
          </div>
        )}

        <DailyCompletionButton
          trackId="chofetz-chaim"
          onAdvance={
            user && paceMode === "personal" && isCurrent && viewingUnit < TOTAL_CHOFETZ_CHAIM_UNITS
              ? handleFinished
              : undefined
          }
        />

        <StudyBottomNav
          pagination={{
            current: viewingUnit,
            total: TOTAL_CHOFETZ_CHAIM_UNITS,
            onPrev: goToPrevUnit,
            onNext: goToNextUnit,
            prevDisabled: viewingUnit <= 1,
            nextDisabled: viewingUnit >= TOTAL_CHOFETZ_CHAIM_UNITS,
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
          currentUnitIndex={viewingUnit}
          initialGate={unit.gate}
          onSelect={setViewingUnit}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
