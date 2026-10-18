// Ovozli yozuv (diktovka) va ovoz chiqarib o'qish uchun yordamchilar — AI'siz, faqat qoidalar.

export type DictLang = "uz" | "ru" | "en";

export const DICT_LANGS: { id: DictLang; label: string; bcp47: string }[] = [
  { id: "uz", label: "O'zbek", bcp47: "uz-UZ" },
  { id: "ru", label: "Rus", bcp47: "ru-RU" },
  { id: "en", label: "Ingliz", bcp47: "en-US" },
];

// Apostrof turli ko'rinishda kelishi mumkin: ' ‘ ’ ʻ ʼ `
const AP = "['‘’ʻʼ`]";

// Aytilgan buyruq → belgi. Uzunroq iboralar avval turadi ("ikki nuqta" "nuqta"dan oldin).
const COMMANDS: Record<DictLang, [string, string][]> = {
  uz: [
    ["yangi xatboshi", "\n\n"],
    ["yangi qator", "\n"],
    [`so${AP}roq belgisi`, "?"],
    ["undov belgisi", "!"],
    ["ikki nuqta", ":"],
    [`nuqtali vergul`, ";"],
    ["nuqta", "."],
    ["vergul", ","],
    ["tire", "—"],
  ],
  ru: [
    ["новый абзац", "\n\n"],
    ["новая строка", "\n"],
    ["вопросительный знак", "?"],
    ["восклицательный знак", "!"],
    ["двоеточие", ":"],
    ["точка с запятой", ";"],
    ["точка", "."],
    ["запятая", ","],
    ["тире", "—"],
  ],
  en: [
    ["new paragraph", "\n\n"],
    ["new line", "\n"],
    ["question mark", "?"],
    ["exclamation (?:mark|point)", "!"],
    ["semicolon", ";"],
    ["colon", ":"],
    ["full stop", "."],
    ["period", "."],
    ["comma", ","],
    ["dash", "—"],
  ],
};

const PATTERNS: Record<DictLang, [RegExp, string][]> = Object.fromEntries(
  Object.entries(COMMANDS).map(([lang, list]) => [
    lang,
    // So'z chegarasi Unicode harflar bo'yicha: "nuqtai" ichidagi "nuqta" tegilmaydi
    list.map(([phrase, sign]) => [new RegExp(`(?<![\\p{L}'‘’ʻʼ\`])${phrase}(?![\\p{L}'‘’ʻʼ\`])`, "giu"), sign] as [RegExp, string]),
  ]),
) as Record<DictLang, [RegExp, string][]>;

function applyCommands(text: string, lang: DictLang): string {
  let s = text;
  for (const [re, sign] of PATTERNS[lang]) s = s.replace(re, sign);
  return s
    .replace(/[ \t]+([.,!?:;])/g, "$1") // belgi oldidagi bo'shliq
    .replace(/([.,!?:;])(?=[\p{L}\p{N}])/gu, "$1 ") // belgidan keyin bo'shliq
    .replace(/[ \t]*—[ \t]*/g, " — ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/^[ \t]+|[ \t]+$/g, "");
}

/** Yangi aytilgan bo'lakni mavjud matn oxiriga qo'shadi: tinish buyruqlari, bo'shliq va bosh harflar. */
export function appendDictation(prev: string, segment: string, lang: DictLang, commands: boolean): string {
  let seg = segment.replace(/\s+/g, " ").trim();
  if (!seg) return prev;
  if (commands) seg = applyCommands(seg, lang);

  const sep = !prev || /\s$/.test(prev) || /^[.,!?:;\n]/.test(seg) ? "" : " ";

  // Gap boshida bosh harf: matn boshi, . ! ? yoki yangi qatordan keyin
  let cap = !prev.trim() || /[.!?]\s*$|\n\s*$/.test(prev);
  let out = "";
  for (const ch of seg) {
    if (cap && /\p{L}/u.test(ch)) {
      out += ch.toLocaleUpperCase(lang);
      cap = false;
      continue;
    }
    if (/[.!?\n]/.test(ch)) cap = true;
    else if (/[\p{L}\p{N},;:]/u.test(ch)) cap = false;
    out += ch;
  }
  return prev + sep + out;
}

/**
 * Uzun matnni o'qish uchun bo'laklarga ajratadi. Brauzerlar (ayniqsa Chrome) bitta uzun
 * so'zlashuvni ~15 soniyadan keyin uzib qo'yadi, shuning uchun gaplar bo'yicha bo'linadi.
 */
export function splitForSpeech(text: string, max = 220): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?…]+[.!?…]+["»”)]*|[^.!?…]+$/g) ?? [];
  const chunks: string[] = [];
  let cur = "";
  const push = () => {
    if (cur.trim()) chunks.push(cur.trim());
    cur = "";
  };
  for (const raw of sentences) {
    const s = raw.trim();
    if (s.length > max) {
      push();
      // Juda uzun gap — vergul, keyin bo'shliq bo'yicha bo'linadi
      let rest = s;
      while (rest.length > max) {
        const window = rest.slice(0, max);
        let cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
        if (cut < max / 3) cut = window.lastIndexOf(" ");
        if (cut <= 0) cut = max;
        chunks.push(rest.slice(0, cut + 1).trim());
        rest = rest.slice(cut + 1).trim();
      }
      cur = rest;
    } else if ((cur + " " + s).length > max) {
      push();
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  push();
  return chunks;
}
