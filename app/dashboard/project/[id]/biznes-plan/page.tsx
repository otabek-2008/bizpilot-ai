"use client";

import {
  Briefcase,
  Compass,
  Eye,
  Footprints,
  LineChart,
  Package,
  Settings2,
  Swords,
  Target,
  Users,
} from "lucide-react";
import GeneratePrompt from "@/components/GeneratePrompt";
import LoadingScreen from "@/components/LoadingScreen";
import { PageContainer, PageHeader, Section, BulletList } from "@/components/PlanSection";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";

export default function BusinessPlanPage() {
  const { projectId, project, documents, loading } = useProjectWorkspace();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!project || !documents) {
    return (
      <PageContainer>
        <PageHeader icon={Briefcase} title="Biznes reja" subtitle="AI tomonidan yaratilgan biznes reja" />
        <GeneratePrompt projectId={projectId} />
      </PageContainer>
    );
  }

  const bp = documents.businessPlan;

  const swot = [
    { title: "Kuchli tomonlar", items: bp.swot.strengths, tone: "border-emerald-500/25 bg-emerald-500/[0.06]", dot: "text-emerald-400" },
    { title: "Zaif tomonlar", items: bp.swot.weaknesses, tone: "border-red-500/25 bg-red-500/[0.06]", dot: "text-red-400" },
    { title: "Imkoniyatlar", items: bp.swot.opportunities, tone: "border-sky-500/25 bg-sky-500/[0.06]", dot: "text-sky-400" },
    { title: "Xatarlar", items: bp.swot.threats, tone: "border-amber-500/25 bg-amber-500/[0.06]", dot: "text-amber-400" },
  ];

  return (
    <PageContainer>
      <PageHeader
        icon={Briefcase}
        title="Biznes reja"
        subtitle={`${project.title} uchun AI tomonidan yaratilgan biznes reja`}
      />

      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-brand-400/25 bg-gradient-to-br from-brand-500/15 via-white/[0.03] to-transparent p-7">
          <div aria-hidden className="absolute -right-20 -top-20 size-60 rounded-full bg-brand-500/20 blur-3xl" />
          <p className="relative text-sm font-medium text-brand-300">Xulosa (Executive Summary)</p>
          <p className="relative mt-3 text-lg leading-relaxed text-zinc-200">{bp.summary}</p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="Missiya" icon={Target}>
            <p>{bp.mission}</p>
          </Section>
          <Section title="Vizyon" icon={Eye}>
            <p>{bp.vision}</p>
          </Section>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="Mahsulot va xizmatlar" icon={Package}>
            <BulletList items={bp.products} />
          </Section>
          <Section title="Raqobatchilar" icon={Swords}>
            <BulletList items={bp.competitors} />
          </Section>
        </div>

        <Section title="Bozor tahlili" icon={LineChart}>
          <p>{bp.marketAnalysis}</p>
        </Section>

        <Section title="SWOT tahlili" icon={Compass}>
          <div className="grid gap-4 md:grid-cols-2">
            {swot.map((q) => (
              <div key={q.title} className={`rounded-2xl border p-5 ${q.tone}`}>
                <h4 className={`mb-3 font-semibold ${q.dot}`}>{q.title}</h4>
                <ul className="space-y-2 text-sm">
                  {q.items.map((item, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className={`${q.dot} mt-0.5`}>●</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Operatsion reja" icon={Settings2}>
          <p>{bp.operations}</p>
        </Section>

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="Jamoa" icon={Users}>
            <BulletList items={bp.team} />
          </Section>
          <Section title="Keyingi qadamlar" icon={Footprints}>
            <ol className="space-y-3">
              {bp.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500/20 font-mono text-xs text-brand-300">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}
