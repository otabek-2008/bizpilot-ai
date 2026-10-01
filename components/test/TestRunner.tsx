"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Flag, RotateCw, Timer, XCircle } from "lucide-react";
import { passed as rulePassed, score, scoreBySection, type Answers, type PassRule, type TestQuestion } from "@/lib/quiz";

// Umumiy test oynasi: har javobdan keyin darhol "to'g'ri / noto'g'ri" va izoh, oxirida natija va xatolar tahlili.

const LETTERS = "ABCDEF";
const keyOf = (q: TestQuestion) => String(q.id);
const same = (s: string) => s;

export type TestSummary = {
  correct: number;
  total: number;
  points: number;
  maxPoints: number;
  /** Qoida berilmagan bo'lsa null. */
  passed: boolean | null;
  durationSec: number;
};

export type TestRunnerProps = {
  title: string;
  questions: TestQuestion[];
  /** Matn o'girgich (masalan lotin → kirill). */
  tr?: (s: string) => string;
  /** Berilsa — teskari sanoq, tugasa test yakunlanadi. */
  timeLimitSec?: number | null;
  /** Imtihon qoidasi: berilsa natijada "o'tdingiz / o'tmadingiz" chiqadi. */
  rule?: PassRule | null;
  /** Ball ko'rsatilsinmi (DTM kabi vaznli testlar). */
  showPoints?: boolean;
  imageSrc?: (path: string) => string;
  onAnswer?: (q: TestQuestion, right: boolean) => void;
  onFinish?: (summary: TestSummary) => void;
  onExit: () => void;
  onRestart?: () => void;
  exitLabel?: string;
  restartLabel?: string;
};

