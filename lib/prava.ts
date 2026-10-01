// Prava (haydovchilik guvohnomasi) nazariy test moduli: savol turi, imtihon qoidalari va savollarni import qilish.
// Savollar bazasi admin panel orqali to'ldiriladi — bu yerda hech qanday rasmiy savol yo'q.

import { score, type Answers } from "./quiz";

export { score, type Answers };

export const PRAVA_BUCKET = "prava-images";

/**
 * Imtihon formatlari: savollar soni, vaqt va o'tish normasi (kamida shuncha to'g'ri javob).
 * 20 savollik — rasmiy YHXX nazariy imtihoni sharti (20 daqiqa, ko'pi bilan 2 ta xato); 50 savollik — kengaytirilgan mashq.
 */
export const EXAM_FORMATS = [
  { size: 20, minutes: 20, minCorrect: 18 },
  { size: 50, minutes: 60, minCorrect: 46 },
] as const;

export type ExamFormat = (typeof EXAM_FORMATS)[number];
export type ExamSize = ExamFormat["size"];

export const examFormat = (size: ExamSize): ExamFormat => EXAM_FORMATS.find((f) => f.size === size) ?? EXAM_FORMATS[0];

/** Normani buzmasdan qilish mumkin bo'lgan eng ko'p xato. */
export const maxMistakes = (f: ExamFormat) => f.size - f.minCorrect;

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export type PravaQuestion = {
  id: number;
  ticket: number | null;
  position: number | null;
  topic: string | null;
  question: string;
  options: string[];
  /** To'g'ri javob indeksi (0 dan boshlanadi). */
  correct: number;
  explanation: string | null;
  /** prava-images bucket ichidagi yo'l. */
  image: string | null;
  active: boolean;
};

export type PravaMode = "exam" | "ticket" | "topic" | "mistakes";

/** Bazaga yoziladigan (id'siz) savol. */
export type QuestionInput = Omit<PravaQuestion, "id">;

const LETTERS = "ABCDEF";

const clean = (v: unknown) => (v == null ? "" : String(v)).replace(/\r\n?/g, "\n").trim();

function intOrNull(v: unknown, field: string): number | null {
  const s = clean(v);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new Error(`${field} musbat butun son bo'lishi kerak ("${s}").`);
  return n;
}

/** "2", "B", "b" → 1. Raqamlar 1 dan boshlanadi (odamlar shunday yozadi). */
export function parseCorrect(v: unknown, optionCount: number): number {
  const s = clean(v).toUpperCase();
  let idx = -1;
  if (/^\d+$/.test(s)) idx = Number(s) - 1;
  else if (s.length === 1 && LETTERS.includes(s)) idx = LETTERS.indexOf(s);
  if (idx < 0 || idx >= optionCount) {
    throw new Error(`To'g'ri javob "${s || "bo'sh"}" — 1..${optionCount} yoki ${LETTERS.slice(0, optionCount).split("").join("/")} bo'lishi kerak.`);
  }
  return idx;
}

