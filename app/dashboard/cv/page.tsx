"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, FileDown, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CvPreview, { CV_LABELS, type CvLang } from "@/components/cv/CvPreview";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";
import { aiStream } from "@/lib/ai-client";
import { A4_PX, CV_COLORS, CV_TEMPLATES, cvToPdf, emptyCv, newEntry, readPhoto, type CvData, type CvEntry, type CvTemplate } from "@/lib/cv";

type Saved = { data: CvData; template: CvTemplate; color: string; lang: CvLang };
const storeKey = (uid: string) => `campusai:cv:${uid}`;

const LANGS: { id: CvLang; label: string }[] = [
  { id: "uz", label: "O'zbekcha" },
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
];

const LANG_NAME: Record<CvLang, string> = { uz: "o'zbek tilida (lotin)", ru: "rus tilida", en: "ingliz tilida" };

function load(uid: string, name: string, email: string): Saved {
  const fallback: Saved = { data: emptyCv(name, email), template: "modern", color: CV_COLORS[0], lang: "uz" };
  try {
    const raw = localStorage.getItem(storeKey(uid));
    return raw ? { ...fallback, ...(JSON.parse(raw) as Saved) } : fallback;
  } catch {
    return fallback;
  }
}

export default function CvPage() {
  const { user, profile } = useAuth();
  const [initial] = useState(() => load(user.id, profile.name, user.email ?? ""));
  const [data, setData] = useState<CvData>(initial.data);
  const [template, setTemplate] = useState<CvTemplate>(initial.template);
  const [color, setColor] = useState(initial.color);
  const [lang, setLang] = useState<CvLang>(initial.lang);
  const [exporting, setExporting] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");

  const frame = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(A4_PX.h);
  const previewRef = useRef<HTMLDivElement>(null);

  // Ma'lumotlar brauzerda saqlanadi (rasm ham, kichraytirilgan holda)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storeKey(user.id), JSON.stringify({ data, template, color, lang } satisfies Saved));
      } catch {
        // joy yetmasa — joriy seansda ishlashda davom etadi
      }
    }, 400);
    return () => clearTimeout(t);
  }, [data, template, color, lang, user.id]);

  // Ko'rinishni konteyner kengligiga moslash
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / A4_PX.w)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const set = <K extends keyof CvData>(key: K, value: CvData[K]) => setData((d) => ({ ...d, [key]: value }));

  function setEntry(list: "experience" | "education", id: string, patch: Partial<CvEntry>) {
    setData((d) => ({ ...d, [list]: d[list].map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    try {
      set("photo", await readPhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rasm yuklanmadi.");
    }
  }

  async function exportPdf() {
    setError("");
    setExporting(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await document.fonts.ready;
      const blob = await cvToPdf(exportRef.current!);
      downloadBlob(blob, `${(data.name || "CV").replace(/[\\/:*?"<>|]+/g, "").trim()} - CV.pdf`);
      logActivity("cv", `PDF yuklab olindi (${CV_TEMPLATES.find((t) => t.id === template)!.name})`);
    } catch (e) {
      console.error(e);
      setError("PDF yaratib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setExporting(false);
    }
  }

  async function writeSummary() {
    setError("");
    setWriting(true);
    const facts = [
      data.role && `Lavozim/maqsad: ${data.role}`,
      ...data.experience.filter((e) => e.title).map((e) => `Tajriba: ${e.title}, ${e.place} (${e.period}) ${e.details}`),
      ...data.education.filter((e) => e.title).map((e) => `Ta'lim: ${e.title}, ${e.place} (${e.period})`),
      data.skills && `Ko'nikmalar: ${data.skills}`,
      data.languages && `Tillar: ${data.languages}`,
      data.summary && `Hozirgi matn: ${data.summary}`,
    ].filter(Boolean);
    const prompt = `Rezyume uchun "${CV_LABELS[lang].summary}" bo'limini ${LANG_NAME[lang]} yoz: 3-4 gap, birinchi shaxsda, aniq va professional, shablon iboralarsiz. Faqat quyidagi faktlarga tayan, yangi fakt qo'shma. Javobda faqat matnning o'zi bo'lsin — sarlavha, qo'shtirnoq va izohsiz.\n\n${facts.join("\n") || "Ma'lumot kam — umumiy, lekin samimiy talaba rezyumesi uchun yoz."}`;
    try {
      await aiStream("/api/ai/chat", { messages: [{ role: "user", content: prompt }] }, (t) => set("summary", t.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI matn yoza olmadi.");
    } finally {
      setWriting(false);
    }
  }

  function reset() {
    if (!confirm("Barcha ma'lumotlar o'chiriladi. Davom etasizmi?")) return;
    setData(emptyCv(profile.name, user.email ?? ""));
  }

  const preview = <CvPreview data={data} template={template} color={color} lang={lang} />;

  return (
    <PageWrap>
      <ModuleHeader module={modules.cv}>
        <div className="flex gap-2">
          <button onClick={reset} className="chip" title="Tozalash"><RotateCcw size={15} /> Tozalash</button>
          <button onClick={exportPdf} disabled={exporting} className="btn-accent !px-4 !py-2.5">
            {exporting ? <Spinner className="size-4" /> : <FileDown size={17} />} PDF yuklab olish
          </button>
        </div>
      </ModuleHeader>
      <FormError message={error} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Forma */}
        <div className="space-y-4">
          <Card title="Ko'rinish">
            <div className="flex flex-wrap gap-2">
              {CV_TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTemplate(t.id)} data-active={template === t.id} className="chip !py-1.5 text-sm">{t.name}</button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {CV_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Rang ${c}`}
                  className={`size-7 rounded-full ring-offset-2 ring-offset-transparent transition ${color === c ? "ring-2 ring-white" : "hover:scale-110"}`}
                  style={{ background: c }}
                />
              ))}
              <span className="mx-2 h-6 w-px bg-white/10" />
              {LANGS.map((l) => (
                <button key={l.id} onClick={() => setLang(l.id)} data-active={lang === l.id} className="chip !px-2.5 !py-1 text-xs">{l.label}</button>
              ))}
            </div>
          </Card>

          <Card title="Shaxsiy ma'lumotlar">
            <div className="flex gap-4">
              <label className="group relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-zinc-500 hover:border-white/30">
                {data.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.photo} alt="Rasm" className="size-full object-cover" />
                ) : (
                  <Camera size={20} />
                )}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              <div className="grid flex-1 gap-3">
                <Field label="Ism familiya" value={data.name} onChange={(v) => set("name", v)} placeholder="Aliyev Vali" />
                <Field label="Lavozim / yo'nalish" value={data.role} onChange={(v) => set("role", v)} placeholder="Frontend dasturchi" />
              </div>
            </div>
            {data.photo && (
              <button onClick={() => set("photo", "")} className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-white"><X size={12} /> Rasmni olib tashlash</button>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Email" value={data.email} onChange={(v) => set("email", v)} placeholder="siz@example.com" />
              <Field label="Telefon" value={data.phone} onChange={(v) => set("phone", v)} placeholder="+998 90 123 45 67" />
              <Field label="Shahar" value={data.city} onChange={(v) => set("city", v)} placeholder="Toshkent" />
              <Field label="Havolalar (vergul bilan)" value={data.links} onChange={(v) => set("links", v)} placeholder="github.com/vali, t.me/vali" />
            </div>
          </Card>

          <Card
            title={CV_LABELS.uz.summary}
            action={
              <button onClick={writeSummary} disabled={writing} className="chip !py-1 text-xs">
                {writing ? <Spinner className="size-3.5" /> : <Sparkles size={13} />} AI bilan yozish
              </button>
            }
          >
            <textarea value={data.summary} onChange={(e) => set("summary", e.target.value)} rows={4} placeholder="O'zingiz, maqsadlaringiz va kuchli tomonlaringiz haqida 3-4 gap" className="field accent-ring resize-y text-sm" />
          </Card>

          <EntryList title="Ish tajribasi" list={data.experience} titleLabel="Lavozim" placeLabel="Kompaniya"
            onChange={(id, p) => setEntry("experience", id, p)}
            onAdd={() => set("experience", [...data.experience, newEntry()])}
            onRemove={(id) => set("experience", data.experience.filter((e) => e.id !== id))} />

          <EntryList title="Ta'lim" list={data.education} titleLabel="Yo'nalish / daraja" placeLabel="O'quv muassasasi"
            onChange={(id, p) => setEntry("education", id, p)}
            onAdd={() => set("education", [...data.education, newEntry()])}
            onRemove={(id) => set("education", data.education.filter((e) => e.id !== id))} />

          <Card title="Ko'nikmalar va tillar">
            <div className="grid gap-3">
              <Field label="Ko'nikmalar (vergul bilan)" value={data.skills} onChange={(v) => set("skills", v)} placeholder="JavaScript, React, Figma, MS Excel" />
              <Field label="Tillar (vergul bilan)" value={data.languages} onChange={(v) => set("languages", v)} placeholder="O'zbek — ona tili, Ingliz — B2, Rus — C1" />
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Qo&apos;shimcha (sertifikatlar, yutuqlar)</label>
                <textarea value={data.extra} onChange={(e) => set("extra", e.target.value)} rows={3} placeholder="IELTS 7.0, Olimpiada g'olibi…" className="field accent-ring resize-y text-sm" />
              </div>
            </div>
          </Card>
        </div>

        {/* Ko'rinish */}
        <div className="xl:sticky xl:top-6 xl:h-fit">
          <div ref={frame} className="overflow-hidden rounded-2xl shadow-2xl shadow-black/40" style={{ height: height * scale }}>
            <div style={{ width: A4_PX.w, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <div ref={previewRef}>{preview}</div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-500">
            {height > A4_PX.h + 4 ? `${Math.ceil(height / A4_PX.h)} sahifa — ixchamroq qilsangiz, 1 sahifaga sig'adi` : "A4 · 1 sahifa"} · ma&apos;lumotlar faqat brauzeringizda saqlanadi
          </p>
        </div>
      </div>

      {/* PDF uchun masshtabsiz nusxa — ekrandan tashqarida */}
      {exporting && (
        <div aria-hidden style={{ position: "fixed", left: -10000, top: 0 }}>
          <CvPreview ref={exportRef} data={data} template={template} color={color} lang={lang} />
        </div>
      )}
    </PageWrap>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field accent-ring !py-2 text-sm" />
    </label>
  );
}

function EntryList({
  title,
  list,
  titleLabel,
  placeLabel,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  list: CvEntry[];
  titleLabel: string;
  placeLabel: string;
  onChange: (id: string, patch: Partial<CvEntry>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card title={title} action={<button onClick={onAdd} className="chip !py-1 text-xs"><Plus size={13} /> Qo&apos;shish</button>}>
      <div className="space-y-4">
        {list.map((e) => (
          <div key={e.id} className="relative rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <button onClick={() => onRemove(e.id)} aria-label="O'chirish" className="absolute right-2 top-2 rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-rose-300">
              <Trash2 size={14} />
            </button>
            <div className="grid gap-3 pr-8 sm:grid-cols-2">
              <Field label={titleLabel} value={e.title} onChange={(v) => onChange(e.id, { title: v })} />
              <Field label={placeLabel} value={e.place} onChange={(v) => onChange(e.id, { place: v })} />
              <Field label="Davr" value={e.period} onChange={(v) => onChange(e.id, { period: v })} placeholder="2022 — hozir" />
            </div>
            <textarea value={e.details} onChange={(ev) => onChange(e.id, { details: ev.target.value })} rows={2} placeholder="Qisqacha: vazifalar va natijalar" className="field accent-ring mt-3 resize-y text-sm" />
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-zinc-600">Hali qo&apos;shilmagan</p>}
      </div>
    </Card>
  );
}
