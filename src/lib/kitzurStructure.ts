// קיצור שולחן ערוך (Kitzur Shulchan Aruch) by R' Shlomo Ganzfried — a single
// flat sequence of 221 סימנים (siman/chapters), no book/section subdivision.
// Sefaria addresses each siman directly as `Kitzur Shulchan Aruch ${n}`.

export const TOTAL_KITZUR_SIMANIM = 221;

// ── Hebrew numerals (up to ~999, more than enough for a count of 221) ────────
// Mirrors the convention already used for Sefer HaMitzvot numbering.

function toHebrewNumeral(n: number): string {
  if (n <= 0 || n > 999) return String(n);
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const tens     = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const ones     = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (t === 1 && o === 5) return hundreds[h] + "טו" + (n > 15 ? "״" : "׳");
  if (t === 1 && o === 6) return hundreds[h] + "טז" + (n > 16 ? "״" : "׳");
  let result = hundreds[h] + tens[t] + ones[o];
  if (result.length > 1) result = result.slice(0, -1) + "״" + result.slice(-1);
  else result += "׳";
  return result;
}

// e.g. getSimanHebrewNumber(1) -> "סימן א'", getSimanHebrewNumber(221) -> "סימן רכ״א"
export function getSimanHebrewNumber(siman: number): string {
  return `סימן ${toHebrewNumeral(siman)}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export interface KitzurSimanInfo {
  siman: number;       // clamped 1..TOTAL_KITZUR_SIMANIM
  titleHebrew: string; // e.g. "סימן א'"
}

// Clamps an arbitrary index into the valid 1..221 range — mirrors the
// clamping helpers in rambamStructure/seferHaMitzvotStructure, so prev/next
// navigation and Firestore-restored progress can never point out of bounds.
export function getKitzurSimanInfo(siman: number): KitzurSimanInfo {
  const clamped = Math.max(1, Math.min(siman, TOTAL_KITZUR_SIMANIM));
  return {
    siman: clamped,
    titleHebrew: getSimanHebrewNumber(clamped),
  };
}
