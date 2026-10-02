"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toProfile } from "@/lib/profile";
import { universityById } from "@/lib/universities";

// Ro'yxatdan o'tgandan keyingi ma'lumotlar (profiles jadvali) — reyting shu asosida tuziladi.

export type UserStatus = "talaba" | "abituriyent" | "shaxsiy";

export const STATUSES: { id: UserStatus; title: string; desc: string }[] = [
  { id: "talaba", title: "Talabaman", desc: "Oliygohda o'qiyman" },
  { id: "abituriyent", title: "Abituriyentman", desc: "Oliygohga kirishga tayyorlanyapman" },
  { id: "shaxsiy", title: "Shaxsiy foydalanish", desc: "O'qish yoki ish uchun vositalar kerak" },
];

export const STATUS_LABEL: Record<UserStatus, string> = { talaba: "Talaba", abituriyent: "Abituriyent", shaxsiy: "Shaxsiy" };

export type StudentProfile = {
  status: UserStatus;
  university_id: string | null;
  university_name: string | null;
  faculty: string | null;
};

export const emptyStudentProfile = (): StudentProfile => ({ status: "talaba", university_id: null, university_name: null, faculty: null });

const FIELDS = "status, university_id, university_name, faculty, full_name, avatar_url";

export type LoadResult =
  | { state: "ok"; profile: StudentProfile; name: string | null; avatar: string | null }
  | { state: "missing" }
  /** Jadval hali yaratilmagan (schema.sql ishga tushirilmagan) — foydalanuvchini bloklamaymiz. */
  | { state: "unavailable" };

export async function loadStudentProfile(userId: string): Promise<LoadResult> {
  const { data, error } = await supabase.from("profiles").select(FIELDS).eq("id", userId).maybeSingle();
  if (error) return { state: "unavailable" };
  if (!data) return { state: "missing" };
  const { full_name, avatar_url, ...profile } = data as StudentProfile & { full_name: string | null; avatar_url: string | null };
  return { state: "ok", profile, name: full_name, avatar: avatar_url };
}

/** Talaba uchun oliygoh va yo'nalish majburiy; boshqalarda bu maydonlar tozalanadi. Xato bo'lsa — matn. */
export function normalizeStudentProfile(p: StudentProfile): { profile: StudentProfile } | { error: string } {
  if (p.status !== "talaba") return { profile: { status: p.status, university_id: null, university_name: null, faculty: null } };
  const uni = universityById(p.university_id);
  const name = uni?.name ?? (p.university_name?.trim().slice(0, 200) || null);
  if (!name) return { error: "Oliygohingizni tanlang." };
  const faculty = p.faculty?.trim().slice(0, 200) || null;
  if (!faculty) return { error: "Yo'nalishingizni kiriting." };
  return { profile: { status: "talaba", university_id: uni?.id ?? null, university_name: name, faculty } };
}

/** Reytingda hammaga ko'rinadigan ism — email manzilining bo'lagi hech qachon chiqmasin. */
function publicName(user: User): string | null {
  const m = (user.user_metadata ?? {}) as { full_name?: string; name?: string; telegram_username?: string };
  return (m.full_name?.trim() || m.name?.trim() || (m.telegram_username ? `@${m.telegram_username}` : "")).slice(0, 120) || null;
}

/** profiles jadvaliga yozadi va profil sahifasidagi eski maydonlarni (user_metadata) ham moslaydi. */
export async function saveStudentProfile(user: User, raw: StudentProfile): Promise<StudentProfile> {
  const checked = normalizeStudentProfile(raw);
  if ("error" in checked) throw new Error(checked.error);
  const p = checked.profile;
  const view = toProfile(user);

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    ...p,
    full_name: publicName(user),
    avatar_url: view.avatar || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.code === "PGRST205" ? "Profil jadvali hali sozlanmagan." : error.message);

  await supabase.auth.updateUser({ data: { university: p.university_name ?? "", faculty: p.faculty ?? "", course: "" } });
  return p;
}

/** Ism yoki avatar o'zgarganda reytingdagi ko'rinishni yangilaydi. */
export function syncIdentity(user: User, stored: { name: string | null; avatar: string | null }) {
  const view = toProfile(user);
  const name = publicName(user);
  const avatar = view.avatar || null;
  if (stored.name === name && stored.avatar === avatar) return;
  void supabase
    .from("profiles")
    .update({ full_name: name, avatar_url: avatar })
    .eq("id", user.id)
    .then(({ error }) => error && console.warn("Profilni yangilab bo'lmadi:", error.message));
}
