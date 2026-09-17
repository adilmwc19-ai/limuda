// Perek Shirah (פרק שירה) — read in full each day (no day-by-day division).

export interface PerekShirahSection {
  id: string;
  title: string;
  ref: string; // Sefaria ref
}

export const PEREK_SHIRAH_SECTIONS: PerekShirahSection[] = [
  { id: "intro",  title: "הקדמה",                                    ref: "Perek Shirah, Introductory Text" },
  { id: "perek1", title: "פרק ראשון (שמים וארץ)",                     ref: "Perek Shirah 1" },
  { id: "perek2", title: "פרק שני (יום ולילה, שמש וירח)",             ref: "Perek Shirah 2" },
  { id: "perek3", title: "פרק שלישי (אילנות ודשאים)",                 ref: "Perek Shirah 3" },
  { id: "perek4", title: "פרק רביעי (עופות)",                        ref: "Perek Shirah 4" },
  { id: "perek5", title: "פרק חמישי (חיות ובהמות)",                   ref: "Perek Shirah 5" },
  { id: "perek6", title: "פרק ששי (שרצים וחיות הארץ)",                ref: "Perek Shirah 6" },
  { id: "prayer", title: "תפילה לאחר פרק שירה",                       ref: "Perek Shirah, Concluding Prayer" },
];

export function getPerekShirahSection(id: string): PerekShirahSection | undefined {
  return PEREK_SHIRAH_SECTIONS.find((s) => s.id === id);
}
