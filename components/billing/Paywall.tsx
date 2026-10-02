"use client";

import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { PageWrap } from "@/components/ui/ModuleHeader";
import type { AppModule } from "@/lib/modules";
import { PLANS, TRIAL_DAYS } from "@/lib/billing";

/** Pullik bo'lim: bepul sinov tugagan va obuna yo'q. */
export default function Paywall({ module: m }: { module: AppModule }) {
  const Icon = m.icon;
  return (
    <PageWrap>
      <div className="glass enter-pop relative mx-auto max-w-xl overflow-hidden rounded-3xl p-8 text-center">
        <div aria-hidden className="accent-gradient absolute -right-24 -top-24 size-64 rounded-full opacity-20 blur-3xl" />
        <span className="accent-gradient relative mx-auto grid size-16 place-items-center rounded-2xl">
          <Icon size={28} />
          <span className="absolute -bottom-1.5 -right-1.5 grid size-7 place-items-center rounded-full border border-white/15 bg-ink">
            <Lock size={13} />
          </span>
        </span>
        <h1 className="relative mt-5 text-2xl font-semibold">{m.title} — Premium vosita</h1>
        <p className="relative mt-2 text-zinc-400">
          {TRIAL_DAYS} kunlik bepul sinov muddatingiz tugadi. Davom ettirish uchun Premium obunani faollashtiring — oyiga ${PLANS.month.usd} yoki
          yiliga ${PLANS.year.usd}.
        </p>
        <Link href="/dashboard/premium" className="btn-primary relative mt-6 inline-flex px-6 py-3">
          <Crown size={18} /> Premium&apos;ga o&apos;tish
        </Link>
      </div>
    </PageWrap>
  );
}
