// 14 books of the Mishneh Torah (יד החזקה), each broken into its הלכות/treatises.
// Chapter counts and Sefaria treatise titles were pulled from Sefaria's own
// index schema (GET /api/v2/raw/index/<title> -> schema.lengths[0]), so they
// match the API's ref format exactly: `Mishneh Torah, ${sefariaTreatise} ${chapter}`.

export interface RambamTreatise {
  id: string;              // slug, e.g. "foundations-of-the-torah"
  nameHe: string;           // e.g. "הלכות יסודי התורה"
  sefariaTreatise: string;  // e.g. "Foundations of the Torah"
  chapters: number;
}

export interface RambamBook {
  id: string;      // slug, e.g. "madda"
  nameHe: string;   // e.g. "ספר מדע"
  treatises: RambamTreatise[];
}

export const RAMBAM_BOOKS: RambamBook[] = [
  {
    id: "madda",
    nameHe: "ספר מדע",
    treatises: [
      { id: "foundations-of-the-torah", nameHe: "הלכות יסודי התורה", sefariaTreatise: "Foundations of the Torah", chapters: 10 },
      { id: "human-dispositions", nameHe: "הלכות דעות", sefariaTreatise: "Human Dispositions", chapters: 7 },
      { id: "torah-study", nameHe: "הלכות תלמוד תורה", sefariaTreatise: "Torah Study", chapters: 7 },
      { id: "foreign-worship-and-customs-of-the-nations", nameHe: "הלכות עבודה זרה וחוקות הגויים", sefariaTreatise: "Foreign Worship and Customs of the Nations", chapters: 12 },
      { id: "repentance", nameHe: "הלכות תשובה", sefariaTreatise: "Repentance", chapters: 10 },
    ],
  },
  {
    id: "ahavah",
    nameHe: "ספר אהבה",
    treatises: [
      { id: "reading-the-shema", nameHe: "הלכות קריאת שמע", sefariaTreatise: "Reading the Shema", chapters: 4 },
      { id: "prayer-and-the-priestly-blessing", nameHe: "הלכות תפילה וברכת כהנים", sefariaTreatise: "Prayer and the Priestly Blessing", chapters: 15 },
      { id: "tefillin-mezuzah-and-the-torah-scroll", nameHe: "הלכות תפילין ומזוזה וספר תורה", sefariaTreatise: "Tefillin, Mezuzah and the Torah Scroll", chapters: 10 },
      { id: "fringes", nameHe: "הלכות ציצית", sefariaTreatise: "Fringes", chapters: 3 },
      { id: "blessings", nameHe: "הלכות ברכות", sefariaTreatise: "Blessings", chapters: 11 },
      { id: "circumcision", nameHe: "הלכות מילה", sefariaTreatise: "Circumcision", chapters: 3 },
      { id: "the-order-of-prayer", nameHe: "סדר התפילה", sefariaTreatise: "The Order of Prayer", chapters: 5 },
    ],
  },
  {
    id: "zemanim",
    nameHe: "ספר זמנים",
    treatises: [
      { id: "sabbath", nameHe: "הלכות שבת", sefariaTreatise: "Sabbath", chapters: 30 },
      { id: "eruvin", nameHe: "הלכות עירובין", sefariaTreatise: "Eruvin", chapters: 8 },
      { id: "rest-on-the-tenth-of-tishrei", nameHe: "הלכות שביתת עשור", sefariaTreatise: "Rest on the Tenth of Tishrei", chapters: 3 },
      { id: "rest-on-a-holiday", nameHe: "הלכות שביתת יום טוב", sefariaTreatise: "Rest on a Holiday", chapters: 8 },
      { id: "leavened-and-unleavened-bread", nameHe: "הלכות חמץ ומצה", sefariaTreatise: "Leavened and Unleavened Bread", chapters: 9 },
      { id: "shofar-sukkah-and-lulav", nameHe: "הלכות שופר וסוכה ולולב", sefariaTreatise: "Shofar, Sukkah and Lulav", chapters: 8 },
      { id: "sheqel-dues", nameHe: "הלכות שקלים", sefariaTreatise: "Sheqel Dues", chapters: 4 },
      { id: "sanctification-of-the-new-month", nameHe: "הלכות קידוש החודש", sefariaTreatise: "Sanctification of the New Month", chapters: 19 },
      { id: "fasts", nameHe: "הלכות תעניות", sefariaTreatise: "Fasts", chapters: 5 },
      { id: "scroll-of-esther-and-hanukkah", nameHe: "הלכות מגילה וחנוכה", sefariaTreatise: "Scroll of Esther and Hanukkah", chapters: 4 },
    ],
  },
  {
    id: "nashim",
    nameHe: "ספר נשים",
    treatises: [
      { id: "marriage", nameHe: "הלכות אישות", sefariaTreatise: "Marriage", chapters: 25 },
      { id: "divorce", nameHe: "הלכות גירושין", sefariaTreatise: "Divorce", chapters: 13 },
      { id: "levirate-marriage-and-release", nameHe: "הלכות יבום וחליצה", sefariaTreatise: "Levirate Marriage and Release", chapters: 8 },
      { id: "virgin-maiden", nameHe: "הלכות נערה בתולה", sefariaTreatise: "Virgin Maiden", chapters: 3 },
      { id: "woman-suspected-of-infidelity", nameHe: "הלכות סוטה", sefariaTreatise: "Woman Suspected of Infidelity", chapters: 4 },
    ],
  },
  {
    id: "kedushah",
    nameHe: "ספר קדושה",
    treatises: [
      { id: "forbidden-intercourse", nameHe: "הלכות איסורי ביאה", sefariaTreatise: "Forbidden Intercourse", chapters: 22 },
      { id: "forbidden-foods", nameHe: "הלכות מאכלות אסורות", sefariaTreatise: "Forbidden Foods", chapters: 17 },
      { id: "ritual-slaughter", nameHe: "הלכות שחיטה", sefariaTreatise: "Ritual Slaughter", chapters: 14 },
    ],
  },
  {
    id: "haflaah",
    nameHe: "ספר הפלאה",
    treatises: [
      { id: "oaths", nameHe: "הלכות שבועות", sefariaTreatise: "Oaths", chapters: 12 },
      { id: "vows", nameHe: "הלכות נדרים", sefariaTreatise: "Vows", chapters: 13 },
      { id: "nazariteship", nameHe: "הלכות נזירות", sefariaTreatise: "Nazariteship", chapters: 10 },
      { id: "appraisals-and-devoted-property", nameHe: "הלכות ערכים וחרמין", sefariaTreatise: "Appraisals and Devoted Property", chapters: 8 },
    ],
  },
  {
    id: "zeraim",
    nameHe: "ספר זרעים",
    treatises: [
      { id: "diverse-species", nameHe: "הלכות כלאים", sefariaTreatise: "Diverse Species", chapters: 10 },
      { id: "gifts-to-the-poor", nameHe: "הלכות מתנות עניים", sefariaTreatise: "Gifts to the Poor", chapters: 10 },
      { id: "heave-offerings", nameHe: "הלכות תרומות", sefariaTreatise: "Heave Offerings", chapters: 15 },
      { id: "tithes", nameHe: "הלכות מעשרות", sefariaTreatise: "Tithes", chapters: 14 },
      { id: "second-tithes-and-fourth-year-s-fruit", nameHe: "הלכות מעשר שני ונטע רבעי", sefariaTreatise: "Second Tithes and Fourth Year's Fruit", chapters: 11 },
      { id: "first-fruits-and-other-gifts-to-priests-outside-the-sanctuary", nameHe: "הלכות ביכורים ושאר מתנות כהונה שבגבולין", sefariaTreatise: "First Fruits and other Gifts to Priests Outside the Sanctuary", chapters: 12 },
      { id: "sabbatical-year-and-the-jubilee", nameHe: "הלכות שמיטה ויובל", sefariaTreatise: "Sabbatical Year and the Jubilee", chapters: 13 },
    ],
  },
  {
    id: "avodah",
    nameHe: "ספר עבודה",
    treatises: [
      { id: "the-chosen-temple", nameHe: "הלכות בית הבחירה", sefariaTreatise: "The Chosen Temple", chapters: 8 },
      { id: "vessels-of-the-sanctuary-and-those-who-serve-therein", nameHe: "הלכות כלי המקדש והעובדין בו", sefariaTreatise: "Vessels of the Sanctuary and Those Who Serve Therein", chapters: 10 },
      { id: "admission-into-the-sanctuary", nameHe: "הלכות ביאת מקדש", sefariaTreatise: "Admission into the Sanctuary", chapters: 9 },
      { id: "things-forbidden-on-the-altar", nameHe: "הלכות איסורי המזבח", sefariaTreatise: "Things Forbidden on the Altar", chapters: 7 },
      { id: "sacrificial-procedure", nameHe: "הלכות מעשה הקרבנות", sefariaTreatise: "Sacrificial Procedure", chapters: 19 },
      { id: "daily-offerings-and-additional-offerings", nameHe: "הלכות תמידים ומוספין", sefariaTreatise: "Daily Offerings and Additional Offerings", chapters: 10 },
      { id: "sacrifices-rendered-unfit", nameHe: "הלכות פסולי המוקדשין", sefariaTreatise: "Sacrifices Rendered Unfit", chapters: 19 },
      { id: "service-on-the-day-of-atonement", nameHe: "הלכות עבודת יום הכפורים", sefariaTreatise: "Service on the Day of Atonement", chapters: 5 },
      { id: "trespass", nameHe: "הלכות מעילה", sefariaTreatise: "Trespass", chapters: 8 },
    ],
  },
  {
    id: "korbanot",
    nameHe: "ספר קרבנות",
    treatises: [
      { id: "paschal-offering", nameHe: "הלכות קרבן פסח", sefariaTreatise: "Paschal Offering", chapters: 10 },
      { id: "festival-offering", nameHe: "הלכות חגיגה", sefariaTreatise: "Festival Offering", chapters: 3 },
      { id: "firstlings", nameHe: "הלכות בכורות", sefariaTreatise: "Firstlings", chapters: 8 },
      { id: "offerings-for-unintentional-transgressions", nameHe: "הלכות שגגות", sefariaTreatise: "Offerings for Unintentional Transgressions", chapters: 15 },
      { id: "offerings-for-those-with-incomplete-atonement", nameHe: "הלכות מחוסרי כפרה", sefariaTreatise: "Offerings for Those with Incomplete Atonement", chapters: 5 },
      { id: "substitution", nameHe: "הלכות תמורה", sefariaTreatise: "Substitution", chapters: 4 },
    ],
  },
  {
    id: "taharah",
    nameHe: "ספר טהרה",
    treatises: [
      { id: "defilement-by-a-corpse", nameHe: "הלכות טומאת מת", sefariaTreatise: "Defilement by a Corpse", chapters: 25 },
      { id: "red-heifer", nameHe: "הלכות פרה אדומה", sefariaTreatise: "Red Heifer", chapters: 15 },
      { id: "defilement-by-leprosy", nameHe: "הלכות טומאת צרעת", sefariaTreatise: "Defilement by Leprosy", chapters: 16 },
      { id: "those-who-defile-bed-or-seat", nameHe: "הלכות מטמאי משכב ומושב", sefariaTreatise: "Those Who Defile Bed or Seat", chapters: 13 },
      { id: "other-sources-of-defilement", nameHe: "הלכות שאר אבות הטומאות", sefariaTreatise: "Other Sources of Defilement", chapters: 20 },
      { id: "defilement-of-foods", nameHe: "הלכות טומאת אוכלים", sefariaTreatise: "Defilement of Foods", chapters: 16 },
      { id: "vessels", nameHe: "הלכות כלים", sefariaTreatise: "Vessels", chapters: 28 },
      { id: "immersion-pools", nameHe: "הלכות מקואות", sefariaTreatise: "Immersion Pools", chapters: 11 },
    ],
  },
  {
    id: "nezikin",
    nameHe: "ספר נזיקין",
    treatises: [
      { id: "damages-to-property", nameHe: "הלכות נזקי ממון", sefariaTreatise: "Damages to Property", chapters: 14 },
      { id: "theft", nameHe: "הלכות גניבה", sefariaTreatise: "Theft", chapters: 9 },
      { id: "robbery-and-lost-property", nameHe: "הלכות גזילה ואבידה", sefariaTreatise: "Robbery and Lost Property", chapters: 18 },
      { id: "one-who-injures-a-person-or-property", nameHe: "הלכות חובל ומזיק", sefariaTreatise: "One Who Injures a Person or Property", chapters: 8 },
      { id: "murderer-and-the-preservation-of-life", nameHe: "הלכות רוצח ושמירת נפש", sefariaTreatise: "Murderer and the Preservation of Life", chapters: 13 },
    ],
  },
  {
    id: "kinyan",
    nameHe: "ספר קניין",
    treatises: [
      { id: "sales", nameHe: "הלכות מכירה", sefariaTreatise: "Sales", chapters: 30 },
      { id: "ownerless-property-and-gifts", nameHe: "הלכות זכייה ומתנה", sefariaTreatise: "Ownerless Property and Gifts", chapters: 12 },
      { id: "neighbors", nameHe: "הלכות שכנים", sefariaTreatise: "Neighbors", chapters: 14 },
      { id: "agents-and-partners", nameHe: "הלכות שלוחין ושותפין", sefariaTreatise: "Agents and Partners", chapters: 10 },
      { id: "slaves", nameHe: "הלכות עבדים", sefariaTreatise: "Slaves", chapters: 9 },
    ],
  },
  {
    id: "mishpatim",
    nameHe: "ספר משפטים",
    treatises: [
      { id: "hiring", nameHe: "הלכות שכירות", sefariaTreatise: "Hiring", chapters: 13 },
      { id: "borrowing-and-deposit", nameHe: "הלכות שאלה ופיקדון", sefariaTreatise: "Borrowing and Deposit", chapters: 8 },
      { id: "creditor-and-debtor", nameHe: "הלכות מלווה ולווה", sefariaTreatise: "Creditor and Debtor", chapters: 27 },
      { id: "plaintiff-and-defendant", nameHe: "הלכות טוען ונטען", sefariaTreatise: "Plaintiff and Defendant", chapters: 16 },
      { id: "inheritances", nameHe: "הלכות נחלות", sefariaTreatise: "Inheritances", chapters: 11 },
    ],
  },
  {
    id: "shoftim",
    nameHe: "ספר שופטים",
    treatises: [
      { id: "the-sanhedrin-and-the-penalties-within-their-jurisdiction", nameHe: "הלכות סנהדרין והעונשין המסורין להם", sefariaTreatise: "The Sanhedrin and the Penalties within Their Jurisdiction", chapters: 26 },
      { id: "testimony", nameHe: "הלכות עדות", sefariaTreatise: "Testimony", chapters: 22 },
      { id: "rebels", nameHe: "הלכות ממרים", sefariaTreatise: "Rebels", chapters: 7 },
      { id: "mourning", nameHe: "הלכות אבל", sefariaTreatise: "Mourning", chapters: 14 },
      { id: "kings-and-wars", nameHe: "הלכות מלכים ומלחמות", sefariaTreatise: "Kings and Wars", chapters: 12 },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getTotalRambamChaptersCount(): number {
  return RAMBAM_BOOKS.reduce(
    (bookSum, book) =>
      bookSum + book.treatises.reduce((tSum, t) => tSum + t.chapters, 0),
    0
  );
}

export const TOTAL_RAMBAM_CHAPTERS = getTotalRambamChaptersCount();

export interface RambamLocation {
  book: RambamBook;
  treatise: RambamTreatise;
  chapter: number;      // 1-based chapter number within the treatise
  globalIndex: number;  // 1-based position across the whole Mishneh Torah
}

// Resolve a 1-based running chapter count (across all 14 books, in order) to
// its book / treatise / in-treatise chapter number — used to drive personal
// day-by-day progress the same way talmudStructure/mishnahStructure do.
export function getRambamChapterByGlobalIndex(index: number): RambamLocation {
  const total = getTotalRambamChaptersCount();
  let remaining = Math.max(1, Math.min(index, total));

  for (const book of RAMBAM_BOOKS) {
    for (const treatise of book.treatises) {
      if (remaining <= treatise.chapters) {
        return { book, treatise, chapter: remaining, globalIndex: Math.max(1, Math.min(index, total)) };
      }
      remaining -= treatise.chapters;
    }
  }

  const lastBook = RAMBAM_BOOKS[RAMBAM_BOOKS.length - 1];
  const lastTreatise = lastBook.treatises[lastBook.treatises.length - 1];
  return {
    book: lastBook,
    treatise: lastTreatise,
    chapter: lastTreatise.chapters,
    globalIndex: total,
  };
}

// Inverse lookup: book + treatise + chapter -> full location, including the
// running globalIndex (used to persist/resume personal progress).
export function getRambamLocationInfo(
  bookId: string,
  treatiseId: string,
  chapter: number
): RambamLocation | null {
  let globalIndex = 0;
  for (const book of RAMBAM_BOOKS) {
    for (const treatise of book.treatises) {
      if (book.id === bookId && treatise.id === treatiseId) {
        const clampedChapter = Math.max(1, Math.min(chapter, treatise.chapters));
        return {
          book,
          treatise,
          chapter: clampedChapter,
          globalIndex: globalIndex + clampedChapter,
        };
      }
      globalIndex += treatise.chapters;
    }
  }
  return null;
}

// Resolve a Sefaria treatise title (e.g. "Marriage", as it appears in the
// `ref` field of a Sefaria calendar item) back to its book/treatise — used
// to place the "Daily Rambam" calendar entry on the global chapter timeline.
export function findTreatiseBySefariaName(
  sefariaTreatise: string
): { book: RambamBook; treatise: RambamTreatise } | null {
  for (const book of RAMBAM_BOOKS) {
    const treatise = book.treatises.find((t) => t.sefariaTreatise === sefariaTreatise);
    if (treatise) return { book, treatise };
  }
  return null;
}
