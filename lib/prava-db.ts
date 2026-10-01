"use client";

import { supabase } from "@/lib/supabase";
import { PRAVA_BUCKET, type PravaMode, type PravaQuestion } from "@/lib/prava";

// Supabase Data API bir so'rovda ko'pi bilan 1000 qator beradi — kattaroq ro'yxatlar sahifalab olinadi.
const PAGE = 1000;
const FIELDS = "id, ticket, position, topic, question, options, correct, explanation, image, active";

export type QuestionIndex = { id: number; ticket: number | null; topic: string | null };

export async function fetchIndex(): Promise<QuestionIndex[]> {
  const out: QuestionIndex[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("prava_questions")
      .select("id, ticket, topic")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(friendly(error));
    out.push(...(data as QuestionIndex[]));
    if (data.length < PAGE) return out;
  }
}

export async function fetchQuestions(ids: number[]): Promise<PravaQuestion[]> {
  const out: PravaQuestion[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from("prava_questions").select(FIELDS).in("id", ids.slice(i, i + 200));
    if (error) throw new Error(friendly(error));
    out.push(...(data as PravaQuestion[]));
  }
  // So'ralgan tartibni saqlaymiz
  const byId = new Map(out.map((q) => [q.id, q]));
  return ids.map((id) => byId.get(id)).filter((q): q is PravaQuestion => !!q);
}

export async function fetchMistakeIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("prava_mistakes")
    .select("question_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE);
  if (error) throw new Error(friendly(error));
  return data.map((r) => r.question_id as number);
}

export type PravaResult = {
  mode: PravaMode;
  ticket: number | null;
  topic: string | null;
  total: number;
  correct: number;
  passed: boolean | null;
  duration_sec: number;
  created_at: string;
};

export async function fetchResults(userId: string): Promise<PravaResult[]> {
  const { data, error } = await supabase
    .from("prava_results")
    .select("mode, ticket, topic, total, correct, passed, duration_sec, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(PAGE);
  if (error) throw new Error(friendly(error));
  return data as PravaResult[];
}

/** Xato javob "Xatolarim"ga qo'shiladi, to'g'ri javob esa uni u yerdan olib tashlaydi. */
export function recordAnswer(userId: string, questionId: number, right: boolean) {
  const table = supabase.from("prava_mistakes");
  const req = right
    ? table.delete().eq("user_id", userId).eq("question_id", questionId)
    : table.upsert({ user_id: userId, question_id: questionId }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
  void req.then(({ error }) => {
    if (error) console.warn("Javobni saqlab bo'lmadi:", error.message);
  });
}

export async function saveResult(userId: string, r: Omit<PravaResult, "created_at">) {
  const { error } = await supabase.from("prava_results").insert({ user_id: userId, ...r });
  if (error) console.warn("Natijani saqlab bo'lmadi:", error.message);
}

export function imageUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from(PRAVA_BUCKET).getPublicUrl(path).data.publicUrl;
}

function friendly(error: { code?: string; message: string }): string {
  if (error.code === "PGRST205" || error.code === "42P01") return "Prava bo'limi hali sozlanmagan (bazada jadval yo'q).";
  return error.message;
}
