/* eslint-disable @next/next/no-img-element -- avatarlar tashqi domenlardan (Google, Telegram, Supabase) keladi */
import type { Profile } from "@/lib/profile";

export default function Avatar({
  profile,
  className = "size-9 text-sm",
}: {
  profile: Pick<Profile, "avatar" | "initials" | "name">;
  className?: string;
}) {
  if (profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt={profile.name}
        referrerPolicy="no-referrer"
        className={`${className} shrink-0 rounded-full object-cover ring-2 ring-white/10`}
      />
    );
  }
  return (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 font-semibold ring-2 ring-white/10`}
    >
      {profile.initials}
    </span>
  );
}
