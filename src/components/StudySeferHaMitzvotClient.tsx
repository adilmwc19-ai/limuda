"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  SEFER_HAMITZVOT_SECTIONS,
  TOTAL_SEFER_HAMITZVOT_ITEMS,
  getItemByGlobalIndex,
  getGlobalIndex,
  type SeferHaMitzvotSection,
  type SeferHaMitzvotItem,
} from "@/lib/seferHaMitzvotStructure";
import {
  fetchSeferHaMitzvot,
  getDailySeferHaMitzvotRef,
  type SeferHaMitzvotItemData,
} from "@/lib/sefaria";

const DEFAULT_START_INDEX = getGlobalIndex("positive", 1); // 15 — skips the 14 shorashim

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
  currentGlobalIndex: number;
  initialSection: SeferHaMitzvotSection;
  onSelect: (globalIndex: number) => void;
  onClose: () => void;
}

function TocModal({ currentGlobalIndex, initialSection, onSelect, onClose }: TocModalProps) {
  const [tab, setTab] = useState<SeferHaMitzvotSection>(initialSection);
  const section = SEFER_HAMITZVOT_SECTIONS.find((s) => s.id === tab)!;

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
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים — ספר המצוות</h2>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center gap-1.5 border-b border-slate-100 px-4 py-3" dir="rtl">
          {SEFER_HAMITZVOT_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === s.id
                  ? "bg-blue-900 text-white"
                  : "bg-slate-50 text-blue-900 hover:bg-blue-50"
              }`}
            >
              {s.titleHebrew}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4" dir="rtl">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: section.count }, (_, i) => {
              const num = i + 1;
              const globalIndex = getGlobalIndex(section.id, num);
              const isCurrent = globalIndex === currentGlobalIndex;
              return (
                <button
                  key={num}
                  onClick={() => {
                    onSelect(globalIndex);
                    onClose();
                  }}
                  className={`min-w-[2.5rem] rounded-lg px-2.5 py-1 text-sm transition ${
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

type PaceMode = "global" | "personal";

export default function StudySeferHaMitzvotClient() {
  const [user, setUser]                     = useState<User | null>(null);
  const [authLoading, setAuthLoading]       = useState(true);
  const [paceMode, setPaceMode]             = useState<PaceMode>("personal");
  const [personalIndex, setPersonalIndex]   = useState<number>(DEFAULT_START_INDEX); // Firestore seferHaMitzvotIndex
  const [viewingIndex, setViewingIndex]     = useState<number>(DEFAULT_START_INDEX);
  const [itemData, setItemData]             = useState<SeferHaMitzvotItemData | null>(null);
  const [itemLoading, setItemLoading]       = useState(false);
  const [fetchError, setFetchError]         = useState<string | null>(null);
  const [completing, setCompleting]         = useState(false);
  const [settingItem, setSettingItem]       = useState(false);
  const [setItemMsg, setSetItemMsg]         = useState<string | null>(null);
  const [tocOpen, setTocOpen]               = useState(false);

  // Global "Daily Sefer HaMitzvot" sync — optional, only if Sefaria publishes one
  const [dailyGlobalIndex, setDailyGlobalIndex] = useState<number | null>(null);

  // ── Auth + Firestore (personal progress) ────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref  = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        let personalStart = DEFAULT_START_INDEX;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.seferHaMitzvotIndex === "number" ? data.seferHaMitzvotIndex : DEFAULT_START_INDEX;
          if (typeof data.seferHaMitzvotIndex !== "number") {
            await updateDoc(ref, { seferHaMitzvotIndex: DEFAULT_START_INDEX });
          }
        } else {
          await setDoc(ref, { seferHaMitzvotIndex: DEFAULT_START_INDEX }, { merge: true });
        }
        setPersonalIndex(personalStart);
        setViewingIndex(personalStart);
      } else {
        setPersonalIndex(DEFAULT_START_INDEX);
        setViewingIndex(DEFAULT_START_INDEX);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Optional global Daily Sefer HaMitzvot sync ──────────────────────────────
  // Checked in the background; the pace toggle only appears if Sefaria
  // actually publishes this calendar track (it does not, as of this writing).

  useEffect(() => {
    let cancelled = false;
    getDailySeferHaMitzvotRef()
      .then((ref) => {
        if (cancelled || !ref) return;
        setDailyGlobalIndex(getGlobalIndex(ref.section, ref.number));
      })
      .catch((e: unknown) => {
        console.error("[sefer-hamitzvot] daily calendar check failed:", e instanceof Error ? e.message : e);
      });
    return () => { cancelled = true; };
  }, []);

  const activeIndex = paceMode === "global" ? (dailyGlobalIndex ?? personalIndex) : personalIndex;

  // Explicit handler: update pace mode + viewing index together, synchronously,
  // so the switch never leaves a stale item on screen.
  function handlePaceModeChange(mode: PaceMode) {
    setPaceMode(mode);
    if (mode === "personal") {
      setViewingIndex(personalIndex);
    } else if (dailyGlobalIndex !== null) {
      setViewingIndex(dailyGlobalIndex);
    }
  }

  // ── Fetch item on viewing index change ──────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const item = getItemByGlobalIndex(viewingIndex);
    setItemData(null);
    setFetchError(null);
    setItemLoading(true);

    fetchSeferHaMitzvot(item.section, item.number)
      .then((data) => { if (!cancelled) setItemData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "שגיאה בטעינה");
      })
      .finally(() => { if (!cancelled) setItemLoading(false); });

    return () => { cancelled = true; };
  }, [viewingIndex, authLoading]);

  // ── Set current item as personal starting point ─────────────────────────────

  async function handleSetAsItem() {
    if (!user || settingItem) return;
    setSettingItem(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { seferHaMitzvotIndex: viewingIndex });
      setPersonalIndex(viewingIndex);
      setSetItemMsg("המצווה עודכנה כנקודת הלימוד שלך ✓");
      setTimeout(() => setSetItemMsg(null), 3000);
    } finally {
      setSettingItem(false);
    }
  }

  // ── Mark finished — advance personal progress (personal mode only) ─────────

  async function handleFinished() {
    if (!user || completing || paceMode !== "personal") return;
    const nextIndex = Math.min(personalIndex + 1, TOTAL_SEFER_HAMITZVOT_ITEMS);
    setCompleting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { seferHaMitzvotIndex: nextIndex });
      setPersonalIndex(nextIndex);
      setViewingIndex(nextIndex);
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

  const item: SeferHaMitzvotItem = getItemByGlobalIndex(viewingIndex);
  const isCurrent = viewingIndex === activeIndex;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-blue-950 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link href="/" className="text-sm text-blue-300 transition hover:text-white">→ ראשי</Link>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wide text-white">
              {item.titleHebrew}
              {paceMode === "global" && (
                <span className="mr-2 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-normal">עולמי</span>
              )}
            </h1>
            <p className="text-xs text-blue-300">
              {SEFER_HAMITZVOT_SECTIONS.find((s) => s.id === item.section)?.titleHebrew}
            </p>
          </div>
          <span className="w-[76px]" aria-hidden="true" />
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="sticky top-[52px] z-10 border-b border-blue-100 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {dailyGlobalIndex !== null && (
              <SegControl<PaceMode>
                options={[
                  { value: "global", label: "יומי עולמי" },
                  { value: "personal", label: "בקצב שלי" },
                ]}
                value={paceMode}
                onChange={handlePaceModeChange}
              />
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewingIndex((d) => Math.max(1, d - 1))}
                disabled={viewingIndex <= 1}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                ←
              </button>
              <button
                onClick={() => setViewingIndex((d) => Math.min(TOTAL_SEFER_HAMITZVOT_ITEMS, d + 1))}
                disabled={viewingIndex >= TOTAL_SEFER_HAMITZVOT_ITEMS}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
              >
                →
              </button>
              <span className="mr-1 text-xs text-slate-400">
                {viewingIndex} מתוך {TOTAL_SEFER_HAMITZVOT_ITEMS}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {user && !isCurrent && (
              <button
                onClick={handleSetAsItem}
                disabled={settingItem}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
              >
                {settingItem ? "שומר..." : "📌 קבע כמצוות הלימוד שלי"}
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
              {SEFER_HAMITZVOT_SECTIONS.find((s) => s.id === item.section)?.titleHebrew}{" "}
              <span className="text-blue-300">◄</span> {item.titleHebrew}
            </span>
          </button>
        </div>

        <div className="mb-6 text-center">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-2xl font-bold text-blue-950 dark:border-slate-700 dark:bg-slate-800/60 dark:text-blue-100">
            {item.titleHebrew}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {SEFER_HAMITZVOT_SECTIONS.find((s) => s.id === item.section)?.titleHebrew}
          </p>
        </div>

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : itemLoading || !itemData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : (
          <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            {itemData.paragraphs.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">אין טקסט זמין עבור פריט זה</p>
            ) : (
              <div className="space-y-4 text-lg font-medium leading-relaxed text-gray-800 lg:text-xl">
                {itemData.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}
          </article>
        )}

        {/* Action row — personal mode only; hidden entirely in global mode */}
        {user && paceMode === "personal" && (
          <div className="flex flex-col items-center gap-2 pt-8">
            {isCurrent && viewingIndex < TOTAL_SEFER_HAMITZVOT_ITEMS && (
              <button
                onClick={handleFinished}
                disabled={completing}
                className="rounded-xl bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
              >
                {completing ? "שומר..." : "סיימתי מצווה זו ←"}
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
          currentGlobalIndex={viewingIndex}
          initialSection={item.section}
          onSelect={setViewingIndex}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
