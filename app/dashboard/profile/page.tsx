"use client";

import { useRef, useState } from "react";
import { Camera, Check, KeyRound, Loader2, LogOut, Save, Trash2 } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Avatar from "@/components/shell/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";
import { banners, type ProfileMeta } from "@/lib/profile";
import { logActivity } from "@/lib/activity";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date";

const COURSES = ["1-kurs", "2-kurs", "3-kurs", "4-kurs", "5-kurs", "Magistratura", "Bitirgan", "O'quvchi", "Boshqa"];
const PROVIDERS: Record<string, string> = {
  email: "Email",
  google: "Google",
  apple: "Apple",
  phone: "Telefon",
};

/** Rasmni kvadrat qilib kesadi va kichraytiradi. */
async function squareAvatar(file: File, size = 320): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const s = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size);
  bitmap.close();
  return new Promise((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("Rasm yaratilmadi"))), "image/jpeg", 0.9));
}

export default function ProfilePage() {
  const { user, profile, refresh, signOut } = useAuth();
  const telegram = !!(user.user_metadata as ProfileMeta).telegram_username || user.email?.endsWith("@telegram.campusai.app");

  const [form, setForm] = useState({
    full_name: (user.user_metadata as ProfileMeta & { name?: string }).full_name ?? user.user_metadata?.name ?? "",
    bio: profile.bio,
    university: profile.university,
    faculty: profile.faculty,
    course: profile.course,
    banner: profile.banner,
  });
  const [saving, setSaving] = useState<"" | "profile" | "avatar" | "password">("");
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving("profile");
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ data: { ...form, full_name: form.full_name.trim() } });
    setSaving("");
    if (error) {
      setMsg({ type: "err", text: error.message });
      return;
    }
    await refresh();
    setSaved(true);
    logActivity("profile", "Profil ma'lumotlari yangilandi");
  }

  async function uploadAvatar(file: File) {
    setSaving("avatar");
    setMsg(null);
    try {
      const blob = await squareAvatar(file);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (upErr) throw new Error(upErr.message.includes("Bucket not found") ? "«avatars» storage bucket yaratilmagan (supabase/schema.sql)." : upErr.message);
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
      if (error) throw error;
      await refresh();
      logActivity("profile", "Avatar yangilandi");
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Avatar yuklanmadi." });
    } finally {
      setSaving("");
    }
  }

  async function removeAvatar() {
    setSaving("avatar");
    await supabase.auth.updateUser({ data: { avatar_url: "" } });
    await refresh();
    setSaving("");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.next.length < 8) return setMsg({ type: "err", text: "Parol kamida 8 ta belgidan iborat bo'lsin." });
    if (pw.next !== pw.confirm) return setMsg({ type: "err", text: "Parollar mos kelmadi." });
    setSaving("password");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setSaving("");
    if (error) {
      setMsg({
        type: "err",
        text: error.code === "reauthentication_needed" ? "Xavfsizlik uchun qayta kirib, keyin parolni o'zgartiring." : error.message,
      });
      return;
    }
    setPw({ next: "", confirm: "" });
    setMsg({ type: "ok", text: "Parol muvaffaqiyatli o'zgartirildi." });
    logActivity("profile", "Parol o'zgartirildi");
  }

  const preview = { ...profile, name: form.full_name || profile.name };

  return (
    <PageWrap>
      <ModuleHeader module={modules.profile} />

      {/* Banner va avatar */}
      <section className="glass overflow-hidden rounded-[2rem]">
        <div className="relative h-36 transition-[background] duration-700 sm:h-44" style={{ background: form.banner }}>
          <div className="noise absolute inset-0" />
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="relative -mt-14 w-fit">
            <Avatar profile={preview} className="size-28 text-3xl ring-4 !ring-ink" />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={!!saving}
              aria-label="Avatarni o'zgartirish"
              className="accent-gradient absolute bottom-1 right-1 grid size-9 place-items-center rounded-full shadow-lg ring-4 ring-ink transition hover:scale-110"
            >
              {saving === "avatar" ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-semibold">{preview.name}</p>
            <p className="truncate text-sm text-zinc-400">
              {[form.university, form.course].filter(Boolean).join(" · ") || "O'qish joyini qo'shing"}
            </p>
          </div>
          {profile.avatar && (
            <button onClick={removeAvatar} disabled={!!saving} className="chip self-start sm:self-auto">
              <Trash2 size={14} /> Avatarni o&apos;chirish
            </button>
          )}
        </div>
      </section>

      {msg && (
        <div
          role={msg.type === "err" ? "alert" : "status"}
          className={`animate-bubble-in mt-5 rounded-2xl border p-4 text-sm ${
            msg.type === "err" ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Asosiy ma'lumotlar */}
        <form onSubmit={saveProfile} className="glass space-y-5 rounded-3xl p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Shaxsiy ma&apos;lumotlar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="To'liq ism" id="p-name">
              <input id="p-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Ism Familiya" className="field accent-ring" />
            </Field>
            <Field label="Kurs" id="p-course">
              <select id="p-course" value={form.course} onChange={(e) => set("course", e.target.value)} className="field accent-ring">
                <option value="">Tanlang</option>
                {COURSES.map((c) => (
                  <option key={c} value={c} className="bg-surface">{c}</option>
                ))}
              </select>
            </Field>
            <Field label="O'qish joyi" id="p-uni">
              <input id="p-uni" value={form.university} onChange={(e) => set("university", e.target.value)} placeholder="Masalan: TATU" className="field accent-ring" />
            </Field>
            <Field label="Fakultet / yo'nalish" id="p-fac">
              <input id="p-fac" value={form.faculty} onChange={(e) => set("faculty", e.target.value)} placeholder="Dasturiy injiniring" className="field accent-ring" />
            </Field>
          </div>
          <Field label={`Bio (${form.bio.length}/160)`} id="p-bio">
            <textarea id="p-bio" value={form.bio} maxLength={160} rows={3} onChange={(e) => set("bio", e.target.value)} placeholder="O'zingiz haqingizda qisqacha…" className="field accent-ring resize-none" />
          </Field>
          <div>
            <p className="mb-2 text-sm text-zinc-400">Banner</p>
            <div className="flex flex-wrap gap-2">
              {banners.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => set("banner", b)}
                  aria-label="Banner rangini tanlash"
                  aria-pressed={form.banner === b}
                  className={`grid h-10 w-16 place-items-center rounded-xl transition hover:scale-105 ${form.banner === b ? "ring-2 ring-white" : "ring-1 ring-white/10"}`}
                  style={{ background: b }}
                >
                  {form.banner === b && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!!saving} className="btn-accent">
            {saving === "profile" ? <Loader2 size={17} className="animate-spin" /> : saved ? <Check size={17} /> : <Save size={17} />}
            {saved ? "Saqlandi" : "Saqlash"}
          </button>
        </form>

        <div className="space-y-6">
          {/* Hisob */}
          <section className="glass rounded-3xl p-6">
            <h2 className="text-lg font-semibold">Hisob</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {profile.email && <Row k="Email" v={profile.email} />}
              {profile.phone && <Row k="Telefon" v={profile.phone} />}
              <Row k="Kirish usuli" v={telegram ? "Telegram" : (PROVIDERS[profile.provider] ?? profile.provider)} />
              <Row k="A'zo bo'lgan" v={formatDate(user.created_at)} />
            </dl>
            <button onClick={signOut} className="btn-ghost mt-5 w-full !text-red-300 hover:!border-red-400/30">
              <LogOut size={16} /> Chiqish
            </button>
          </section>

          {/* Parol */}
          <form onSubmit={changePassword} className="glass space-y-4 rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound size={18} /> Parol
            </h2>
            <p className="-mt-2 text-sm text-zinc-500">
              {profile.provider === "email" ? "Yangi parol o'rnating." : "Email/telefon bilan ham kirish uchun parol o'rnatishingiz mumkin."}
            </p>
            <input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="Yangi parol" className="field accent-ring" />
            <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} placeholder="Parolni takrorlang" className="field accent-ring" />
            <button type="submit" disabled={!!saving || !pw.next} className="btn-accent w-full">
              {saving === "password" && <Loader2 size={16} className="animate-spin" />}
              Parolni o&apos;zgartirish
            </button>
          </form>
        </div>
      </div>
    </PageWrap>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{k}</dt>
      <dd className="truncate text-right text-zinc-200">{v}</dd>
    </div>
  );
}
