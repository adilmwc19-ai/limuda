"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

interface UserProgress {
  tanakh929Day: number;
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
        createdAt: new Date().toISOString(),
      };
      await setDoc(ref, defaultData);
      setProgress(defaultData);
    } else {
      setProgress(snap.data() as UserProgress);
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
          <h1 className="text-2xl font-bold tracking-wide text-white">
            לימודא
          </h1>
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
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-blue-950">
                ברוך הבא ללימודא
              </h2>
              <p className="text-lg text-slate-500">
                פלטפורמה אישית ללימוד תורה יומי בקצב שלך
              </p>
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
          </div>
        ) : (
          <div className="flex w-full flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-blue-950">
                שלום, {user.displayName?.split(" ")[0]}!
              </h2>
              <p className="text-slate-500">המשך ללמוד היום</p>
            </div>

            {/* תנ"ך 929 card */}
            <div className="w-full max-w-sm rounded-2xl border border-blue-100 bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-950 text-white">
                  <BookIcon />
                </div>
                <div>
                  <h3 className="font-bold text-blue-950">תנ"ך יומי (929)</h3>
                  <p className="text-sm text-slate-400">קרא פרק ביום</p>
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 px-5 py-3 text-center">
                <span className="text-3xl font-bold text-blue-950">
                  יום {progress?.tanakh929Day ?? 1}
                </span>
              </div>
              <Link
                href="/study/tanakh"
                className="mt-4 block rounded-xl bg-blue-950 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-900 active:scale-95"
              >
                המשך לימוד &larr;
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

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

function BookIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
