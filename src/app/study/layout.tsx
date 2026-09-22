"use client";

import Link from "next/link";
import ReadingSettingsButton from "@/components/ReadingSettingsModal";

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-zinc-100">
      <header
        dir="rtl"
        className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
      >
        <Link
          href="/"
          className="text-sm font-semibold text-blue-900 transition hover:text-blue-700 dark:text-blue-200 dark:hover:text-blue-100"
        >
          ← חזרה לראשי
        </Link>
        <ReadingSettingsButton />
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
