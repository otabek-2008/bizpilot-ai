import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { adminDb } from "@/lib/admin/db";
import PravaImport from "@/components/admin/PravaImport";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Prava import" };

export default async function PravaImportPage() {
  const { count } = await adminDb().from("prava_questions").select("id", { count: "exact", head: true });

  return (
    <>
      <Link href="/admin/prava" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={15} /> Savollar ro&apos;yxati
      </Link>
      <PageTitle title="Savollarni import qilish" desc="Ko'p savolni bir martada CSV yoki JSON fayldan qo'shish" />
      <PravaImport existing={count ?? 0} />
    </>
  );
}
