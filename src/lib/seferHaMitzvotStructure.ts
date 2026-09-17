// Sefer HaMitzvot (ספר המצוות) — the Rambam's enumeration of the 613 mitzvot,
// preceded by the 14 שורשים (root principles) that govern how the count is
// made. Ref format and item counts (14 / 248 / 365) were verified directly
// against Sefaria's index schema and by probing the boundary of each section
// (`GET /api/texts/<ref>` on the last real item vs. one past it).

export type SeferHaMitzvotSection = "shorashim" | "positive" | "negative";

export interface SeferHaMitzvotSectionInfo {
  id: SeferHaMitzvotSection;
  titleHebrew: string;
  sefariaTreatise: string; // full Sefaria ref prefix, e.g. "Sefer HaMitzvot, Shorashim"
  count: number;
}

export const SEFER_HAMITZVOT_SECTIONS: SeferHaMitzvotSectionInfo[] = [
  { id: "shorashim", titleHebrew: 'י"ד השורשים', sefariaTreatise: "Sefer HaMitzvot, Shorashim", count: 14 },
  { id: "positive", titleHebrew: "מצוות עשה", sefariaTreatise: "Sefer HaMitzvot, Positive Commandments", count: 248 },
  { id: "negative", titleHebrew: "מצוות לא תעשה", sefariaTreatise: "Sefer HaMitzvot, Negative Commandments", count: 365 },
];

// ── Hebrew numerals (up to ~999, more than enough for a count of 365) ─────────

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

function itemTitleHebrew(section: SeferHaMitzvotSection, number: number): string {
  const heNum = toHebrewNumeral(number);
  if (section === "shorashim") return `השורש ${heNum}`;
  if (section === "positive") return `עשה ${heNum}`;
  return `לא תעשה ${heNum}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getTotalItemsCount(): number {
  return SEFER_HAMITZVOT_SECTIONS.reduce((sum, s) => sum + s.count, 0);
}

export const TOTAL_SEFER_HAMITZVOT_ITEMS = getTotalItemsCount(); // 627 (14 + 248 + 365)

export interface SeferHaMitzvotItem {
  section: SeferHaMitzvotSection;
  number: number;      // 1-based position within the section
  titleHebrew: string;
  globalIndex: number; // 1-based position across all 3 sections
}

// Resolve a 1-based running index (across shorashim -> positive -> negative,
// in that order) to its section + in-section number — drives personal
// progress and prev/next navigation the same way rambamStructure does.
export function getItemByGlobalIndex(index: number): SeferHaMitzvotItem {
  const total = getTotalItemsCount();
  let remaining = Math.max(1, Math.min(index, total));

  for (const section of SEFER_HAMITZVOT_SECTIONS) {
    if (remaining <= section.count) {
      return {
        section: section.id,
        number: remaining,
        titleHebrew: itemTitleHebrew(section.id, remaining),
        globalIndex: Math.max(1, Math.min(index, total)),
      };
    }
    remaining -= section.count;
  }

  const last = SEFER_HAMITZVOT_SECTIONS[SEFER_HAMITZVOT_SECTIONS.length - 1];
  return {
    section: last.id,
    number: last.count,
    titleHebrew: itemTitleHebrew(last.id, last.count),
    globalIndex: total,
  };
}

// Inverse lookup: section + in-section number -> running global index.
export function getGlobalIndex(section: SeferHaMitzvotSection, number: number): number {
  let base = 0;
  for (const s of SEFER_HAMITZVOT_SECTIONS) {
    if (s.id === section) {
      const clamped = Math.max(1, Math.min(number, s.count));
      return base + clamped;
    }
    base += s.count;
  }
  return 1;
}
