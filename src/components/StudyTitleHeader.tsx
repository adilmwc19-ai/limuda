"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

export interface StudyHeaderPagination {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

interface StudyTitleHeaderProps {
  /** Main descriptor, e.g. "סימן ב׳" or "ברכות כ״א" */
  unitLabel: string;
  /** Track/book name, e.g. "קיצור שולחן ערוך". Rendered as a small kicker above the title. */
  bookLabel?: string;
  /** Small refined tag rendered next to the title, e.g. "עולמי" / "בקצב שלי" */
  badge?: ReactNode;
  /** When set, the title (+ badge) becomes a button that opens a chapter/unit picker. */
  onTitleClick?: () => void;
  /** Accessible label for the title button, when onTitleClick is set. */
  titleClickLabel?: string;
  pagination?: StudyHeaderPagination;
  /** Mode toggles / segmented controls */
  toolbar?: ReactNode;
  /** "Set as current" / "back to current" chips */
  chips?: ReactNode;
  maxWidthClassName?: string;
}

const NAV_BTN =
  "flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-blue-200 dark:hover:bg-slate-700 md:h-11 md:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2";

/**
 * In-page reader title block — the source/unit title, pace badge, pagination
 * and mode toolbar, rendered at the top of the scrolling content (Apple
 * Books / Sefaria style), below the minimal sticky top bar.
 */
export default function StudyTitleHeader({
  unitLabel,
  bookLabel,
  badge,
  onTitleClick,
  titleClickLabel,
  pagination,
  toolbar,
  chips,
  maxWidthClassName = "max-w-3xl",
}: StudyTitleHeaderProps) {
  return (
    <div className={`mx-auto w-full ${maxWidthClassName} px-4 pb-6 pt-8 text-center`} dir="rtl">
      {bookLabel && (
        <p className="mb-2 text-sm font-semibold tracking-wide text-blue-500/80 dark:text-blue-400/80 md:text-base">
          {bookLabel}
        </p>
      )}

      {onTitleClick ? (
        <button
          type="button"
          onClick={onTitleClick}
          aria-label={titleClickLabel ?? unitLabel}
          className="group mx-auto flex flex-wrap items-center justify-center gap-2 rounded-xl px-2.5 py-1 transition hover:bg-blue-50/70 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2"
        >
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-blue-950 dark:text-blue-50 sm:text-3xl">
            {unitLabel}
          </h1>
          <Search
            className="h-4 w-4 shrink-0 text-blue-400/70 transition group-hover:text-blue-600 dark:text-blue-300/60 dark:group-hover:text-blue-200"
            aria-hidden="true"
          />
          {badge}
        </button>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-blue-950 dark:text-blue-50 sm:text-3xl">
            {unitLabel}
          </h1>
          {badge}
        </div>
      )}

      {pagination && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={pagination.onPrev}
            disabled={pagination.prevDisabled}
            aria-label="הקודם"
            className={NAV_BTN}
          >
            ←
          </button>
          <span className="min-w-[5.5rem] text-base font-medium text-slate-700 dark:text-slate-200 md:text-lg">
            {pagination.current} מתוך {pagination.total}
          </span>
          <button
            onClick={pagination.onNext}
            disabled={pagination.nextDisabled}
            aria-label="הבא"
            className={NAV_BTN}
          >
            →
          </button>
        </div>
      )}

      {toolbar && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:gap-4">{toolbar}</div>
      )}

      {chips && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">{chips}</div>
      )}
    </div>
  );
}

const BOTTOM_NAV_BTN =
  "flex min-h-[44px] items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-950 shadow-sm transition hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-blue-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2";

/** End-of-text navigation row — prev/next, rendered under the reading content. */
export function StudyBottomNav({ pagination }: { pagination: StudyHeaderPagination }) {
  return (
    <div
      className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700"
      dir="rtl"
    >
      <button onClick={pagination.onPrev} disabled={pagination.prevDisabled} className={BOTTOM_NAV_BTN}>
        <span aria-hidden>←</span> הקודם
      </button>
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
        {pagination.current} מתוך {pagination.total}
      </span>
      <button onClick={pagination.onNext} disabled={pagination.nextDisabled} className={BOTTOM_NAV_BTN}>
        הבא <span aria-hidden>→</span>
      </button>
    </div>
  );
}
