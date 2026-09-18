// משנה ברורה (Mishnah Berurah) — the Chofetz Chaim's commentary on Shulchan
// Arukh, Orach Chayim, printed in six volumes covering all 697 סימנים.
// Sefaria addresses the Shulchan Arukh text as `Shulchan Arukh, Orach Chayim
// ${siman}` and the Mishnah Berurah commentary as `Mishnah Berurah ${siman}`
// (see sefaria.ts's fetchMishnahBerurahSiman for how the two are joined).

export const TOTAL_MB_SIMANIM = 697;

export interface MishnahBerurahVolume {
  volume: number;       // 1-6
  titleHebrew: string;  // "חלק א׳"
  subtitleHebrew: string;
  fromSiman: number;
  toSiman: number;
}

export const MISHNAH_BERURAH_VOLUMES: MishnahBerurahVolume[] = [
  {
    volume: 1,
    titleHebrew: "חלק א׳",
    subtitleHebrew: "השכמת הבוקר, ציצית, תפילין, תפילה",
    fromSiman: 1,
    toSiman: 127,
  },
  {
    volume: 2,
    titleHebrew: "חלק ב׳",
    subtitleHebrew: "ברכת כהנים, ברכות השחר, קריאת התורה, סעודה",
    fromSiman: 128,
    toSiman: 241,
  },
  {
    volume: 3,
    titleHebrew: "חלק ג׳",
    subtitleHebrew: "הלכות שבת א׳",
    fromSiman: 242,
    toSiman: 344,
  },
  {
    volume: 4,
    titleHebrew: "חלק ד׳",
    subtitleHebrew: "הלכות שבת ב׳ ועירובין",
    fromSiman: 345,
    toSiman: 428,
  },
  {
    volume: 5,
    titleHebrew: "חלק ה׳",
    subtitleHebrew: "ראש חודש, פסח ויום טוב",
    fromSiman: 429,
    toSiman: 529,
  },
  // Spec listed this volume's start as "ת״ל" (430), which would overlap
  // volume 5 (ends 529) — corrected to the numerically consistent תק״ל (530),
  // immediately following volume 5, so all six volumes tile 1..697 exactly.
  {
    volume: 6,
    titleHebrew: "חלק ו׳",
    subtitleHebrew: "חול המועד, תעניות, ראש השנה, יום כיפור, סוכות, חנוכה, פורים",
    fromSiman: 530,
    toSiman: 697,
  },
];

// ── Hebrew numerals (up to ~999) ─────────────────────────────────────────────
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

// e.g. getSimanHebrewNumber(1) -> "סימן א'", getSimanHebrewNumber(697) -> "סימן תרצ״ז"
export function getSimanHebrewNumber(siman: number): string {
  return `סימן ${toHebrewNumeral(siman)}`;
}

// ── Volume lookup ─────────────────────────────────────────────────────────

export interface MishnahBerurahVolumeInfo {
  volume: number;      // 1-6
  titleHebrew: string; // "חלק א׳"
}

export function getMishnahBerurahVolume(siman: number): MishnahBerurahVolumeInfo {
  const clamped = Math.max(1, Math.min(Math.trunc(siman) || 1, TOTAL_MB_SIMANIM));
  const found = MISHNAH_BERURAH_VOLUMES.find((v) => clamped >= v.fromSiman && clamped <= v.toSiman);
  const volume = found ?? MISHNAH_BERURAH_VOLUMES[MISHNAH_BERURAH_VOLUMES.length - 1];
  return { volume: volume.volume, titleHebrew: volume.titleHebrew };
}

// ── Siman info (clamped, with Hebrew title + volume) ────────────────────────
// Mirrors getKitzurSimanInfo/getChofetzChaimUnitInfo — keeps prev/next
// navigation and Firestore-restored progress from ever pointing out of bounds.

export interface MishnahBerurahSimanInfo {
  siman: number;             // clamped 1..TOTAL_MB_SIMANIM
  titleHebrew: string;       // e.g. "סימן א'"
  volume: number;
  volumeTitleHebrew: string;
}

export function getMishnahBerurahSimanInfo(siman: number): MishnahBerurahSimanInfo {
  const clamped = Math.max(1, Math.min(Math.trunc(siman) || 1, TOTAL_MB_SIMANIM));
  const { volume, titleHebrew: volumeTitleHebrew } = getMishnahBerurahVolume(clamped);
  return {
    siman: clamped,
    titleHebrew: getSimanHebrewNumber(clamped),
    volume,
    volumeTitleHebrew,
  };
}
