"use client";

import { supabase } from "@/lib/supabase";
import { shuffle } from "@/lib/prava";
import type { ExamId } from "@/lib/exams";
import type { TestQuestion } from "@/lib/quiz";

export const EXAM_BUCKET = "exam-files";

// Supabase Data API bir so'rovda ko'pi bilan 1000 qator beradi — kattaroq ro'yxatlar sahifalab olinadi.
const PAGE = 1000;
const FIELDS = "id, subject, topic, question, options, correct, explanation, passage, image";

type Row = {
  id: number;
  subject: string;
  topic: string | null;
  question: string;
  options: string[];
  correct: number;
  explanation: string | null;
  passage: string | null;
  image: string | null;
};

export type QuestionRef = { id: number; subject: string };

/** Imtihon bo'yicha barcha faol savollar (faqat id va fan) — fanlar bo'yicha sanash va tasodifiy tanlash uchun. */
export async function fetchExamIndex(exam: ExamId): Promise<QuestionRef[]> {
  const out: QuestionRef[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("exam_questions")
      .select("id, subject")
      .eq("exam", exam)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(friendly(error));
    out.push(...(data as QuestionRef[]));
    if (data.length < PAGE) return out;
  }
}

/** Fandan tasodifiy `count` ta savol. */
export async function pickQuestions(index: QuestionRef[], subject: string, count: number): Promise<TestQuestion[]> {
  const ids = shuffle(index.filter((q) => q.subject === subject).map((q) => q.id)).slice(0, count);
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from("exam_questions").select(FIELDS).in("id", ids.slice(i, i + 200));
    if (error) throw new Error(friendly(error));
    rows.push(...(data as Row[]));
  }
  // Umumiy matnli (passage) savollar ketma-ket tursin
  const byId = new Map(rows.map((r) => [r.id, r]));
  const list = ids.map((id) => byId.get(id)).filter((r): r is Row => !!r);
  list.sort((a, b) => (a.passage ?? "").localeCompare(b.passage ?? ""));
  return list.map((r) => ({ ...r, meta: r.topic }));
}

export type Material = {
  id: number;
  subject: string | null;
  title: string;
  description: string | null;
  kind: "file" | "link";
  url: string;
};

export async function fetchMaterials(exam: ExamId): Promise<Material[]> {
  const { data, error } = await supabase
    .from("exam_materials")
    .select("id, subject, title, description, kind, url")
    .eq("exam", exam)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(friendly(error));
  return data as Material[];
}

export type ExamResult = {
  exam: string;
  subject: string | null;
  mode: "practice" | "mock" | "ai" | "writing";
  total: number;
  correct: number;
  points: number | null;
  max_points: number | null;
  duration_sec: number | null;
  created_at: string;
};

export async function fetchExamResults(userId: string): Promise<ExamResult[]> {
  const { data, error } = await supabase
    .from("exam_results")
    .select("exam, subject, mode, total, correct, points, max_points, duration_sec, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(friendly(error));
  return data as ExamResult[];
}

export async function saveExamResult(userId: string, r: Omit<ExamResult, "created_at">) {
  const { error } = await supabase.from("exam_results").insert({ user_id: userId, ...r });
  if (error) console.warn("Natijani saqlab bo'lmadi:", error.message);
}

export function examFileUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from(EXAM_BUCKET).getPublicUrl(path).data.publicUrl;
}

function friendly(error: { code?: string; message: string }): string {
  if (error.code === "PGRST205" || error.code === "42P01") return "Abituriyent bo'limi hali sozlanmagan (bazada jadval yo'q).";
  return error.message;
}
