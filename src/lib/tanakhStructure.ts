export interface Parasha {
  nameHe: string;
  bookEn: string;
  startChapter: number;
  endChapter: number;
}

// 54 parshiyot with non-overlapping chapter ranges covering all 187 Torah chapters
export const PARSHIYOT: Parasha[] = [
  // ── בראשית ──────────────────────────────────────── 50 chapters
  { nameHe: "בראשית",     bookEn: "Genesis",      startChapter: 1,  endChapter: 6  },
  { nameHe: "נח",         bookEn: "Genesis",      startChapter: 7,  endChapter: 11 },
  { nameHe: "לך לך",      bookEn: "Genesis",      startChapter: 12, endChapter: 17 },
  { nameHe: "וירא",       bookEn: "Genesis",      startChapter: 18, endChapter: 22 },
  { nameHe: "חיי שרה",    bookEn: "Genesis",      startChapter: 23, endChapter: 25 },
  { nameHe: "תולדות",     bookEn: "Genesis",      startChapter: 26, endChapter: 28 },
  { nameHe: "ויצא",       bookEn: "Genesis",      startChapter: 29, endChapter: 32 },
  { nameHe: "וישלח",      bookEn: "Genesis",      startChapter: 33, endChapter: 36 },
  { nameHe: "וישב",       bookEn: "Genesis",      startChapter: 37, endChapter: 40 },
  { nameHe: "מקץ",        bookEn: "Genesis",      startChapter: 41, endChapter: 44 },
  { nameHe: "ויגש",       bookEn: "Genesis",      startChapter: 45, endChapter: 47 },
  { nameHe: "ויחי",       bookEn: "Genesis",      startChapter: 48, endChapter: 50 },
  // ── שמות ─────────────────────────────────────────  40 chapters
  { nameHe: "שמות",       bookEn: "Exodus",       startChapter: 1,  endChapter: 6  },
  { nameHe: "וארא",       bookEn: "Exodus",       startChapter: 7,  endChapter: 9  },
  { nameHe: "בא",         bookEn: "Exodus",       startChapter: 10, endChapter: 13 },
  { nameHe: "בשלח",       bookEn: "Exodus",       startChapter: 14, endChapter: 17 },
  { nameHe: "יתרו",       bookEn: "Exodus",       startChapter: 18, endChapter: 20 },
  { nameHe: "משפטים",     bookEn: "Exodus",       startChapter: 21, endChapter: 24 },
  { nameHe: "תרומה",      bookEn: "Exodus",       startChapter: 25, endChapter: 27 },
  { nameHe: "תצוה",       bookEn: "Exodus",       startChapter: 28, endChapter: 30 },
  { nameHe: "כי תשא",     bookEn: "Exodus",       startChapter: 31, endChapter: 34 },
  { nameHe: "ויקהל",      bookEn: "Exodus",       startChapter: 35, endChapter: 37 },
  { nameHe: "פקודי",      bookEn: "Exodus",       startChapter: 38, endChapter: 40 },
  // ── ויקרא ────────────────────────────────────────  27 chapters
  { nameHe: "ויקרא",      bookEn: "Leviticus",    startChapter: 1,  endChapter: 5  },
  { nameHe: "צו",         bookEn: "Leviticus",    startChapter: 6,  endChapter: 8  },
  { nameHe: "שמיני",      bookEn: "Leviticus",    startChapter: 9,  endChapter: 11 },
  { nameHe: "תזריע",      bookEn: "Leviticus",    startChapter: 12, endChapter: 13 },
  { nameHe: "מצורע",      bookEn: "Leviticus",    startChapter: 14, endChapter: 15 },
  { nameHe: "אחרי מות",   bookEn: "Leviticus",    startChapter: 16, endChapter: 18 },
  { nameHe: "קדושים",     bookEn: "Leviticus",    startChapter: 19, endChapter: 20 },
  { nameHe: "אמור",       bookEn: "Leviticus",    startChapter: 21, endChapter: 24 },
  { nameHe: "בהר",        bookEn: "Leviticus",    startChapter: 25, endChapter: 26 },
  { nameHe: "בחוקותי",    bookEn: "Leviticus",    startChapter: 27, endChapter: 27 },
  // ── במדבר ────────────────────────────────────────  36 chapters
  { nameHe: "במדבר",      bookEn: "Numbers",      startChapter: 1,  endChapter: 4  },
  { nameHe: "נשא",        bookEn: "Numbers",      startChapter: 5,  endChapter: 7  },
  { nameHe: "בהעלתך",     bookEn: "Numbers",      startChapter: 8,  endChapter: 12 },
  { nameHe: "שלח",        bookEn: "Numbers",      startChapter: 13, endChapter: 15 },
  { nameHe: "קרח",        bookEn: "Numbers",      startChapter: 16, endChapter: 18 },
  { nameHe: "חקת",        bookEn: "Numbers",      startChapter: 19, endChapter: 21 },
  { nameHe: "בלק",        bookEn: "Numbers",      startChapter: 22, endChapter: 25 },
  { nameHe: "פינחס",      bookEn: "Numbers",      startChapter: 26, endChapter: 30 },
  { nameHe: "מטות",       bookEn: "Numbers",      startChapter: 31, endChapter: 32 },
  { nameHe: "מסעי",       bookEn: "Numbers",      startChapter: 33, endChapter: 36 },
  // ── דברים ────────────────────────────────────────  34 chapters
  { nameHe: "דברים",      bookEn: "Deuteronomy",  startChapter: 1,  endChapter: 3  },
  { nameHe: "ואתחנן",     bookEn: "Deuteronomy",  startChapter: 4,  endChapter: 7  },
  { nameHe: "עקב",        bookEn: "Deuteronomy",  startChapter: 8,  endChapter: 11 },
  { nameHe: "ראה",        bookEn: "Deuteronomy",  startChapter: 12, endChapter: 16 },
  { nameHe: "שופטים",     bookEn: "Deuteronomy",  startChapter: 17, endChapter: 21 },
  { nameHe: "כי תצא",     bookEn: "Deuteronomy",  startChapter: 22, endChapter: 25 },
  { nameHe: "כי תבא",     bookEn: "Deuteronomy",  startChapter: 26, endChapter: 29 },
  { nameHe: "נצבים",      bookEn: "Deuteronomy",  startChapter: 30, endChapter: 30 },
  { nameHe: "וילך",       bookEn: "Deuteronomy",  startChapter: 31, endChapter: 31 },
  { nameHe: "האזינו",     bookEn: "Deuteronomy",  startChapter: 32, endChapter: 32 },
  { nameHe: "וזאת הברכה", bookEn: "Deuteronomy",  startChapter: 33, endChapter: 34 },
];

const TORAH_BOOK_HE: Record<string, string> = {
  Genesis: "בראשית",
  Exodus: "שמות",
  Leviticus: "ויקרא",
  Numbers: "במדבר",
  Deuteronomy: "דברים",
};

export function getBookHebrewName(bookEn: string): string {
  return TORAH_BOOK_HE[bookEn] ?? bookEn;
}
