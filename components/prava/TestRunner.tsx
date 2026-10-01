"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Flag, RotateCw, Timer, XCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { logActivity } from "@/lib/activity";
import { imageUrl, recordAnswer, saveResult } from "@/lib/prava-db";
import { examPassed, maxMistakes, score, type Answers, type ExamFormat, type PravaMode, type PravaQuestion } from "@/lib/prava";

const LETTERS = "ABCDEF";

export type TestSession = {
  /** Har yangi urinish uchun yangi kalit — komponent holati noldan boshlanadi. */
  key: string;
  mode: PravaMode;
  title: string;
  questions: PravaQuestion[];
  ticket?: number | null;
  topic?: string | null;
  /** Faqat imtihon rejimida. */
  exam?: ExamFormat;
};

function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function TestRunner({
  session,
  tr,
  onExit,
  onRestart,
}: {
  session: TestSession;
  /** Lotin/kirill o'girgich. */
  tr: (s: string) => string;
  onExit: () => void;
  onRestart: () => void;
}) {
  const { user } = useAuth();
  const { questions, mode } = session;
  const exam = mode === "exam" ? session.exam : undefined;
  const isExam = exam != null;
  const limitSec = exam ? exam.minutes * 60 : null;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const saved = useRef(false);

  const s = useMemo(() => score(questions, answers), [questions, answers]);
  const elapsed = ((finishedAt ?? now) - startedAt) / 1000;
  const left = limitSec != null ? limitSec - elapsed : null;
  const q = questions[index];
  const chosen = answers[q.id];
  const answered = chosen != null;
  const finished = finishedAt != null;

  const finish = useCallback(() => setFinishedAt((f) => f ?? Date.now()), []);

  // Taymer (imtihon uchun teskari sanoq, mashq uchun sarflangan vaqt). Vaqt tugasa — test yakunlanadi.
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (limitSec != null && n - startedAt >= limitSec * 1000) setFinishedAt((f) => f ?? startedAt + limitSec * 1000);
    }, 1000);
    return () => clearInterval(t);
  }, [finished, limitSec, startedAt]);

  // Natijani bir marta saqlaymiz
  useEffect(() => {
    if (!finished || saved.current) return;
    saved.current = true;
    const passed = exam ? examPassed(questions, answers, exam) : null;
    void saveResult(user.id, {
      mode,
      ticket: session.ticket ?? null,
      topic: session.topic ?? null,
      total: questions.length,
      correct: s.correct,
      passed,
      duration_sec: Math.round(elapsed),
    });
    logActivity(
      "prava",
      `${session.title}: ${s.correct}/${questions.length}${passed == null ? "" : passed ? " — o'tdi" : " — o'tmadi"}`,
    );
  }, [finished, exam, questions, answers, user.id, mode, session, s.correct, elapsed]);

  const choose = useCallback(
    (option: number) => {
      if (finished || answers[q.id] != null || option >= q.options.length) return;
      const next = { ...answers, [q.id]: option };
      setAnswers(next);
      recordAnswer(user.id, q.id, option === q.correct);
      const sc = score(questions, next);
      // Imtihonda norma bajarib bo'lmaydigan bo'lsa (xatolar chegaradan oshsa) — imtihon shu zahoti tugaydi
      if (exam && sc.wrong > maxMistakes(exam)) finish();
      else if (exam && sc.answered === questions.length) finish();
    },
    [finished, answers, q, user.id, questions, exam, finish],
  );

  const go = useCallback((i: number) => setIndex(Math.min(questions.length - 1, Math.max(0, i))), [questions.length]);

  /** Keyingi javobsiz savolga (oxiriga yetsa — boshidan qidiradi). */
  const nextUnanswered = useCallback(() => {
    for (let k = 1; k <= questions.length; k++) {
      const i = (index + k) % questions.length;
      if (answers[questions[i].id] == null) return go(i);
    }
    go(index + 1);
  }, [questions, answers, index, go]);

  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 6) choose(n - 1);
      else if (e.key === "ArrowRight" || e.key === "Enter") nextUnanswered();
      else if (e.key === "ArrowLeft") go(index - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, choose, nextUnanswered, go, index]);

  if (finished) {
    return (
      <Result
        session={session}
        answers={answers}
        elapsed={elapsed}
        timedOut={left != null && left <= 0}
        tr={tr}
        onExit={onExit}
        onRestart={onRestart}
      />
    );
  }

  const allAnswered = s.answered === questions.length;

  return (
    <div className="animate-fade-in">
      {/* Yuqori panel */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={onExit} className="chip">
          <ArrowLeft size={15} /> Chiqish
        </button>
        <h2 className="mr-auto truncate text-lg font-semibold">{session.title}</h2>
        <span className="flex items-center gap-1.5 text-sm text-emerald-300 tabular-nums">
          <CheckCircle2 size={16} /> {s.correct}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-rose-300 tabular-nums">
          <XCircle size={16} /> {s.wrong}
          {exam && <span className="text-zinc-500">/{maxMistakes(exam)}</span>}
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm tabular-nums ${
            left != null && left < 120 ? "bg-rose-500/15 text-rose-200" : "bg-white/5 text-zinc-300"
          }`}
          title={isExam ? "Qolgan vaqt" : "Sarflangan vaqt"}
        >
          {isExam ? <Timer size={15} /> : <Clock size={15} />}
          {clock(left ?? elapsed)}
        </span>
        <button
          onClick={() => {
            if (allAnswered || confirm("Hamma savolga javob berilmagan. Testni yakunlaysizmi?")) finish();
          }}
          className="chip"
          data-active={allAnswered}
        >
          <Flag size={15} /> Yakunlash
        </button>
      </div>

      {/* Savol raqamlari */}
      <nav aria-label="Savollar" className="mb-5 flex flex-wrap gap-1.5">
        {questions.map((x, i) => {
          const a = answers[x.id];
          const state = a == null ? "" : a === x.correct ? "bg-emerald-500/25 text-emerald-100" : "bg-rose-500/25 text-rose-100";
          return (
            <button
              key={x.id}
              onClick={() => go(i)}
              aria-current={i === index ? "step" : undefined}
              className={`grid size-9 place-items-center rounded-lg text-sm tabular-nums transition ${
                state || "bg-white/[0.04] text-zinc-400 hover:bg-white/10 hover:text-white"
              } ${i === index ? "ring-2 ring-[var(--accent)]" : ""}`}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>

      {/* Savol */}
      <article key={q.id} className="glass animate-fade-in rounded-3xl p-5 sm:p-7">
        <p className="text-xs text-zinc-500">
          Savol {index + 1} / {questions.length}
          {q.ticket != null && ` · ${q.ticket}-bilet`}
          {q.topic && ` · ${tr(q.topic)}`}
        </p>

        {q.image && (
          // Savol rasmlari Supabase Storage'dan keladi; o'lchami oldindan noma'lum
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(q.image)}
            alt=""
            className="mx-auto mt-4 max-h-[340px] w-auto rounded-2xl border border-white/10 bg-black/30 object-contain"
          />
        )}

        <h3 className="mt-4 whitespace-pre-wrap text-lg font-medium leading-relaxed sm:text-xl">{tr(q.question)}</h3>

        <ol className="mt-5 space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isChosen = i === chosen;
            const tone = !answered
              ? "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
              : isCorrect
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-50"
                : isChosen
                  ? "border-rose-400/50 bg-rose-500/15 text-rose-50"
                  : "border-white/5 bg-white/[0.02] text-zinc-500";
            return (
              <li key={i}>
                <button
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${tone}`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-sm font-semibold">
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap pt-0.5">{tr(opt)}</span>
                  {answered && isCorrect && <CheckCircle2 size={20} className="shrink-0 text-emerald-300" />}
                  {answered && isChosen && !isCorrect && <XCircle size={20} className="shrink-0 text-rose-300" />}
                </button>
              </li>
            );
          })}
        </ol>

        {answered && q.explanation && (
          <div className="animate-fade-in mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
            <p className="mb-1 font-medium">Izoh</p>
            <p className="whitespace-pre-wrap">{tr(q.explanation)}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="chip disabled:opacity-40">
            <ArrowLeft size={15} /> Oldingi
          </button>
          <span className="hidden text-xs text-zinc-600 sm:block">Klaviatura: 1–{q.options.length} javob, ← → savollar</span>
          {allAnswered ? (
            <button onClick={finish} className="btn-accent">
              Natijani ko&apos;rish <Flag size={16} />
            </button>
          ) : (
            <button onClick={nextUnanswered} className={answered ? "btn-accent" : "chip"}>
              Keyingi <ArrowRight size={15} />
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

function Result({
  session,
  answers,
  elapsed,
  timedOut,
  tr,
  onExit,
  onRestart,
}: {
  session: TestSession;
  answers: Answers;
  elapsed: number;
  timedOut: boolean;
  tr: (s: string) => string;
  onExit: () => void;
  onRestart: () => void;
}) {
  const { questions, mode } = session;
  const s = score(questions, answers);
  const exam = mode === "exam" ? session.exam : undefined;
  const isExam = exam != null;
  const passed = exam ? examPassed(questions, answers, exam) : s.correct === s.total;
  const wrong = questions.filter((q) => answers[q.id] != null && answers[q.id] !== q.correct);
  const percent = Math.round((s.correct / s.total) * 100);

  let note = "";
  if (exam) {
    if (passed) note = "Tabriklaymiz! Imtihondan o'tdingiz.";
    else if (s.wrong > maxMistakes(exam)) note = `Imtihondan o'tmadingiz: ${maxMistakes(exam)} tadan ko'p xato.`;
    else if (timedOut) note = "Imtihondan o'tmadingiz: vaqt tugadi.";
    else note = "Imtihondan o'tmadingiz: hamma savolga javob berilmadi.";
  } else {
    note = passed ? "Hammasi to'g'ri — zo'r!" : s.answered < s.total ? `${s.total - s.answered} ta savolga javob berilmadi.` : "Xatolar ustida ishlang.";
  }

  return (
    <div className="animate-fade-in">
      <div className="glass relative overflow-hidden rounded-3xl p-6 text-center sm:p-10">
        <div
          aria-hidden
          className={`absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl ${passed ? "bg-emerald-500" : "bg-rose-500"}`}
        />
        <p className="relative text-sm text-zinc-400">{session.title}</p>
        <p className="relative mt-3 text-6xl font-semibold tabular-nums">
          {s.correct}
          <span className="text-3xl text-zinc-500">/{s.total}</span>
        </p>
        <p className={`relative mt-3 text-lg font-medium ${passed ? "text-emerald-300" : "text-rose-300"}`}>{note}</p>
        {exam && (
          <p className="relative mt-1 text-sm text-zinc-400">
            Norma: {exam.size} tadan kamida {exam.minCorrect} ta to&apos;g&apos;ri javob
          </p>
        )}
        <p className="relative mt-2 text-sm text-zinc-500">
          {percent}% to&apos;g&apos;ri · {s.wrong} ta xato · vaqt: {clock(elapsed)}
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={onRestart} className="btn-accent">
            <RotateCw size={16} /> {isExam ? "Yangi imtihon" : "Qayta ishlash"}
          </button>
          <button onClick={onExit} className="chip">
            <ArrowLeft size={15} /> Prava bo&apos;limiga
          </button>
        </div>
      </div>

      {wrong.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 font-semibold">Xato javoblar ({wrong.length})</h3>
          <div className="space-y-3">
            {wrong.map((q) => (
              <div key={q.id} className="glass rounded-2xl p-5 text-sm">
                <p className="text-xs text-zinc-500">
                  {questions.indexOf(q) + 1}-savol{q.ticket != null && ` · ${q.ticket}-bilet`}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap font-medium">{tr(q.question)}</p>
                <p className="mt-2 text-rose-300">
                  <XCircle size={14} className="mr-1.5 inline" />
                  {tr(q.options[answers[q.id]])}
                </p>
                <p className="mt-1 text-emerald-300">
                  <CheckCircle2 size={14} className="mr-1.5 inline" />
                  {tr(q.options[q.correct])}
                </p>
                {q.explanation && <p className="mt-2 whitespace-pre-wrap text-zinc-400">{tr(q.explanation)}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
