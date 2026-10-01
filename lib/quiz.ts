// Umumiy test (bir to'g'ri javobli savollar) yordamchilari: prava, abituriyent testlari va AI test yaratuvchi uchun.

export type TestQuestion = {
  id: number | string;
  question: string;
  options: string[];
  /** To'g'ri javob indeksi (0 dan boshlanadi). */
  correct: number;
  explanation?: string | null;
  /** Rasm yo'li yoki to'liq URL — ko'rsatishda imageSrc() orqali o'tadi. */
  image?: string | null;
  /** Savol ustidagi qisqa yozuv (bilet, fan, mavzu). */
  meta?: string | null;
  /** Ball (masalan DTM'da fanga qarab 1,1 / 2,1 / 3,1). Berilmasa 1. */
  points?: number;
  /** Bir nechta savolga umumiy matn (IELTS/CEFR Reading). */
  passage?: string | null;
  /** Natijani bo'limlar bo'yicha ko'rsatish uchun (fan nomi). */
  section?: string | null;
};

/** Savol kaliti → tanlangan variant indeksi. */
export type Answers = Record<string, number>;

export function score(questions: readonly TestQuestion[], answers: Answers) {
  let correct = 0;
  let wrong = 0;
  let points = 0;
  let maxPoints = 0;
  for (const q of questions) {
    const p = q.points ?? 1;
    maxPoints += p;
    const a = answers[String(q.id)];
    if (a == null) continue;
    if (a === q.correct) {
      correct++;
      points += p;
    } else wrong++;
  }
  return { correct, wrong, answered: correct + wrong, total: questions.length, points: round1(points), maxPoints: round1(maxPoints) };
}

/** Bo'limlar (fanlar) bo'yicha natija — section berilmagan savollar hisobga olinmaydi. */
export function scoreBySection(questions: readonly TestQuestion[], answers: Answers) {
  const map = new Map<string, TestQuestion[]>();
  for (const q of questions) if (q.section) map.set(q.section, [...(map.get(q.section) ?? []), q]);
  return [...map.entries()].map(([section, qs]) => ({ section, ...score(qs, answers) }));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Imtihon qoidasi: minCorrect — o'tish uchun kamida shuncha to'g'ri javob;
 * maxMistakes oshib ketsa test shu zahoti tugaydi.
 */
export type PassRule = { minCorrect: number; maxMistakes: number; label: string };

export const passed = (questions: readonly TestQuestion[], answers: Answers, rule: PassRule) =>
  score(questions, answers).correct >= rule.minCorrect;

/** AI yoki import qilingan savolni tekshiradi: kamida 2 variant, to'g'ri javob indeksi chegarada. */
export function isValidQuestion(q: Pick<TestQuestion, "question" | "options" | "correct">): boolean {
  return (
    typeof q.question === "string" &&
    q.question.trim().length > 0 &&
    Array.isArray(q.options) &&
    q.options.length >= 2 &&
    q.options.every((o) => typeof o === "string" && o.trim()) &&
    Number.isInteger(q.correct) &&
    q.correct >= 0 &&
    q.correct < q.options.length
  );
}

/** Variantlarni aralashtiradi va to'g'ri javob indeksini moslaydi (AI ko'pincha to'g'ri javobni bir joyga qo'yadi). */
export function shuffleOptions<T extends Pick<TestQuestion, "options" | "correct">>(q: T, random = Math.random): T {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct) };
}
