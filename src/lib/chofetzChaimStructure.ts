// Chofetz Chaim (חפץ חיים) — the Chofetz Chaim's own halachic code of the laws
// of lashon hara and rechilut, studied here 2 seifim a day. Sefaria indexes it
// under its alternate title "Chafetz Chaim"; both titles resolve at the API,
// so refs below use "Chofetz Chaim" to match this app's naming.
//
// Book structure (verified against Sefaria's /api/v2/index and /api/shape for
// "Chofetz Chaim" — the standalone front-matter "Preface"/הקדמה, the
// "Illustrations", and the Responsa appendices are haskamos/supplementary
// material, not halachic content, and are intentionally excluded):
//
//  1. Introduction to the Laws of the Prohibition of Lashon Hara and Rechilut
//     ("פתיחה להלכות לשון הרע ורכילות") — 4 standalone parts: Opening
//     Comments (הקדמה), Negative Commandments (לאוין), Positive Commandments
//     (עשיין), Curses (ארורין). Each is one atomic unit.
//  2. Part One, The Prohibition Against Lashon Hara — 10 כללים (Principles).
//  3. Part Two, The Prohibition Against Rechilut — 9 כללים (Principles).
//
// Each כלל has its own "Opening Comments" (הערות מקדימות, 1 unit) followed by
// its seifim, paginated 2-per-unit (a trailing odd seif becomes a 1-seif unit).

export type ChofetzChaimGate = "petichah" | "lashonHara" | "rechilut";

export interface ChofetzChaimGateInfo {
  id: ChofetzChaimGate;
  titleHebrew: string;
}

export const CHOFETZ_CHAIM_GATES: ChofetzChaimGateInfo[] = [
  { id: "petichah", titleHebrew: "פתיחה" },
  { id: "lashonHara", titleHebrew: "הלכות לשון הרע" },
  { id: "rechilut", titleHebrew: "הלכות רכילות" },
];

interface PetichahPart {
  titleHebrew: string;
  refSuffix: string;
}

// Order matches the book's own schema order.
const PETICHAH_PARTS: PetichahPart[] = [
  { titleHebrew: "הקדמה", refSuffix: "Opening Comments" },
  { titleHebrew: "לאוין", refSuffix: "Negative Commandments" },
  { titleHebrew: "עשיין", refSuffix: "Positive Commandments" },
  { titleHebrew: "ארורין", refSuffix: "Curses" },
];

const PETICHAH_REF_PREFIX =
  "Chofetz Chaim, Introduction to the Laws of the Prohibition of Lashon Hara and Rechilut";

// Seif counts per כלל — verified directly against Sefaria's /api/shape for
// each "...Principle N" node (klal 1 is index 0, etc).
const LASHON_HARA_SEIFIM: number[] = [9, 13, 8, 12, 8, 12, 14, 14, 6, 17]; // 10 כללים
const RECHILUT_SEIFIM: number[] = [11, 4, 4, 3, 7, 10, 5, 5, 15]; // 9 כללים

function gateRefPrefix(gate: "lashonHara" | "rechilut"): string {
  return gate === "lashonHara"
    ? "Chofetz Chaim, Part One, The Prohibition Against Lashon Hara"
    : "Chofetz Chaim, Part Two, The Prohibition Against Rechilut";
}

// ── Hebrew numerals (up to ~999, more than enough for a seif count of 17) ────
// Mirrors the convention already used across the other structure files.

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

export function getSeifHebrewLabel(n: number): string {
  return toHebrewNumeral(n);
}

// ── Unit model ────────────────────────────────────────────────────────────

export interface ChofetzChaimUnit {
  index: number; // 1-based, global
  gate: ChofetzChaimGate;
  klal?: number; // 1-based, only for lashonHara/rechilut
  titleHebrew: string;    // main heading: klal title, or the petichah part's name
  subtitleHebrew: string; // secondary line: seif range / "הערות מקדימות" / "" for petichah
  ref: string;            // exact Sefaria ref to fetch
  seifFrom?: number;      // real seif number this unit starts at (seifim units only)
  seifTo?: number;        // real seif number this unit ends at (seifim units only)
}

