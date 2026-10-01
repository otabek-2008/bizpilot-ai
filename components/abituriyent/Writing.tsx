"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, PenLine, Shuffle, TrendingUp } from "lucide-react";
import CopyButton from "@/components/ui/CopyButton";
import { Group, Pill } from "@/components/ui/Pills";
import { Spinner } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";
import { aiJson } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";
import { saveExamResult } from "@/lib/exam-db";
import { WRITING_PROMPTS, type WritingReview } from "@/lib/writing";
import type { Exam } from "@/lib/exams";

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** IELTS/CEFR Writing: topshiriq tanlash, insho yozish va AI bahosi. */
export default function Writing({ exam, onError }: { exam: Exam; onError: (message: string) => void }) {
  const { user } = useAuth();
  const tasks = exam.writing!.tasks;
  const [taskId, setTaskId] = useState(tasks[0].id);
  const [prompt, setPrompt] = useState(WRITING_PROMPTS[tasks[0].id]?.[0] ?? "");
  const [essay, setEssay] = useState("");
  const [review, setReview] = useState<WritingReview | null>(null);
  const [loading, setLoading] = useState(false);

  const task = tasks.find((t) => t.id === taskId)!;
  const words = countWords(essay);
  const samples = WRITING_PROMPTS[taskId] ?? [];

  function pickTask(id: string) {
    setTaskId(id);
    setPrompt(WRITING_PROMPTS[id]?.[0] ?? "");
    setReview(null);
  }

  function nextSample() {
    if (!samples.length) return;
    const i = samples.indexOf(prompt);
    setPrompt(samples[(i + 1) % samples.length]);
  }

  async function check() {
    onError("");
    setLoading(true);
    try {
      const r = await aiJson<WritingReview>("/api/ai/writing", { exam: exam.id, task: taskId, prompt: prompt.trim() || undefined, essay });
      setReview(r);
      void saveExamResult(user.id, {
        exam: exam.id,
        subject: `writing-${taskId}`,
        mode: "writing",
        total: 100,
        correct: r.score100,
        points: null,
        max_points: null,
        duration_sec: null,
      });
      logActivity("abituriyent", `${exam.short} Writing (${task.label}): ${r.overall}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {review && <ReviewCard review={review} exam={exam} onClose={() => setReview(null)} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="glass flex flex-col rounded-3xl p-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Inshongiz (ingliz tilida)</span>
            <span className={`tabular-nums ${words >= task.minWords ? "text-emerald-300" : "text-zinc-500"}`}>
              {words} / {task.minWords}+ so&apos;z
            </span>
          </div>
          <textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value.slice(0, 12000))}
            placeholder="Shu yerga yozing yoki joylang…"
            aria-label="Insho"
            spellCheck={false}
            className="field accent-ring min-h-[380px] flex-1 resize-y leading-relaxed"
          />
          <button onClick={() => void check()} disabled={words < 20 || loading} className="btn-accent mt-4 w-full py-3">
            {loading ? <Spinner className="size-4" /> : <PenLine size={17} />}
            {loading ? "AI baholamoqda… (30–60 soniya)" : "Tekshirish va baholash"}
          </button>
        </div>

        <aside className="glass h-fit space-y-5 rounded-3xl p-6">
          <Group label="Topshiriq turi">
            {tasks.map((t) => (
              <Pill key={t.id} active={taskId === t.id} onClick={() => pickTask(t.id)}>
                {t.label}
              </Pill>
            ))}
          </Group>
          <p className="text-xs text-zinc-500">{task.hint}</p>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Topshiriq matni</span>
              {samples.length > 1 && (
                <button onClick={nextSample} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white">
                  <Shuffle size={12} /> Boshqasi
                </button>
              )}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 3000))}
              placeholder="O'z topshirig'ingizni yozing yoki namunadan foydalaning"
              className="field accent-ring min-h-[150px] resize-y text-sm leading-relaxed"
            />
            <p className="mt-1 text-[11px] text-zinc-600">Namunaviy topshiriqlar CampusAI tomonidan tuzilgan, rasmiy imtihon savollari emas.</p>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">Baho: {exam.writing!.scale}. Bu AI bergan taxminiy baho.</p>
        </aside>
      </div>
    </div>
  );
}

function ReviewCard({ review: r, exam, onClose }: { review: WritingReview; exam: Exam; onClose: () => void }) {
  return (
    <div className="glass animate-fade-in relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div aria-hidden className="accent-gradient absolute -right-20 -top-20 size-60 rounded-full opacity-20 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">{exam.short} Writing — taxminiy baho</p>
          <p className="mt-1 text-5xl font-semibold tabular-nums">{r.overall}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {r.score100}/100 · {r.wordCount} so&apos;z
          </p>
        </div>
        <button onClick={onClose} className="chip">
          Yangi insho
        </button>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
        {r.criteria.map((c) => (
          <div key={c.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{c.name}</p>
              <span className="accent-soft rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums">{c.score}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{c.comment}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-2 font-medium text-emerald-300">
            <CheckCircle2 size={17} /> Yaxshi tomonlari
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {r.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 font-medium text-amber-300">
            <TrendingUp size={17} /> Nimani yaxshilash kerak
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {r.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {r.mistakes.length > 0 && (
        <div className="relative mt-6">
          <p className="mb-2 font-medium">Xatolar ({r.mistakes.length})</p>
          <div className="space-y-2">
            {r.mistakes.map((m, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-rose-300 line-through decoration-rose-400/60">{m.original}</span>
                  <ArrowRight size={13} className="text-zinc-500" />
                  <span className="text-emerald-300">{m.fix}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{m.why}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="relative mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <summary className="cursor-pointer font-medium">Yaxshilangan variant</summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{r.improved}</p>
        <div className="mt-3">
          <CopyButton text={r.improved} />
        </div>
      </details>
    </div>
  );
}
