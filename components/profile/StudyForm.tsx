"use client";

import { BookOpen, GraduationCap, UserRound } from "lucide-react";
import UniversityPicker from "@/components/profile/UniversityPicker";
import { STATUSES, type StudentProfile, type UserStatus } from "@/lib/student-profile";

const ICONS: Record<UserStatus, typeof UserRound> = { talaba: GraduationCap, abituriyent: BookOpen, shaxsiy: UserRound };

/** Holat (talaba / abituriyent / shaxsiy); talaba uchun oliygoh va yo'nalish. Boshqariladigan forma. */
export default function StudyForm({ value: v, onChange }: { value: StudentProfile; onChange: (v: StudentProfile) => void }) {
  const set = (patch: Partial<StudentProfile>) => onChange({ ...v, ...patch });

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Siz kimsiz?" className="grid gap-2 sm:grid-cols-3">
        {STATUSES.map((s) => {
          const Icon = ICONS[s.id];
          const active = v.status === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set({ status: s.id })}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                active ? "accent-soft border-[color:var(--accent)]" : "border-white/10 hover:border-white/25"
              }`}
            >
              <Icon size={20} className={active ? "text-[var(--accent)]" : "text-zinc-400"} />
              <span>
                <span className="block font-medium">{s.title}</span>
                <span className="block text-xs text-zinc-500">{s.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {v.status === "talaba" && (
        <div className="animate-fade-in space-y-4">
          <div>
            <p className="mb-2 text-sm text-zinc-400">Oliygoh</p>
            <UniversityPicker
              value={{ id: v.university_id, name: v.university_name }}
              onChange={(u) => set({ university_id: u.id, university_name: u.name })}
            />
          </div>
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">Yo&apos;nalish (mutaxassislik)</span>
            <input
              value={v.faculty ?? ""}
              onChange={(e) => set({ faculty: e.target.value.slice(0, 200) })}
              placeholder="Masalan: Dasturiy injiniring"
              className="field accent-ring"
            />
          </label>
        </div>
      )}
    </div>
  );
}
