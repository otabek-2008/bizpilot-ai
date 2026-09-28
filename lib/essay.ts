// Referat/esse generatori sozlamalari — sahifa va API route o'rtasida umumiy.

export const ESSAY_KINDS = {
  referat: "referat",
  esse: "esse",
  maqola: "ilmiy maqola",
  mustaqil: "mustaqil ish",
  kurs: "kurs ishi",
} as const;

export type EssayKind = keyof typeof ESSAY_KINDS;

export const ESSAY_LANGS = { uz: "O'zbekcha", ru: "Русский", en: "English" } as const;

export type EssayLang = keyof typeof ESSAY_LANGS;

// Titul varag'idagi ish turi nomi — ish tiliga mos
export const KIND_TITLES: Record<EssayKind, Record<EssayLang, string>> = {
  referat: { uz: "Referat", ru: "Реферат", en: "Report" },
  esse: { uz: "Esse", ru: "Эссе", en: "Essay" },
  maqola: { uz: "Ilmiy maqola", ru: "Научная статья", en: "Research paper" },
  mustaqil: { uz: "Mustaqil ish", ru: "Самостоятельная работа", en: "Independent work" },
  kurs: { uz: "Kurs ishi", ru: "Курсовая работа", en: "Course paper" },
};
