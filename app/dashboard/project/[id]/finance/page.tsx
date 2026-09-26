"use client";

import GeneratePrompt from "@/components/GeneratePrompt";
import { PageHeader, Section, BulletList } from "@/components/PlanSection";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";

export default function FinancePage() {
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
        <PageHeader title="Finance" subtitle="AI tomonidan yaratilgan moliyaviy reja" />
        <GeneratePrompt projectId={projectId} />
      </div>
    );
  }

  const f = documents.finance;

  return (
    <div className="p-8 text-white max-w-4xl">
      <PageHeader
        title="Finance"
        subtitle={`${project.title} uchun AI tomonidan yaratilgan moliyaviy reja`}
      />

      <div className="space-y-6">
        <Section title="Moliyaviy sharh">
          <p>{f.overview}</p>
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Boshlang'ich xarajatlar">
            <div className="space-y-2">
              {f.startupCosts.map((c, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-zinc-800 pb-2 last:border-0">
                  <span className="text-zinc-400">{c.label}</span>
                  <span className="font-semibold text-white">{c.amount}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Oylik xarajatlar">
            <div className="space-y-2">
              {f.monthlyCosts.map((c, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-zinc-800 pb-2 last:border-0">
                  <span className="text-zinc-400">{c.label}</span>
                  <span className="font-semibold text-white">{c.amount}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <Section title="Daromad manbalari">
          <div className="space-y-3">
            {f.revenueStreams.map((r, i) => (
              <div key={i}>
                <h4 className="font-semibold text-white">{r.label}</h4>
                <p className="text-zinc-400 text-sm mt-1">{r.description}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="3 yillik prognoz">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-2">Yil</th>
                  <th className="text-right py-2">Daromad</th>
                  <th className="text-right py-2">Xarajatlar</th>
                  <th className="text-right py-2">Sof foyda</th>
                </tr>
              </thead>
              <tbody>
                {f.projections.map((p) => {
                  const profitNegative = p.profit.startsWith("-");
                  return (
                    <tr key={p.year} className="border-b border-zinc-800/60">
                      <td className="py-3 font-semibold">{p.year}-yil</td>
                      <td className="py-3 text-right text-emerald-400">{p.revenue}</td>
                      <td className="py-3 text-right text-red-400">{p.costs}</td>
                      <td
                        className={`py-3 text-right font-semibold ${
                          profitNegative ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {p.profit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="O'zini qoplash">
            <p>{f.breakEven}</p>
          </Section>
          <Section title="Kapital ehtiyoji">
            <p>{f.fundingNeeds}</p>
          </Section>
        </div>

        <Section title="Xatar yumshatish">
          <BulletList items={f.riskMitigation} />
        </Section>
      </div>
    </div>
  );
}
