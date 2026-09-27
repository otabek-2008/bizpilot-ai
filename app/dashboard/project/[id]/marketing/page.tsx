"use client";

import {
  BarChart3,
  Fingerprint,
  Gem,
  Megaphone,
  Radio,
  Rocket,
  Telescope,
  Users,
} from "lucide-react";
import GeneratePrompt from "@/components/GeneratePrompt";
import LoadingScreen from "@/components/LoadingScreen";
import { PageContainer, PageHeader, Section, BulletList } from "@/components/PlanSection";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";

const priorityColor: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  low: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/30",
};

const priorityLabel: Record<string, string> = {
  high: "Yuqori",
  medium: "O'rtacha",
  low: "Past",
};

export default function MarketingPage() {
  const { projectId, project, documents, loading } = useProjectWorkspace();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!project || !documents) {
    return (
      <PageContainer>
        <PageHeader icon={Megaphone} title="Marketing strategiyasi" subtitle="AI tomonidan yaratilgan marketing strategiyasi" />
        <GeneratePrompt projectId={projectId} />
      </PageContainer>
    );
  }

  const m = documents.marketing;

  return (
    <PageContainer>
      <PageHeader
        icon={Megaphone}
        title="Marketing strategiyasi"
        subtitle={`${project.title} uchun AI tomonidan yaratilgan marketing strategiyasi`}
      />

      <div className="space-y-5">
        <Section title="Umumiy strategiya" icon={Telescope}>
          <p>{m.overview}</p>
        </Section>

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="Maqsadli auditoriya" icon={Users}>
            <p>{m.targetAudience}</p>
          </Section>
          <Section title="Farqlovchi ustunlik" icon={Gem}>
            <p>{m.uniqueValue}</p>
          </Section>
        </div>

        <Section title="Marketing kanallari" icon={Radio}>
          <div className="grid gap-3 md:grid-cols-2">
            {m.channels.map((c, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-white">{c.name}</div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${priorityColor[c.priority]}`}>
                    {priorityLabel[c.priority]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{c.description}</p>
                <div className="mt-3 text-xs text-zinc-500">
                  Xarajat: <span className="font-mono text-zinc-300">{c.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Kampaniyalar" icon={Rocket}>
          <div className="grid gap-3 md:grid-cols-2">
            {m.campaigns.map((c, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-brand-500/10 to-transparent p-5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-white">{c.name}</h4>
                  <span className="shrink-0 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs text-brand-300">
                    {c.duration}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{c.description}</p>
                <div className="mt-4 text-xs text-zinc-500">
                  Byudjet: <span className="font-mono text-zinc-300">{c.budget}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Brend ko'rsatmalari" icon={Fingerprint}>
          <p>{m.brandGuidelines}</p>
        </Section>

        <Section title="Muvaffaqiyat ko'rsatkichlari (KPI)" icon={BarChart3}>
          <BulletList items={m.kpis} />
        </Section>
      </div>
    </PageContainer>
  );
}
