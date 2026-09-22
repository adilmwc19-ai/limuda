"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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
      className={`rounded-lg px-2.5 py-1 text-sm transition ${
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
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center gap-1.5 border-b border-slate-100 px-4 py-3" dir="rtl">
          {CHOFETZ_CHAIM_GATES.map((g) => (
            <button
              key={g.id}
              onClick={() => setTab(g.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    <main className="flex min-h-screen flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-blue-950 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link href="/" className="text-sm text-blue-300 transition hover:text-white">→ ראשי</Link>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wide text-white">
              {unit.titleHebrew}
              {paceMode === "daily" && (
                <span className="mr-2 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-normal">יומי</span>
              )}
            </h1>
            <p className="text-xs text-blue-300">
              {gateTitle}{unit.subtitleHebrew && ` · ${unit.subtitleHebrew}`}
            </p>
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
                { value: "daily", label: "לפי לוח יומי" },
                { value: "personal", label: "בקצב שלי" },
              ]}
              value={paceMode}
              onChange={handlePaceModeChange}
            />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewingUnit((d) => Math.max(1, d - 1))}
                disabled={viewingUnit <= 1}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                ←
              </button>
              <button
                onClick={() => setViewingUnit((d) => Math.min(TOTAL_CHOFETZ_CHAIM_UNITS, d + 1))}
                disabled={viewingUnit >= TOTAL_CHOFETZ_CHAIM_UNITS}
                className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                →
              </button>
              <span className="mr-1 text-xs text-slate-400">
                {viewingUnit} מתוך {TOTAL_CHOFETZ_CHAIM_UNITS}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {user && !isCurrent && (
              <button
                onClick={handleSetAsUnit}
                disabled={settingItem}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
              >
                {settingItem ? "שומר..." : "📌 קבע כיחידת הלימוד שלי"}
              </button>
            )}
            {!isCurrent && (
              <button
                onClick={() => setViewingUnit(activeUnit)}
                className="rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs text-amber-800 transition hover:bg-amber-200"
              >
                {paceMode === "daily" ? "חזור להיום" : "חזור לנקודת הלימוד שלי"}
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
              {gateTitle} <span className="text-blue-300">◄</span> {unit.titleHebrew}
            </span>
          </button>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-blue-500">{gateTitle}</p>
          <h2 className="text-2xl font-bold text-blue-950">{unit.titleHebrew}</h2>
          {unit.subtitleHebrew && (
            <p className="mt-1 text-sm text-slate-400">{unit.subtitleHebrew}</p>
          )}
        </div>

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
                    <div key={seif.seif} className="space-y-2 leading-relaxed text-gray-800 text-base">
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
              <div className="space-y-4 leading-relaxed text-gray-800 text-base">
                {unitData.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </article>
        )}

        {/* Action row — personal mode only; hidden entirely in daily mode */}
        {user && paceMode === "personal" && (
          <div className="flex flex-col items-center gap-2 pt-8">
            {isCurrent && viewingUnit < TOTAL_CHOFETZ_CHAIM_UNITS && (
              <button
                onClick={handleFinished}
                disabled={completing}
                className="rounded-xl bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
              >
                {completing ? "שומר..." : unit.gate === "illustrations" ? "סיימתי לימוד זה ←" : "סיימתי שתי הלכות אלו ←"}
              </button>
            )}
            {setItemMsg && (
              <p className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 border border-green-200">
                {setItemMsg}
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
          currentUnitIndex={viewingUnit}
          initialGate={unit.gate}
          onSelect={setViewingUnit}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
