// Daily Tehillim (תהלים) by day of the Hebrew month — the traditional
// 30-day division of all 150 psalms. Day 25/26 split Psalm 119 (the longest
// psalm) by verse instead of by psalm number, since it alone spans two days.

export interface TehillimDayRange {
  day: number;         // 1-30
  fromPsalm: number;
  toPsalm: number;
  verseFrom?: number;  // set only for a partial-psalm day (25, 26 — within Psalm 119)
  verseTo?: number;
}

export const TEHILLIM_DAYS: TehillimDayRange[] = [
  { day: 1,  fromPsalm: 1,   toPsalm: 9   },
  { day: 2,  fromPsalm: 10,  toPsalm: 17  },
  { day: 3,  fromPsalm: 18,  toPsalm: 22  },
  { day: 4,  fromPsalm: 23,  toPsalm: 28  },
  { day: 5,  fromPsalm: 29,  toPsalm: 34  },
  { day: 6,  fromPsalm: 35,  toPsalm: 38  },
  { day: 7,  fromPsalm: 39,  toPsalm: 43  },
  { day: 8,  fromPsalm: 44,  toPsalm: 48  },
  { day: 9,  fromPsalm: 49,  toPsalm: 54  },
  { day: 10, fromPsalm: 55,  toPsalm: 59  },
  { day: 11, fromPsalm: 60,  toPsalm: 65  },
  { day: 12, fromPsalm: 66,  toPsalm: 68  },
  { day: 13, fromPsalm: 69,  toPsalm: 71  },
  { day: 14, fromPsalm: 72,  toPsalm: 76  },
  { day: 15, fromPsalm: 77,  toPsalm: 78  },
  { day: 16, fromPsalm: 79,  toPsalm: 82  },
  { day: 17, fromPsalm: 83,  toPsalm: 87  },
  { day: 18, fromPsalm: 88,  toPsalm: 89  },
  { day: 19, fromPsalm: 90,  toPsalm: 96  },
  { day: 20, fromPsalm: 97,  toPsalm: 103 },
  { day: 21, fromPsalm: 104, toPsalm: 105 },
  { day: 22, fromPsalm: 106, toPsalm: 107 },
  { day: 23, fromPsalm: 108, toPsalm: 112 },
  { day: 24, fromPsalm: 113, toPsalm: 118 },
  { day: 25, fromPsalm: 119, toPsalm: 119, verseFrom: 1,   verseTo: 96  },
  { day: 26, fromPsalm: 119, toPsalm: 119, verseFrom: 97,  verseTo: 176 },
  { day: 27, fromPsalm: 120, toPsalm: 134 },
  { day: 28, fromPsalm: 135, toPsalm: 139 },
  { day: 29, fromPsalm: 140, toPsalm: 144 },
  { day: 30, fromPsalm: 145, toPsalm: 150 },
];

export const TOTAL_TEHILLIM_DAYS = TEHILLIM_DAYS.length; // 30

// ── Hebrew numerals (up to 176, for Psalm 119's verse numbers) ────────────────
// ט״ו/ט״ז (15/16) avoid spelling out God's name; the gershayim always sits
// before the final letter, never appended after both (e.g. ט״ו, not טו׳).

export function toHebrewNumeral(n: number): string {
  if (n <= 0 || n > 999) return String(n);
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const tens     = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const ones     = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const letters =
    t === 1 && o === 5 ? hundreds[h] + "טו" :
    t === 1 && o === 6 ? hundreds[h] + "טז" :
    hundreds[h] + tens[t] + ones[o];
  return letters.length > 1
    ? letters.slice(0, -1) + "״" + letters.slice(-1)
    : letters + "׳";
}

function buildLabel(range: TehillimDayRange): string {
  if (range.fromPsalm === range.toPsalm) {
    const psalmHe = toHebrewNumeral(range.fromPsalm);
    if (range.verseFrom && range.verseTo) {
      return `${psalmHe}, פסוקים ${toHebrewNumeral(range.verseFrom)}–${toHebrewNumeral(range.verseTo)}`;
    }
    return psalmHe;
  }
  return `${toHebrewNumeral(range.fromPsalm)}–${toHebrewNumeral(range.toPsalm)}`;
}

// ── Day info ────────────────────────────────────────────────────────────────

export interface TehillimDayInfo extends TehillimDayRange {
  label: string;        // e.g. "א׳–ט׳" or "קי״ט, פסוקים א׳–צ״ו"
  description: string;  // e.g. "תהלים א׳–ט׳"
}

export function getTehillimDayInfo(day: number): TehillimDayInfo {
  const clamped = Math.max(1, Math.min(Math.trunc(day) || 1, TOTAL_TEHILLIM_DAYS));
  const range = TEHILLIM_DAYS.find((d) => d.day === clamped) ?? TEHILLIM_DAYS[0];
  const label = buildLabel(range);
  return { ...range, label, description: `תהלים ${label}` };
}

// ── Current Hebrew day-of-month ────────────────────────────────────────────

function hebrewDayOfMonth(date: Date): number {
  const formatted = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric" }).format(date);
  return parseInt(formatted, 10);
}

export interface CurrentHebrewDay {
  day: number;              // 1-30, today's Hebrew day-of-month
  isDeficientMonth: boolean; // true if the current Hebrew month has only 29 days
  combineWithDay30: boolean; // true on day 29 of a deficient month — read day 30's psalms too
}

// Computes today's Hebrew day-of-month via Intl's Hebrew calendar. A
// deficient (חסר) month has only 29 days, so day 29 is also its last day —
// detected by checking whether tomorrow's Hebrew day-of-month resets to 1.
export function getCurrentHebrewDayOfMonth(): CurrentHebrewDay {
  const now = new Date();
  const day = Math.max(1, Math.min(hebrewDayOfMonth(now), TOTAL_TEHILLIM_DAYS));

  let isDeficientMonth = false;
  if (day === 29) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    isDeficientMonth = hebrewDayOfMonth(tomorrow) === 1;
  }

  return {
    day,
    isDeficientMonth,
    combineWithDay30: day === 29 && isDeficientMonth,
  };
}
