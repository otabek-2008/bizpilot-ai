import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Link2, Trash2 } from "lucide-react";
import { adminDb } from "@/lib/admin/db";
import { publicBase } from "@/lib/admin/files";
import { deleteMaterialAction } from "@/app/admin/actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import MaterialForm from "@/components/admin/MaterialForm";
import { Empty, PageTitle, fmt } from "@/components/admin/ui";
import { examById, subjectOf } from "@/lib/exams";

export const metadata = { title: "Abituriyent materiallari" };

type Row = { id: number; exam: string; subject: string | null; title: string; description: string | null; kind: "file" | "link"; url: string; created_at: string };

export default async function MaterialsAdminPage() {
  const { data, error } = await adminDb()
    .from("exam_materials")
    .select("id, exam, subject, title, description, kind, url, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = (data ?? []) as Row[];
  const base = publicBase("exam-files");

  return (
    <>
      <Link href="/admin/exams" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Abituriyent savollari
      </Link>
      <PageTitle title="O'quv materiallari" desc="Qo'llanma, PDF va foydali havolalar — foydalanuvchilar imtihon sahifasining 'Materiallar' bo'limida ko'radi." />

      {error && (
        <p className="mb-6 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
          {["PGRST205", "42P01"].includes(error.code) ? (
            <>
              <code>exam_materials</code> jadvali topilmadi. <code>supabase/schema.sql</code> ni qayta ishga tushiring.
            </>
          ) : (
            error.message
          )}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          {rows.length ? (
            <div className="glass overflow-hidden rounded-2xl">
              <ul className="divide-y divide-white/5">
                {rows.map((r) => {
                  const e = examById(r.exam);
                  const href = r.kind === "file" ? base + r.url : r.url;
                  return (
                    <li key={r.id} className="flex items-start gap-4 p-4">
                      <span className="mt-0.5 text-brand-400">{r.kind === "file" ? <FileText size={17} /> : <Link2 size={17} />}</span>
                      <div className="min-w-0 flex-1">
                        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm hover:text-brand-300">
                          {r.title} <ExternalLink size={12} />
                        </a>
                        {r.description && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{r.description}</p>}
                        <p className="mt-1 text-xs text-zinc-500">
                          {e?.short ?? r.exam} · {(e && r.subject && subjectOf(e, r.subject)?.name) || "Umumiy"} · {fmt(r.created_at)}
                        </p>
                      </div>
                      <form action={deleteMaterialAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmButton message="Bu materialni o'chirasizmi? Yuklangan fayl ham o'chiriladi.">
                          <Trash2 size={16} />
                        </ConfirmButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            !error && <Empty>Hali material yo&apos;q. O&apos;ngdagi forma orqali fayl yoki havola qo&apos;shing.</Empty>
          )}
        </div>
        <MaterialForm />
      </div>
    </>
  );
}
