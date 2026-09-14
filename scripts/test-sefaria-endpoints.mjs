#!/usr/bin/env node
/**
 * Sanity-check script: verifies every Sefaria API endpoint used by Limuda.
 * Run with:  npm run test:sefaria
 * Requires Node 18+ (native fetch + AbortSignal.timeout).
 */

// ── ANSI colours ────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const RED    = "\x1b[31m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const BOLD   = "\x1b[1m";

// ── Book list (mirrors tanakhMapping.ts) ────────────────────────────────────
const TORAH_BOOKS = new Set(["Genesis","Exodus","Leviticus","Numbers","Deuteronomy"]);

// Mirrors commentators.ts exclusion sets
const NO_RADAK    = new Set(["Proverbs","Job","Song of Songs","Ruth","Lamentations","Ecclesiastes","Esther","Daniel","Ezra","Nehemiah"]);
const NO_METZUDOT = new Set(["Ruth","Lamentations","Esther"]);

const ALL_BOOKS = [
  { he: "בראשית",        en: "Genesis"       },
  { he: "שמות",          en: "Exodus"        },
  { he: "ויקרא",         en: "Leviticus"     },
  { he: "במדבר",         en: "Numbers"       },
  { he: "דברים",         en: "Deuteronomy"   },
  { he: "יהושע",         en: "Joshua"        },
  { he: "שופטים",        en: "Judges"        },
  { he: "שמואל א",       en: "I Samuel"      },
  { he: "שמואל ב",       en: "II Samuel"     },
  { he: "מלכים א",       en: "I Kings"       },
  { he: "מלכים ב",       en: "II Kings"      },
  { he: "ישעיהו",        en: "Isaiah"        },
  { he: "ירמיהו",        en: "Jeremiah"      },
  { he: "יחזקאל",        en: "Ezekiel"       },
  { he: "הושע",          en: "Hosea"         },
  { he: "יואל",          en: "Joel"          },
  { he: "עמוס",          en: "Amos"          },
  { he: "עובדיה",        en: "Obadiah"       },
  { he: "יונה",          en: "Jonah"         },
  { he: "מיכה",          en: "Micah"         },
  { he: "נחום",          en: "Nahum"         },
  { he: "חבקוק",         en: "Habakkuk"      },
  { he: "צפניה",         en: "Zephaniah"     },
  { he: "חגי",           en: "Haggai"        },
  { he: "זכריה",         en: "Zechariah"     },
  { he: "מלאכי",         en: "Malachi"       },
  { he: "תהילים",        en: "Psalms"        },
  { he: "משלי",          en: "Proverbs"      },
  { he: "איוב",          en: "Job"           },
  { he: "שיר השירים",    en: "Song of Songs" },
  { he: "רות",           en: "Ruth"          },
  { he: "איכה",          en: "Lamentations"  },
  { he: "קהלת",          en: "Ecclesiastes"  },
  { he: "אסתר",          en: "Esther"        },
  { he: "דניאל",         en: "Daniel"        },
  { he: "עזרא",          en: "Ezra"          },
  { he: "נחמיה",         en: "Nehemiah"      },
  { he: "דברי הימים א",  en: "I Chronicles"  },
  { he: "דברי הימים ב",  en: "II Chronicles" },
];

// ── Commentator lists (mirrors commentators.ts) ──────────────────────────────
const TORAH_COMMENTATORS = [
  { id: "rashi",    he: 'רש"י',     prefix: "Rashi_on_"    },
  { id: "ramban",   he: 'רמב"ן',    prefix: "Ramban_on_"   },
  { id: "ibnezra",  he: "אבן עזרא", prefix: "Ibn_Ezra_on_" },
  { id: "sforno",   he: "ספורנו",   prefix: "Sforno_on_"   },
];

const NAKH_COMMENTATORS = [
  { id: "rashi",         he: 'רש"י',       prefix: "Rashi_on_"          },
  { id: "metzudatdavid", he: "מצודת דוד",  prefix: "Metzudat_David_on_" },
  { id: "metzudatzion",  he: "מצודת ציון", prefix: "Metzudat_Zion_on_"  },
  { id: "radak",         he: 'רד"ק',       prefix: "Radak_on_"          },
];

// ── HTTP probe ───────────────────────────────────────────────────────────────
async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    // Sefaria can return HTTP 200 with {"error":"..."} for unknown refs
    if (res.ok) {
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { /* not JSON – treat as ok */ }
      if (json && typeof json.error === "string") {
        return { ok: false, status: 200, detail: json.error };
      }
    }
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, detail: err.message };
  }
}

// ── Per-book check ────────────────────────────────────────────────────────────
async function checkBook(book) {
  const enc = encodeURIComponent(book.en);
  let commentators;
  if (TORAH_BOOKS.has(book.en)) {
    commentators = TORAH_COMMENTATORS;
  } else {
    commentators = NAKH_COMMENTATORS.filter((c) => {
      if (c.id === "radak"         && NO_RADAK.has(book.en))    return false;
      if ((c.id === "metzudatdavid" || c.id === "metzudatzion") && NO_METZUDOT.has(book.en)) return false;
      return true;
    });
  }

  const endpoints = [
    {
      label: "טקסט",
      url: `https://www.sefaria.org/api/texts/${enc}.1?context=0`,
    },
    ...commentators.map((c) => ({
      label: c.he,
      url: `https://www.sefaria.org/api/texts/${c.prefix}${enc}.1.1-3?context=0`,
    })),
  ];

  // Run all endpoints for this book in parallel
  const results = await Promise.all(
    endpoints.map(async (ep) => ({ ...ep, ...(await probe(ep.url)) }))
  );

  let bookFailed = 0;
  for (const r of results) {
    if (r.ok) {
      process.stdout.write(`  ${GREEN}ok${R}  ${r.label}\n`);
    } else {
      bookFailed++;
      const detail = r.detail ? `  → ${r.detail}` : "";
      process.stderr.write(
        `  ${RED}${BOLD}FAIL${R} ${r.label} [HTTP ${r.status}]${detail}\n` +
        `       ${YELLOW}${r.url}${R}\n`
      );
    }
  }
  return { count: endpoints.length, failed: bookFailed };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`${BOLD}Sefaria API endpoint check — ${ALL_BOOKS.length} ספרים${R}\n`);

let totalFailed = 0;
let totalChecked = 0;

for (const book of ALL_BOOKS) {
  process.stdout.write(`${CYAN}${BOLD}${book.he}${R} (${book.en})\n`);
  const { count, failed } = await checkBook(book);
  totalFailed  += failed;
  totalChecked += count;
}

const passed = totalChecked - totalFailed;
console.log(`\n${"─".repeat(52)}`);
console.log(
  `${BOLD}תוצאות: ` +
  `${GREEN}${passed} עברו${R}${BOLD} / ` +
  (totalFailed > 0 ? `${RED}${totalFailed} נכשלו${R}` : `${GREEN}0 נכשלו${R}`) +
  `${BOLD} (סה"כ ${totalChecked})${R}`
);

if (totalFailed > 0) {
  process.stderr.write(`\n${RED}${BOLD}תיקון נדרש: ${totalFailed} נקודות קצה לא הגיבו כצפוי.${R}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}כל נקודות הקצה תקינות.${R}`);
}
