"use client";

import { useState } from "react";
import { EXAMS, examById } from "@/lib/exams";

/** Imtihon va unga bog'liq fan tanlovi (forma maydonlari: exam, subject). */
export default function ExamSubjectSelect({
  exam: initialExam,
  subject: initialSubject,
  allowAnySubject = false,
  onChange,
}: {
  exam?: string | null;
  subject?: string | null;
  /** Fan majburiy emas (masalan material "Umumiy" bo'lishi mumkin). */
  allowAnySubject?: boolean;
  onChange?: (v: { exam: string; subject: string }) => void;
}) {
  const [exam, setExam] = useState(initialExam && examById(initialExam) ? initialExam : EXAMS[0].id);
  const subjects = examById(exam)!.subjects;
  const [subject, setSubject] = useState(
    initialSubject && subjects.some((s) => s.id === initialSubject) ? initialSubject : allowAnySubject ? "" : subjects[0].id,
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-400">Imtihon</span>
        <select
          name="exam"
          value={exam}
          onChange={(e) => {
            const next = e.target.value;
            const first = allowAnySubject ? "" : examById(next)!.subjects[0].id;
            setExam(next);
            setSubject(first);
            onChange?.({ exam: next, subject: first });
          }}
          className="field !py-2.5"
        >
          {EXAMS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.short}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-zinc-400">Fan</span>
        <select
          name="subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            onChange?.({ exam, subject: e.target.value });
          }}
          className="field !py-2.5"
        >
          {allowAnySubject && <option value="">Umumiy</option>}
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
