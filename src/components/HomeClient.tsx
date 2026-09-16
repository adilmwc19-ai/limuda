"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";
import { TOTAL_DAYS } from "@/lib/tanakhMapping";
import { TOTAL_MISHNAH_DAYS } from "@/lib/mishnahStructure";

interface UserProgress {
  tanakh929Day: number;
  mishnah525Day: number;
  createdAt: string;
}

export default function HomeClient() {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await ensureUserDoc(firebaseUser);
      } else {
        setProgress(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function ensureUserDoc(firebaseUser: User) {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const defaultData: UserProgress = {
        tanakh929Day: 1,
        mishnah525Day: 1,
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, defaultData);
      setProgress(defaultData);
    } else {
      const data = snap.data() as Partial<UserProgress>;
      // Migrate existing users who signed up before Mishnah track was added
      if (data.mishnah525Day === undefined) {
        await updateDoc(ref, { mishnah525Day: 1 });
        setProgress({ tanakh929Day: 1, createdAt: "", ...data, mishnah525Day: 1 });
      } else {
        setProgress(data as UserProgress);
      }
    }
  }

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-blue-950 px-6 py-4 shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-2xl font-bold tracking-wide text-white">לימודא</h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-200">{user.displayName}</span>
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-blue-800 px-4 py-1.5 text-sm text-white transition hover:bg-blue-700 active:scale-95"
              >
                התנתק
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
        {!user ? (
          /* ── Not signed in ── */
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-blue-950">ברוך הבא ללימודא</h2>
              <p className="text-lg text-slate-500">פלטפורמה אישית ללימוד תורה יומי בקצב שלך</p>
            </div>

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-3 rounded-xl bg-blue-950 px-8 py-3 text-lg font-medium text-white shadow-lg transition hover:bg-blue-900 active:scale-95 disabled:opacity-60"
            >
              {signingIn ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <GoogleIcon />
              )}
              התחבר עם Google
            </button>

            {/* Track previews for non-signed-in users */}
            <div className="mt-2 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              {TRACKS.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-right"
                >
                  <span className="mt-0.5 text-2xl" aria-hidden="true">{t.emoji}</span>
                  <div>
                    <p className="font-semibold text-blue-950">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Signed in ── */
          <div className="flex w-full flex-col gap-6">
            <div dir="rtl">
              <h2 className="text-2xl font-bold text-blue-950">
                שלום, {user.displayName?.split(" ")[0]}!
              </h2>
              <p className="text-slate-500">בחר מסלול לימוד להמשיך</p>
            </div>

            {/* Study track cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StudyCard
                emoji="📖"
                title='תנ"ך (929)'
                description='פרק יומי עם שכבות מקראות גדולות ומפרשים'
                currentDay={progress?.tanakh929Day ?? 1}
                totalDays={TOTAL_DAYS}
                href="/study/tanakh"
              />
              <StudyCard
                emoji="📜"
                title="משנה יומית"
                description='פרק ביום מתוך ששת סדרי משנה עם ביאור ברטנורא ורמב"ם'
                currentDay={progress?.mishnah525Day ?? 1}
                totalDays={TOTAL_MISHNAH_DAYS}
                href="/study/mishnah"
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// ─── Study card ───────────────────────────────────────────────────────────────

interface StudyCardProps {
  emoji: string;
  title: string;
  description: string;
  currentDay: number;
  totalDays: number;
  href: string;
}

function StudyCard({ emoji, title, description, currentDay, totalDays, href }: StudyCardProps) {
  const pct = Math.round((currentDay / totalDays) * 100);

  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      {/* Icon + title */}
      <div className="mb-3 flex items-center gap-3" dir="rtl">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {emoji}
        </span>
        <div>
          <h3 className="font-bold text-blue-950">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-auto space-y-2">
        <div className="flex items-baseline justify-between" dir="rtl">
          <span className="text-2xl font-bold text-blue-950">יום {currentDay}</span>
          <span className="text-xs text-slate-400">מתוך {totalDays}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-700 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-blue-950 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-900"
          dir="rtl"
        >
          המשך לימוד
          <span aria-hidden="true">&larr;</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Track metadata (used in non-signed-in preview) ──────────────────────────

const TRACKS = [
  {
    id: "tanakh",
    emoji: "📖",
    title: 'תנ"ך (929)',
    description: "פרק יומי עם מקראות גדולות ומפרשים",
  },
  {
    id: "mishnah",
    emoji: "📜",
    title: "משנה יומית",
    description: 'פרק ביום עם ביאור ברטנורא ורמב"ם',
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#fff"
        d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.7 20-21 0-1.3-.2-2.7-.5-4z"
      />
    </svg>
  );
}
