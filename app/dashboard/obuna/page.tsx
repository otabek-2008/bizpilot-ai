"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Crown, Loader2, XCircle } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { FormError } from "@/components/AuthShell";
import { daysLeft, useAccess } from "@/components/billing/AccessProvider";
import { modules } from "@/lib/modules";
import { PLANS, TRIAL_DAYS, type PlanId } from "@/lib/billing";
import { formatDate } from "@/lib/date";
import { supabase } from "@/lib/supabase";

export default function ObunaPage() {
  const access = useAccess();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

  const now = new Date();
  const paidActive = !!access.paidUntil && access.paidUntil > now;
  const trialActive = !!access.trialEndsAt && access.trialEndsAt > now;

  async function pay(plan: PlanId) {
    setError("");
    setBusy(plan);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessiya tugagan. Qayta kiring.");
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.url) throw new Error(body?.error || "To'lovni boshlab bo'lmadi.");
      window.location.assign(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "To'lovni boshlab bo'lmadi.");
      setBusy(null);
    }
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.obuna} />

      <Suspense>
        <PaymentReturn onPaid={access.refresh} />
      </Suspense>

      <section className="glass relative mb-6 overflow-hidden rounded-3xl p-6">
        <div aria-hidden className="accent-gradient absolute -right-20 -top-20 size-56 rounded-full opacity-20 blur-3xl" />
        <p className="relative text-sm text-zinc-400">Holat</p>
        {access.loading ? (
          <Loader2 className="relative mt-2 animate-spin text-zinc-500" size={20} />
        ) : paidActive ? (
          <p className="relative mt-1 text-xl font-semibold">
            Obuna faol — {formatDate(access.paidUntil!.getTime())} gacha
            <span className="ml-2 text-sm font-normal text-zinc-400">({daysLeft(access.paidUntil)} kun)</span>
          </p>
        ) : trialActive ? (
          <p className="relative mt-1 text-xl font-semibold">
            Bepul sinov — {daysLeft(access.trialEndsAt)} kun qoldi
            <span className="ml-2 text-sm font-normal text-zinc-400">({formatDate(access.trialEndsAt!.getTime())} gacha)</span>
          </p>
        ) : (
          <p className="relative mt-1 text-xl font-semibold text-rose-200">Bepul sinov tugagan</p>
        )}
        <p className="relative mt-2 text-sm text-zinc-500">
          Yangi foydalanuvchilarga barcha vositalar {TRIAL_DAYS} kun bepul. Abituriyent testlari, reyting va yordam doim bepul. Sinov davrida
          to&apos;lasangiz, qolgan bepul kunlar kuyib ketmaydi — obuna ulardan keyin boshlanadi.
        </p>
      </section>

      <FormError message={error} />

      <div className="stagger grid gap-4 sm:grid-cols-2">
        {Object.values(PLANS).map((p) => (
          <div key={p.id} className="glass lift flex flex-col rounded-3xl p-6">
            <div className="flex items-center gap-2 text-zinc-300">
              <Crown size={18} className="text-amber-300" /> {p.title}
            </div>
            <p className="mt-3 text-4xl font-semibold">${p.usd}</p>
            <p className="mt-1 text-sm text-zinc-500">{p.note}</p>
            <p className="mt-3 text-xs text-zinc-500">To&apos;lov Payme orqali so&apos;mda, Markaziy bank kursi bo&apos;yicha.</p>
            <button type="button" onClick={() => pay(p.id)} disabled={!!busy} className="btn-primary mt-5 w-full py-3">
              {busy === p.id ? <Loader2 size={18} className="animate-spin" /> : null}
              Payme orqali to&apos;lash
            </button>
          </div>
        ))}
      </div>
    </PageWrap>
  );
}

/** Payme'dan qaytilganda (?tolov=<buyurtma>) to'lov holatini ko'rsatadi; to'lov tasdiqlanguncha bir necha marta tekshiradi. */
function PaymentReturn({ onPaid }: { onPaid: () => Promise<void> }) {
  const orderId = Number(useSearchParams().get("tolov"));
  const [state, setState] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return;
    let stop = false;
    let tries = 0;
    async function check() {
      const { data } = await supabase.from("payments").select("state").eq("id", orderId).maybeSingle();
      if (stop) return;
      const s = data?.state ?? 0;
      setState(s);
      if (s === 2) return void onPaid();
      if (s >= 0 && ++tries < 10) setTimeout(check, 3000);
    }
    void check();
    return () => {
      stop = true;
    };
  }, [orderId, onPaid]);

  if (state === null) return null;
  const box = "mb-6 flex items-center gap-3 rounded-2xl border p-4 text-sm";
  if (state === 2)
    return (
      <div className={`${box} border-emerald-400/25 bg-emerald-400/10 text-emerald-200`}>
        <CheckCircle2 size={20} /> To&apos;lov qabul qilindi. Rahmat! Obuna faollashtirildi.
      </div>
    );
  if (state < 0)
    return (
      <div className={`${box} border-rose-400/25 bg-rose-400/10 text-rose-200`}>
        <XCircle size={20} /> To&apos;lov bekor qilindi.
      </div>
    );
  return (
    <div className={`${box} border-amber-400/25 bg-amber-400/10 text-amber-200`}>
      <Clock size={20} /> To&apos;lov hali tasdiqlanmadi. Payme&apos;da to&apos;lovni yakunlagan bo&apos;lsangiz, bir oz kuting.
    </div>
  );
}
