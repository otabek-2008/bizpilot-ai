import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { adminDb } from "@/lib/admin/db";
import { deleteQuestionAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import QuestionForm from "@/components/admin/QuestionForm";
import { PageTitle, fmt } from "@/components/admin/ui";
import type { PravaQuestion } from "@/lib/prava";

export const metadata = { title: "Prava savoli" };

export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; bilet?: string }>;
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
          .from("prava_questions")
          .select("id, ticket, position, topic, question, options, correct, explanation, image, active, updated_at")
          .eq("id", id)
          .maybeSingle(),
    db.from("prava_questions").select("topic").not("topic", "is", null).limit(10000),
  ]);
  if (question?.error) throw question.error;
  const q = question?.data as (PravaQuestion & { updated_at: string }) | null;
  if (!isNew && !q) notFound();

  const topicList = [...new Set((topics.data ?? []).map((t) => t.topic as string))].sort((a, b) => a.localeCompare(b, "uz"));

  return (
    <>
      <Link href={q?.ticket != null ? `/admin/prava?bilet=${q.ticket}` : "/admin/prava"} className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Savollar ro&apos;yxati
      </Link>
      <PageTitle title={isNew ? "Yangi savol" : `Savol #${id}`} desc={q ? `Oxirgi o'zgarish: ${fmt(q.updated_at)}` : undefined}>
        {q && (
          <form action={deleteQuestionAction}>
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
          <Link href={`/admin/prava/new${q?.ticket != null ? `?bilet=${q.ticket}` : ""}`} className="underline hover:text-white">
            {q?.ticket != null ? `${q.ticket}-biletga yana savol qo'shish` : "Yana savol qo'shish"}
          </Link>
        </p>
      )}

      <QuestionForm
        // Saqlangandan keyin forma yangi qiymatlar bilan qayta ochilsin
        key={q ? `${q.id}:${q.updated_at}` : "new"}
        question={q}
        topics={topicList}
        defaultTicket={isNew ? Number(sp.bilet) || null : null}
      />
    </>
  );
}
