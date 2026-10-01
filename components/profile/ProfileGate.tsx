"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Backdrop from "@/components/Backdrop";
import Logo from "@/components/Logo";
import { Spinner } from "@/components/LoadingScreen";
import StudyForm from "@/components/profile/StudyForm";
import { logActivity } from "@/lib/activity";
import {
  emptyStudentProfile,
  loadStudentProfile,
  saveStudentProfile,
  syncIdentity,
  type StudentProfile,
} from "@/lib/student-profile";

type Ctx = {
  /** null — jadval hali sozlanmagan (schema.sql ishga tushirilmagan). */
  student: StudentProfile | null;
  save: (p: StudentProfile) => Promise<void>;
};

const StudentContext = createContext<Ctx | null>(null);

export function useStudentProfile(): Ctx {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudentProfile faqat ProfileGate ichida ishlatiladi");
  return ctx;
}

/**
 * Har qanday usulda (Google, Telegram, email) kirgan foydalanuvchi o'qish ma'lumotlarini
 * to'ldirmaguncha kabinetga o'tmaydi — reyting shu ma'lumotlarga tayanadi.
 */
export default function ProfileGate({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<"loading" | "missing" | "ok" | "unavailable">("loading");
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [stored, setStored] = useState<{ name: string | null; avatar: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    loadStudentProfile(user.id).then((r) => {
      if (!active) return;
      if (r.state === "ok") {
        setStudent(r.profile);
        setStored({ name: r.name, avatar: r.avatar });
      }
      setState(r.state);
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  // Ism yoki avatar profil sahifasida o'zgarsa — reytingdagi ko'rinish ham yangilanadi
  useEffect(() => {
    if (state === "ok" && stored) syncIdentity(user, stored);
  }, [state, stored, user]);

  const save = useCallback(
    async (p: StudentProfile) => {
      const saved = await saveStudentProfile(user, p);
      setStudent(saved);
      setState("ok");
    },
    [user],
  );

  const value = useMemo(() => ({ student, save }), [student, save]);

  if (state === "loading") return <>{fallback}</>;
  if (state === "missing") return <Onboarding onSave={save} />;
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

function Onboarding({ onSave }: { onSave: (p: StudentProfile) => Promise<void> }) {
  const { profile, signOut } = useAuth();
  const [value, setValue] = useState<StudentProfile>(emptyStudentProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave(value);
      logActivity("profile", "Ro'yxatdan o'tish yakunlandi");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="module-scope relative min-h-screen text-white" style={{ "--accent": "#8b5cf6", "--accent-2": "#6366f1" } as React.CSSProperties}>
      <Backdrop />
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <Logo />
          <button onClick={() => void signOut()} className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-white">
            <LogOut size={15} /> Chiqish
          </button>
        </div>

        <form onSubmit={submit} className="glass animate-fade-in mt-10 rounded-3xl p-6 sm:p-8">
          <p className="text-sm text-[var(--accent)]">Oxirgi qadam</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Xush kelibsiz, {profile.firstName}!</h1>
          <p className="mt-2 text-sm text-zinc-400">
            O&apos;zingiz haqingizda qisqacha ma&apos;lumot bering — vositalar va reyting shunga moslashadi. Keyin profil sahifasida
            o&apos;zgartirishingiz mumkin.
          </p>

          <div className="mt-7">
            <StudyForm value={value} onChange={setValue} />
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-accent mt-7 w-full py-3.5">
            {saving ? <Spinner className="size-4" /> : <ArrowRight size={18} />}
            {saving ? "Saqlanmoqda…" : "Davom etish"}
          </button>
        </form>
      </div>
    </div>
  );
}
