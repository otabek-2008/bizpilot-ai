"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import Runner, { type TestSummary } from "@/components/test/TestRunner";
import { logActivity } from "@/lib/activity";
import { imageUrl, recordAnswer, saveResult } from "@/lib/prava-db";
import { maxMistakes, type ExamFormat, type PravaMode, type PravaQuestion } from "@/lib/prava";
import type { PassRule, TestQuestion } from "@/lib/quiz";

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

/** Prava testi: umumiy test oynasi + natija va xatolarni Supabase'ga yozish. */
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
  const exam = session.mode === "exam" ? session.exam : undefined;

  const questions = useMemo<TestQuestion[]>(
    () =>
      session.questions.map((q) => ({
        ...q,
        meta: [q.ticket != null ? `${q.ticket}-bilet` : "", q.topic ?? ""].filter(Boolean).join(" · ") || null,
      })),
    [session.questions],
  );

  const rule = useMemo<PassRule | null>(
    () =>
      exam
        ? { minCorrect: exam.minCorrect, maxMistakes: maxMistakes(exam), label: `${exam.size} tadan kamida ${exam.minCorrect} ta to'g'ri javob` }
        : null,
    [exam],
  );

  const onAnswer = useCallback((q: TestQuestion, right: boolean) => recordAnswer(user.id, Number(q.id), right), [user.id]);

  const onFinish = useCallback(
    (r: TestSummary) => {
      void saveResult(user.id, {
        mode: session.mode,
        ticket: session.ticket ?? null,
        topic: session.topic ?? null,
        total: r.total,
        correct: r.correct,
        passed: r.passed,
        duration_sec: r.durationSec,
      });
      logActivity("prava", `${session.title}: ${r.correct}/${r.total}${r.passed == null ? "" : r.passed ? " — o'tdi" : " — o'tmadi"}`);
    },
    [user.id, session],
  );

  return (
    <Runner
      title={session.title}
      questions={questions}
      tr={tr}
      timeLimitSec={exam ? exam.minutes * 60 : null}
      rule={rule}
      imageSrc={imageUrl}
      onAnswer={onAnswer}
      onFinish={onFinish}
      onExit={onExit}
      onRestart={onRestart}
      exitLabel="Prava bo'limiga"
      restartLabel={exam ? "Yangi imtihon" : "Qayta ishlash"}
    />
  );
}
