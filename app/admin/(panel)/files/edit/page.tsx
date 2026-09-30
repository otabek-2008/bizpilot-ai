import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminDb, isBucket } from "@/lib/admin/db";
import { MAX_EDIT_BYTES, isEditable } from "@/lib/admin/files";
import TextEditor from "@/components/admin/TextEditor";

export const metadata = { title: "Faylni tahrirlash" };

export default async function EditFilePage({ searchParams }: { searchParams: Promise<{ b?: string; p?: string }> }) {
  const { b = "", p = "" } = await searchParams;
  const parts = p.split("/").filter(Boolean);
  if (!isBucket(b) || !parts.length || parts.some((x) => x === "." || x === "..")) notFound();
  const path = parts.join("/");
  const name = parts.at(-1)!;
  const folder = parts.slice(0, -1).join("/");

  const { data, error } = await adminDb().storage.from(b).download(path);
  const back = `/admin/files?b=${b}${folder ? `&p=${encodeURIComponent(folder)}` : ""}`;

  return (
    <>
      <Link href={back} className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} /> Fayllar
      </Link>
      <h1 className="mb-4 break-all text-2xl font-semibold">{name}</h1>

      {error || !data ? (
        <p className="text-sm text-rose-300">Faylni ochib bo&apos;lmadi{error ? `: ${error.message}` : ""}.</p>
      ) : !isEditable(name, data.size) ? (
        <p className="text-sm text-amber-200">
          Bu faylni brauzerda tahrirlab bo&apos;lmaydi (faqat {Math.round(MAX_EDIT_BYTES / 1024)} KB gacha matnli fayllar). Uni yuklab
          olib, tahrirlab, qayta yuklang.
        </p>
      ) : (
        <TextEditor bucket={b} path={path} initial={await data.text()} />
      )}
    </>
  );
}