function buildUnits(): ChofetzChaimUnit[] {
  const units: Omit<ChofetzChaimUnit, "index">[] = [];

  // Gate 1: Petichah — one atomic unit per part.
  for (const part of PETICHAH_PARTS) {
    units.push({
      gate: "petichah",
      titleHebrew: part.titleHebrew,
      subtitleHebrew: "",
      ref: `${PETICHAH_REF_PREFIX}, ${part.refSuffix}`,
    });
  }

  // Gates 2 & 3: per-כלל opening comments, then seifim paginated 2-per-unit.
  (["lashonHara", "rechilut"] as const).forEach((gate) => {
    const seifCounts = gate === "lashonHara" ? LASHON_HARA_SEIFIM : RECHILUT_SEIFIM;
    const prefix = gateRefPrefix(gate);

    seifCounts.forEach((seifCount, i) => {
      const klal = i + 1;
      const klalTitle = `כלל ${toHebrewNumeral(klal)}`;
      const bodyRef = `${prefix}, Principle ${klal}`;

      units.push({
        gate,
        klal,
        titleHebrew: klalTitle,
        subtitleHebrew: "הערות מקדימות",
        ref: `${bodyRef}, Opening Comments`,
      });

      for (let from = 1; from <= seifCount; from += 2) {
        const to = Math.min(from + 1, seifCount);
        units.push({
          gate,
          klal,
          titleHebrew: klalTitle,
          subtitleHebrew:
            from === to
              ? `סעיף ${toHebrewNumeral(from)}`
              : `סעיפים ${toHebrewNumeral(from)}–${toHebrewNumeral(to)}`,
          ref: from === to ? `${bodyRef}.${from}` : `${bodyRef}.${from}-${to}`,
          seifFrom: from,
          seifTo: to,
        });
      }
    });
  });

  return units.map((u, i) => ({ ...u, index: i + 1 }));
}

export const CHOFETZ_CHAIM_UNITS: ChofetzChaimUnit[] = buildUnits();
export const TOTAL_CHOFETZ_CHAIM_UNITS = CHOFETZ_CHAIM_UNITS.length; // 116

export function getChofetzChaimUnitInfo(unitIndex: number): ChofetzChaimUnit {
  const clamped = Math.max(1, Math.min(Math.trunc(unitIndex) || 1, TOTAL_CHOFETZ_CHAIM_UNITS));
  return CHOFETZ_CHAIM_UNITS[clamped - 1];
}

// ── TOC grouping ──────────────────────────────────────────────────────────

export interface ChofetzChaimKlalGroup {
  klal: number;
  titleHebrew: string;
  units: ChofetzChaimUnit[];
}

export function getPetichahUnits(): ChofetzChaimUnit[] {
  return CHOFETZ_CHAIM_UNITS.filter((u) => u.gate === "petichah");
}

export function getKlalGroups(gate: "lashonHara" | "rechilut"): ChofetzChaimKlalGroup[] {
  const groups: ChofetzChaimKlalGroup[] = [];
  for (const unit of CHOFETZ_CHAIM_UNITS) {
    if (unit.gate !== gate || unit.klal === undefined) continue;
    let group = groups[groups.length - 1];
    if (!group || group.klal !== unit.klal) {
      group = { klal: unit.klal, titleHebrew: unit.titleHebrew, units: [] };
      groups.push(group);
    }
    group.units.push(unit);
  }
  return groups;
}

// ── Daily unit (annual cycle from 1 Tishrei, scaled to the year's length) ───
//
// Uses Intl's Hebrew calendar (no external library — same approach as
// tehillimStructure's getCurrentHebrewDayOfMonth) to locate the two Rosh
// Hashanahs bracketing today, then spreads TOTAL_CHOFETZ_CHAIM_UNITS
// proportionally across however many days that Hebrew year actually has
// (353-385, depending on leap / deficient / full year), so the cycle
// completes exactly once per year regardless of year length.

const MS_PER_DAY = 86400000;

function hebrewMonthDay(date: Date): { month: string; day: number } {
  const parts = new Intl.DateTimeFormat("en-u-ca-hebrew", {
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "1", 10);
  return { month, day };
}

// Sefaria/ICU render the Hebrew calendar's month as its name (e.g. "Tishri"),
// not a number, even when asked for "numeric" — matching on the name avoids
// any leap-year (Adar I/II) month-numbering ambiguity entirely.
function isRoshHashanah(date: Date): boolean {
  const { month, day } = hebrewMonthDay(date);
  return day === 1 && /^Tishr/i.test(month);
}

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Searches day-by-day (bounded well past the longest possible Hebrew year,
// 385 days) for the nearest Rosh Hashanah in the given direction.
function findRoshHashanah(from: Date, direction: 1 | -1): Date {
  const d = atMidnight(from);
  for (let i = 0; i < 400; i++) {
    if (isRoshHashanah(d)) return d;
    d.setDate(d.getDate() + direction);
  }
  return atMidnight(from);
}

export function getChofetzChaimDailyUnit(): number {
  const today = atMidnight(new Date());
  const lastRH = isRoshHashanah(today)
    ? today
    : findRoshHashanah(new Date(today.getTime() - MS_PER_DAY), -1);
  const nextRH = findRoshHashanah(new Date(lastRH.getTime() + MS_PER_DAY), 1);

  const dayOfYear = Math.round((today.getTime() - lastRH.getTime()) / MS_PER_DAY) + 1;
  const totalDaysInYear = Math.round((nextRH.getTime() - lastRH.getTime()) / MS_PER_DAY);

  const raw = Math.ceil((dayOfYear / totalDaysInYear) * TOTAL_CHOFETZ_CHAIM_UNITS);
  return Math.max(1, Math.min(raw, TOTAL_CHOFETZ_CHAIM_UNITS));
}
