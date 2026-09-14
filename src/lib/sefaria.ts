import { type Commentator, getCommentators } from "@/lib/commentators";

export type { Commentator };

export interface VerseWithCommentaries {
  verseNumber: number;
  text: string;
  commentaries: Record<string, string[]>; // key = Commentator.id
}

export interface ChapterData {
  bookName: string;
  chapterNumber: number;
  verses: VerseWithCommentaries[];
  commentators: Commentator[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function extractForVerse(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return (raw as unknown[])
      .filter((s): s is string => typeof s === "string" && s.trim() !== "")
      .map(stripHtml)
      .filter((s) => s.length > 0);
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const cleaned = stripHtml(raw);
    return cleaned ? [cleaned] : [];
  }
  return [];
}

async function fetchCommentatorChapter(
  commentator: Commentator,
  enc: string,
  chapter: number,
  verseCount: number
): Promise<{ id: string; heArr: unknown[] }> {
  const url = `https://www.sefaria.org/api/texts/${commentator.prefix}${enc}.${chapter}.1-${verseCount}?context=0`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${res.status} for ${commentator.id}: ${url}`);
  }
  const data = await res.json();
  return {
    id: commentator.id,
    heArr: Array.isArray(data.he) ? (data.he as unknown[]) : [],
  };
}

// ── Mishnah types ─────────────────────────────────────────────────────────────

export interface MishnahCommentator {
  id: string;
  nameHe: string;
}

export const MISHNAH_COMMENTATORS: MishnahCommentator[] = [
  { id: "bartenura", nameHe: "ברטנורא"  },
  { id: "rambam",    nameHe: 'רמב"ם'   },
];

export interface MishnahWithCommentaries {
  mishnahNumber: number;
  text: string;
  commentaries: Record<string, string[]>;
}

export interface MishnahChapterData {
  masechetName: string;
  chapterNumber: number;
  mishnahs: MishnahWithCommentaries[];
  commentators: MishnahCommentator[];
}

// ── Mishnah fetch ─────────────────────────────────────────────────────────────

export async function fetchMishnahChapter(
  sefariaName: string,
  chapter: number
): Promise<MishnahChapterData> {
  const enc = encodeURIComponent(sefariaName);

  const textRes = await fetch(
    `https://www.sefaria.org/api/texts/${enc}.${chapter}?context=0`
  );
  if (!textRes.ok) {
    throw new Error(`שגיאה בטעינת פרק משנה: ${textRes.status} ${textRes.statusText}`);
  }
  const textData = await textRes.json();
  const rawMishnahs: string[] = Array.isArray(textData.he) ? (textData.he as string[]) : [];
  const mishnahCount = rawMishnahs.length;

  const COMMS_WITH_PREFIX = [
    { id: "bartenura", prefix: "Bartenura on " },
    { id: "rambam",    prefix: "Rambam on "    },
  ];

  const settled = await Promise.allSettled(
    COMMS_WITH_PREFIX.map(async (c) => {
      const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(c.prefix + sefariaName)}.${chapter}.1-${mishnahCount}?context=0`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API ${res.status} for ${c.id}: ${url}`);
      const data = await res.json();
      return {
        id: c.id,
        heArr: Array.isArray(data.he) ? (data.he as unknown[]) : [],
      };
    })
  );

  const commentaryMap: Record<string, unknown[]> = {};
  for (const result of settled) {
    if (result.status === "fulfilled") {
      commentaryMap[result.value.id] = result.value.heArr;
    } else {
      console.error("[sefaria] mishnah commentator rejected:", result.reason);
    }
  }

  const mishnahs: MishnahWithCommentaries[] = rawMishnahs.map((text, i) => {
    const commentaries: Record<string, string[]> = {};
    for (const c of COMMS_WITH_PREFIX) {
      commentaries[c.id] = extractForVerse((commentaryMap[c.id] ?? [])[i]);
    }
    return { mishnahNumber: i + 1, text, commentaries };
  });

  return {
    masechetName: (textData.index_title as string) || sefariaName,
    chapterNumber: chapter,
    mishnahs,
    commentators: MISHNAH_COMMENTATORS,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function fetchChapterWithCommentaries(
  bookEn: string,
  chapter: number
): Promise<ChapterData> {
  const enc = encodeURIComponent(bookEn);

  // 1. Fetch chapter text
  const textRes = await fetch(
    `https://www.sefaria.org/api/texts/${enc}.${chapter}?context=0`
  );
  if (!textRes.ok) {
    throw new Error(`שגיאה בטעינת הפרק מספריא: ${textRes.status} ${textRes.statusText}`);
  }
  const textData = await textRes.json();
  const rawVerses: string[] = Array.isArray(textData.he) ? (textData.he as string[]) : [];
  const verseCount = rawVerses.length;

  // 2. Resolve commentators for this book
  const { commentators } = getCommentators(bookEn);

  // 3. Fetch all commentators in parallel — failures are non-fatal
  const settled = await Promise.allSettled(
    commentators.map((c) => fetchCommentatorChapter(c, enc, chapter, verseCount))
  );

  const commentaryMap: Record<string, unknown[]> = {};
  for (const result of settled) {
    if (result.status === "fulfilled") {
      commentaryMap[result.value.id] = result.value.heArr;
    } else {
      console.error("[sefaria] commentator rejected:", result.reason);
    }
  }

  // 4. Build verses with per-commentator content
  const verses: VerseWithCommentaries[] = rawVerses.map((text, i) => {
    const commentaries: Record<string, string[]> = {};
    for (const c of commentators) {
      commentaries[c.id] = extractForVerse((commentaryMap[c.id] ?? [])[i]);
    }
    return { verseNumber: i + 1, text, commentaries };
  });

  return {
    bookName: (textData.index_title as string) || bookEn,
    chapterNumber: chapter,
    verses,
    commentators,
  };
}
