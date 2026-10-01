"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Upload } from "lucide-react";
import { importExamQuestionsAction } from "@/app/admin/actions";
import { Spinner } from "@/components/LoadingScreen";
import ExamSubjectSelect from "@/components/admin/ExamSubjectSelect";
import { downloadBlob } from "@/lib/download";
import { EXAM_CSV_TEMPLATE, parseExamImport } from "@/lib/exam-questions";
import { EXAMS, examById } from "@/lib/exams";

const CHUNK = 250;

export default function ExamImport() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [defaults, setDefaults] = useState({ exam: EXAMS[0].id as string, subject: EXAMS[0].subjects[0].id });
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [replace, setReplace] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  const parsed = useMemo(() => (text.trim() ? parseExamImport(text, defaults) : null), [text, defaults]);
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of parsed?.questions ?? []) {
      const e = examById(q.exam)!;
      const key = `${e.short} · ${e.subjects.find((s) => s.id === q.subject)?.name ?? q.subject}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m];
  }, [parsed]);
  const subjectName = examById(defaults.exam)!.subjects.find((s) => s.id === defaults.subject)?.name;

  async function readFile(file: File | undefined) {
    if (!file) return;
    setDone("");
    setError("");
    setFileName(file.name);
    setText(await file.text());
  }

  async function run() {
    if (!parsed?.questions.length) return;
    if (replace && !confirm(`${examById(defaults.exam)!.short} · ${subjectName} dagi barcha eski savollar o'chiriladi. Davom etasizmi?`)) return;
    setError("");
    setDone("");
    setProgress(0);
    let inserted = 0;
    try {
      for (let i = 0; i < parsed.questions.length; i += CHUNK) {
        const r = await importExamQuestionsAction(parsed.questions.slice(i, i + CHUNK), replace && i === 0 ? defaults : null);
        inserted += r.inserted;
        setProgress(inserted);
      }
      setDone(`${inserted} ta savol qo'shildi.`);
      setText("");
      setFileName("");
      router.refresh();
    } catch (e) {
      setError(`${inserted ? `${inserted} ta savol qo'shilgandan keyin xato: ` : ""}${(e as Error).message}`);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5">
          <p className="mb-3 text-sm text-zinc-400">
            Faylda <code>imtihon</code>/<code>fan</code> ustunlari bo&apos;lmasa, savollar shu yerga qo&apos;shiladi:
          </p>
          <ExamSubjectSelect exam={defaults.exam} subject={defaults.subject} onChange={setDefaults} />
        </div>

        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void readFile(e.dataTransfer.files[0]);
          }}
          className="glass flex w-full flex-col items-center gap-2 rounded-2xl border-dashed p-8 text-sm text-zinc-400 transition hover:!border-white/25 hover:text-white"
        >
          <FileUp size={26} className="text-brand-400" />
          {fileName || "CSV yoki JSON faylni tanlang yoki shu yerga tashlang"}
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,.json,.txt,.tsv,text/csv,application/json"
          hidden
          onChange={(e) => {
            void readFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <details className="glass rounded-2xl p-4 text-sm">
          <summary className="cursor-pointer text-zinc-400">…yoki matnni shu yerga joylang</summary>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileName("");
            }}
            rows={10}
            placeholder="imtihon;fan;mavzu;savol;javob1;javob2;javob3;javob4;togri;izoh;matn;rasm"
            className="field mt-3 font-mono text-xs"
          />
        </details>

        {parsed && (
          <div className="glass rounded-2xl p-5">
            <p className="text-lg font-semibold">
              {parsed.questions.length} ta savol tayyor
              {parsed.errors.length > 0 && <span className="text-rose-300"> · {parsed.errors.length} ta xato qator</span>}
            </p>
            <p className="mt-1 text-sm text-zinc-500">{groups.map(([k, n]) => `${k}: ${n}`).join(" · ")}</p>

            {parsed.questions.length > 0 && (
              <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4 text-sm">
                <p className="text-xs text-zinc-500">1-savol (tekshirib ko&apos;ring):</p>
                <p className="mt-1 font-medium">{parsed.questions[0].question}</p>
                <ol className="mt-2 space-y-0.5">
                  {parsed.questions[0].options.map((o, i) => (
                    <li key={i} className={i === parsed.questions[0].correct ? "text-emerald-300" : "text-zinc-400"}>
                      {"ABCDEF"[i]}) {o} {i === parsed.questions[0].correct && "✓"}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {parsed.errors.length > 0 && (
              <ul className="mt-4 max-h-56 space-y-1 overflow-auto text-xs text-rose-300">
                {parsed.errors.slice(0, 100).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {parsed.errors.length > 100 && <li>… yana {parsed.errors.length - 100} ta</li>}
              </ul>
            )}

            <label className="mt-5 flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4 accent-rose-500" />
              Avval {examById(defaults.exam)!.short} · {subjectName} dagi eski savollarni o&apos;chirish
            </label>

            <button onClick={() => void run()} disabled={!parsed.questions.length || progress !== null} className="btn-primary mt-4">
              {progress !== null ? <Spinner className="size-4" /> : <Upload size={16} />}
              {progress !== null ? `Yuklanmoqda… ${progress}/${parsed.questions.length}` : `${parsed.questions.length} ta savolni qo'shish`}
            </button>
          </div>
        )}

        {done && <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200">{done}</p>}
        {error && <p className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      </div>

      <aside className="glass h-fit space-y-3 rounded-2xl p-5 text-sm text-zinc-400">
        <p className="font-medium text-white">Fayl formati</p>
        <p>
          <b className="text-zinc-200">CSV</b> (Excel → &quot;CSV UTF-8&quot;). Birinchi qator — ustun nomlari:
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li><code>savol</code> — majburiy</li>
          <li><code>javob1</code> … <code>javob6</code> — kamida 2 tasi</li>
          <li><code>togri</code> — to&apos;g&apos;ri javob raqami (1, 2…) yoki harfi (A, B…)</li>
          <li><code>imtihon</code> — {EXAMS.map((e) => e.id).join(", ")}</li>
          <li><code>fan</code> — fan id&apos;si yoki nomi (masalan <code>matematika</code>)</li>
          <li><code>mavzu</code>, <code>izoh</code>, <code>matn</code> (Reading passage), <code>rasm</code> — ixtiyoriy</li>
        </ul>
        <p>
          <code>rasm</code> — <b className="text-zinc-200">Fayllar → Abituriyent fayllari</b> ga yuklangan rasm yo&apos;li.
        </p>
        <p>
          <b className="text-zinc-200">JSON</b>: <code>[{"{"}&quot;imtihon&quot;: &quot;sat&quot;, &quot;fan&quot;: &quot;math&quot;, &quot;savol&quot;: &quot;…&quot;, &quot;javoblar&quot;: [&quot;…&quot;], &quot;togri&quot;: 2{"}"}]</code>
        </p>
        <button onClick={() => downloadBlob(new Blob([EXAM_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }), "abituriyent-namuna.csv")} className="btn-ghost !px-4 !py-2 text-sm">
          <Download size={15} /> Namuna CSV
        </button>
      </aside>
    </div>
  );
}
