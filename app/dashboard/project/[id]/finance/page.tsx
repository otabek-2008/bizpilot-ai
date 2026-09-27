"use client";

import {
  CalendarClock,
  HandCoins,
  Landmark,
  PiggyBank,
  Receipt,
  Scale,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import GeneratePrompt from "@/components/GeneratePrompt";
import LoadingScreen from "@/components/LoadingScreen";
import { PageContainer, PageHeader, Section, BulletList } from "@/components/PlanSection";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";

function CostList({ items }: { items: { label: string; amount: string }[] }) {
  return (
    <div className="divide-y divide-white/5">
      {items.map((c, i) => (
        <div key={i} className="flex justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
          <span className="text-zinc-400">{c.label}</span>
          <span className="shrink-0 font-mono font-medium text-white">{c.amount}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const { projectId, project, documents, loading } = useProjectWorkspace();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!project || !documents) {
    return (
      <PageContainer>
        <PageHeader icon={Wallet} title="Moliyaviy reja" subtitle="AI tomonidan yaratilgan moliyaviy reja" />
        <GeneratePrompt projectId={projectId} />
      </PageContainer>
    );
  }

  const f = documents.finance;

  return (
    <PageContainer>
      <PageHeader
        icon={Wallet}
        title="Moliyaviy reja"
        subtitle={`${project.title} uchun AI tomonidan yaratilgan moliyaviy reja`}
      />

      <div className="space-y-5">
        <Section title="Moliyaviy sharh" icon={Landmark}>
          <p>{f.overview}</p>
        </Section>

        <Section title="3 yillik prognoz" icon={TrendingUp}>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-2 pb-3 text-left font-medium">Yil</th>
                  <th className="px-2 pb-3 text-right font-medium">Daromad</th>
                  <th className="px-2 pb-3 text-right font-medium">Xarajatlar</th>
                  <th className="px-2 pb-3 text-right font-medium">Sof foyda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {f.projections.map((p) => {
                  const profitNegative = p.profit.trim().startsWith("-");
                  return (
                    <tr key={p.year} className="transition hover:bg-white/[0.03]">
                      <td className="px-2 py-3.5 font-sans font-semibold text-white">{p.year}-yil</td>
                      <td className="px-2 py-3.5 text-right text-emerald-400">{p.revenue}</td>
                      <td className="px-2 py-3.5 text-right text-red-400">{p.costs}</td>
                      <td className="px-2 py-3.5 text-right">
                        <span
                          className={`rounded-md px-2 py-1 font-semibold ${
                            profitNegative ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {p.profit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="Boshlang'ich xarajatlar" icon={Receipt}>
            <CostList items={f.startupCosts} />
          </Section>
          <Section title="Oylik xarajatlar" icon={CalendarClock}>
            <CostList items={f.monthlyCosts} />
          </Section>
        </div>

        <Section title="Daromad manbalari" icon={HandCoins}>
          <div className="grid gap-3 md:grid-cols-2">
            {f.revenueStreams.map((r, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <h4 className="font-semibold text-white">{r.label}</h4>
                <p className="mt-1 text-sm text-zinc-400">{r.description}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="grid gap-5 md:grid-cols-2">
          <Section title="O'zini qoplash" icon={Scale}>
            <p>{f.breakEven}</p>
          </Section>
          <Section title="Kapital ehtiyoji" icon={PiggyBank}>
            <p>{f.fundingNeeds}</p>
          </Section>
        </div>

        <Section title="Xatarlarni kamaytirish" icon={ShieldAlert}>
          <BulletList items={f.riskMitigation} />
        </Section>
      </div>
    </PageContainer>
  );
}
