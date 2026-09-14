export interface Masechet {
  sederHe: string;
  sederEn: string;
  nameHe: string;
  nameEn: string;
  sefariaName: string; // e.g. "Mishnah Berakhot"
  chapters: number;
}

const Z  = "סדר זרעים";
const Mo = "סדר מועד";
const Na = "סדר נשים";
const Ne = "סדר נזיקין";
const K  = "סדר קדשים";
const T  = "סדר טהרות";

// 63 tractates, 525 chapters total
export const MASECHTOT: Masechet[] = [
  // ── זרעים ─────────────────────────────── 75 chapters
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "ברכות",      nameEn: "Berakhot",      sefariaName: "Mishnah Berakhot",      chapters: 9  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "פאה",         nameEn: "Peah",          sefariaName: "Mishnah Peah",          chapters: 8  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "דמאי",        nameEn: "Demai",         sefariaName: "Mishnah Demai",         chapters: 7  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "כלאים",       nameEn: "Kilayim",       sefariaName: "Mishnah Kilayim",       chapters: 9  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "שביעית",      nameEn: "Sheviit",       sefariaName: "Mishnah Sheviit",       chapters: 10 },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "תרומות",      nameEn: "Terumot",       sefariaName: "Mishnah Terumot",       chapters: 11 },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "מעשרות",      nameEn: "Maasrot",       sefariaName: "Mishnah Maasrot",       chapters: 5  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "מעשר שני",    nameEn: "Maaser Sheni",  sefariaName: "Mishnah Maaser Sheni",  chapters: 5  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "חלה",         nameEn: "Challah",       sefariaName: "Mishnah Challah",       chapters: 4  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "ערלה",        nameEn: "Orlah",         sefariaName: "Mishnah Orlah",         chapters: 3  },
  { sederHe: Z,  sederEn: "Zeraim",   nameHe: "ביכורים",     nameEn: "Bikkurim",      sefariaName: "Mishnah Bikkurim",      chapters: 4  },
  // ── מועד ──────────────────────────────── 88 chapters
  { sederHe: Mo, sederEn: "Moed",     nameHe: "שבת",         nameEn: "Shabbat",       sefariaName: "Mishnah Shabbat",       chapters: 24 },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "עירובין",     nameEn: "Eruvin",        sefariaName: "Mishnah Eruvin",        chapters: 10 },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "פסחים",       nameEn: "Pesachim",      sefariaName: "Mishnah Pesachim",      chapters: 10 },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "שקלים",       nameEn: "Shekalim",      sefariaName: "Mishnah Shekalim",      chapters: 8  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "יומא",        nameEn: "Yoma",          sefariaName: "Mishnah Yoma",          chapters: 8  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "סוכה",        nameEn: "Sukkah",        sefariaName: "Mishnah Sukkah",        chapters: 5  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "ביצה",        nameEn: "Beitzah",       sefariaName: "Mishnah Beitzah",       chapters: 5  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "ראש השנה",    nameEn: "Rosh Hashanah", sefariaName: "Mishnah Rosh Hashanah", chapters: 4  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "תענית",       nameEn: "Taanit",        sefariaName: "Mishnah Taanit",        chapters: 4  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "מגילה",       nameEn: "Megillah",      sefariaName: "Mishnah Megillah",      chapters: 4  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "מועד קטן",    nameEn: "Moed Katan",    sefariaName: "Mishnah Moed Katan",    chapters: 3  },
  { sederHe: Mo, sederEn: "Moed",     nameHe: "חגיגה",       nameEn: "Chagigah",      sefariaName: "Mishnah Chagigah",      chapters: 3  },
  // ── נשים ──────────────────────────────── 71 chapters
  { sederHe: Na, sederEn: "Nashim",   nameHe: "יבמות",       nameEn: "Yevamot",       sefariaName: "Mishnah Yevamot",       chapters: 16 },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "כתובות",      nameEn: "Ketubot",       sefariaName: "Mishnah Ketubot",       chapters: 13 },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "נדרים",       nameEn: "Nedarim",       sefariaName: "Mishnah Nedarim",       chapters: 11 },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "נזיר",        nameEn: "Nazir",         sefariaName: "Mishnah Nazir",         chapters: 9  },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "סוטה",        nameEn: "Sotah",         sefariaName: "Mishnah Sotah",         chapters: 9  },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "גיטין",       nameEn: "Gittin",        sefariaName: "Mishnah Gittin",        chapters: 9  },
  { sederHe: Na, sederEn: "Nashim",   nameHe: "קידושין",     nameEn: "Kiddushin",     sefariaName: "Mishnah Kiddushin",     chapters: 4  },
  // ── נזיקין ──────────────────────────── 74 chapters
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "בבא קמא",     nameEn: "Bava Kamma",    sefariaName: "Mishnah Bava Kamma",    chapters: 10 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "בבא מציעא",   nameEn: "Bava Metzia",   sefariaName: "Mishnah Bava Metzia",   chapters: 10 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "בבא בתרא",    nameEn: "Bava Batra",    sefariaName: "Mishnah Bava Batra",    chapters: 10 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "סנהדרין",     nameEn: "Sanhedrin",     sefariaName: "Mishnah Sanhedrin",     chapters: 11 },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "מכות",        nameEn: "Makkot",        sefariaName: "Mishnah Makkot",        chapters: 3  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "שבועות",      nameEn: "Shevuot",       sefariaName: "Mishnah Shevuot",       chapters: 8  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "עדויות",      nameEn: "Eduyot",        sefariaName: "Mishnah Eduyot",        chapters: 8  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "עבודה זרה",   nameEn: "Avodah Zarah",  sefariaName: "Mishnah Avodah Zarah",  chapters: 5  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "אבות",        nameEn: "Avot",          sefariaName: "Mishnah Avot",          chapters: 6  },
  { sederHe: Ne, sederEn: "Nezikin",  nameHe: "הוריות",      nameEn: "Horayot",       sefariaName: "Mishnah Horayot",       chapters: 3  },
  // ── קדשים ───────────────────────────── 91 chapters
  { sederHe: K,  sederEn: "Kodashim", nameHe: "זבחים",       nameEn: "Zevachim",      sefariaName: "Mishnah Zevachim",      chapters: 14 },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "מנחות",       nameEn: "Menachot",      sefariaName: "Mishnah Menachot",      chapters: 13 },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "חולין",       nameEn: "Chullin",       sefariaName: "Mishnah Chullin",       chapters: 12 },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "בכורות",      nameEn: "Bechorot",      sefariaName: "Mishnah Bechorot",      chapters: 9  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "ערכין",       nameEn: "Arachin",       sefariaName: "Mishnah Arachin",       chapters: 9  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "תמורה",       nameEn: "Temurah",       sefariaName: "Mishnah Temurah",       chapters: 7  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "כריתות",      nameEn: "Keritot",       sefariaName: "Mishnah Keritot",       chapters: 6  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "מעילה",       nameEn: "Meilah",        sefariaName: "Mishnah Meilah",        chapters: 6  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "תמיד",        nameEn: "Tamid",         sefariaName: "Mishnah Tamid",         chapters: 7  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "מידות",       nameEn: "Middot",        sefariaName: "Mishnah Middot",        chapters: 5  },
  { sederHe: K,  sederEn: "Kodashim", nameHe: "קינים",       nameEn: "Kinnim",        sefariaName: "Mishnah Kinnim",        chapters: 3  },
  // ── טהרות ───────────────────────────── 126 chapters
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "כלים",        nameEn: "Kelim",         sefariaName: "Mishnah Kelim",         chapters: 30 },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "אהלות",       nameEn: "Oholot",        sefariaName: "Mishnah Oholot",        chapters: 18 },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "נגעים",       nameEn: "Negaim",        sefariaName: "Mishnah Negaim",        chapters: 14 },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "פרה",         nameEn: "Parah",         sefariaName: "Mishnah Parah",         chapters: 12 },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "טהרות",       nameEn: "Tahorot",       sefariaName: "Mishnah Tahorot",       chapters: 10 },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "מקוואות",     nameEn: "Mikvaot",       sefariaName: "Mishnah Mikvaot",       chapters: 10 },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "נידה",        nameEn: "Niddah",        sefariaName: "Mishnah Niddah",        chapters: 10 },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "מכשירין",     nameEn: "Machshirin",    sefariaName: "Mishnah Machshirin",    chapters: 6  },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "זבים",        nameEn: "Zavim",         sefariaName: "Mishnah Zavim",         chapters: 5  },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "טבול יום",    nameEn: "Tevul Yom",     sefariaName: "Mishnah Tevul Yom",     chapters: 4  },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "ידיים",       nameEn: "Yadayim",       sefariaName: "Mishnah Yadayim",       chapters: 4  },
  { sederHe: T,  sederEn: "Tahorot",  nameHe: "עוקצין",      nameEn: "Oktzin",        sefariaName: "Mishnah Oktzin",        chapters: 3  },
];

