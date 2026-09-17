import { type Commentator, getCommentators } from "@/lib/commentators";
import {
  SEFER_HAMITZVOT_SECTIONS,
  type SeferHaMitzvotSection,
} from "@/lib/seferHaMitzvotStructure";
import { getTehillimDayInfo } from "@/lib/tehillimStructure";

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

// ── Rambam (Mishneh Torah) types ───────────────────────────────────────────────

export interface RambamHalakha {
  number: number; // 1-based halakhah number within the chapter (printed as א׳, ב׳...)
  text: string;
}

export interface RambamChapterData {
  bookName: string; // Sefaria's title for the treatise, e.g. "Mishneh Torah, Foundations of the Torah"
  chapterNumber: number;
  halakhot: RambamHalakha[];
}

// ── Rambam fetch ─────────────────────────────────────────────────────────────

export async function fetchRambamChapter(
  sefariaTreatise: string,
  chapter: number
): Promise<RambamChapterData> {
  const ref = `Mishneh Torah, ${sefariaTreatise} ${chapter}`;
  const res = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!res.ok) {
    throw new Error(`שגיאה בטעינת הפרק מספריא: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // Sefaria returns {"error":"..."} with HTTP 200 for missing refs
  if (typeof data.error === "string") {
    throw new Error(data.error as string);
  }
  const rawHe: unknown[] = Array.isArray(data.he) ? (data.he as unknown[]) : [];

  // Each entry in `he` is one halakhah's text. Preserve the original 1-based
  // position as the halakhah number *before* dropping empty entries, so
  // numbering stays correct even if Sefaria has gaps in the array.
  const halakhot: RambamHalakha[] = rawHe
    .map((raw, i) => ({ number: i + 1, text: flattenHeField(raw).join(" ") }))
    .filter((h) => h.text.trim().length > 0);

  return {
    // Sefaria's texts endpoint exposes this as `indexTitle` (camelCase), not `index_title`.
    bookName: (data.indexTitle as string) || `Mishneh Torah, ${sefariaTreatise}`,
    chapterNumber: chapter,
    halakhot,
  };
}

// ── Daily Rambam (global calendar sync) ─────────────────────────────────────

export interface DailyRambamRef {
  sefariaTreatise: string;
  chapter: number;
}

// Sefaria's calendar API lists today's items across all daily-learning
// tracks. We want the single-chapter-a-day cycle specifically — its
// title.en is exactly "Daily Rambam" (as opposed to "Daily Rambam (3
// Chapters)", the three-chapters-a-day cycle, which must NOT match).
export async function getDailyRambamRef(): Promise<DailyRambamRef> {
  const res = await fetch("https://www.sefaria.org/api/calendars");
  if (!res.ok) {
    throw new Error(`שגיאה בטעינת הלוח היומי מספריא: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const items: unknown[] = Array.isArray(data.calendar_items) ? (data.calendar_items as unknown[]) : [];

  const item = items.find((raw): raw is { ref: string } => {
    if (typeof raw !== "object" || raw === null) return false;
    const title = (raw as Record<string, unknown>).title;
    const titleEn =
      typeof title === "object" && title !== null
        ? (title as Record<string, unknown>).en
        : undefined;
    return titleEn === "Daily Rambam" && typeof (raw as Record<string, unknown>).ref === "string";
  });

  if (!item) {
    throw new Error('לא נמצא "רמב"ם היומי" בלוח השנה של ספריא');
  }

  // item.ref looks like "Mishneh Torah, Marriage 21" — treatise names can
  // themselves contain commas (e.g. "Tefillin, Mezuzah and the Torah
  // Scroll"), so match greedily and only peel off the trailing chapter number.
  const match = /^Mishneh Torah, (.+) (\d+)$/.exec(item.ref);
  if (!match) {
    throw new Error(`תבנית ref לא צפויה עבור רמב"ם יומי: ${item.ref}`);
  }

  return {
    sefariaTreatise: match[1],
    chapter: parseInt(match[2], 10),
  };
}

// ── Sefer HaMitzvot types ───────────────────────────────────────────────────

export interface SeferHaMitzvotItemData {
  sectionTitleHebrew: string;
  number: number;
  paragraphs: string[]; // flattened, HTML-stripped Seif paragraphs
}

// ── Sefer HaMitzvot fetch ────────────────────────────────────────────────────

export async function fetchSeferHaMitzvot(
  section: SeferHaMitzvotSection,
  number: number
): Promise<SeferHaMitzvotItemData> {
  const sectionInfo = SEFER_HAMITZVOT_SECTIONS.find((s) => s.id === section);
  if (!sectionInfo) {
    throw new Error(`מקטע לא ידוע בספר המצוות: ${section}`);
  }

  const ref = `${sectionInfo.sefariaTreatise} ${number}`;
  const res = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!res.ok) {
    throw new Error(`שגיאה בטעינה מספריא: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // Sefaria returns {"error":"..."} with HTTP 200 for missing refs
  if (typeof data.error === "string") {
    throw new Error(data.error as string);
  }

  return {
    sectionTitleHebrew: sectionInfo.titleHebrew,
    number,
    paragraphs: flattenHeField(data.he),
  };
}

// ── Daily Sefer HaMitzvot (global calendar sync, if Sefaria publishes one) ──

export interface DailySeferHaMitzvotRef {
  section: SeferHaMitzvotSection;
  number: number;
}

const SEFER_HAMITZVOT_REF_TO_SECTION: Record<string, SeferHaMitzvotSection> = {
  Shorashim: "shorashim",
  "Positive Commandments": "positive",
  "Negative Commandments": "negative",
};

// As of this writing, Sefaria's /api/calendars does not include a daily
// Sefer HaMitzvot cycle (verified directly against the live endpoint — its
// calendar_items cover Daf Yomi, Daily Mishnah, Daily Rambam, etc., but no
// "Daily Sefer HaMitzvot"/"Daily Mitzvah" entry). This function still checks
// for one defensively — by title (matching "Sefer HaMitzvot" or "Mitzvah")
// rather than an exact string — so global-mode support activates
// automatically if Sefaria ever adds that track, without a code change.
// Returns null (not an error) when no such calendar entry exists.
export async function getDailySeferHaMitzvotRef(): Promise<DailySeferHaMitzvotRef | null> {
  const res = await fetch("https://www.sefaria.org/api/calendars");
  if (!res.ok) {
    throw new Error(`שגיאה בטעינת הלוח היומי מספריא: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const items: unknown[] = Array.isArray(data.calendar_items) ? (data.calendar_items as unknown[]) : [];

  const item = items.find((raw): raw is { ref: string } => {
    if (typeof raw !== "object" || raw === null) return false;
    const record = raw as Record<string, unknown>;
    const title = record.title;
    const titleEn =
      typeof title === "object" && title !== null
        ? (title as Record<string, unknown>).en
        : undefined;
    return (
      typeof titleEn === "string" &&
      /sefer hamitzvot|daily mitzvah/i.test(titleEn) &&
      typeof record.ref === "string"
    );
  });

  if (!item) return null;

  const match = /^Sefer HaMitzvot, (Shorashim|Positive Commandments|Negative Commandments) (\d+)$/.exec(item.ref);
  if (!match) return null;

  return {
    section: SEFER_HAMITZVOT_REF_TO_SECTION[match[1]],
    number: parseInt(match[2], 10),
  };
}

// ── Tehillim (daily, by Hebrew day-of-month) types ──────────────────────────

export interface TehillimVerse {
  verse: number; // verse number within the psalm (not the array position — matters for day 25/26)
  text: string;
}

export interface TehillimPsalmData {
  number: number;
  verses: TehillimVerse[];
}

export interface TehillimDayData {
  day: number;
  psalms: TehillimPsalmData[];
}

// ── Tehillim fetch ───────────────────────────────────────────────────────────

async function fetchPsalm(
  psalmNumber: number,
  fromVerse?: number,
  toVerse?: number
): Promise<TehillimPsalmData> {
  const ref = fromVerse && toVerse ? `Psalms ${psalmNumber}:${fromVerse}-${toVerse}` : `Psalms ${psalmNumber}`;
  const res = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!res.ok) {
    throw new Error(`שגיאה בטעינת תהלים ${psalmNumber} מספריא: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (typeof data.error === "string") {
    throw new Error(data.error as string);
  }

  // A single-chapter ref (with or without a verse range) returns a flat `he`
  // array — one string per verse — so flattenHeField is safe here. (A
  // multi-chapter range like "Psalms 1-3" would instead nest one array per
  // chapter, which is why each psalm is fetched with its own ref.)
  const texts = flattenHeField(data.he);
  const startVerse = fromVerse ?? 1;

  return {
    number: psalmNumber,
    verses: texts.map((text, i) => ({ verse: startVerse + i, text })),
  };
}

export async function fetchTehillimDay(day: number): Promise<TehillimDayData> {
  const info = getTehillimDayInfo(day);

  // Days 25/26 are a single psalm (119) split by verse range.
  if (info.verseFrom && info.verseTo) {
    const psalm = await fetchPsalm(info.fromPsalm, info.verseFrom, info.verseTo);
    return { day: info.day, psalms: [psalm] };
  }

  const psalmNumbers: number[] = [];
  for (let p = info.fromPsalm; p <= info.toPsalm; p++) psalmNumbers.push(p);

  const settled = await Promise.allSettled(psalmNumbers.map((n) => fetchPsalm(n)));
  const psalms: TehillimPsalmData[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      psalms.push(result.value);
    } else {
      console.error("[sefaria] tehillim psalm fetch failed:", result.reason);
    }
  }

  if (psalms.length === 0 && psalmNumbers.length > 0) {
    throw new Error("שגיאה בטעינת תהלים מספריא");
  }

  return { day: info.day, psalms };
}
