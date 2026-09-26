"use client";

import Link from "next/link";

export default function GeneratePrompt({ projectId }: { projectId: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
      <div className="text-4xl mb-4">📄</div>
      <h2 className="text-2xl font-bold">Hujjat hali yaratilmagan</h2>
      <p className="text-zinc-400 mt-3 max-w-md mx-auto">
        Loyihangiz haqida ma&apos;lumot kiriting va Generate Business Plan
        tugmasini bosing. Biz siz uchun biznes reja, marketing strategiyasi va
        moliyaviy rejani yaratamiz.
      </p>
      <Link
        href={`/dashboard/project/${projectId}`}
        className="inline-block mt-6 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-semibold transition"
      >
        Boshlash →
      </Link>
    </div>
  );
}
