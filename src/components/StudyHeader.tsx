"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import ReadingSettingsButton from "@/components/ReadingSettingsModal";
import { HEADER_BUTTON_CLASS } from "@/components/studyHeaderStyles";

export {
  HEADER_BUTTON_CLASS,
  HEADER_ICON_BUTTON_CLASS,
  HEADER_BADGE_CLASS,
  CHIP_PRIMARY_CLASS,
  CHIP_SECONDARY_CLASS,
} from "@/components/studyHeaderStyles";

interface StudyHeaderProps {
  backHref?: string;
  /** Extra buttons rendered left of the Aa button (e.g. a TOC toggle) */
  headerActions?: ReactNode;
  maxWidthClassName?: string;
}

/**
 * Minimal sticky reader top bar — a single thin row (back button, TOC / Aa).
 * The unit title, pagination, toolbar and chips live in the page body, see
 * `StudyTitleHeader`.
 */
export default function StudyHeader({
  backHref = "/",
  headerActions,
  maxWidthClassName = "max-w-3xl",
}: StudyHeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 h-12 bg-blue-900 text-white shadow-md dark:bg-slate-950"
      dir="rtl"
    >
      <div className={`mx-auto flex h-full ${maxWidthClassName} items-center justify-between px-3`}>
        <Link href={backHref} className={`shrink-0 ${HEADER_BUTTON_CLASS}`}>
          → ראשי
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          <ReadingSettingsButton />
        </div>
      </div>
    </header>
  );
}