/** Savolni tekshiradi va tozalaydi; xato bo'lsa tushunarli matn bilan Error tashlaydi. */
export function normalizeQuestion(raw: {
  ticket?: unknown;
  position?: unknown;
  topic?: unknown;
  question?: unknown;
  options?: unknown[];
  correct?: unknown;
  /** true bo'lsa correct 0 dan boshlanadi (formadan), aks holda 1 dan yoki harf (importdan). */
  correctIsIndex?: boolean;
  explanation?: unknown;
  image?: unknown;
  active?: unknown;
}): QuestionInput {
  const question = clean(raw.question);
  if (!question) throw new Error("Savol matni bo'sh.");
  if (question.length > 2000) throw new Error("Savol matni juda uzun (2000 belgidan oshmasin).");

  // To'g'ri javob bo'sh variantlar olib tashlanishidan oldingi o'rinni bildiradi (masalan "javob3" ustuni).
  const rawOptions = (raw.options ?? []).map(clean);
  const options = rawOptions.filter(Boolean);
  if (options.length < MIN_OPTIONS) throw new Error(`Kamida ${MIN_OPTIONS} ta javob varianti kerak.`);
  if (options.length > MAX_OPTIONS) throw new Error(`Ko'pi bilan ${MAX_OPTIONS} ta javob varianti bo'lishi mumkin.`);
  if (options.some((o) => o.length > 500)) throw new Error("Javob varianti juda uzun (500 belgidan oshmasin).");

  let rawIndex: number;
  if (raw.correctIsIndex) {
    rawIndex = Number(raw.correct);
    if (!Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex >= rawOptions.length) throw new Error("To'g'ri javobni belgilang.");
  } else {
    rawIndex = parseCorrect(raw.correct, Math.min(rawOptions.length, MAX_OPTIONS));
  }
  if (!rawOptions[rawIndex]) throw new Error(`To'g'ri javob deb belgilangan ${rawIndex + 1}-variant bo'sh.`);
  const correct = rawOptions.slice(0, rawIndex).filter(Boolean).length;

  const image = clean(raw.image).replace(/^\/+/, "");
  if (image.split("/").some((p) => p === "..")) throw new Error("Rasm yo'li noto'g'ri.");
  const topic = clean(raw.topic);
  const explanation = clean(raw.explanation);

  return {
    ticket: intOrNull(raw.ticket, "Bilet raqami"),
    position: intOrNull(raw.position, "Tartib raqami"),
    topic: topic ? topic.slice(0, 120) : null,
    question,
    options,
    correct,
    explanation: explanation ? explanation.slice(0, 3000) : null,
    image: image || null,
    active: raw.active == null || raw.active === "" ? true : !/^(0|false|yo'q|yoq|no)$/i.test(clean(raw.active)),
  };
}

// ---------------- Import (CSV / JSON) ----------------

/** RFC 4180 CSV: qo'shtirnoq ichidagi vergul va yangi qatorlar, "" → ". Ajratgich avtomatik (; , yoki tab). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0];
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delim = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// Ustun nomlari: o'zbekcha (apostrofsiz ham) va inglizcha.
const HEADER_ALIASES: Record<string, string> = {
  bilet: "ticket", ticket: "ticket",
  tartib: "position", raqam: "position", position: "position", no: "position",
  mavzu: "topic", topic: "topic",
  savol: "question", question: "question",
  togri: "correct", "to'g'ri": "correct", "to‘g‘ri": "correct", correct: "correct", answer: "correct",
  izoh: "explanation", explanation: "explanation",
  rasm: "image", image: "image",
  faol: "active", active: "active",
  // Abituriyent savollari uchun (prava importi bularni e'tiborsiz qoldiradi)
  imtihon: "exam", exam: "exam",
  fan: "subject", subject: "subject",
  matn: "passage", passage: "passage",
};

function headerKey(h: string): string | null {
  const k = h.trim().toLowerCase().replace(/\s+/g, "");
  if (HEADER_ALIASES[k]) return HEADER_ALIASES[k];
  // javob1..javob6, variant1, option1, yoki A..F
  const m = k.match(/^(?:javob|variant|option|answer)_?(\d)$/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= MAX_OPTIONS) return `opt${Number(m[1]) - 1}`;
  if (k.length === 1 && LETTERS.includes(k.toUpperCase())) return `opt${LETTERS.indexOf(k.toUpperCase())}`;
  return null;
}

export type ImportResult = { questions: QuestionInput[]; errors: string[] };

/** Fayldan o'qilgan, hali tekshirilmagan yozuv: ustun kalitlari (question, correct, ...) va variantlar. */
export type RawRecord = Record<string, unknown> & { options: unknown[] };

type Records = { records: { label: string; rec: RawRecord }[]; errors: string[] };

function csvRecords(text: string): Records {
  const rows = parseCsv(text);
  if (rows.length < 2) return { records: [], errors: ["Faylda sarlavha qatori va kamida bitta savol bo'lishi kerak."] };
  const keys = rows[0].map(headerKey);
  if (!keys.includes("question")) return { records: [], errors: ['Sarlavhada "savol" ustuni topilmadi.'] };
  if (!keys.some((k) => k?.startsWith("opt"))) return { records: [], errors: ['Sarlavhada "javob1", "javob2", ... ustunlari topilmadi.'] };
  if (!keys.includes("correct")) return { records: [], errors: ['Sarlavhada "togri" ustuni topilmadi.'] };

  const records = rows.slice(1).map((cells, i) => {
    const rec: Record<string, string> = {};
    keys.forEach((k, j) => {
      if (k) rec[k] = cells[j] ?? "";
    });
    const options = Array.from({ length: MAX_OPTIONS }, (_, j) => rec[`opt${j}`] ?? "");
    return { label: `${i + 2}-qator`, rec: { ...rec, options } };
  });
  return { records, errors: [] };
}

function jsonRecords(text: string): Records {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (e) {
    return { records: [], errors: [`JSON xato: ${(e as Error).message}`] };
  }
  if (!Array.isArray(data)) return { records: [], errors: ["JSON ro'yxat ([ ... ]) bo'lishi kerak."] };

  const records: Records["records"] = [];
  const errors: string[] = [];
  data.forEach((item, i) => {
    const label = `${i + 1}-savol`;
    if (!item || typeof item !== "object") return errors.push(`${label}: obyekt emas.`);
    const o = item as Record<string, unknown>;
    const options = o.javoblar ?? o.variantlar ?? o.options ?? o.answers;
    if (!Array.isArray(options)) return errors.push(`${label}: "javoblar" ro'yxati topilmadi.`);
    records.push({
      label,
      rec: {
        ticket: o.bilet ?? o.ticket,
        position: o.tartib ?? o.position,
        topic: o.mavzu ?? o.topic,
        question: o.savol ?? o.question,
        options,
        correct: o.togri ?? o["to'g'ri"] ?? o.correct,
        explanation: o.izoh ?? o.explanation,
        image: o.rasm ?? o.image,
        active: o.faol ?? o.active,
        exam: o.imtihon ?? o.exam,
        subject: o.fan ?? o.subject,
        passage: o.matn ?? o.passage,
      },
    });
  });
  return { records, errors };
}

/** Fayl matnini (CSV yoki JSON) yozuvlarga ajratadi — tekshirish chaqiruvchida. */
export function readRecords(text: string): Records {
  const t = text.replace(/^\uFEFF/, "").trimStart();
  if (!t) return { records: [], errors: ["Fayl bo'sh."] };
  return t.startsWith("[") ? jsonRecords(t) : csvRecords(t);
}

/** Fayl matnini (CSV yoki JSON) savollarga aylantiradi. Xato qatorlar o'tkazib yuboriladi va ro'yxatda qaytadi. */
export function parseImport(text: string): ImportResult {
  const { records, errors } = readRecords(text);
  const questions: QuestionInput[] = [];
  for (const { label, rec } of records) {
    try {
      questions.push(normalizeQuestion(rec));
    } catch (e) {
      errors.push(`${label}: ${(e as Error).message}`);
    }
  }
  return { questions, errors };
}

/** Admin namunasi — rasmiy savol emas, faqat format ko'rsatkichi. */
export const CSV_TEMPLATE =
  "\uFEFFbilet;tartib;mavzu;savol;javob1;javob2;javob3;javob4;javob5;javob6;togri;izoh;rasm\n" +
  '1;1;Mavzu nomi;"Savol matni shu yerda (ichida ; bo\'lsa, qo\'shtirnoqqa oling)";1-javob;2-javob;3-javob;;;;2;Izoh — ixtiyoriy;rasm-fayli.jpg\n';

// ---------------- Test ----------------

/** Fisher–Yates; `random` testlarda almashtiriladi. */
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bilet/mavzu savollari tartibi: avval tartib raqami, keyin id. */
export const byPosition = (a: PravaQuestion, b: PravaQuestion) =>
  (a.position ?? Infinity) - (b.position ?? Infinity) || a.id - b.id;

/** Imtihon: faqat norma bajarilsa (to'g'ri javoblar kamida minCorrect ta) — o'tdi. Javobsiz savol to'g'ri hisoblanmaydi. */
export function examPassed(questions: PravaQuestion[], answers: Answers, format: ExamFormat): boolean {
  return questions.length === format.size && score(questions, answers).correct >= format.minCorrect;
}
