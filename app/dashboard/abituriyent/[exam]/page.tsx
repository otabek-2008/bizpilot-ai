"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, ExternalLink, Info, ListChecks, PenLine, Timer } from "lucide-react";
import { PageWrap } from "@/components/ui/ModuleHeader";
import { FormError } from "@/components/AuthShell";
import { useAuth } from "@/components/AuthProvider";
import TestRunner, { type TestSummary } from "@/components/test/TestRunner";
import Practice from "@/components/abituriyent/Practice";
import Mock from "@/components/abituriyent/Mock";
import Materials from "@/components/abituriyent/Materials";
import Writing from "@/components/abituriyent/Writing";
import type { ExamSession } from "@/components/abituriyent/types";
import { logActivity } from "@/lib/activity";
import { examById, type Exam } from "@/lib/exams";
import { examFileUrl, fetchExamIndex, fetchMaterials, saveExamResult, type Material, type QuestionRef } from "@/lib/exam-db";

type Tab = "info" | "practice" | "mock" | "materials" | "writing";

export default function ExamPage() {
  const { exam: id } = useParams<{ exam: string }>();
  const exam = examById(id);

  if (!exam) {
    return (
      <PageWrap>
        <p className="glass rounded-2xl p-8 text-center text-zinc-400">
          Bunday imtihon topilmadi.{" "}
          <Link href="/dashboard/abituriyent" className="text-[var(--accent)]">
            Abituriyent bo&apos;limiga qaytish
          </Link>
        </p>
      </PageWrap>
    );
  }
  return <ExamView key={exam.id} exam={exam} />;
}

function ExamView({ exam }: { exam: Exam }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("practice");
  const [index, setIndex] = useState<QuestionRef[]>([]);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Jadval hali yaratilmagan bo'lsa ham bo'lim ishlaydi — AI savollari bilan
    fetchExamIndex(exam.id)
      .then(setIndex)
      .catch(() => setIndex([]));
    fetchMaterials(exam.id)
      .then(setMaterials)
      .catch(() => setMaterials([]));
  }, [exam.id]);

  const start = useCallback((s: ExamSession) => {
    setSession(s);
    window.scrollTo({ top: 0 });
  }, []);

  const onFinish = useCallback(
    (r: TestSummary) => {
      if (!session) return;
      void saveExamResult(user.id, {
        exam: exam.id,
        subject: session.subject,
        mode: session.mode,
        total: r.total,
        correct: r.correct,
        points: r.points,
        max_points: r.maxPoints,
        duration_sec: r.durationSec,
      });
      logActivity("abituriyent", `${session.title}: ${r.correct}/${r.total}${session.showPoints ? ` (${r.points} ball)` : ""}`);
    },
    [session, user.id, exam.id],
  );

  if (session) {
    return (
      <PageWrap>
        <TestRunner
          key={session.key}
          title={session.title}
          questions={session.questions}
          timeLimitSec={session.timeLimitSec}
          showPoints={session.showPoints}
          imageSrc={examFileUrl}
          onFinish={onFinish}
          onExit={() => setSession(null)}
          onRestart={() => void session.restart().catch((e: Error) => setError(e.message))}
          restartLabel={session.mode === "mock" ? "Yangi mock test" : "Yangi savollar"}
          exitLabel={`${exam.short} bo'limiga`}
        />
        <FormError message={error} />
      </PageWrap>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Info }[] = [
    { id: "practice", label: "Mashq", icon: ListChecks },
    { id: "mock", label: "Mock test", icon: Timer },
    ...(exam.writing ? [{ id: "writing" as const, label: "Writing", icon: PenLine }] : []),
    { id: "materials", label: "Materiallar", icon: BookOpen },
    { id: "info", label: "Imtihon haqida", icon: Info },
  ];

  return (
    <PageWrap>
      <Link href="/dashboard/abituriyent" className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white">
        <ArrowLeft size={15} /> Abituriyent
      </Link>

      <div className="mb-6 flex items-start gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${exam.from}, ${exam.to})` }}
        >
          {exam.short.slice(0, 4).toUpperCase()}
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{exam.name}</h1>
          <p className="mt-1.5 max-w-2xl text-zinc-400">{exam.desc}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.04] p-1" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setError("");
            }}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
              tab === id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <FormError message={error} />

      {tab === "practice" && <Practice exam={exam} index={index} onStart={start} onError={setError} />}
      {tab === "mock" && <Mock exam={exam} index={index} onStart={start} onError={setError} />}
      {tab === "writing" && exam.writing && <Writing exam={exam} onError={setError} />}
      {tab === "materials" && <Materials exam={exam} materials={materials} />}
      {tab === "info" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="glass overflow-hidden rounded-3xl">
            <dl className="divide-y divide-white/5">
              {exam.facts.map((f) => (
                <div key={f.label} className="grid gap-1 px-6 py-4 sm:grid-cols-[200px_1fr]">
                  <dt className="text-sm text-zinc-400">{f.label}</dt>
                  <dd className="text-sm">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <aside className="glass h-fit space-y-3 rounded-3xl p-6 text-sm text-zinc-400">
            <p>
              Ma&apos;lumotlar umumiy tanishish uchun. Imtihon talablari o&apos;zgarishi mumkin — so&apos;nggi va aniq ma&apos;lumotni rasmiy
              saytdan tekshiring.
            </p>
            <a href={exam.officialUrl} target="_blank" rel="noreferrer" className="btn-accent w-full">
              {exam.officialName} <ExternalLink size={15} />
            </a>
          </aside>
        </div>
      )}
    </PageWrap>
  );
}
