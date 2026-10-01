"use client";

import { supabase } from "@/lib/supabase";
import type { UserStatus } from "@/lib/student-profile";

// Reyting: Supabase'dagi rating_* funksiyalari (security definer) faqat jamlangan natijani qaytaradi.

export type Period = "week" | "month" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "week", label: "Hafta" },
  { id: "month", label: "Oy" },
  { id: "all", label: "Barcha vaqt" },
];

export type RatingUser = {
  rank: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  university_id: string | null;
  university_name: string | null;
  faculty: string | null;
  points: number;
  tests: number;
};

export type RatingMe = { rank: number; points: number; tests: number; participants: number };

export type RatingUniversity = { university_id: string | null; university_name: string; students: number; active: number; points: number };

function friendly(error: { code?: string; message: string }): string {
  if (error.code === "PGRST202" || error.code === "42883") return "Reyting hali sozlanmagan (bazada funksiya yo'q).";
  return error.message;
}

export async function fetchRatingUsers(period: Period, filter: { status?: UserStatus; university?: string } = {}): Promise<RatingUser[]> {
  const { data, error } = await supabase.rpc("rating_users", {
    period,
    p_status: filter.status ?? null,
    p_university: filter.university ?? null,
    p_limit: 100,
  });
  if (error) throw new Error(friendly(error));
  return (data ?? []) as RatingUser[];
}

export async function fetchRatingMe(period: Period): Promise<RatingMe | null> {
  const { data, error } = await supabase.rpc("rating_me", { period });
  if (error) throw new Error(friendly(error));
  return ((data ?? []) as RatingMe[])[0] ?? null;
}

export async function fetchRatingUniversities(period: Period): Promise<RatingUniversity[]> {
  const { data, error } = await supabase.rpc("rating_universities", { period });
  if (error) throw new Error(friendly(error));
  return (data ?? []) as RatingUniversity[];
}
