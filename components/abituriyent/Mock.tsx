"use client";

import { useMemo, useState } from "react";
import { Clock, Database, Play, Sparkles } from "lucide-react";
import { Spinner } from "@/components/LoadingScreen";
import { generateQuiz } from "@/lib/quiz-client";
import { pickQuestions, type QuestionRef } from "@/lib/exam-db";
import { needsPicks, pickableSubjects, resolveMock, type Exam } from "@/lib/exams";
import type { TestQuestion } from "@/lib/quiz";
import { SourceButton } from "./Practice";
import type { ExamSession } from "./types";

/** AI bitta so'rovda ko'pi bilan shuncha savol tuzadi — kattaroq bloklar parallel bo'laklarga bo'linadi. */
const AI_CHUNK = 15;

function chunks(n: number): number[] {
  const parts = Math.ceil(n / AI_CHUNK);
  return Array.from({ length: parts }, (_, i) => Math.floor(n / parts) + (i < n % parts ? 1 : 0));
}

const fmtPoints = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/** To'liq mock test: imtihon tuzilmasi bo'yicha bloklar, umumiy vaqt va ball. */
export default function Mock({
  exam,
  index,
  onStart,
  onError,
}: {
  exam: Exam;
  index: QuestionRef[];
  onStart: (s: ExamSession) => void;
  onError: (message: string) => void;
}) {
  const options = pickableSubjects(exam);
  const picksNeeded = needsPicks(exam);
  const [pick1, setPick1] = useState(options[0]?.id ?? "");
  const [pick2, setPick2] = useState(options[1]?.id ?? "");
  const [chosenSource, setSource] = useState<"bank" | "ai" | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const blocks = useMemo(() => resolveMock(exam, { pick1, pick2 }), [exam, pick1, pick2]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of index) m.set(q.subject, (m.get(q.subject) ?? 0) + 1);
    return m;
  }, [index]);
  const bankReady = blocks.every((b) => b.subjectId && (counts.get(b.subjectId) ?? 0) >= b.count);
  const source = chosenSource ?? (bankReady ? "bank" : "ai");
  const total = blocks.reduce((s, b) => s + b.count, 0);
  const maxPoints = blocks.reduce((s, b) => s + b.count * b.points, 0);
  const showPoints = blocks.some((b) => b.points !== 1);
  const samePicks = picksNeeded === 2 && pick1 === pick2;

  async function build(): Promise<ExamSession> {
    const tasks: { block: (typeof blocks)[number]; load: () => Promise<TestQuestion[]> }[] = [];
    for (const b of blocks) {
      if (!b.subject) throw new Error("Fanlarni tanlang.");
      const subject = b.subject;
      const extra: Partial<TestQuestion> = { section: `${b.label}${b.label !== subject.name ? ` (${subject.name})` : ""}`, points: b.points, meta: subject.name };
      if (source === "bank") {
        tasks.push({ block: b, load: async () => (await pickQuestions(index, subject.id, b.count)).map((q) => ({ ...q, ...extra })) });
      } else {
        for (const n of chunks(b.count)) {
          tasks.push({
            block: b,
            load: async () =>
              (await generateQuiz({ exam: exam.id, subject: subject.id, count: n, difficulty: "orta", lang: subject.lang }, extra)).questions,
          });
        }
      }
    }

    let done = 0;
    setProgress(`0 / ${tasks.length}`);
    const parts = await Promise.all(
      tasks.map(async (t) => {
        const qs = await t.load();
        setProgress(`${++done} / ${tasks.length}`);
        return qs;
      }),
    );
    const questions = parts.flat();
    if (!questions.length) throw new Error("Savollar topilmadi.");

    return {
      key: crypto.randomUUID(),
      title: `${exam.short} · Mock test`,
      questions,
      mode: "mock",
      subject: picksNeeded ? [pick1, picksNeeded === 2 ? pick2 : ""].filter(Boolean).join("+") : null,
      timeLimitSec: exam.mock.minutes * 60,
      showPoints,
      restart: async () => onStart(await build()),
    };
  }

  async function start() {
    onError("");
    try {
      onStart(await build());
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  const select = "field accent-ring !py-2.5 text-sm";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass rounded-3xl p-6">
        <p className="text-sm text-zinc-400">{exam.mock.note}</p>

        {picksNeeded > 0 && (
          <div className={`mt-5 grid gap-3 ${picksNeeded === 2 ? "sm:grid-cols-2" : ""}`}>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">{picksNeeded === 2 ? "1-ixtisoslik fani" : "Fan"}</span>
              <select value={pick1} onChange={(e) => setPick1(e.target.value)} className={select}>
                {options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {picksNeeded === 2 && (
              <label className="block">
                <span className="mb-1.5 block text-sm text-zinc-400">2-ixtisoslik fani</span>
                <select value={pick2} onChange={(e) => setPick2(e.target.value)} className={select}>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {samePicks && <p className="mt-2 text-sm text-amber-300">Ikki xil fan tanlang.</p>}

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Blok</th>
                <th className="px-4 py-2 text-right font-medium">Savol</th>
                {showPoints && <th className="px-4 py-2 text-right font-medium">Ball</th>}
                <th className="px-4 py-2 text-right font-medium">Bazada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {blocks.map((b, i) => {
                const have = b.subjectId ? (counts.get(b.subjectId) ?? 0) : 0;
                return (
                  <tr key={i}>
                    <td className="px-4 py-2.5">
                      {b.label}
                      {b.subject && b.subject.name !== b.label && <span className="text-zinc-500"> · {b.subject.name}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{b.count}</td>
                    {showPoints && (
                      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">
                        {b.count} × {fmtPoints(b.points)} = {fmtPoints(b.count * b.points)}
                      </td>
                    )}
                    <td className={`px-4 py-2.5 text-right tabular-nums ${have >= b.count ? "text-emerald-300" : "text-zinc-500"}`}>{have}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-white/[0.02] font-medium">
              <tr>
                <td className="px-4 py-2.5">Jami</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{total}</td>
                {showPoints && <td className="px-4 py-2.5 text-right tabular-nums">{fmtPoints(maxPoints)}</td>}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <aside className="glass h-fit space-y-5 rounded-3xl p-6">
        <p className="flex items-center gap-2 text-sm text-zinc-300">
          <Clock size={16} className="text-[var(--accent)]" /> Vaqt: {Math.floor(exam.mock.minutes / 60) ? `${Math.floor(exam.mock.minutes / 60)} soat ` : ""}
          {exam.mock.minutes % 60 ? `${exam.mock.minutes % 60} daqiqa` : ""}
        </p>
        <div className="grid gap-2">
          <SourceButton
            active={source === "bank"}
            disabled={!bankReady}
            onClick={() => setSource("bank")}
            icon={<Database size={16} />}
            title="Savollar bazasidan"
            hint={bankReady ? "Barcha bloklar uchun savol yetarli" : "Bazada savol yetarli emas"}
          />
          <SourceButton
            active={source === "ai"}
            onClick={() => setSource("ai")}
            icon={<Sparkles size={16} />}
            title="AI tuzgan mock"
            hint={`${total} ta yangi savol · ~1–2 daqiqa tayyorlanadi`}
          />
        </div>
        <button onClick={() => void start()} disabled={progress !== null || samePicks} className="btn-accent w-full py-3">
          {progress !== null ? <Spinner className="size-4" /> : <Play size={17} />}
          {progress !== null ? `Tayyorlanmoqda… ${progress}` : "Mock testni boshlash"}
        </button>
        <p className="text-xs leading-relaxed text-zinc-500">
          Natijada {showPoints ? "umumiy ball, " : ""}har bir blok bo&apos;yicha natija va xatolar tahlili ko&apos;rsatiladi.
        </p>
      </aside>
    </div>
  );
}
