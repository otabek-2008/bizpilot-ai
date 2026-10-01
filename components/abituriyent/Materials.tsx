"use client";

import { ExternalLink, FileText, Link2 } from "lucide-react";
import { examFileUrl, type Material } from "@/lib/exam-db";
import type { Exam } from "@/lib/exams";

/** O'quv materiallari — admin yuklagan fayl va havolalar, fanlar bo'yicha guruhlangan. */
export default function Materials({ exam, materials }: { exam: Exam; materials: Material[] }) {
  const name = (id: string | null) => (id ? (exam.subjects.find((s) => s.id === id)?.name ?? id) : "Umumiy");
  const groups = new Map<string, Material[]>();
  for (const m of materials) groups.set(name(m.subject), [...(groups.get(name(m.subject)) ?? []), m]);

  return (
    <div className="space-y-5">
      {[...groups].map(([group, items]) => (
        <div key={group}>
          <p className="mb-2 text-sm text-zinc-400">{group}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((m) => (
              <a
                key={m.id}
                href={m.kind === "file" ? examFileUrl(m.url) : m.url}
                target="_blank"
                rel="noreferrer"
                className="glass glass-hover flex items-start gap-3 rounded-2xl p-4"
              >
                <span className="accent-soft grid size-9 shrink-0 place-items-center rounded-xl">
                  {m.kind === "file" ? <FileText size={16} /> : <Link2 size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.title}</span>
                  {m.description && <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500">{m.description}</span>}
                </span>
                <ExternalLink size={14} className="mt-1 shrink-0 text-zinc-500" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
