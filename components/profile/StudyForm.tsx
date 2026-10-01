"use client";

import { BookOpen, GraduationCap, UserRound } from "lucide-react";
import ProgramPicker from "@/components/profile/ProgramPicker";
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
              // Oliygoh almashsa — avvalgi yo'nalish endi mos emas
              onChange={(u) => set({ university_id: u.id, university_name: u.name, ...(u.id !== v.university_id && { faculty: null }) })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-zinc-400">Yo&apos;nalish (mutaxassislik)</p>
            <ProgramPicker universityId={v.university_id} value={v.faculty} onChange={(faculty) => set({ faculty })} />
          </div>
        </div>
      )}
    </div>
  );
}
