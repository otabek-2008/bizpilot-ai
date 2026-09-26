"use client";

import GeneratePrompt from "@/components/GeneratePrompt";
import { PageHeader, Section, BulletList } from "@/components/PlanSection";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";

export default function BusinessPlanPage() {
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
        <PageHeader title="Business Plan" subtitle="AI tomonidan yaratilgan biznes reja" />
        <GeneratePrompt projectId={projectId} />
      </div>
    );
  }

  const bp = documents.businessPlan;

  return (
    <div className="p-8 text-white max-w-4xl">
      <PageHeader
        title="Business Plan"
        subtitle={`${project.title} uchun AI tomonidan yaratilgan biznes reja`}
      />

      <div className="space-y-6">
        <Section title="Xulosa (Executive Summary)">
          <p>{bp.summary}</p>
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Mission">
            <p>{bp.mission}</p>
          </Section>
          <Section title="Vision">
            <p>{bp.vision}</p>
          </Section>
        </div>

        <Section title="Mahsulot va xizmatlar">
          <BulletList items={bp.products} />
        </Section>

        <Section title="Bozor tahlili">
          <p>{bp.marketAnalysis}</p>
        </Section>

        <Section title="Raqobatchilar">
          <BulletList items={bp.competitors} />
        </Section>

        <Section title="SWOT tahlili">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-emerald-400 mb-2">🟢 Kuchli tomonlar</h4>
              <BulletList items={bp.swot.strengths} />
            </div>
            <div>
              <h4 className="font-semibold text-red-400 mb-2">🔴 Zaif tomonlar</h4>
              <BulletList items={bp.swot.weaknesses} />
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">🔵 Imkoniyatlar</h4>
              <BulletList items={bp.swot.opportunities} />
            </div>
            <div>
              <h4 className="font-semibold text-amber-400 mb-2">🟡 Xatarlar</h4>
              <BulletList items={bp.swot.threats} />
            </div>
          </div>
        </Section>

        <Section title="Operatsion reja">
          <p>{bp.operations}</p>
        </Section>

        <Section title="Jamoa">
          <BulletList items={bp.team} />
        </Section>

        <Section title="Keyingi qadamlar">
          <BulletList items={bp.nextSteps} />
        </Section>
      </div>
    </div>
  );
}
