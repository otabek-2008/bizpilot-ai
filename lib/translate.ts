// Tarjimon tillari — klient va server uchun umumiy ro'yxat.

export const TRANSLATE_LANGS = [
  { id: "uz", label: "O'zbekcha (lotin)", prompt: "o'zbek tili, lotin yozuvi (2023-yilgi imlo qoidalari)" },
  { id: "uz-cyrl", label: "Ўзбекча (кирилл)", prompt: "o'zbek tili, kirill yozuvi" },
  { id: "ru", label: "Русский", prompt: "rus tili" },
  { id: "en", label: "English", prompt: "ingliz tili" },
  { id: "tr", label: "Türkçe", prompt: "turk tili" },
  { id: "de", label: "Deutsch", prompt: "nemis tili" },
  { id: "fr", label: "Français", prompt: "fransuz tili" },
  { id: "ko", label: "한국어", prompt: "koreys tili" },
  { id: "zh", label: "中文", prompt: "xitoy tili (soddalashtirilgan)" },
  { id: "ar", label: "العربية", prompt: "arab tili" },
  { id: "kk", label: "Qazaqsha", prompt: "qozoq tili" },
  { id: "tg", label: "Тоҷикӣ", prompt: "tojik tili" },
] as const;

export type TranslateLang = (typeof TRANSLATE_LANGS)[number]["id"];

export const TRANSLATE_IDS = TRANSLATE_LANGS.map((l) => l.id) as [TranslateLang, ...TranslateLang[]];

export const TONES = [
  { id: "auto", label: "Asl uslubda" },
  { id: "formal", label: "Rasmiy" },
  { id: "casual", label: "Oddiy" },
] as const;

export type Tone = (typeof TONES)[number]["id"];
