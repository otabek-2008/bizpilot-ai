"use client";

import GeneratePrompt from "@/components/GeneratePrompt";
import { PageHeader, Section, BulletList } from "@/components/PlanSection";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";

const priorityColor: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-400",
  medium: "bg-amber-500/15 text-amber-400",
  low: "bg-zinc-500/15 text-zinc-400",
};

const priorityLabel: Record<string, string> = {
  high: "Yuqori",
  medium: "O'rtacha",
  low: "Past",
};

export default function MarketingPage() {
  const { projectId, project, documents, loading } = useProjectWorkspace();

  if (loading) {
    return (
      <div className="p-8 text-white">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!project || !documents) {
    return (
      <div className="p-8 text-white">
        <PageHeader title="Marketing Strategy" subtitle="AI tomonidan yaratilgan marketing strategiyasi" />
        <GeneratePrompt projectId={projectId} />
      </div>
    );
  }

  const m = documents.marketing;

  return (
    <div className="p-8 text-white max-w-4xl">
      <PageHeader
        title="Marketing Strategy"
        subtitle={`${project.title} uchun AI tomonidan yaratilgan marketing strategiyasi`}
      />

      <div className="space-y-6">
        <Section title="Umumiy strategiya">
          <p>{m.overview}</p>
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Maqsadli auditoriya">
            <p>{m.targetAudience}</p>
          </Section>
          <Section title="Farqlovchi ustunlik">
            <p>{m.uniqueValue}</p>
          </Section>
        </div>

        <Section title="Marketing kanallari">
          <div className="space-y-3">
            {m.channels.map((c, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-3 last:border-0"
              >
                <div>
                  <div className="font-semibold text-white">{c.name}</div>
                  <p className="text-zinc-400 text-sm mt-1">{c.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${priorityColor[c.priority]}`}
                  >
                    {priorityLabel[c.priority]}
                  </span>
                  <div className="text-xs text-zinc-500 mt-1">Xarajat: {c.cost}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Kampaniyalar">
          <div className="grid md:grid-cols-2 gap-4">
            {m.campaigns.map((c, i) => (
              <div key={i} className="bg-zinc-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white">{c.name}</h4>
                  <span className="text-xs text-purple-400">{c.duration}</span>
                </div>
                <p className="text-zinc-400 text-sm mt-2">{c.description}</p>
                <div className="text-xs text-zinc-500 mt-3">Byudjet: {c.budget}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Brend ko'rsatmalari">
          <p>{m.brandGuidelines}</p>
        </Section>

        <Section title="Muvaffaqiyat ko'rsatkichlari (KPI)">
          <BulletList items={m.kpis} />
        </Section>
      </div>
    </div>
  );
}
