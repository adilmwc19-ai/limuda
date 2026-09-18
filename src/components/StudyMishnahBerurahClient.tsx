"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  TOTAL_MB_SIMANIM,
  MISHNAH_BERURAH_VOLUMES,
  getMishnahBerurahSimanInfo,
} from "@/lib/mishnahBerurahStructure";
import {
  fetchMishnahBerurahSiman,
  type MishnahBerurahSimanData,
  type MishnahBerurahComment,
} from "@/lib/sefaria";

const DEFAULT_SIMAN = 1;

// ─── Mishnah Berurah collapsible block (per seif) ──────────────────────────

function MishnahBerurahBlock({ comments }: { comments: MishnahBerurahComment[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-blue-100 bg-slate-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold text-blue-700 transition hover:bg-slate-100"
      >
        <span>משנה ברורה · {comments.length} ס״ק</span>
        <span aria-hidden="true">{open ? "▾" : "◂"}</span>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          {comments.map((c, i) => (
            <p key={i} className="text-sm leading-relaxed text-gray-700">
              {c.label && <span className="ml-1 font-bold text-blue-700">({c.label})</span>}{" "}
              {c.dibburHamatchil && (
                <span className="font-bold text-blue-900">{c.dibburHamatchil}</span>
              )}
              {c.dibburHamatchil && " – "}
              {c.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

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
          <h2 className="text-lg font-bold text-blue-950">תוכן עניינים — משנה ברורה</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4" dir="rtl">
          <div className="space-y-5">
            {MISHNAH_BERURAH_VOLUMES.map((v) => (
              <div key={v.volume}>
                <h3 className="mb-0.5 text-sm font-bold text-blue-950">
                  {v.titleHebrew} · סימנים {v.fromSiman}–{v.toSiman}
                </h3>
                <p className="mb-1.5 text-xs text-slate-400">{v.subtitleHebrew}</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: v.toSiman - v.fromSiman + 1 }, (_, i) => v.fromSiman + i).map(
                    (num) => {
                      const isCurrent = num === currentSiman;
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            onSelect(num);
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
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudyMishnahBerurahClient() {
  const [user, setUser]                   = useState<User | null>(null);
  const [authLoading, setAuthLoading]     = useState(true);
  const [personalSiman, setPersonalSiman] = useState<number>(DEFAULT_SIMAN); // Firestore mishnahBerurahSiman
  const [viewingSiman, setViewingSiman]   = useState<number>(DEFAULT_SIMAN);
  const [simanData, setSimanData]         = useState<MishnahBerurahSimanData | null>(null);
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
        let personalStart = DEFAULT_SIMAN;
        if (snap.exists()) {
          const data = snap.data() as Record<string, unknown>;
          personalStart = typeof data.mishnahBerurahSiman === "number" ? data.mishnahBerurahSiman : DEFAULT_SIMAN;
          if (typeof data.mishnahBerurahSiman !== "number") {
            await updateDoc(ref, { mishnahBerurahSiman: DEFAULT_SIMAN });
          }
        } else {
          await setDoc(ref, { mishnahBerurahSiman: DEFAULT_SIMAN }, { merge: true });
        }
        setPersonalSiman(personalStart);
        setViewingSiman(personalStart);
      } else {
        setPersonalSiman(DEFAULT_SIMAN);
        setViewingSiman(DEFAULT_SIMAN);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Fetch siman on viewing index change ─────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const { siman } = getMishnahBerurahSimanInfo(viewingSiman);
    setSimanData(null);
    setFetchError(null);
    setItemLoading(true);

    fetchMishnahBerurahSiman(siman)
      .then((data) => { if (!cancelled) setSimanData(data); })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "שגיאה בטעינה");
      })
      .finally(() => { if (!cancelled) setItemLoading(false); });

    return () => { cancelled = true; };
  }, [viewingSiman, authLoading]);

  // ── Set current siman as personal starting point ────────────────────────────

  async function handleSetAsSiman() {
    if (!user || settingItem) return;
    setSettingItem(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { mishnahBerurahSiman: viewingSiman });
      setPersonalSiman(viewingSiman);
      setSetItemMsg("הסימן עודכן כנקודת הלימוד שלך ✓");
      setTimeout(() => setSetItemMsg(null), 3000);
    } finally {
      setSettingItem(false);
    }
  }

  // ── Mark finished — advance personal progress ────────────────────────────────

  async function handleFinished() {
    if (!user || completing) return;
    const nextSiman = Math.min(personalSiman + 1, TOTAL_MB_SIMANIM);
    setCompleting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { mishnahBerurahSiman: nextSiman });
      setPersonalSiman(nextSiman);
      setViewingSiman(nextSiman);
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

  const { siman, titleHebrew: simanHebrewNumber, volumeTitleHebrew } = getMishnahBerurahSimanInfo(viewingSiman);
  const isCurrent = viewingSiman === personalSiman;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-blue-950 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link href="/" className="text-sm text-blue-300 transition hover:text-white">→ ראשי</Link>
          <div className="text-center">
            <h1 className="text-base font-bold tracking-wide text-white">{simanHebrewNumber}</h1>
            <p className="text-xs text-blue-300">משנה ברורה · {volumeTitleHebrew}</p>
          </div>
          <span className="w-[76px]" aria-hidden="true" />
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div className="sticky top-[52px] z-10 border-b border-blue-100 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewingSiman((d) => Math.max(1, d - 1))}
              disabled={siman <= 1}
              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
            >
              ←
            </button>
            <button
              onClick={() => setViewingSiman((d) => Math.min(TOTAL_MB_SIMANIM, d + 1))}
              disabled={siman >= TOTAL_MB_SIMANIM}
              className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm text-blue-900 transition hover:bg-blue-50 disabled:opacity-40"
            >
              →
            </button>
            <span className="mr-1 text-xs text-slate-400">
              {siman} מתוך {TOTAL_MB_SIMANIM}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {user && !isCurrent && (
              <button
                onClick={handleSetAsSiman}
                disabled={settingItem}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
              >
                {settingItem ? "שומר..." : "📌 קבע כסימן הלימוד שלי"}
              </button>
            )}
            {!isCurrent && (
              <button
                onClick={() => setViewingSiman(personalSiman)}
                className="rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs text-amber-800 transition hover:bg-amber-200"
              >
                חזור לנקודת הלימוד שלי
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
            <span>תוכן עניינים · {simanHebrewNumber}</span>
          </button>
        </div>

        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-blue-500">{volumeTitleHebrew}</p>
          <h2 className="text-2xl font-bold text-blue-950">{simanHebrewNumber}</h2>
          {simanData?.titleHebrew && (
            <p className="mt-1 text-sm text-slate-500">{simanData.titleHebrew}</p>
          )}
        </div>

        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {fetchError}
          </div>
        ) : itemLoading || !simanData ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : simanData.seifim.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="py-8 text-center text-sm text-slate-400">אין טקסט זמין עבור סימן זה</p>
          </div>
        ) : (
          <div className="space-y-4">
            {simanData.seifim.map((seif) => (
              <article
                key={seif.seifNumber}
                className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
              >
                <div className="p-5 leading-relaxed text-base">
                  <span className="ml-1.5 font-bold text-blue-900">{seif.seifNumber}.</span>
                  {seif.parts.map((part, i) =>
                    part.type === "mechaber" ? (
                      <span key={i} className="font-semibold text-gray-900">
                        {part.text}{" "}
                      </span>
                    ) : (
                      <span
                        key={i}
                        className="mx-1 rounded border border-amber-100 bg-amber-50 px-1 text-sm italic text-amber-800"
                      >
                        (הגה: {part.text}){" "}
                      </span>
                    )
                  )}
                </div>
                {seif.comments.length > 0 && <MishnahBerurahBlock comments={seif.comments} />}
              </article>
            ))}
          </div>
        )}

        {/* Action row */}
        {user && (
          <div className="flex flex-col items-center gap-2 pt-8">
            {isCurrent && siman < TOTAL_MB_SIMANIM && (
              <button
                onClick={handleFinished}
                disabled={completing}
                className="rounded-xl bg-blue-950 px-8 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
              >
                {completing ? "שומר..." : "סיימתי סימן זה ←"}
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
          currentSiman={siman}
          onSelect={setViewingSiman}
          onClose={() => setTocOpen(false)}
        />
      )}
    </main>
  );
}