export const TOTAL_MISHNAH_DAYS = MASECHTOT.reduce((s, m) => s + m.chapters, 0); // 525

export interface MishnahDayInfo {
  sederHe: string;
  sederEn: string;
  masechetHe: string;
  masechetEn: string;
  sefariaName: string;
  chapter: number;
}

export function getMishnahDayInfo(day: number): MishnahDayInfo {
  let remaining = day;
  for (const m of MASECHTOT) {
    if (remaining <= m.chapters) {
      return {
        sederHe: m.sederHe,
        sederEn: m.sederEn,
        masechetHe: m.nameHe,
        masechetEn: m.nameEn,
        sefariaName: m.sefariaName,
        chapter: remaining,
      };
    }
    remaining -= m.chapters;
  }
  const last = MASECHTOT[MASECHTOT.length - 1];
  return {
    sederHe: last.sederHe,
    sederEn: last.sederEn,
    masechetHe: last.nameHe,
    masechetEn: last.nameEn,
    sefariaName: last.sefariaName,
    chapter: last.chapters,
  };
}

export function getDayFromMishnah(sefariaName: string, chapter: number): number {
  let day = 0;
  for (const m of MASECHTOT) {
    if (m.sefariaName === sefariaName) return day + chapter;
    day += m.chapters;
  }
  return 1;
}

export const SEDARIM = [
  { nameHe: "סדר זרעים",  nameEn: "Zeraim"   },
  { nameHe: "סדר מועד",   nameEn: "Moed"     },
  { nameHe: "סדר נשים",   nameEn: "Nashim"   },
  { nameHe: "סדר נזיקין", nameEn: "Nezikin"  },
  { nameHe: "סדר קדשים",  nameEn: "Kodashim" },
  { nameHe: "סדר טהרות",  nameEn: "Tahorot"  },
] as const;
