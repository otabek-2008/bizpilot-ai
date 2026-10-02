import type { User } from "@supabase/supabase-js";

// Profil ma'lumotlari Supabase user_metadata ichida saqlanadi.
export type ProfileMeta = {
  full_name?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  university?: string;
  faculty?: string;
  course?: string;
  avatar_url?: string;
  banner?: string;
  telegram_username?: string;
};

export type Profile = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  university: string;
  faculty: string;
  course: string;
  banner: string;
  provider: string;
};

export const banners = [
  "linear-gradient(120deg,#7c3aed,#4f46e5 50%,#06b6d4)",
  "linear-gradient(120deg,#f43f5e,#d946ef 55%,#6366f1)",
  "linear-gradient(120deg,#10b981,#14b8a6 45%,#0ea5e9)",
  "linear-gradient(120deg,#f59e0b,#f97316 45%,#ef4444)",
  "linear-gradient(120deg,#0f172a,#334155 50%,#64748b)",
  "linear-gradient(120deg,#ec4899,#8b5cf6 50%,#22d3ee)",
];

const isInternalEmail = (email: string) => email.endsWith("@telegram.campusai.app");

export function toProfile(user: User): Profile {
  const m = (user.user_metadata ?? {}) as ProfileMeta & { name?: string; picture?: string };
  const email = user.email && !isInternalEmail(user.email) ? user.email : "";
  const phone = user.phone ? `+${user.phone.replace(/^\+/, "")}` : "";

  const name =
    m.full_name?.trim() ||
    m.name?.trim() ||
    (m.telegram_username ? `@${m.telegram_username}` : "") ||
    email.split("@")[0] ||
    phone ||
    "Foydalanuvchi";

  const initials =
    name
      .replace(/^[@+]/, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0))
      .join("")
      .toUpperCase() || "U";

  return {
    id: user.id,
    name,
    firstName: name.split(/\s+/)[0],
    initials,
    email,
    phone,
    avatar: m.avatar_url || m.picture || "",
    bio: m.bio ?? "",
    university: m.university ?? "",
    faculty: m.faculty ?? "",
    course: m.course ?? "",
    banner: m.banner ?? banners[0],
    provider: (user.app_metadata?.provider as string) ?? "email",
  };
}
