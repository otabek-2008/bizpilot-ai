"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, GraduationCap, ListChecks } from "lucide-react";
import { PageWrap } from "@/components/ui/ModuleHeader";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { useAuth } from "@/components/AuthProvider";
import TestRunner, { type TestSummary } from "@/components/test/TestRunner";
import Practice from "@/components/abituriyent/Practice";
import Materials from "@/components/abituriyent/Materials";
import type { ExamSession } from "@/components/abituriyent/types";
import { logActivity } from "@/lib/activity";
import { examById, type Exam } from "@/lib/exams";
import { examFileUrl, fetchExamIndex, fetchMaterials, saveExamResult, type Material, type QuestionRef } from "@/lib/exam-db";

type Tab = "practice" | "materials";

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
  const [index, setIndex] = useState<QuestionRef[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Jadval hali yaratilmagan bo'lsa — bo'sh baza sifatida ko'rsatamiz
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
      logActivity("abituriyent", `${session.title}: ${r.correct}/${r.total}`);
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
          restartLabel="Yangi savollar"
          exitLabel={`${exam.short} bo'limiga`}
        />
        <FormError message={error} />
      </PageWrap>
    );
  }

  const loading = index === null || materials === null;
  const hasQuestions = (index?.length ?? 0) > 0;
  const hasMaterials = (materials?.length ?? 0) > 0;
  const tabs = [
    ...(hasQuestions ? [{ id: "practice" as const, label: "Test", icon: ListChecks }] : []),
    ...(hasMaterials ? [{ id: "materials" as const, label: "Materiallar", icon: BookOpen }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <PageWrap>
      <Link href="/dashboard/abituriyent" className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white">
        <ArrowLeft size={15} /> Abituriyent
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${exam.from}, ${exam.to})` }}
        >
          {exam.short.slice(0, 4).toUpperCase()}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{exam.name}</h1>
      </div>

      {loading ? (
        <div className="grid min-h-[300px] place-items-center">
          <Spinner className="size-6" />
        </div>
      ) : !tabs.length ? (
        <div className="glass rounded-3xl px-6 py-14 text-center">
          <GraduationCap size={36} className="mx-auto text-zinc-500" />
          <p className="mt-4 text-lg font-medium">Savollar bazasi tayyorlanmoqda</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            {exam.name} bo&apos;yicha testlar va materiallar tez orada qo&apos;shiladi. Shu orada boshqa vositalardan foydalanib turing.
          </p>
        </div>
      ) : (
        <>
          {tabs.length > 1 && (
            <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.04] p-1" role="tablist">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={current === id}
                  onClick={() => {
                    setTab(id);
                    setError("");
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                    current === id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          )}

          <FormError message={error} />

          {current === "practice" && <Practice exam={exam} index={index} onStart={start} onError={setError} />}
          {current === "materials" && <Materials exam={exam} materials={materials} />}
        </>
      )}
    </PageWrap>
  );
}
