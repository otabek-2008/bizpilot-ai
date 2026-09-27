"use client";

import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

export default function GeneratePrompt({ projectId }: { projectId: string }) {
  return (
    <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
      <div aria-hidden className="absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="relative mx-auto grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/5">
        <FileText size={28} className="text-brand-300" />
      </div>
      <h2 className="relative mt-6 text-2xl font-semibold">Hujjat hali yaratilmagan</h2>
      <p className="relative mx-auto mt-3 max-w-md text-zinc-400">
        Loyihangiz haqida ma&apos;lumot kiriting va &laquo;Biznes reja yaratish&raquo;
        tugmasini bosing. Biz siz uchun biznes reja, marketing strategiyasi va
        moliyaviy rejani yaratamiz.
      </p>
      <Link href={`/dashboard/project/${projectId}`} className="btn-primary relative mt-8">
        Boshlash <ArrowRight size={18} />
      </Link>
    </div>
  );
}
