"use client";

import { aiJson } from "@/lib/ai-client";
import type { QuizLang } from "@/lib/exams";
import type { TestQuestion } from "@/lib/quiz";

export type Difficulty = "oson" | "orta" | "qiyin";

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "oson", label: "Oson" },
  { id: "orta", label: "O'rta" },
  { id: "qiyin", label: "Qiyin" },
];

export type QuizRequest = {
  topic?: string;
  text?: string;
  count: number;
  difficulty: Difficulty;
  lang: QuizLang;
  exam?: string;
  subject?: string;
};

type QuizResponse = {
  title: string;
  passage: string | null;
  questions: { question: string; options: string[]; correct: number; explanation: string }[];
};

let seq = 0;

/** AI'dan test so'raydi; savollarga noyob id beriladi (bir nechta to'plam birlashtirilganda ham to'qnashmaydi). */
export async function generateQuiz(
  req: QuizRequest,
  extra: Partial<TestQuestion> = {},
  signal?: AbortSignal,
): Promise<{ title: string; questions: TestQuestion[] }> {
  const res = await aiJson<QuizResponse>("/api/ai/quiz", req, signal);
  return {
    title: res.title,
    questions: res.questions.map((q) => ({ ...q, ...extra, passage: res.passage, id: `ai-${Date.now().toString(36)}-${seq++}` })),
  };
}
