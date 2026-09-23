/** Shared look for the sticky top bar's buttons (back link, Aa, TOC). */
export const HEADER_BUTTON_CLASS =
  "flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white";

/** Square variant for icon-only side buttons. */
export const HEADER_ICON_BUTTON_CLASS =
  "flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-white/90 transition hover:bg-white/10 hover:text-white";

/** Refined pace/status tag rendered next to the in-page title (e.g. "עולמי" / "צפייה"). */
export const HEADER_BADGE_CLASS =
  "rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300";

/** "Set as my study point" chip — rendered under the in-page title. */
export const CHIP_PRIMARY_CLASS =
  "rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300";

/** "Back to my study point / today" chip — rendered under the in-page title. */
export const CHIP_SECONDARY_CLASS =
  "rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
