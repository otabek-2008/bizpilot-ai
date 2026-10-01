import Link from "next/link";
import { BookOpen, CircleCheck, CircleOff, FileUp, ImageIcon, ListChecks, Pencil, Plus, Trash2, Users } from "lucide-react";
import { adminDb } from "@/lib/admin/db";
import { deleteExamQuestionAction, toggleExamQuestionAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Empty, PageTitle, Stat } from "@/components/admin/ui";
import { EXAMS, examById, subjectOf } from "@/lib/exams";

export const metadata = { title: "Abituriyent savollari" };

const PER_PAGE = 50;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

type Row = {
  id: number;
  exam: string;
  subject: string;
  topic: string | null;
  question: string;
  options: string[];
  correct: number;
  image: string | null;
  passage: string | null;
  active: boolean;
};

/** Imtihon/fan bo'yicha savollar soni (Data API 1000 qatordan sahifalaydi). */
async function allRefs(): Promise<{ exam: string; subject: string }[]> {
  const out: { exam: string; subject: string }[] = [];
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await adminDb().from("exam_questions").select("exam, subject").order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export default async function ExamsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ imtihon?: string; fan?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const exam = sp.imtihon ? examById(sp.imtihon) : undefined;
  const subject = exam && sp.fan ? subjectOf(exam, sp.fan) : undefined;
  const search = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);

  const db = adminDb();
  let query = db
    .from("exam_questions")
    .select("id, exam, subject, topic, question, options, correct, image, passage, active", { count: "exact" })
    .order("id", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (exam) query = query.eq("exam", exam.id);
  if (subject) query = query.eq("subject", subject.id);
  if (search) query = query.ilike("question", `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);

  const [list, refs, results, materials] = await Promise.all([
    query,
    allRefs().catch(() => null),
    db.from("exam_results").select("mode", { count: "exact", head: true }).gte("created_at", isoAgo(WEEK_MS)),
    db.from("exam_materials").select("id", { count: "exact", head: true }),
  ]);

  const schemaMissing = ["PGRST205", "42P01"].includes(list.error?.code ?? "");
  const rows = (list.data ?? []) as Row[];
  const total = list.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const countOf = (e: string, s?: string) => (refs ?? []).filter((r) => r.exam === e && (!s || r.subject === s)).length;

  const href = (p: Partial<Record<"imtihon" | "fan" | "q" | "page", string | number | null>>) => {
    const params = new URLSearchParams();
    const merged = { imtihon: exam?.id, fan: subject?.id, q: search || undefined, ...p };
    for (const [k, v] of Object.entries(merged)) if (v != null && v !== "") params.set(k, String(v));
    const qs = params.toString();
    return `/admin/exams${qs ? `?${qs}` : ""}`;
  };
  const pill = (active: boolean) =>
    `shrink-0 rounded-lg px-2.5 py-1 text-sm tabular-nums transition ${active ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`;

  return (
    <>
      <PageTitle title="Abituriyent savollari" desc="DTM, Milliy sertifikat, IELTS, CEFR va SAT savollar bazasi. Faol savollar mashq va mock testlarda darhol ishlatiladi.">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/exams/materials" className="btn-ghost !px-4 !py-2 text-sm">
            <BookOpen size={16} /> Materiallar
          </Link>
          <Link href="/admin/exams/import" className="btn-ghost !px-4 !py-2 text-sm">
            <FileUp size={16} /> Import
          </Link>
          <Link href={`/admin/exams/new${exam ? `?imtihon=${exam.id}${subject ? `&fan=${subject.id}` : ""}` : ""}`} className="btn-primary !px-4 !py-2 text-sm">
            <Plus size={16} /> Yangi savol
          </Link>
        </div>
      </PageTitle>

      {schemaMissing && (
        <p className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
          <code>exam_questions</code> jadvali topilmadi. Supabase SQL Editor&apos;da <code>supabase/schema.sql</code> ni qayta ishga tushiring.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Savollar" value={refs?.length ?? total} icon={ListChecks} />
        <Stat label="Materiallar" value={materials.count ?? 0} icon={BookOpen} />
        <Stat label="Testlar (7 kun)" value={results.count ?? 0} icon={Users} />
      </div>

      <div className="mt-8 space-y-3">
        <form action="/admin/exams" className="flex gap-2">
          {exam && <input type="hidden" name="imtihon" value={exam.id} />}
          {subject && <input type="hidden" name="fan" value={subject.id} />}
          <input name="q" defaultValue={search} placeholder="Savol matni bo'yicha qidirish" aria-label="Qidirish" className="field !py-2 text-sm" />
          <button className="btn-ghost shrink-0 !px-4 !py-2 text-sm">Qidirish</button>
        </form>
        <div className="flex gap-1 overflow-x-auto pb-1">
          <Link href={href({ imtihon: null, fan: null, page: null })} className={pill(!exam)}>
            Hammasi
          </Link>
          {EXAMS.map((e) => (
            <Link key={e.id} href={href({ imtihon: e.id, fan: null, page: null })} className={pill(exam?.id === e.id)}>
              {e.short} <span className="text-zinc-500">{countOf(e.id)}</span>
            </Link>
          ))}
        </div>
        {exam && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            <Link href={href({ fan: null, page: null })} className={pill(!subject)}>
              Barcha fanlar
            </Link>
            {exam.subjects.map((s) => (
              <Link key={s.id} href={href({ fan: s.id, page: null })} className={pill(subject?.id === s.id)}>
                {s.name} <span className="text-zinc-500">{countOf(exam.id, s.id)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {rows.length ? (
          <div className="glass overflow-hidden rounded-2xl">
            <ul className="divide-y divide-white/5">
              {rows.map((r) => {
                const e = examById(r.exam);
                return (
                  <li key={r.id} className={`flex items-start gap-4 p-4 ${r.active ? "" : "opacity-50"}`}>
                    <span className="w-24 shrink-0 text-xs text-zinc-500">
                      {e?.short ?? r.exam}
                      <span className="block truncate">{(e && subjectOf(e, r.subject)?.name) ?? r.subject}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/exams/${r.id}`} className="line-clamp-2 text-sm hover:text-brand-300">
                        {r.question}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span className="text-emerald-300/80">✓ {r.options[r.correct]}</span>
                        <span>{r.options.length} variant</span>
                        {r.passage && <span>matn bilan</span>}
                        {r.image && (
                          <span className="flex items-center gap-1">
                            <ImageIcon size={12} /> rasm
                          </span>
                        )}
                        {r.topic && <span>{r.topic}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <form action={toggleExamQuestionAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                        <button className="text-zinc-400 transition hover:text-white" title={r.active ? "O'chirish (yashirish)" : "Yoqish"}>
                          {r.active ? <CircleCheck size={17} className="text-emerald-300" /> : <CircleOff size={17} />}
                        </button>
                      </form>
                      <Link href={`/admin/exams/${r.id}`} className="text-zinc-400 transition hover:text-white" title="Tahrirlash">
                        <Pencil size={16} />
                      </Link>
                      <form action={deleteExamQuestionAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmButton message="Bu savolni butunlay o'chirasizmi?">
                          <Trash2 size={16} />
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          !schemaMissing && (
            <Empty>
              {search || exam ? (
                "Hech narsa topilmadi."
              ) : (
                <>
                  Hali savol yo&apos;q. <Link href="/admin/exams/new" className="text-brand-400">Bittalab qo&apos;shing</Link> yoki{" "}
                  <Link href="/admin/exams/import" className="text-brand-400">CSV/JSON fayldan import qiling</Link>. Baza bo&apos;sh bo&apos;lsa ham
                  foydalanuvchilar AI tuzgan savollar bilan mashq qila oladi.
                </>
              )}
            </Empty>
          )
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-1 text-sm">
          {page > 1 && <Link href={href({ page: page - 1 })} className={pill(false)}>← Oldingi</Link>}
          <span className="px-3 text-zinc-500 tabular-nums">
            {page} / {pages} · {total} ta
          </span>
          {page < pages && <Link href={href({ page: page + 1 })} className={pill(false)}>Keyingi →</Link>}
        </nav>
      )}
    </>
  );
}
