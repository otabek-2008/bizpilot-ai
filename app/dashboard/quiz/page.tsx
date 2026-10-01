"use client";

import { useState } from "react";
import { FileText, ListChecks, Sparkles, Type } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import TestRunner from "@/components/test/TestRunner";
import { FormError } from "@/components/AuthShell";
import { Group, Pill } from "@/components/ui/Pills";
import { Spinner } from "@/components/LoadingScreen";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { DIFFICULTIES, generateQuiz, type Difficulty, type QuizLang, type QuizRequest } from "@/lib/quiz-client";
import type { TestQuestion } from "@/lib/quiz";

const LANGS: { id: QuizLang; label: string }[] = [
  { id: "uz", label: "O'zbekcha" },
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
];
const COUNTS = [5, 10, 15, 20, 30];
const MAX_TEXT = 15000;

type Source = "topic" | "text";

export default function QuizPage() {
  const [source, setSource] = useState<Source>("topic");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("orta");
  const [lang, setLang] = useState<QuizLang>("uz");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [test, setTest] = useState<{ key: string; title: string; questions: TestQuestion[]; req: QuizRequest } | null>(null);

  const ready = source === "topic" ? topic.trim().length > 1 : text.trim().length > 50;

  async function create(req: QuizRequest) {
    setError("");
    setLoading(true);
    try {
      const res = await generateQuiz(req);
      setTest({ key: crypto.randomUUID(), title: res.title, questions: res.questions, req });
      logActivity("quiz", `${res.title} — ${res.questions.length} ta savol`);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setError("Fayl 2 MB dan oshmasin.");
    let content = "";
    if (/\.docx$/i.test(file.name)) {
      const mammoth = await import("mammoth");
      content = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    } else content = await file.text();
    setText(content.slice(0, MAX_TEXT));
  }

  if (test) {
    return (
      <PageWrap>
        <TestRunner
          key={test.key}
          title={test.title}
          questions={test.questions}
          onExit={() => setTest(null)}
          onRestart={() => setTest({ ...test, key: crypto.randomUUID() })}
          restartLabel="Qayta ishlash"
          exitLabel="Yangi test"
          onFinish={(r) => logActivity("quiz", `${test.title}: ${r.correct}/${r.total}`)}
        />
        {loading ? null : (
          <div className="mt-6 flex justify-center">
            <button onClick={() => void create(test.req)} className="chip">
              <Sparkles size={15} /> Shu mavzuda yangi savollar
            </button>
          </div>
        )}
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.quiz} />
      <FormError message={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass rounded-3xl p-6">
          <div className="mb-5 flex gap-1 rounded-xl bg-white/[0.04] p-1" role="tablist">
            {(
              [
                ["topic", "Mavzu bo'yicha", Type],
                ["text", "Matn / konspektdan", FileText],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={source === id}
                onClick={() => setSource(id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  source === id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {source === "topic" ? (
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-400">Mavzu</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 300))}
                placeholder="Masalan: Kvadrat tenglamalar, Amir Temur davlati, Present Perfect"
                className="field accent-ring"
              />
            </label>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Matn (ma&apos;ruza, konspekt, kitob bo&apos;limi)</span>
                <label className="cursor-pointer rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white">
                  .txt / .docx yuklash
                  <input
                    type="file"
                    accept=".txt,.md,.docx,text/plain"
                    hidden
                    onChange={(e) => {
                      void readFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
                placeholder="Matnni shu yerga joylang — AI faqat shu matn bo'yicha savol tuzadi"
                className="field accent-ring min-h-[240px] resize-y leading-relaxed"
              />
              <p className="mt-1 text-right text-xs text-zinc-500 tabular-nums">
                {text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}
              </p>
            </div>
          )}

          <button
            onClick={() =>
              void create({
                ...(source === "topic" ? { topic: topic.trim() } : { text: text.trim() }),
                count,
                difficulty,
                lang,
              })
            }
            disabled={!ready || loading}
            className="btn-accent mt-6 w-full py-3.5"
          >
            {loading ? <Spinner className="size-4" /> : <ListChecks size={18} />}
            {loading ? "AI savollar tuzmoqda…" : `${count} ta savolli test tuzish`}
          </button>
        </div>

        <aside className="glass h-fit space-y-5 rounded-3xl p-6">
          <Group label="Savollar soni">
            {COUNTS.map((n) => (
              <Pill key={n} active={count === n} onClick={() => setCount(n)}>
                {n}
              </Pill>
            ))}
          </Group>
          <Group label="Qiyinlik">
            {DIFFICULTIES.map((d) => (
              <Pill key={d.id} active={difficulty === d.id} onClick={() => setDifficulty(d.id)}>
                {d.label}
              </Pill>
            ))}
          </Group>
          <Group label="Til">
            {LANGS.map((l) => (
              <Pill key={l.id} active={lang === l.id} onClick={() => setLang(l.id)}>
                {l.label}
              </Pill>
            ))}
          </Group>
          <p className="text-xs leading-relaxed text-zinc-500">
            Har javobdan keyin to&apos;g&apos;ri yoki noto&apos;g&apos;ri ekani va izoh ko&apos;rsatiladi. Savollarni AI tuzadi — muhim
            joylarni darslik bilan solishtiring.
          </p>
        </aside>
      </div>
    </PageWrap>
  );
}
