export interface TalmudMasechet {
  sederHe: string;
  sederEn: string;
  nameHe: string;
  sefariaName: string; // used verbatim in Sefaria API
  lastDaf: number;     // dafim span 2..lastDaf (inclusive)
}

const Z  = "סדר זרעים";
const Mo = "סדר מועד";
const Na = "סדר נשים";
const Ne = "סדר נזיקין";
const K  = "סדר קדשים";
const T  = "סדר טהרות";

export const TALMUD_MASECHTOT: TalmudMasechet[] = [
  // ── זרעים ──────────────────────── (1)
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "ברכות",       sefariaName: "Berakhot",      lastDaf: 64  },
  // ── מועד ───────────────────────── (12)
  { sederHe: Mo, sederEn: "Moed",     nameHe: "שבת",         sefariaName: "Shabbat",       lastDaf: 157 },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "עירובין",     sefariaName: "Eruvin",        lastDaf: 105 },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "פסחים",       sefariaName: "Pesachim",      lastDaf: 121 },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "שקלים",       sefariaName: "Shekalim",      lastDaf: 22  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "יומא",        sefariaName: "Yoma",          lastDaf: 88  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "סוכה",        sefariaName: "Sukkah",        lastDaf: 56  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "ביצה",        sefariaName: "Beitzah",       lastDaf: 40  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "ראש השנה",    sefariaName: "Rosh Hashanah", lastDaf: 35  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "תענית",       sefariaName: "Taanit",        lastDaf: 31  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "מגילה",       sefariaName: "Megillah",      lastDaf: 32  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "מועד קטן",    sefariaName: "Moed Katan",    lastDaf: 29  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "חגיגה",       sefariaName: "Chagigah",      lastDaf: 27  },
  // ── נשים ───────────────────────── (7)
  { sederHe: Na, sederEn: "Nashim",   nameHe: "יבמות",       sefariaName: "Yevamot",       lastDaf: 122 },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "כתובות",      sefariaName: "Ketubot",       lastDaf: 112 },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "נדרים",       sefariaName: "Nedarim",       lastDaf: 91  },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "נזיר",        sefariaName: "Nazir",         lastDaf: 66  },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "סוטה",        sefariaName: "Sotah",         lastDaf: 49  },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "גיטין",       sefariaName: "Gittin",        lastDaf: 90  },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "קידושין",     sefariaName: "Kiddushin",     lastDaf: 82  },
  // ── נזיקין ─────────────────────── (8)
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "בבא קמא",     sefariaName: "Bava Kamma",    lastDaf: 119 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "בבא מציעא",   sefariaName: "Bava Metzia",   lastDaf: 119 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "בבא בתרא",    sefariaName: "Bava Batra",    lastDaf: 176 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "סנהדרין",     sefariaName: "Sanhedrin",     lastDaf: 113 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "מכות",        sefariaName: "Makkot",        lastDaf: 24  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "שבועות",      sefariaName: "Shevuot",       lastDaf: 49  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "עבודה זרה",   sefariaName: "Avodah Zarah",  lastDaf: 76  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "הוריות",      sefariaName: "Horayot",       lastDaf: 14  },
  // ── קדשים ──────────────────────── (8)
  { sederHe: K,  sederEn: "Kodashim", nameHe: "זבחים",       sefariaName: "Zevachim",      lastDaf: 120 },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "מנחות",       sefariaName: "Menachot",      lastDaf: 110 },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "חולין",       sefariaName: "Chullin",       lastDaf: 142 },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "בכורות",      sefariaName: "Bechorot",      lastDaf: 61  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "ערכין",       sefariaName: "Arachin",       lastDaf: 34  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "תמורה",       sefariaName: "Temurah",       lastDaf: 34  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "כריתות",      sefariaName: "Keritot",       lastDaf: 28  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "מעילה",       sefariaName: "Meilah",        lastDaf: 22  },
  // ── טהרות ──────────────────────── (1)
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "נידה",        sefariaName: "Niddah",        lastDaf: 73  },
];

// Total unique dafim (each masechet contributes lastDaf - 1 dafim: 2..lastDaf)
export const TOTAL_TALMUD_DAYS = TALMUD_MASECHTOT.reduce((s, m) => s + (m.lastDaf - 1), 0);

export interface DafInfo {
  sederHe: string;
  sederEn: string;
  masechetHe: string;
  sefariaName: string;
  dafNumber: number; // 2..lastDaf
  dafCount: number;  // lastDaf - 1
}

export function getDafInfo(day: number): DafInfo {
  let remaining = Math.max(1, Math.min(day, TOTAL_TALMUD_DAYS));
  for (const m of TALMUD_MASECHTOT) {
    const count = m.lastDaf - 1;
    if (remaining <= count) {
      return {
        sederHe:    m.sederHe,
        sederEn:    m.sederEn,
        masechetHe: m.nameHe,
        sefariaName: m.sefariaName,
        dafNumber:  remaining + 1, // dafim begin at 2
        dafCount:   count,
      };
    }
    remaining -= count;
  }
  const last = TALMUD_MASECHTOT[TALMUD_MASECHTOT.length - 1];
  return {
    sederHe:    last.sederHe,
    sederEn:    last.sederEn,
    masechetHe: last.nameHe,
    sefariaName: last.sefariaName,
    dafNumber:  last.lastDaf,
    dafCount:   last.lastDaf - 1,
  };
}

export function getDayFromDaf(sefariaName: string, daf: number): number {
  let day = 0;
  for (const m of TALMUD_MASECHTOT) {
    if (m.sefariaName === sefariaName) return day + (daf - 1); // daf 2 → day 1
    day += m.lastDaf - 1;
  }
  return 1;
}

// Aligned to the 14th Daf Yomi cycle (Berakhot 2 = Jan 5, 2020)
const DAF_YOMI_EPOCH_MS = new Date("2020-01-05T00:00:00Z").getTime();

export function getCurrentDafYomiDay(): number {
  const elapsed = Math.floor((Date.now() - DAF_YOMI_EPOCH_MS) / (24 * 60 * 60 * 1000));
  return (elapsed % TOTAL_TALMUD_DAYS) + 1;
}

export const TALMUD_SEDARIM = [
  { nameHe: "סדר זרעים",  nameEn: "Zeraim"   },
  { nameHe: "סדר מועד",   nameEn: "Moed"     },
  { nameHe: "סדר נשים",   nameEn: "Nashim"   },
  { nameHe: "סדר נזיקין", nameEn: "Nezikin"  },
  { nameHe: "סדר קדשים",  nameEn: "Kodashim" },
  { nameHe: "סדר טהרות",  nameEn: "Tahorot"  },
] as const;
