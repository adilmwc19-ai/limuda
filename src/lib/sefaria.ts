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

// Sefaria's `he` field is sometimes a flat string, sometimes string[], and
// sometimes a nested array (string[][] or deeper) when a line has multiple
// comments. Flatten fully regardless of depth, then drop empty/blank/null values.
function flattenHeField(raw: unknown): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return (arr as unknown[])
    .flat(Infinity)
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map(stripHtml)
    .filter((s) => s.length > 0);
}

function extractForVerse(raw: unknown): string[] {
  return flattenHeField(raw);
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

// ── Talmud types ──────────────────────────────────────────────────────────────

export interface TalmudAmudData {
  amud: "a" | "b";
  text: string[];          // each segment is one paragraph
  rashi: string[];
  tosafot: string[];
}

export interface TalmudDafData {
  masechetName: string;
  dafNumber: number;
  amudAlef: TalmudAmudData;
  amudBet: TalmudAmudData;
}

// "Vilna mode": remove nikud/cantillation AND modern punctuation added by editors.
// Geresh ׳ (U+05F3) and gershayim ״ (U+05F4) lie outside the stripped range and
// are preserved so abbreviations like רמב"ם / ר' remain readable.
export function stripTalmudPunctuation(text: string): string {
  return text
    .replace(/[֑-ׇ]/g, "")              // nikud + cantillation marks
    .replace(/[,\.?!:;–—\-–—()\[\]{}]/g, "") // modern punctuation
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Talmud fetch ──────────────────────────────────────────────────────────────

// Rashi/Tosafot on Talmud are addressed 3 levels deep (Daf, Line, Comment) —
// a Daf can have several comments per line. Fetching the bare daf ref
// ("Rashi on Berakhot 3b") only resolves to line 1's comment(s); Sefaria does
// NOT default to the full daf the way it does for the (2-level) Gemara text
// itself. We must request an explicit line range ("...3b.1-{lineCount}") to
// get every line's comments. Since we don't know the line count up front, we
// first fetch the Gemara text (which does return in full) and use its
// segment count to build the range for the commentary fetch.
const MAX_TALMUD_LINES_FALLBACK = 100; // safety net if the Gemara fetch itself fails

export async function fetchTalmudDaf(
  sefariaName: string,
  dafNumber: number
): Promise<TalmudDafData> {
  // Build a fully-encoded Sefaria ref URL: "Tosafot on Berakhot 2b" → %2F-safe
  function refUrl(ref: string): string {
    return `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`;
  }

  async function fetchJson(url: string): Promise<Record<string, unknown>> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }

  function heSegments(result: PromiseSettledResult<Record<string, unknown>>): string[] {
    if (result.status !== "fulfilled") return [];
    const data = result.value;
    // Sefaria returns {"error":"..."} with HTTP 200 for missing refs
    if (typeof data.error === "string") return [];
    return flattenHeField(data.he);
  }

  // Phase 1: Gemara text for both amudim — this also tells us how many lines
  // each amud has, which the commentary fetches in phase 2 need.
  const [textA, textB] = await Promise.allSettled([
    fetchJson(refUrl(`${sefariaName} ${dafNumber}a`)),
    fetchJson(refUrl(`${sefariaName} ${dafNumber}b`)),
  ]);

  function lineCount(result: PromiseSettledResult<Record<string, unknown>>): number {
    if (result.status !== "fulfilled") return MAX_TALMUD_LINES_FALLBACK;
    const he = result.value.he;
    return Array.isArray(he) && he.length > 0 ? he.length : MAX_TALMUD_LINES_FALLBACK;
  }

  const linesA = lineCount(textA);
  const linesB = lineCount(textB);

  // Phase 2: Rashi/Tosafot, requested across the full line range of their amud.
  const [rashiA, rashiB, tosafA, tosafB] = await Promise.allSettled([
    fetchJson(refUrl(`Rashi on ${sefariaName} ${dafNumber}a.1-${linesA}`)),
    fetchJson(refUrl(`Rashi on ${sefariaName} ${dafNumber}b.1-${linesB}`)),
    fetchJson(refUrl(`Tosafot on ${sefariaName} ${dafNumber}a.1-${linesA}`)),
    fetchJson(refUrl(`Tosafot on ${sefariaName} ${dafNumber}b.1-${linesB}`)),
  ]);

  const masechetName =
    (textA.status === "fulfilled" ? (textA.value.index_title as string) : undefined) ?? sefariaName;

  return {
    masechetName,
    dafNumber,
    amudAlef: {
      amud: "a",
      text:    heSegments(textA),
      rashi:   heSegments(rashiA),
      tosafot: heSegments(tosafA),
    },
    amudBet: {
      amud: "b",
      text:    heSegments(textB),
      rashi:   heSegments(rashiB),
      tosafot: heSegments(tosafB),
    },
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
