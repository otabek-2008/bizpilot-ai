"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ExternalLink, FileText, Link2, Sparkles, X } from "lucide-react";
import Markdown from "@/components/ui/Markdown";
import { Spinner } from "@/components/LoadingScreen";
import { aiStream } from "@/lib/ai-client";
import { examFileUrl, type Material } from "@/lib/exam-db";
import type { Exam } from "@/lib/exams";

/** O'quv materiallari (admin yuklagan fayl va havolalar) hamda fan mavzularini AI tushuntirishi. */
export default function Materials({ exam, materials }: { exam: Exam; materials: Material[] | null }) {
  const [subjectId, setSubjectId] = useState(exam.subjects[0].id);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const subject = exam.subjects.find((s) => s.id === subjectId)!;
  const name = (id: string | null) => (id ? (exam.subjects.find((s) => s.id === id)?.name ?? id) : "Umumiy");
  const groups = new Map<string, Material[]>();
  for (const m of materials ?? []) groups.set(name(m.subject), [...(groups.get(name(m.subject)) ?? []), m]);

  async function explain(topic: string) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setOpen(topic);
    setText("");
    setError("");
    setBusy(true);
    requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    const lang = subject.lang === "uz" ? "o'zbek tilida (lotin)" : subject.lang === "ru" ? "rus tilida" : "o'zbek tilida, inglizcha atama va misollar bilan";
    const prompt = `${exam.name} imtihoniga tayyorlanayotgan abituriyent uchun "${subject.name}" fanidan "${topic}" mavzusini ${lang} tushuntirib ber: asosiy tushunchalar va qoidalar, formulalar (agar bo'lsa), 2–3 ta yechilgan misol, imtihonda ko'p uchraydigan xatolar va eslab qolish uchun qisqa xulosa. Formulalarni LaTeX'siz yoz.`;
    try {
      await aiStream("/api/ai/chat", { messages: [{ role: "user", content: prompt }] }, setText, controller.signal);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <FileText size={18} className="text-[var(--accent)]" /> Qo&apos;llanma va materiallar
        </h3>
        {materials === null ? (
          <Spinner className="size-5" />
        ) : groups.size === 0 ? (
          <p className="glass rounded-2xl p-6 text-sm text-zinc-500">
            Hozircha material yuklanmagan. Quyidagi mavzular bo&apos;yicha AI tushuntirishidan foydalaning yoki rasmiy saytga qarang:{" "}
            <a href={exam.officialUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">
              {exam.officialName}
            </a>
            .
          </p>
        ) : (
          <div className="space-y-5">
            {[...groups].map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 text-sm text-zinc-400">{group}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((m) => (
                    <a
                      key={m.id}
                      href={m.kind === "file" ? examFileUrl(m.url) : m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="glass glass-hover flex items-start gap-3 rounded-2xl p-4"
                    >
                      <span className="accent-soft grid size-9 shrink-0 place-items-center rounded-xl">
                        {m.kind === "file" ? <FileText size={16} /> : <Link2 size={16} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.title}</span>
                        {m.description && <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500">{m.description}</span>}
                      </span>
                      <ExternalLink size={14} className="mt-1 shrink-0 text-zinc-500" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <BookOpen size={18} className="text-[var(--accent)]" /> Mavzular — AI tushuntiradi
        </h3>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {exam.subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${subjectId === s.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {subject.topics.map((t) => (
            <button
              key={t}
              onClick={() => void explain(t)}
              className={`glass glass-hover flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm ${open === t ? "ring-1 ring-[color:var(--accent)]" : ""}`}
            >
              <span className="min-w-0 truncate">{t}</span>
              <Sparkles size={14} className="shrink-0 text-[var(--accent)]" />
            </button>
          ))}
        </div>

        {open && (
          <div ref={panel} className="glass animate-fade-in relative mt-5 scroll-mt-6 rounded-3xl p-6">
            <button
              onClick={() => {
                abort.current?.abort();
                setOpen(null);
                setBusy(false);
              }}
              className="absolute right-4 top-4 text-zinc-500 transition hover:text-white"
              title="Yopish"
            >
              <X size={18} />
            </button>
            <p className="mb-3 pr-8 text-lg font-semibold">
              {subject.name}: {open}
            </p>
            {error ? <p className="text-sm text-rose-300">{error}</p> : text ? <Markdown text={text} className="text-zinc-200" /> : null}
            {busy && <Spinner className="mt-3 size-4" />}
          </div>
        )}
      </section>
    </div>
  );
}
