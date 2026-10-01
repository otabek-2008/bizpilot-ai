import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ExamImport from "@/components/admin/ExamImport";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Abituriyent import" };

export default function ExamImportPage() {
  return (
    <>
      <Link href="/admin/exams" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Savollar ro&apos;yxati
      </Link>
      <PageTitle title="Savollarni import qilish" desc="Ko'p savolni bir martada CSV yoki JSON fayldan qo'shish" />
      <ExamImport />
    </>
  );
}
