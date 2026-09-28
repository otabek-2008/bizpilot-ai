"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileDown, RotateCcw, ScrollText, Square } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Markdown from "@/components/ui/Markdown";
import CopyButton from "@/components/ui/CopyButton";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";
import { aiStream } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";
import { ESSAY_KINDS, ESSAY_LANGS, KIND_TITLES, type EssayKind, type EssayLang } from "@/lib/essay";
import type { Cover } from "@/lib/markdown-docx";

type Form = { kind: EssayKind; topic: string; subject: string; pages: number; language: EssayLang; notes: string };
type CoverFields = Omit<Cover, "kind" | "topic" | "subject" | "lang">;
type Saved = { form: Form; text: string };

const EMPTY_COVER: CoverFields = { institution: "", author: "", group: "", teacher: "", city: "" };
const COVER_INPUTS: { key: keyof CoverFields; label: string; placeholder: string }[] = [
  { key: "institution", label: "OTM nomi", placeholder: "Toshkent davlat iqtisodiyot universiteti" },
  { key: "author", label: "Talaba (F.I.Sh.)", placeholder: "Aliyev Vali" },
  { key: "group", label: "Guruh", placeholder: "IQ-21" },
  { key: "teacher", label: "O'qituvchi", placeholder: "Karimova N." },
  { key: "city", label: "Shahar", placeholder: "Toshkent" },
];

const coverKey = (uid: string) => `campusai:essay-cover:${uid}`;
const lastKey = (uid: string) => `campusai:essay-last:${uid}`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // saqlab bo'lmasa, faqat joriy seansda qoladi
  }
}

