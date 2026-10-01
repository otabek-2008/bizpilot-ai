"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Eraser, Globe, Square } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CopyButton from "@/components/ui/CopyButton";
import { Group, Pill } from "@/components/ui/Pills";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { modules } from "@/lib/modules";
import { aiStream } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";
import { TONES, TRANSLATE_LANGS, type Tone, type TranslateLang } from "@/lib/translate";

const MAX = 12000;
const PREFS_KEY = "campusai:translator";

type Prefs = { from: TranslateLang | "auto"; to: TranslateLang; tone: Tone };

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Prefs | null;
    if (p?.to) return p;
  } catch {
    // saqlangan sozlama yo'q
  }
  return { from: "auto", to: "en", tone: "auto" };
}

export default function TranslatorPage() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // saqlab bo'lmasa — faqat shu seans uchun
    }
  }, [prefs]);

  useEffect(() => () => abort.current?.abort(), []);

  const set = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));

  function swap() {
    if (prefs.from === "auto") return;
    setPrefs((p) => ({ ...p, from: p.to, to: p.from as TranslateLang }));
    if (output) {
      setInput(output);
      setOutput("");
    }
  }

  async function translate() {
    if (!input.trim() || busy) return;
    setError("");
    setOutput("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      await aiStream("/api/ai/translate", { text: input, ...prefs }, setOutput, controller.signal);
      const to = TRANSLATE_LANGS.find((l) => l.id === prefs.to)!.label;
      logActivity("translator", `${to} tiliga tarjima (${input.length} belgi)`);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const select = "field accent-ring !py-2 text-sm";

  return (
    <PageWrap>
      <ModuleHeader module={modules.translator} />
      <FormError message={error} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={prefs.from} onChange={(e) => set({ from: e.target.value as Prefs["from"] })} aria-label="Qaysi tildan" className={`${select} !w-auto`}>
          <option value="auto">Tilni aniqlash</option>
          {TRANSLATE_LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button onClick={swap} disabled={prefs.from === "auto"} className="chip disabled:opacity-40" title="Tillarni almashtirish">
          <ArrowLeftRight size={15} />
        </button>
        <select value={prefs.to} onChange={(e) => set({ to: e.target.value as TranslateLang })} aria-label="Qaysi tilga" className={`${select} !w-auto`}>
          {TRANSLATE_LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <div className="ml-auto">
          <Group label="">
            {TONES.map((t) => (
              <Pill key={t.id} active={prefs.tone === t.id} onClick={() => set({ tone: t.id })}>
                {t.label}
              </Pill>
            ))}
          </Group>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col rounded-3xl p-5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void translate();
            }}
            placeholder="Tarjima qilinadigan matn…"
            aria-label="Matn"
            className="field accent-ring min-h-[300px] flex-1 resize-y leading-relaxed"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span className="tabular-nums">
              {input.length.toLocaleString()} / {MAX.toLocaleString()} · Ctrl+Enter
            </span>
            <button
              onClick={() => setInput("")}
              disabled={!input}
              className="flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <Eraser size={13} /> Tozalash
            </button>
          </div>
          {busy ? (
            <button onClick={() => abort.current?.abort()} className="chip mt-4 w-full justify-center py-3">
              <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <button onClick={() => void translate()} disabled={!input.trim()} className="btn-accent mt-4 w-full py-3">
              <Globe size={17} /> Tarjima qilish
            </button>
          )}
        </div>

        <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
          <div className="relative mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Tarjima</span>
            {busy && <Spinner className="size-4" />}
          </div>
          {output ? (
            <>
              <output className="animate-fade-in relative min-h-[300px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[0.875rem] border border-white/10 bg-black/30 px-4 py-3 leading-relaxed">
                {output}
              </output>
              {!busy && (
                <div className="relative mt-3">
                  <CopyButton text={output} />
                </div>
              )}
            </>
          ) : (
            <div className="relative grid min-h-[300px] flex-1 place-items-center rounded-[0.875rem] border border-dashed border-white/10 text-sm text-zinc-600">
              {busy ? "Tarjima qilinmoqda…" : "Tarjima shu yerda paydo bo'ladi"}
            </div>
          )}
        </div>
      </div>
    </PageWrap>
  );
}
