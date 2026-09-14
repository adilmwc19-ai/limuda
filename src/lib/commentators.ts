export interface Commentator {
  id: string;
  nameHe: string;
  prefix: string; // prepended to bookEn to form the Sefaria reference
}

export const TORAH_COMMENTATORS: Commentator[] = [
  { id: "rashi",   nameHe: 'רש"י',     prefix: "Rashi_on_"    },
  { id: "ramban",  nameHe: 'רמב"ן',    prefix: "Ramban_on_"   },
  { id: "ibnezra", nameHe: "אבן עזרא", prefix: "Ibn_Ezra_on_" },
  { id: "sforno",  nameHe: "ספורנו",   prefix: "Sforno_on_"   },
];

export const NAKH_COMMENTATORS: Commentator[] = [
  { id: "rashi",         nameHe: 'רש"י',       prefix: "Rashi_on_"          },
  { id: "metzudatdavid", nameHe: "מצודת דוד",  prefix: "Metzudat_David_on_" },
  { id: "metzudatzion",  nameHe: "מצודת ציון", prefix: "Metzudat_Zion_on_"  },
  { id: "radak",         nameHe: 'רד"ק',       prefix: "Radak_on_"          },
];

const TORAH_BOOKS = new Set([
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
]);

// Radak commented on Nevi'im + Psalms + Chronicles only
const NO_RADAK = new Set([
  "Proverbs", "Job", "Song of Songs", "Ruth", "Lamentations",
  "Ecclesiastes", "Esther", "Daniel", "Ezra", "Nehemiah",
]);

// Metzudot (David + Zion) do not cover these megillot
const NO_METZUDOT = new Set(["Ruth", "Lamentations", "Esther"]);

export function getCommentators(bookEn: string): {
  isTorah: boolean;
  commentators: Commentator[];
} {
  if (TORAH_BOOKS.has(bookEn)) return { isTorah: true, commentators: TORAH_COMMENTATORS };
  const commentators = NAKH_COMMENTATORS.filter((c) => {
    if (c.id === "radak" && NO_RADAK.has(bookEn)) return false;
    if ((c.id === "metzudatdavid" || c.id === "metzudatzion") && NO_METZUDOT.has(bookEn)) return false;
    return true;
  });
  return { isTorah: false, commentators };
}