export default function EssayPage() {
  const { user, profile } = useAuth();
  const [last] = useState(() => read<Saved | null>(lastKey(user.id), null));

  const [form, setForm] = useState<Form>(
    last?.form ?? { kind: "referat", topic: "", subject: "", pages: 8, language: "uz", notes: "" },
  );
  const [cover, setCover] = useState<CoverFields>(() => read(coverKey(user.id), { ...EMPTY_COVER, author: profile.name }));
  const [showCover, setShowCover] = useState(false);
  const [text, setText] = useState(last?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => write(coverKey(user.id), cover), [cover, user.id]);
  useEffect(() => () => abort.current?.abort(), []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function generate() {
    setError("");
    setText("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    let full = "";
    try {
      full = await aiStream("/api/ai/essay", form, (t) => {
        full = t;
        setText(t);
      }, controller.signal);
      logActivity("essay", `${ESSAY_KINDS[form.kind]}: ${form.topic.slice(0, 50)}`);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Yozib bo'lmadi.");
    } finally {
      if (full) write(lastKey(user.id), { form, text: full } satisfies Saved);
      setBusy(false);
      abort.current = null;
    }
  }

  async function download() {
    const { markdownToDocx } = await import("@/lib/markdown-docx");
    const blob = await markdownToDocx(text, {
      cover: { ...cover, kind: KIND_TITLES[form.kind][form.language], topic: form.topic, subject: form.subject, lang: form.language },
    });
    const name = form.topic.trim().replace(/[\\/:*?"<>|]+/g, "").slice(0, 60) || "campusai";
    downloadBlob(blob, `${name}.docx`);
    logActivity("essay", `.docx yuklab olindi: ${form.topic.slice(0, 40)}`);
  }

  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;

  return (
    <PageWrap>
      <ModuleHeader module={modules.essay} />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* Sozlamalar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
          className="glass h-fit space-y-5 rounded-3xl p-5 lg:sticky lg:top-6"
        >
          <fieldset>
            <legend className="mb-2 text-sm text-zinc-400">Ish turi</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ESSAY_KINDS) as EssayKind[]).map((k) => (
                <button type="button" key={k} onClick={() => set("kind", k)} data-active={form.kind === k} className="chip !py-1.5 text-sm">
                  {KIND_TITLES[k].uz}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="topic" className="mb-2 block text-sm text-zinc-400">Mavzu</label>
            <textarea
              id="topic"
              rows={2}
              maxLength={300}
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="Masalan: O'zbekistonda raqamli iqtisodiyotning rivojlanishi"
              className="field accent-ring resize-none"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="mb-2 block text-sm text-zinc-400">Fan <span className="text-zinc-600">(ixtiyoriy)</span></label>
            <input id="subject" maxLength={120} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Iqtisodiyot nazariyasi" className="field accent-ring" />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <label htmlFor="pages" className="text-zinc-400">Hajm</label>
              <span className="tabular-nums text-white">{form.pages} sahifa</span>
            </div>
            <input id="pages" type="range" min={1} max={25} value={form.pages} onChange={(e) => set("pages", Number(e.target.value))} className="w-full accent-[var(--accent)]" />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm text-zinc-400">Til</legend>
            <div className="flex gap-2">
              {(Object.keys(ESSAY_LANGS) as EssayLang[]).map((l) => (
                <button type="button" key={l} onClick={() => set("language", l)} data-active={form.language === l} className="chip flex-1 justify-center !py-1.5 text-sm">
                  {ESSAY_LANGS[l]}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="notes" className="mb-2 block text-sm text-zinc-400">Qo&apos;shimcha talablar <span className="text-zinc-600">(ixtiyoriy)</span></label>
            <textarea id="notes" rows={2} maxLength={1500} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Masalan: 3 ta bob, statistik ma'lumotlar bilan" className="field accent-ring resize-none" />
          </div>

          {/* Titul varag'i */}
          <div className="rounded-2xl border border-white/10">
            <button type="button" onClick={() => setShowCover((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm" aria-expanded={showCover}>
              Titul varag&apos;i ma&apos;lumotlari
              <ChevronDown size={16} className={`transition ${showCover ? "rotate-180" : ""}`} />
            </button>
            {showCover && (
              <div className="space-y-3 border-t border-white/10 p-4">
                {COVER_INPUTS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`cover-${f.key}`} className="mb-1 block text-xs text-zinc-500">{f.label}</label>
                    <input id={`cover-${f.key}`} value={cover[f.key]} onChange={(e) => setCover((c) => ({ ...c, [f.key]: e.target.value }))} placeholder={f.placeholder} className="field accent-ring !py-2 text-sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {busy ? (
            <button type="button" onClick={() => abort.current?.abort()} className="chip w-full justify-center py-3">
              <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <button type="submit" disabled={form.topic.trim().length < 3} className="btn-accent w-full py-3">
              <ScrollText size={17} /> {text ? "Qaytadan yozish" : "Yozish"}
            </button>
          )}
        </form>

        {/* Natija */}
        <section className="glass flex min-h-[520px] flex-col overflow-hidden rounded-3xl">
          <header className="flex flex-wrap items-center gap-2 border-b border-white/5 px-5 py-3">
            <span className="mr-auto flex items-center gap-2 text-sm text-zinc-400">
              {busy && <Spinner className="size-4" />}
              {busy ? "Yozilmoqda…" : text ? "Tayyor" : "Natija"}
              {words > 0 && <span className="tabular-nums text-zinc-500">· {words.toLocaleString()} so&apos;z · ~{Math.max(1, Math.round(words / 260))} sahifa</span>}
            </span>
            {text && !busy && (
              <>
                <CopyButton text={text} />
                <button onClick={download} className="btn-accent !px-3.5 !py-2 text-sm">
                  <FileDown size={16} /> .docx
                </button>
                <button onClick={generate} title="Qaytadan yozish" aria-label="Qaytadan yozish" className="chip !px-2.5">
                  <RotateCcw size={15} />
                </button>
              </>
            )}
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            <FormError message={error} />
            {text ? (
              <Markdown text={text} className="text-[15px] text-zinc-200" />
            ) : (
              !busy && (
                <div className="grid h-full place-items-center text-center text-sm text-zinc-600">
                  <p>
                    Mavzuni kiriting va &laquo;Yozish&raquo;ni bosing.
                    <br />
                    Tayyor ish titul varag&apos;i bilan .docx formatida yuklab olinadi
                    <br />
                    (Times New Roman 14, 1.5 interval).
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      </div>

      <p className="mt-4 px-1 text-xs text-zinc-500">
        AI yozgan matnni topshirishdan oldin o&apos;qib chiqing: fakt, raqam va manbalarni tekshiring, o&apos;z fikrlaringizni qo&apos;shing.
      </p>
    </PageWrap>
  );
}
