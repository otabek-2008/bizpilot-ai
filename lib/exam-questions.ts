// Abituriyent savollar bazasi: tekshirish va CSV/JSON import (admin panel va server action uchun).

import { EXAMS, examById, subjectOf, type ExamId } from "./exams";
import { normalizeQuestion, readRecords, type RawRecord } from "./prava";

export type ExamQuestionInput = {
  exam: ExamId;
  subject: string;
  topic: string | null;
  question: string;
  options: string[];
  correct: number;
  explanation: string | null;
  passage: string | null;
  image: string | null;
  active: boolean;
};

const clean = (v: unknown) => (v == null ? "" : String(v)).replace(/\r\n?/g, "\n").trim();

/** Imtihon va fanni id yoki nom bo'yicha topadi ("DTM", "Matematika" ham bo'ladi). */
function resolve(examRaw: unknown, subjectRaw: unknown, defaults: { exam?: string; subject?: string }) {
  const e = clean(examRaw).toLowerCase() || defaults.exam || "";
  const exam = examById(e) ?? EXAMS.find((x) => x.short.toLowerCase() === e || x.name.toLowerCase() === e);
  if (!exam) throw new Error(`Imtihon "${e || "bo'sh"}" — ${EXAMS.map((x) => x.id).join(", ")} dan biri bo'lishi kerak.`);
  const sRaw = clean(subjectRaw) || defaults.subject || "";
  const s = sRaw.toLowerCase();
  const subject = subjectOf(exam, s) ?? exam.subjects.find((x) => x.name.toLowerCase() === s);
  if (!subject) throw new Error(`"${exam.short}" da "${sRaw || "bo'sh"}" fani yo'q. Fanlar: ${exam.subjects.map((x) => x.id).join(", ")}.`);
  return { exam: exam.id, subject: subject.id };
}

export function normalizeExamQuestion(raw: RawRecord & { correctIsIndex?: boolean }, defaults: { exam?: string; subject?: string } = {}): ExamQuestionInput {
  const { exam, subject } = resolve(raw.exam, raw.subject, defaults);
  const base = normalizeQuestion({ ...raw, ticket: null, position: null });
  const passage = clean(raw.passage);
  if (passage.length > 12000) throw new Error("Umumiy matn (passage) juda uzun (12 000 belgidan oshmasin).");
  return {
    exam,
    subject,
    topic: base.topic,
    question: base.question,
    options: base.options,
    correct: base.correct,
    explanation: base.explanation,
    passage: passage || null,
    image: base.image,
    active: base.active,
  };
}

export function parseExamImport(text: string, defaults: { exam?: string; subject?: string }) {
  const { records, errors } = readRecords(text);
  const questions: ExamQuestionInput[] = [];
  for (const { label, rec } of records) {
    try {
      questions.push(normalizeExamQuestion(rec, defaults));
    } catch (e) {
      errors.push(`${label}: ${(e as Error).message}`);
    }
  }
  return { questions, errors };
}

/** Admin namunasi — faqat format ko'rsatkichi. */
export const EXAM_CSV_TEMPLATE =
  "﻿imtihon;fan;mavzu;savol;javob1;javob2;javob3;javob4;togri;izoh;matn;rasm\n" +
  'dtm;matematika;Tenglamalar;"2x + 3 = 11 tenglamaning ildizini toping.";3;4;5;7;2;"2x = 8, x = 4";;\n';
