export interface BookInfo {
  hebrewName: string;
  sefariaName: string;
  chapters: number;
}

export interface DayInfo {
  day: number;
  book: BookInfo;
  chapter: number;
}

export const TOTAL_DAYS = 929;

const BOOKS: BookInfo[] = [
  { hebrewName: "בראשית", sefariaName: "Genesis", chapters: 50 },
  { hebrewName: "שמות", sefariaName: "Exodus", chapters: 40 },
  { hebrewName: "ויקרא", sefariaName: "Leviticus", chapters: 27 },
  { hebrewName: "במדבר", sefariaName: "Numbers", chapters: 36 },
  { hebrewName: "דברים", sefariaName: "Deuteronomy", chapters: 34 },
  { hebrewName: "יהושע", sefariaName: "Joshua", chapters: 24 },
  { hebrewName: "שופטים", sefariaName: "Judges", chapters: 21 },
  { hebrewName: "שמואל א", sefariaName: "I Samuel", chapters: 31 },
  { hebrewName: "שמואל ב", sefariaName: "II Samuel", chapters: 24 },
  { hebrewName: "מלכים א", sefariaName: "I Kings", chapters: 22 },
  { hebrewName: "מלכים ב", sefariaName: "II Kings", chapters: 25 },
  { hebrewName: "ישעיהו", sefariaName: "Isaiah", chapters: 66 },
  { hebrewName: "ירמיהו", sefariaName: "Jeremiah", chapters: 52 },
  { hebrewName: "יחזקאל", sefariaName: "Ezekiel", chapters: 48 },
  { hebrewName: "הושע", sefariaName: "Hosea", chapters: 14 },
  { hebrewName: "יואל", sefariaName: "Joel", chapters: 4 },
  { hebrewName: "עמוס", sefariaName: "Amos", chapters: 9 },
  { hebrewName: "עובדיה", sefariaName: "Obadiah", chapters: 1 },
  { hebrewName: "יונה", sefariaName: "Jonah", chapters: 4 },
  { hebrewName: "מיכה", sefariaName: "Micah", chapters: 7 },
  { hebrewName: "נחום", sefariaName: "Nahum", chapters: 3 },
  { hebrewName: "חבקוק", sefariaName: "Habakkuk", chapters: 3 },
  { hebrewName: "צפניה", sefariaName: "Zephaniah", chapters: 3 },
  { hebrewName: "חגי", sefariaName: "Haggai", chapters: 2 },
  { hebrewName: "זכריה", sefariaName: "Zechariah", chapters: 14 },
  { hebrewName: "מלאכי", sefariaName: "Malachi", chapters: 3 },
  { hebrewName: "תהילים", sefariaName: "Psalms", chapters: 150 },
  { hebrewName: "משלי", sefariaName: "Proverbs", chapters: 31 },
  { hebrewName: "איוב", sefariaName: "Job", chapters: 42 },
  { hebrewName: "שיר השירים", sefariaName: "Song of Songs", chapters: 8 },
  { hebrewName: "רות", sefariaName: "Ruth", chapters: 4 },
  { hebrewName: "איכה", sefariaName: "Lamentations", chapters: 5 },
  { hebrewName: "קהלת", sefariaName: "Ecclesiastes", chapters: 12 },
  { hebrewName: "אסתר", sefariaName: "Esther", chapters: 10 },
  { hebrewName: "דניאל", sefariaName: "Daniel", chapters: 12 },
  { hebrewName: "עזרא", sefariaName: "Ezra", chapters: 10 },
  { hebrewName: "נחמיה", sefariaName: "Nehemiah", chapters: 13 },
  { hebrewName: "דברי הימים א", sefariaName: "I Chronicles", chapters: 29 },
  { hebrewName: "דברי הימים ב", sefariaName: "II Chronicles", chapters: 36 },
];

/** Reverse lookup: (book, chapter) → day number (1-929) */
export function getDayFromBookChapter(bookEn: string, chapter: number): number {
  let cumulative = 0;
  for (const book of BOOKS) {
    if (book.sefariaName === bookEn) {
      return cumulative + Math.max(1, Math.min(chapter, book.chapters));
    }
    cumulative += book.chapters;
  }
  return 1;
}

/** All non-Torah books in canonical order */
export function getNakhBooks(): BookInfo[] {
  return BOOKS.slice(5);
}

export function getDayInfo(day: number): DayInfo {
  const clamped = Math.max(1, Math.min(day, TOTAL_DAYS));
  let remaining = clamped;
  for (const book of BOOKS) {
    if (remaining <= book.chapters) {
      return { day: clamped, book, chapter: remaining };
    }
    remaining -= book.chapters;
  }
  const last = BOOKS[BOOKS.length - 1];
  return { day: TOTAL_DAYS, book: last, chapter: last.chapters };
}
