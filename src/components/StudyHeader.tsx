"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import ReadingSettingsButton from "@/components/ReadingSettingsModal";
import { HEADER_BUTTON_CLASS } from "@/components/studyHeaderStyles";

export { HEADER_BUTTON_CLASS, HEADER_ICON_BUTTON_CLASS, HEADER_BADGE_CLASS } from "@/components/studyHeaderStyles";

interface StudyHeaderPagination {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}

interface StudyHeaderProps {
  /** Main descriptor, e.g. "סימן ב׳" or "ברכות כ״א" */
  unitLabel: string;
  /** Track/book name, e.g. "קיצור שולחן ערוך". Omit to show unitLabel alone. */
  bookLabel?: string;
  /** Small tag rendered next to the title, e.g. "עולמי" / "צפייה" */
  badge?: ReactNode;
  backHref?: string;
  /** Extra buttons rendered left of the Aa button (e.g. a TOC toggle) */
  headerActions?: ReactNode;
  maxWidthClassName?: string;
  pagination?: StudyHeaderPagination;
  /** Mode toggles / segmented controls rendered in the secondary row */
  toolbar?: ReactNode;
  /** "Set as current" / "back to current" chips, secondary row, opposite side from toolbar */
  chips?: ReactNode;
}

const NAV_BTN =
  "flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white/90 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent";

export default function StudyHeader({
  unitLabel,
  bookLabel,
  badge,
  backHref = "/",
  headerActions,
  maxWidthClassName = "max-w-3xl",
  pagination,
  toolbar,
  chips,
}: StudyHeaderProps) {
  const hasSecondaryRow = Boolean(pagination || toolbar || chips);

  return (
    <header className="sticky top-0 z-20 bg-blue-950 shadow-md" dir="rtl">
      <div className={`mx-auto flex ${maxWidthClassName} items-center justify-between gap-2 px-4 py-2.5`}>
        <Link href={backHref} className={`shrink-0 ${HEADER_BUTTON_CLASS}`}>
          → ראשי
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
          <span className="truncate text-base font-semibold text-white md:text-lg">
            {unitLabel}
            {bookLabel && <span className="font-normal text-blue-300"> · {bookLabel}</span>}
          </span>
          {badge}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          <ReadingSettingsButton />
        </div>
      </div>

      {hasSecondaryRow && (
        <div
          className={`mx-auto flex ${maxWidthClassName} flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {pagination && (
              <div className="flex items-center gap-1">
                <button
                  onClick={pagination.onPrev}
                  disabled={pagination.prevDisabled}
                  aria-label="הקודם"
                  className={NAV_BTN}
                >
                  ←
                </button>
                <button
                  onClick={pagination.onNext}
                  disabled={pagination.nextDisabled}
                  aria-label="הבא"
                  className={NAV_BTN}
                >
                  →
                </button>
                <span className="mr-1 text-xs text-blue-300">
                  {pagination.current} מתוך {pagination.total}
                </span>
              </div>
            )}
          </div>
          {chips && <div className="flex flex-wrap items-center gap-1.5">{chips}</div>}
        </div>
      )}
    </header>
  );
}
