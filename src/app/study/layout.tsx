"use client";

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
        className="sticky top-0 z-40 relative flex h-11 items-center justify-center border-b border-slate-200 bg-white/90 py-1.5 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <ReadingSettingsButton />
        </div>
        <span className="text-sm font-bold tracking-wide text-blue-950 dark:text-blue-100">
          לימודא
        </span>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
