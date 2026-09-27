"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Download, Eraser } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CopyButton from "@/components/ui/CopyButton";
import { modules } from "@/lib/modules";
import { convertCase, textStats, type CaseMode } from "@/lib/textcase";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";

const MODES: { id: CaseMode; label: string; sample: string }[] = [
  { id: "upper", label: "KATTA HARF", sample: "AA" },
  { id: "lower", label: "kichik harf", sample: "aa" },
  { id: "title", label: "Sarlavha Registri", sample: "Aa" },
  { id: "sentence", label: "Gap registri", sample: "A." },
  { id: "toggle", label: "tESKARI rEGISTR", sample: "aA" },
];

const SAMPLES = [
  { lang: "O'zbek", text: "o'zbekiston respublikasi oliy ta'lim vazirligi. talabalar uchun yangi imkoniyatlar!" },
  { lang: "Русский", text: "МИНИСТЕРСТВО ВЫСШЕГО ОБРАЗОВАНИЯ. новые возможности для студентов." },
  { lang: "English", text: "the quick brown fox jumps over the lazy dog. don't stop learning!" },
];

export default function CaseConverterPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<CaseMode>("upper");

  const output = useMemo(() => convertCase(input, mode), [input, mode]);
  const stats = useMemo(() => textStats(input), [input]);
  const label = MODES.find((m) => m.id === mode)!.label;

  function logUse(action: string) {
    logActivity("case", `${label} — ${action} (${stats.chars} belgi)`);
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.case} />

      {/* Rejim tanlash */}
      <div className="stagger mb-5 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} data-active={mode === m.id} className="chip">
            <span className="grid size-6 place-items-center rounded-md bg-white/5 font-mono text-[11px]">{m.sample}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Kiritish */}
        <div className="glass flex flex-col rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="case-in" className="text-sm font-medium text-zinc-300">Matn</label>
            <div className="flex gap-1.5">
              {SAMPLES.map((s) => (
                <button
                  key={s.lang}
                  onClick={() => setInput(s.text)}
                  className="rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white"
                >
                  {s.lang}
                </button>
              ))}
            </div>
          </div>
          <textarea
            id="case-in"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Matnni shu yerga yozing yoki joylang…"
            className="field accent-ring min-h-[280px] flex-1 resize-y font-[inherit] leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span className="tabular-nums">
              {stats.chars} belgi · {stats.words} so&apos;z · {stats.lines} qator
            </span>
            <button
              onClick={() => setInput("")}
              disabled={!input}
              className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <Eraser size={13} /> Tozalash
            </button>
          </div>
        </div>

        {/* Natija */}
        <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
          <div className="relative mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Natija</span>
            <span key={mode} className="accent-soft animate-bubble-in rounded-full px-2.5 py-0.5 text-xs">{label}</span>
          </div>
          <output
            key={mode}
            className="animate-fade-in relative min-h-[280px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[0.875rem] border border-white/10 bg-black/30 px-4 py-3 leading-relaxed"
          >
            {output || <span className="text-zinc-600">Natija shu yerda paydo bo&apos;ladi</span>}
          </output>
          <div className="relative mt-3 flex flex-wrap gap-2">
            <CopyButton text={output} onCopied={() => logUse("nusxalandi")} />
            <button
              className="chip disabled:opacity-40"
              disabled={!output}
              onClick={() => {
                downloadBlob(new Blob([output], { type: "text/plain;charset=utf-8" }), "campusai-matn.txt");
                logUse("yuklab olindi");
              }}
            >
              <Download size={15} /> .txt
            </button>
            <button className="chip disabled:opacity-40" disabled={!output} onClick={() => setInput(output)}>
              <ArrowDownUp size={15} /> Natijani matnga o&apos;tkazish
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        O&apos;zbek (lotin va kirill), rus va ingliz tillari qo&apos;llab-quvvatlanadi. Sarlavha registrida
        &laquo;o&apos;&raquo;, &laquo;g&apos;&raquo; va tutuq belgisi to&apos;g&apos;ri saqlanadi: <em>O&apos;zbekiston</em>, <em>Ta&apos;lim</em>.
      </p>
    </PageWrap>
  );
}
