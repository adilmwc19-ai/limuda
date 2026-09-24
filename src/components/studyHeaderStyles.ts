/** Keyboard-only focus ring for controls on light/white surfaces. */
export const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2";

/** Keyboard-only focus ring for controls on dark/blue surfaces (e.g. the sticky header). */
export const FOCUS_RING_ON_DARK_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

/** Shared look for the sticky top bar's buttons (back link, Aa, TOC). */
export const HEADER_BUTTON_CLASS =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-base font-medium text-white antialiased transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

/** Square variant for icon-only side buttons. */
export const HEADER_ICON_BUTTON_CLASS =
  "inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-white antialiased transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

/** Refined pace/status tag rendered next to the in-page title (e.g. "עולמי" / "צפייה"). */
export const HEADER_BADGE_CLASS =
  "rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 md:text-sm";

/** "Set as my study point" chip — rendered under the in-page title. */
export const CHIP_PRIMARY_CLASS =
  "rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2";

/** "Back to my study point / today" chip — rendered under the in-page title. */
export const CHIP_SECONDARY_CLASS =
  "rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 focus-visible:ring-offset-2";