function clock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export default function TestRunner(props: TestRunnerProps) {
  const { title, questions, timeLimitSec = null, rule = null, onAnswer, onFinish, onExit } = props;
  const tr = props.tr ?? same;
  const imageSrc = props.imageSrc ?? same;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const reported = useRef(false);

  const s = useMemo(() => score(questions, answers), [questions, answers]);
  const elapsed = ((finishedAt ?? now) - startedAt) / 1000;
  const left = timeLimitSec != null ? timeLimitSec - elapsed : null;
  const q = questions[index];
  const chosen = answers[keyOf(q)];
  const answered = chosen != null;
  const finished = finishedAt != null;

  const finish = useCallback(() => setFinishedAt((f) => f ?? Date.now()), []);

  // Taymer: imtihonda teskari sanoq, mashqda sarflangan vaqt. Vaqt tugasa — test yakunlanadi.
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (timeLimitSec != null && n - startedAt >= timeLimitSec * 1000) setFinishedAt((f) => f ?? startedAt + timeLimitSec * 1000);
    }, 1000);
    return () => clearInterval(t);
  }, [finished, timeLimitSec, startedAt]);

  // Natija bir marta xabar qilinadi
  useEffect(() => {
    if (!finished || reported.current) return;
    reported.current = true;
    onFinish?.({
      correct: s.correct,
      total: s.total,
      points: s.points,
      maxPoints: s.maxPoints,
      passed: rule ? rulePassed(questions, answers, rule) : null,
      durationSec: Math.round(elapsed),
    });
  }, [finished, onFinish, s, rule, questions, answers, elapsed]);

  const choose = useCallback(
    (option: number) => {
      if (finished || answers[keyOf(q)] != null || option >= q.options.length) return;
      const next = { ...answers, [keyOf(q)]: option };
      setAnswers(next);
      onAnswer?.(q, option === q.correct);
      const sc = score(questions, next);
      // Normani bajarib bo'lmaydigan bo'lsa (xatolar chegaradan oshsa) — imtihon shu zahoti tugaydi
      if (rule && sc.wrong > rule.maxMistakes) finish();
      else if (rule && sc.answered === questions.length) finish();
    },
    [finished, answers, q, onAnswer, questions, rule, finish],
  );

  const go = useCallback((i: number) => setIndex(Math.min(questions.length - 1, Math.max(0, i))), [questions.length]);

  /** Keyingi javobsiz savolga (oxiriga yetsa — boshidan qidiradi). */
  const nextUnanswered = useCallback(() => {
    for (let k = 1; k <= questions.length; k++) {
      const i = (index + k) % questions.length;
      if (answers[keyOf(questions[i])] == null) return go(i);
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
    return <Result {...props} tr={tr} imageSrc={imageSrc} answers={answers} elapsed={elapsed} timedOut={left != null && left <= 0} />;
  }

  const allAnswered = s.answered === questions.length;
  const right = answered && chosen === q.correct;

  return (
    <div className="animate-fade-in">
      {/* Yuqori panel */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={onExit} className="chip">
          <ArrowLeft size={15} /> Chiqish
        </button>
        <h2 className="mr-auto truncate text-lg font-semibold">{title}</h2>
        <span className="flex items-center gap-1.5 text-sm text-emerald-300 tabular-nums">
          <CheckCircle2 size={16} /> {s.correct}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-rose-300 tabular-nums">
          <XCircle size={16} /> {s.wrong}
          {rule && <span className="text-zinc-500">/{rule.maxMistakes}</span>}
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm tabular-nums ${
            left != null && left < 120 ? "bg-rose-500/15 text-rose-200" : "bg-white/5 text-zinc-300"
          }`}
          title={left != null ? "Qolgan vaqt" : "Sarflangan vaqt"}
        >
          {left != null ? <Timer size={15} /> : <Clock size={15} />}
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
          const a = answers[keyOf(x)];
          const state = a == null ? "" : a === x.correct ? "bg-emerald-500/25 text-emerald-100" : "bg-rose-500/25 text-rose-100";
          return (
            <button
              key={keyOf(x)}
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
      <article key={keyOf(q)} className="glass animate-fade-in rounded-3xl p-5 sm:p-7">
        <p className="text-xs text-zinc-500">
          Savol {index + 1} / {questions.length}
          {q.meta && ` · ${tr(q.meta)}`}
        </p>

        {q.passage && (
          <details open className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
            <summary className="cursor-pointer text-zinc-400">Matn (passage)</summary>
            <p className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap leading-relaxed text-zinc-200">{tr(q.passage)}</p>
          </details>
        )}

        {q.image && (
          // Rasm Supabase Storage'dan yoki tashqi manbadan keladi; o'lchami oldindan noma'lum
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc(q.image)}
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

        {answered && (
          <p
            role="status"
            className={`animate-fade-in mt-4 flex items-center gap-2 text-sm font-medium ${right ? "text-emerald-300" : "text-rose-300"}`}
          >
            {right ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {right ? "To'g'ri!" : `Noto'g'ri. To'g'ri javob: ${LETTERS[q.correct]}`}
          </p>
        )}

        {answered && q.explanation && (
          <div className="animate-fade-in mt-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">
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
  title,
  questions,
  rule = null,
  showPoints,
  tr,
  answers,
  elapsed,
  timedOut,
  onExit,
  onRestart,
  exitLabel = "Orqaga",
  restartLabel,
}: TestRunnerProps & { tr: (s: string) => string; answers: Answers; elapsed: number; timedOut: boolean }) {
  const s = score(questions, answers);
  const sections = scoreBySection(questions, answers);
  const ok = rule ? rulePassed(questions, answers, rule) : s.correct === s.total;
  const wrong = questions.filter((q) => answers[keyOf(q)] != null && answers[keyOf(q)] !== q.correct);
  const percent = Math.round((s.correct / s.total) * 100);

  let note: string;
  if (rule) {
    if (ok) note = "Tabriklaymiz! Imtihondan o'tdingiz.";
    else if (s.wrong > rule.maxMistakes) note = `Imtihondan o'tmadingiz: ${rule.maxMistakes} tadan ko'p xato.`;
    else if (timedOut) note = "Imtihondan o'tmadingiz: vaqt tugadi.";
    else note = "Imtihondan o'tmadingiz: hamma savolga javob berilmadi.";
  } else if (ok) note = "Hammasi to'g'ri — zo'r!";
  else if (timedOut) note = "Vaqt tugadi.";
  else note = s.answered < s.total ? `${s.total - s.answered} ta savolga javob berilmadi.` : "Xatolar ustida ishlang.";

  return (
    <div className="animate-fade-in">
      <div className="glass relative overflow-hidden rounded-3xl p-6 text-center sm:p-10">
        <div
          aria-hidden
          className={`absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-25 blur-3xl ${ok ? "bg-emerald-500" : "bg-rose-500"}`}
        />
        <p className="relative text-sm text-zinc-400">{title}</p>
        <p className="relative mt-3 text-6xl font-semibold tabular-nums">
          {s.correct}
          <span className="text-3xl text-zinc-500">/{s.total}</span>
        </p>
        {showPoints && (
          <p className="relative mt-2 text-xl font-medium tabular-nums">
            {s.points} <span className="text-zinc-500">/ {s.maxPoints} ball</span>
          </p>
        )}
        <p className={`relative mt-3 text-lg font-medium ${ok ? "text-emerald-300" : "text-rose-300"}`}>{note}</p>
        {rule && <p className="relative mt-1 text-sm text-zinc-400">Norma: {rule.label}</p>}
        <p className="relative mt-2 text-sm text-zinc-500">
          {percent}% to&apos;g&apos;ri · {s.wrong} ta xato · vaqt: {clock(elapsed)}
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          {onRestart && (
            <button onClick={onRestart} className="btn-accent">
              <RotateCw size={16} /> {restartLabel ?? "Qayta ishlash"}
            </button>
          )}
          <button onClick={onExit} className="chip">
            <ArrowLeft size={15} /> {exitLabel}
          </button>
        </div>
      </div>

      {sections.length > 1 && (
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((x) => (
            <div key={x.section} className="glass rounded-2xl p-4">
              <p className="truncate text-sm text-zinc-400">{tr(x.section)}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {x.correct}
                <span className="text-base text-zinc-500">/{x.total}</span>
                {showPoints && <span className="ml-2 text-sm font-normal text-zinc-400">{x.points} ball</span>}
              </p>
            </div>
          ))}
        </section>
      )}

      {wrong.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 font-semibold">Xato javoblar ({wrong.length})</h3>
          <div className="space-y-3">
            {wrong.map((q) => (
              <div key={keyOf(q)} className="glass rounded-2xl p-5 text-sm">
                <p className="text-xs text-zinc-500">
                  {questions.indexOf(q) + 1}-savol{q.meta && ` · ${tr(q.meta)}`}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap font-medium">{tr(q.question)}</p>
                <p className="mt-2 text-rose-300">
                  <XCircle size={14} className="mr-1.5 inline" />
                  {tr(q.options[answers[keyOf(q)]])}
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
