import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { adminDb } from "@/lib/admin/db";
import { publicBase } from "@/lib/admin/files";
import { deleteExamQuestionAction, saveExamQuestionAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ExamSubjectSelect from "@/components/admin/ExamSubjectSelect";
import QuestionForm, { type EditableQuestion } from "@/components/admin/QuestionForm";
import { PageTitle, fmt } from "@/components/admin/ui";

export const metadata = { title: "Abituriyent savoli" };

const BUCKET = "exam-files";

type Question = EditableQuestion & {
  exam: string;
  subject: string;
  topic: string | null;
  passage: string | null;
  active: boolean;
  updated_at: string;
};

export default async function ExamQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; imtihon?: string; fan?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();

  const db = adminDb();
  const [question, topics] = await Promise.all([
    isNew
      ? Promise.resolve(null)
      : db
          .from("exam_questions")
          .select("id, exam, subject, topic, question, options, correct, explanation, passage, image, active, updated_at")
          .eq("id", id)
          .maybeSingle(),
    db.from("exam_questions").select("topic").not("topic", "is", null).limit(10000),
  ]);
  if (question?.error) throw question.error;
  const q = question?.data as Question | null;
  if (!isNew && !q) notFound();

  const topicList = [...new Set((topics.data ?? []).map((t) => t.topic as string))].sort((a, b) => a.localeCompare(b, "uz"));
  const exam = q?.exam ?? sp.imtihon ?? null;
  const subject = q?.subject ?? sp.fan ?? null;
  const back = `/admin/exams${exam ? `?imtihon=${exam}${subject ? `&fan=${subject}` : ""}` : ""}`;

  return (
    <>
      <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Savollar ro&apos;yxati
      </Link>
      <PageTitle title={isNew ? "Yangi savol" : `Savol #${id}`} desc={q ? `Oxirgi o'zgarish: ${fmt(q.updated_at)}` : undefined}>
        {q && (
          <form action={deleteExamQuestionAction}>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="back" value="1" />
            <ConfirmButton message="Bu savolni butunlay o'chirasizmi?">
              <Trash2 size={15} /> O&apos;chirish
            </ConfirmButton>
          </form>
        )}
      </PageTitle>

      {sp.saved && (
        <p className="mb-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          Savol qo&apos;shildi.{" "}
          <Link href={`/admin/exams/new?imtihon=${q?.exam ?? ""}&fan=${q?.subject ?? ""}`} className="underline hover:text-white">
            Shu fanga yana savol qo&apos;shish
          </Link>
        </p>
      )}

      <QuestionForm
        key={q ? `${q.id}:${q.updated_at}` : "new"}
        question={q}
        save={saveExamQuestionAction}
        bucket={BUCKET}
        publicBase={publicBase(BUCKET)}
        main={
          <details open={!!q?.passage} className="rounded-xl border border-white/10 p-3">
            <summary className="cursor-pointer text-sm text-zinc-400">Umumiy matn / passage (ixtiyoriy — Reading uchun)</summary>
            <textarea name="passage" defaultValue={q?.passage ?? ""} rows={6} maxLength={12000} className="field mt-3 text-sm" />
          </details>
        }
        side={
          <>
            <ExamSubjectSelect exam={exam} subject={subject} />
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Mavzu (ixtiyoriy)</span>
              <input name="topic" list="exam-topics" defaultValue={q?.topic ?? ""} maxLength={120} className="field !py-2.5" />
              <datalist id="exam-topics">
                {topicList.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" name="active" defaultChecked={q?.active ?? true} className="size-4 accent-emerald-500" />
              Faol (foydalanuvchilarga ko&apos;rinadi)
            </label>
          </>
        }
      />
    </>
  );
}
