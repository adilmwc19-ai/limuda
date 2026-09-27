import { type Commentator, getCommentators } from "@/lib/commentators";
import {
  SEFER_HAMITZVOT_SECTIONS,
  type SeferHaMitzvotSection,
} from "@/lib/seferHaMitzvotStructure";
import { getTehillimDayInfo } from "@/lib/tehillimStructure";
import { PEREK_SHIRAH_SECTIONS } from "@/lib/perekShirahStructure";
import { getChofetzChaimUnitInfo, illustrationRef, type ChofetzChaimGate } from "@/lib/chofetzChaimStructure";

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

// Sefaria's Tanakh-sourced text (Torah, Nakh, Tehillim, Perek Shirah, ...)
// includes cantillation marks (טעמי מקרא, U+0591–U+05AF). Rendered alongside
// nikud, these collide visually into clutter that reads as corrupted letters.
// Strip only that range so nikud (vowel points, U+05B0–U+05C7) stays intact —
// unlike stripTalmudPunctuation, which removes nikud too for "Vilna mode".
export function stripCantillation(text: string): string {
  return text.replace(/[֑-֯]/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Catch-all for any other HTML entity Sefaria's markup leaves behind
    // (&thinsp;, &rlm;, &lrm;, etc. — typographic/directional artifacts with
    // no Hebrew-text meaning), so raw entity text never reaches the page.
    .replace(/&[a-zA-Z0-9#]+;/g, "")
    .replace(/\s{2,}/g, " ")
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
    .map(stripCantillation)
    .filter((s) => s.length > 0);
}

function extractForVerse(raw: unknown): string[] {
  return flattenHeField(raw);
}

// ── Shared fetch layer ──────────────────────────────────────────────────────
// Every call site below hits Sefaria's read-only text API for content that
// only changes on Sefaria's own publishing cadence, so responses are safe to
// reuse for a full day. `next.revalidate` feeds Next.js's Data Cache for any
// server-side caller; the in-memory Map covers today's actual callers — the
// "use client" study components — where fetch runs in the browser and the
// Data Cache does not apply. It dedupes repeat requests for a ref already
// loaded this session (e.g. re-visiting a daf/chapter/day) and collapses
// concurrent requests for the same ref (base text + commentaries racing)
// into a single network call.
interface SefariaFetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  // Matches the implicit `any` of `res.json()` that every call site below
  // already narrows itself (via `.he`, `.error`, etc.).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

const SEFARIA_CACHE_MAX_ENTRIES = 500;
const sefariaCache = new Map<string, Promise<SefariaFetchResult>>();

async function sefariaFetch(url: string): Promise<SefariaFetchResult> {
  const cached = sefariaCache.get(url);
  if (cached) return cached;

  const promise = (async (): Promise<SefariaFetchResult> => {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, statusText: res.statusText, data };
  })();

  sefariaCache.set(url, promise);
  // Never keep a failed fetch cached — the next attempt should hit the
  // network again rather than replay the same error for the rest of the session.
  promise.then(
    (result) => { if (!result.ok) sefariaCache.delete(url); },
    () => sefariaCache.delete(url)
  );

  if (sefariaCache.size > SEFARIA_CACHE_MAX_ENTRIES) {
    const oldestKey = sefariaCache.keys().next().value;
    if (oldestKey !== undefined) sefariaCache.delete(oldestKey);
  }

  return promise;
}

async function fetchCommentatorChapter(
  commentator: Commentator,
  enc: string,
  chapter: number,
  verseCount: number
): Promise<{ id: string; heArr: unknown[] }> {
  const url = `https://www.sefaria.org/api/texts/${commentator.prefix}${enc}.${chapter}.1-${verseCount}?context=0`;
  const { ok, status, data } = await sefariaFetch(url);
  if (!ok) {
    throw new Error(`API ${status} for ${commentator.id}: ${url}`);
  }
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

  const { ok: textOk, status: textStatus, statusText: textStatusText, data: textData } =
    await sefariaFetch(`https://www.sefaria.org/api/texts/${enc}.${chapter}?context=0`);
  if (!textOk) {
    throw new Error(`שגיאה בטעינת פרק משנה: ${textStatus} ${textStatusText}`);
  }
  const rawMishnahs: string[] = Array.isArray(textData.he)
    ? (textData.he as string[]).map(stripCantillation)
    : [];
  const mishnahCount = rawMishnahs.length;

  const COMMS_WITH_PREFIX = [
    { id: "bartenura", prefix: "Bartenura on " },
    { id: "rambam",    prefix: "Rambam on "    },
  ];

  const settled = await Promise.allSettled(
    COMMS_WITH_PREFIX.map(async (c) => {
      const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(c.prefix + sefariaName)}.${chapter}.1-${mishnahCount}?context=0`;
      const { ok, status, data } = await sefariaFetch(url);
      if (!ok) throw new Error(`API ${status} for ${c.id}: ${url}`);
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
    const { ok, status, data } = await sefariaFetch(url);
    if (!ok) throw new Error(`${status} ${url}`);
    return data as Record<string, unknown>;
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
  const { ok: textOk, status: textStatus, statusText: textStatusText, data: textData } =
    await sefariaFetch(`https://www.sefaria.org/api/texts/${enc}.${chapter}?context=0`);
  if (!textOk) {
    throw new Error(`שגיאה בטעינת הפרק מספריא: ${textStatus} ${textStatusText}`);
  }
  const rawVerses: string[] = Array.isArray(textData.he)
    ? (textData.he as string[]).map(stripCantillation)
    : [];
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
  const { ok, status, statusText, data } = await sefariaFetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!ok) {
    throw new Error(`שגיאה בטעינת הפרק מספריא: ${status} ${statusText}`);
  }
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
  const { ok, status, statusText, data } = await sefariaFetch("https://www.sefaria.org/api/calendars");
  if (!ok) {
    throw new Error(`שגיאה בטעינת הלוח היומי מספריא: ${status} ${statusText}`);
  }
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
  const { ok, status, statusText, data } = await sefariaFetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!ok) {
    throw new Error(`שגיאה בטעינה מספריא: ${status} ${statusText}`);
  }
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
  const { ok, status, statusText, data } = await sefariaFetch("https://www.sefaria.org/api/calendars");
  if (!ok) {
    throw new Error(`שגיאה בטעינת הלוח היומי מספריא: ${status} ${statusText}`);
  }
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
  const { ok, status, statusText, data } = await sefariaFetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!ok) {
    throw new Error(`שגיאה בטעינת תהלים ${psalmNumber} מספריא: ${status} ${statusText}`);
  }
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

// Single full psalm/chapter, independent of the daily 30-day grouping —
// used by the quick chapter selector to read one psalm on its own.
export async function fetchTehillimChapter(psalmNumber: number): Promise<TehillimPsalmData> {
  return fetchPsalm(psalmNumber);
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

// ── Perek Shirah types ──────────────────────────────────────────────────────

export interface PerekShirahSectionData {
  id: string;
  title: string;
  lines: string[]; // flattened, HTML-stripped paragraphs
}

export interface PerekShirahData {
  sections: PerekShirahSectionData[];
}

// ── Perek Shirah fetch ───────────────────────────────────────────────────────

export async function fetchFullPerekShirah(): Promise<PerekShirahData> {
  const settled = await Promise.allSettled(
    PEREK_SHIRAH_SECTIONS.map(async (section) => {
      const { ok, status, statusText, data } = await sefariaFetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(section.ref)}?context=0`);
      if (!ok) {
        throw new Error(`שגיאה בטעינת "${section.title}" מספריא: ${status} ${statusText}`);
      }
      if (typeof data.error === "string") {
        throw new Error(data.error as string);
      }
      const sectionData: PerekShirahSectionData = {
        id: section.id,
        title: section.title,
        lines: flattenHeField(data.he),
      };
      return sectionData;
    })
  );

  const sections: PerekShirahSectionData[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      sections.push(result.value);
    } else {
      console.error("[sefaria] perek shirah section fetch failed:", result.reason);
    }
  }

  if (sections.length === 0) {
    throw new Error("שגיאה בטעינת פרק שירה מספריא");
  }

  return { sections };
}

// ── Kitzur Shulchan Aruch types ─────────────────────────────────────────────

export interface KitzurSimanData {
  siman: number;
  titleHebrew: string; // e.g. "דיני נטילת ידים שחרית" — "" if Sefaria exposes none
  paragraphs: string[]; // flattened, HTML-stripped seifim (nikud preserved)
}

// The siman's descriptive heading isn't always exposed via a dedicated
// field — when Sefaria doesn't return `heTitle`, the Kitzur's own text often
// carries it as a bolded first segment (e.g. "<b>דיני נטילת ידים...</b>").
// Detect and peel that off so it renders as a title, not as seif א.
function extractKitzurTitle(
  data: Record<string, unknown>,
  rawHe: unknown[]
): { title: string; paragraphs: string[] } {
  const heTitleRaw = data.heTitle;
  if (typeof heTitleRaw === "string" && heTitleRaw.trim() !== "") {
    return { title: stripHtml(heTitleRaw), paragraphs: flattenHeField(rawHe) };
  }

  const first = rawHe[0];
  if (typeof first === "string" && /^\s*<(b|strong)>/i.test(first)) {
    return { title: stripHtml(first), paragraphs: flattenHeField(rawHe.slice(1)) };
  }

  return { title: "", paragraphs: flattenHeField(rawHe) };
}

// ── Kitzur Shulchan Aruch fetch ─────────────────────────────────────────────

export async function fetchKitzurSiman(siman: number): Promise<KitzurSimanData> {
  const ref = `Kitzur Shulchan Aruch ${siman}`;
  const { ok, status, statusText, data } = await sefariaFetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!ok) {
    throw new Error(`שגיאה בטעינת הסימן מספריא: ${status} ${statusText}`);
  }
  // Sefaria returns {"error":"..."} with HTTP 200 for missing refs
  if (typeof data.error === "string") {
    throw new Error(data.error as string);
  }
  const rawHe: unknown[] = Array.isArray(data.he) ? (data.he as unknown[]) : [];
  const { title, paragraphs } = extractKitzurTitle(data, rawHe);

  return {
    siman,
    titleHebrew: title,
    paragraphs,
  };
}

// ── Chofetz Chaim types ──────────────────────────────────────────────────────

export interface ChofetzChaimSeifData {
  seif: number;          // real seif number within the כלל (not relative to the unit)
  paragraphs: string[];  // flattened, HTML-stripped paragraphs within this seif
}

export interface ChofetzChaimUnitData {
  index: number;
  gate: ChofetzChaimGate;
  klal?: number;
  titleHebrew: string;
  subtitleHebrew: string;
  // Exactly one of these two is populated, depending on the unit's kind.
  paragraphs?: string[];              // petichah parts / כלל opening comments
  seifim?: ChofetzChaimSeifData[];    // seif-pair units, grouped by real seif number
}

// A single fully-addressed seif (from === to) comes back from Sefaria as a
// flat array of that seif's own paragraphs. A range (from < to) comes back
// one dimension higher: an array of per-seif arrays. Both shapes are
// normalized here into one array-per-seif before flattening each seif's
// paragraphs, so a multi-paragraph seif is never mistaken for multiple seifim.
function toPerSeifRaw(he: unknown, seifCount: number): unknown[] {
  if (seifCount <= 1) return [he];
  return Array.isArray(he) ? he : [];
}

// ── Chofetz Chaim fetch ──────────────────────────────────────────────────────

async function fetchSefariaHe(ref: string): Promise<unknown> {
  const { ok, status, statusText, data } = await sefariaFetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`);
  if (!ok) {
    throw new Error(`שגיאה בטעינה מספריא: ${status} ${statusText}`);
  }
  // Sefaria returns {"error":"..."} with HTTP 200 for missing refs
  if (typeof data.error === "string") {
    throw new Error(data.error as string);
  }
  return data.he;
}

export async function fetchChofetzChaimUnit(unitIndex: number): Promise<ChofetzChaimUnitData> {
  const unit = getChofetzChaimUnitInfo(unitIndex);

  const base = {
    index: unit.index,
    gate: unit.gate,
    klal: unit.klal,
    titleHebrew: unit.titleHebrew,
    subtitleHebrew: unit.subtitleHebrew,
  };

  // Illustrations are separate top-level nodes, not a numeric sub-range of a
  // shared parent, so a unit covering 2 of them needs 2 separate fetches.
  if (unit.illustrationNumbers) {
    const seifim: ChofetzChaimSeifData[] = await Promise.all(
      unit.illustrationNumbers.map(async (n) => ({
        seif: n,
        paragraphs: flattenHeField(await fetchSefariaHe(illustrationRef(n))),
      }))
    );
    return { ...base, seifim };
  }

  const he = await fetchSefariaHe(unit.ref);

  if (unit.seifFrom === undefined) {
    return { ...base, paragraphs: flattenHeField(he) };
  }

  const seifTo = unit.seifTo ?? unit.seifFrom;
  const seifCount = seifTo - unit.seifFrom + 1;
  const seifim: ChofetzChaimSeifData[] = toPerSeifRaw(he, seifCount).map((raw, i) => ({
    seif: unit.seifFrom! + i,
    paragraphs: flattenHeField(raw),
  }));

  return { ...base, seifim };
}
