"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, History } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";
import { EXAMS, examById, subjectOf } from "@/lib/exams";
import { fetchExamResults, type ExamResult } from "@/lib/exam-db";
import { formatShortDate } from "@/lib/date";

const MODE_LABEL: Record<ExamResult["mode"], string> = { practice: "Test", ai: "AI mashq", mock: "Mock test", writing: "Writing" };

export default function AbituriyentPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);

  useEffect(() => {
    fetchExamResults(user.id)
      .then(setResults)
      .catch(() => setResults([])); // jadval hali yo'q bo'lsa — tarix bo'sh
  }, [user.id]);

  return (
    <PageWrap>
      <ModuleHeader module={modules.abituriyent} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMS.map((e) => {
          const done = results.filter((r) => r.exam === e.id).length;
          return (
            <Link
              key={e.id}
              href={`/dashboard/abituriyent/${e.id}`}
              className="glass glass-hover group relative flex flex-col overflow-hidden rounded-3xl p-6"
            >
              <div
                aria-hidden
                className="absolute -right-14 -top-14 size-44 rounded-full opacity-25 blur-3xl transition group-hover:opacity-40"
                style={{ background: `linear-gradient(135deg, ${e.from}, ${e.to})` }}
              />
              <span
                className="relative grid size-12 place-items-center rounded-2xl text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${e.from}, ${e.to})` }}
              >
                {e.short.slice(0, 4).toUpperCase()}
              </span>
              <h2 className="relative mt-4 flex-1 text-lg font-semibold">{e.name}</h2>
              <div className="relative mt-5 flex items-center justify-between text-sm">
                <span className="text-zinc-500">{done ? `${done} ta urinish` : "Testlar va materiallar"}</span>
                <span className="flex items-center gap-1 text-[var(--accent)] transition group-hover:translate-x-0.5">
                  Boshlash <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {results.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <History size={19} className="text-[var(--accent)]" /> So&apos;nggi natijalarim
          </h2>
          <div className="glass overflow-hidden rounded-2xl">
            <ul className="divide-y divide-white/5">
              {results.slice(0, 10).map((r, i) => {
                const exam = examById(r.exam);
                const subject = exam && r.subject ? subjectOf(exam, r.subject) : undefined;
                const pct = r.total ? Math.round((r.correct / r.total) * 100) : null;
                return (
                  <li key={i} className="flex items-center gap-4 px-5 py-3 text-sm">
                    <span className="w-28 shrink-0 text-zinc-500">{formatShortDate(new Date(r.created_at).getTime())}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {exam?.short ?? r.exam} · {MODE_LABEL[r.mode]}
                      {subject && <span className="text-zinc-500"> · {subject.name}</span>}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {r.correct}/{r.total}
                      {pct != null && <span className={`ml-2 ${pct >= 70 ? "text-emerald-300" : "text-amber-300"}`}>{pct}%</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

    </PageWrap>
  );
}
