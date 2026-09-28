"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, ArrowRight, CheckCircle2, Eraser, SpellCheck } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CopyButton from "@/components/ui/CopyButton";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { modules } from "@/lib/modules";
import { aiJson } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";
import { textStats } from "@/lib/textcase";
import type { SpellcheckResult, SpellIssueKind } from "@/lib/spellcheck";

const MAX = 12000;

const KIND: Record<SpellIssueKind, { label: string; cls: string }> = {
  imlo: { label: "Imlo", cls: "bg-rose-400/15 text-rose-200" },
  grammatika: { label: "Grammatika", cls: "bg-amber-400/15 text-amber-200" },
  punktuatsiya: { label: "Tinish belgisi", cls: "bg-sky-400/15 text-sky-200" },
  uslub: { label: "Uslub", cls: "bg-violet-400/15 text-violet-200" },
};

const SAMPLE =
  "Ertaga biz universitetga borib, yangi kitoblarni ko'rib chiqamiz. Talabalarning ko'pchiligi imtihonga tayyorgarlik ko'rishayapti, lekin ba'zilari hali boshlamagan.Men o'ylaymanki bu to'g'ri emas chunki vaqt juda oz qoldi.";

export default function SpellcheckPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SpellcheckResult | null>(null);
  const [checked, setChecked] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(() => textStats(input), [input]);
  const stale = result !== null && checked !== input;

  async function check() {
    setError("");
    setLoading(true);
    try {
      const res = await aiJson<SpellcheckResult>("/api/ai/spellcheck", { text: input });
      setResult(res);
      setChecked(input);
      logActivity("spellcheck", `${res.issues.length} ta xato topildi (${stats.words} so'z)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tekshirib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const c = new Map<SpellIssueKind, number>();
    for (const i of result?.issues ?? []) c.set(i.kind, (c.get(i.kind) ?? 0) + 1);
    return c;
  }, [result]);

  return (
    <PageWrap>
      <ModuleHeader module={modules.spellcheck} />
      <FormError message={error} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Kiritish */}
        <div className="glass flex flex-col rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="spell-in" className="text-sm font-medium text-zinc-300">Matn</label>
            <button onClick={() => setInput(SAMPLE)} className="rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white">
              Namuna
            </button>
          </div>
          <textarea
            id="spell-in"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX))}
            placeholder="Tekshirmoqchi bo'lgan matnni shu yerga joylang…"
            className="field accent-ring min-h-[320px] flex-1 resize-y leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span className="tabular-nums">
              {stats.chars.toLocaleString()} / {MAX.toLocaleString()} belgi · {stats.words} so&apos;z
            </span>
            <button
              onClick={() => setInput("")}
              disabled={!input}
              className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <Eraser size={13} /> Tozalash
            </button>
          </div>
          <button onClick={check} disabled={!input.trim() || loading} className="btn-accent mt-4 w-full py-3">
            {loading ? <Spinner className="size-4" /> : <SpellCheck size={17} />}
            {loading ? "Tekshirilmoqda…" : "Tekshirish"}
          </button>
        </div>

        {/* Natija */}
        <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
          <div className="relative mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-auto text-sm font-medium text-zinc-300">Tuzatilgan matn</span>
            {[...counts].map(([k, n]) => (
              <span key={k} className={`rounded-full px-2.5 py-0.5 text-xs ${KIND[k].cls}`}>{KIND[k].label}: {n}</span>
            ))}
          </div>

          {!result ? (
            <div className="relative grid min-h-[320px] flex-1 place-items-center rounded-[0.875rem] border border-dashed border-white/10 text-sm text-zinc-600">
              Natija shu yerda paydo bo&apos;ladi
            </div>
          ) : (
            <>
              {stale && <p className="relative mb-2 text-xs text-amber-300/80">Matn o&apos;zgardi — qayta tekshiring.</p>}
              <output className="animate-fade-in relative max-h-[260px] min-h-[140px] overflow-auto whitespace-pre-wrap break-words rounded-[0.875rem] border border-white/10 bg-black/30 px-4 py-3 leading-relaxed">
                {result.corrected}
              </output>
              <div className="relative mt-3 flex flex-wrap gap-2">
                <CopyButton text={result.corrected} />
                <button className="chip" onClick={() => setInput(result.corrected)}>
                  <ArrowDownUp size={15} /> Matnga qo&apos;llash
                </button>
              </div>

              <div className="relative mt-5 flex-1 space-y-2 overflow-auto">
                {result.issues.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-300">
                    <CheckCircle2 size={17} /> Xato topilmadi — matn toza!
                  </p>
                ) : (
                  result.issues.map((issue, i) => (
                    <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${KIND[issue.kind].cls}`}>{KIND[issue.kind].label}</span>
                        <span className="text-rose-300 line-through decoration-rose-400/60">{issue.original}</span>
                        <ArrowRight size={13} className="text-zinc-500" />
                        <span className="text-emerald-300">{issue.suggestion}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-400">{issue.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        O&apos;zbek (lotin va kirill), rus va ingliz tillari. Matn tili va yozuvi o&apos;zgartirilmaydi — faqat xatolar tuzatiladi.
      </p>
    </PageWrap>
  );
}
