"use client";

import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { Group, Pill } from "@/components/ui/Pills";
import { Spinner } from "@/components/LoadingScreen";
import { pickQuestions, type QuestionRef } from "@/lib/exam-db";
import type { Exam } from "@/lib/exams";
import type { ExamSession } from "./types";

const COUNTS = [10, 20, 30, 50];

/** Fan bo'yicha test: savollar bazasidan tasodifiy to'plam. */
export default function Practice({
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
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of index) m.set(q.subject, (m.get(q.subject) ?? 0) + 1);
    return m;
  }, [index]);
  // Faqat savoli bor fanlar ko'rsatiladi
  const subjects = exam.subjects.filter((s) => counts.has(s.id));
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const available = subject ? (counts.get(subject.id) ?? 0) : 0;

  async function build(): Promise<ExamSession> {
    const questions = await pickQuestions(index, subject.id, count);
    if (!questions.length) throw new Error("Bu fanda savol topilmadi.");
    return {
      key: crypto.randomUUID(),
      title: `${exam.short} · ${subject.name}`,
      questions,
      mode: "practice",
      subject: subject.id,
      timeLimitSec: null,
      showPoints: false,
      restart: async () => onStart(await build()),
    };
  }

  async function start() {
    onError("");
    setLoading(true);
    try {
      onStart(await build());
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!subject) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass rounded-3xl p-6">
        <Group label="Fan / bo'lim">
          {subjects.map((s) => (
            <Pill key={s.id} active={subject.id === s.id} onClick={() => setSubjectId(s.id)}>
              {s.name} <span className="text-zinc-500">{counts.get(s.id)}</span>
            </Pill>
          ))}
        </Group>
      </div>

      <aside className="glass h-fit space-y-5 rounded-3xl p-6">
        <Group label="Savollar soni">
          {COUNTS.filter((n, i) => n <= available || i === 0).map((n) => (
            <Pill key={n} active={count === n} onClick={() => setCount(n)}>
              {Math.min(n, available)}
            </Pill>
          ))}
        </Group>
        <button onClick={() => void start()} disabled={loading} className="btn-accent w-full py-3">
          {loading ? <Spinner className="size-4" /> : <Play size={17} />}
          {loading ? "Yuklanmoqda…" : "Testni boshlash"}
        </button>
        <p className="text-xs leading-relaxed text-zinc-500">Har javobdan keyin to&apos;g&apos;ri yoki noto&apos;g&apos;ri ekani ko&apos;rsatiladi.</p>
      </aside>
    </div>
  );
}
