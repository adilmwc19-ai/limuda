import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "העמוד לא נמצא",
};

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950"
    >
      <p className="text-7xl font-bold text-stone-400 dark:text-stone-600">404</p>
      <h1 className="mt-4 text-3xl font-bold text-blue-950 dark:text-white">העמוד לא נמצא</h1>
      <p className="mt-3 max-w-sm text-lg text-slate-700 dark:text-slate-200">
        הדף שחיפשת אינו קיים או שהועבר. מרחב הלימוד ממתין לך בעמוד הבית.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-blue-950 px-8 py-3 text-lg font-medium text-white shadow-lg transition hover:bg-blue-900 active:scale-95"
      >
        חזרה למרחב הלימוד
      </Link>
    </main>
  );
}
