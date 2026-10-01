"use client";

import { useMemo, useState } from "react";
import { Database, Play, Sparkles } from "lucide-react";
import { Group, Pill } from "@/components/ui/Pills";
import { Spinner } from "@/components/LoadingScreen";
import { DIFFICULTIES, generateQuiz, type Difficulty } from "@/lib/quiz-client";
import { pickQuestions, type QuestionRef } from "@/lib/exam-db";
import type { Exam } from "@/lib/exams";
import type { ExamSession } from "./types";

const COUNTS = [5, 10, 20, 30];

type Source = "bank" | "ai";

/** Fan bo'yicha mashq: admin bazasidan yoki AI yangi savollar tuzadi. */
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
  const [subjectId, setSubjectId] = useState(exam.subjects[0].id);
  const [topic, setTopic] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("orta");
  const [chosenSource, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);

  const subject = exam.subjects.find((s) => s.id === subjectId)!;
  const inBank = useMemo(() => index.filter((q) => q.subject === subjectId).length, [index, subjectId]);
  // Bazada savol bo'lsa — standart manba baza, aks holda AI
  const source: Source = chosenSource ?? (inBank > 0 ? "bank" : "ai");

  async function build(): Promise<ExamSession> {
    const title = `${exam.short} · ${subject.name}${topic ? ` · ${topic}` : ""}`;
    const questions =
      source === "bank"
        ? await pickQuestions(index, subjectId, count)
        : (
            await generateQuiz(
              { exam: exam.id, subject: subjectId, topic: topic ?? undefined, count, difficulty, lang: subject.lang },
              { meta: topic ?? subject.name },
            )
          ).questions;
    if (!questions.length) throw new Error("Bu fanda savol topilmadi.");
    return {
      key: crypto.randomUUID(),
      title,
      questions,
      mode: source === "bank" ? "practice" : "ai",
      subject: subjectId,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass space-y-6 rounded-3xl p-6">
        <Group label="Fan / bo'lim">
          {exam.subjects.map((s) => (
            <Pill
              key={s.id}
              active={subjectId === s.id}
              onClick={() => {
                setSubjectId(s.id);
                setTopic(null);
                setSource(null);
              }}
            >
              {s.name}
            </Pill>
          ))}
        </Group>

        <Group label="Mavzu (ixtiyoriy — tanlanmasa aralash)">
          {subject.topics.map((t) => (
            <Pill key={t} active={topic === t} onClick={() => setTopic(topic === t ? null : t)}>
              {t}
            </Pill>
          ))}
        </Group>
      </div>

      <aside className="glass h-fit space-y-5 rounded-3xl p-6">
        <div>
          <p className="mb-2 text-sm text-zinc-400">Savollar manbasi</p>
          <div className="grid gap-2">
            <SourceButton
              active={source === "bank"}
              disabled={inBank === 0}
              onClick={() => setSource("bank")}
              icon={<Database size={16} />}
              title="Savollar bazasi"
              hint={inBank ? `${inBank} ta savol` : "Hozircha savol yo'q"}
            />
            <SourceButton
              active={source === "ai"}
              onClick={() => setSource("ai")}
              icon={<Sparkles size={16} />}
              title="AI yangi savollar"
              hint="Har safar yangi to'plam"
            />
          </div>
          {source === "bank" && topic && <p className="mt-2 text-xs text-zinc-500">Bazadan tanlashda mavzu hisobga olinmaydi.</p>}
        </div>

        <Group label="Savollar soni">
          {COUNTS.map((n) => (
            <Pill key={n} active={count === n} onClick={() => setCount(n)}>
              {n}
            </Pill>
          ))}
        </Group>

        {source === "ai" && (
          <Group label="Qiyinlik">
            {DIFFICULTIES.map((d) => (
              <Pill key={d.id} active={difficulty === d.id} onClick={() => setDifficulty(d.id)}>
                {d.label}
              </Pill>
            ))}
          </Group>
        )}

        <button onClick={() => void start()} disabled={loading} className="btn-accent w-full py-3">
          {loading ? <Spinner className="size-4" /> : <Play size={17} />}
          {loading ? (source === "ai" ? "AI savollar tuzmoqda…" : "Yuklanmoqda…") : "Mashqni boshlash"}
        </button>
        <p className="text-xs leading-relaxed text-zinc-500">Har javobdan keyin to&apos;g&apos;ri yoki noto&apos;g&apos;ri ekani va izoh ko&apos;rsatiladi.</p>
      </aside>
    </div>
  );
}

export function SourceButton({
  active,
  disabled,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:opacity-40 ${
        active ? "accent-soft border-[color:var(--accent)]" : "border-white/10 hover:border-white/25"
      }`}
    >
      <span className="text-[var(--accent)]">{icon}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
    </button>
  );
}
