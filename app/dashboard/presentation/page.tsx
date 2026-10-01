"use client";

import { useState } from "react";
import { FileDown, Palette, Presentation, RotateCw, Sparkles } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { Group, Pill } from "@/components/ui/Pills";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { modules } from "@/lib/modules";
import { aiJson } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";
import { THEMES, splitStat, type Slide, type SlideDeck, type Theme } from "@/lib/presentation";

type Lang = "uz" | "ru" | "en";
const LANGS: { id: Lang; label: string }[] = [
  { id: "uz", label: "O'zbekcha" },
  { id: "ru", label: "Русский" },
  { id: "en", label: "English" },
];

const fileName = (title: string) => `${title.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80) || "taqdimot"}.pptx`;

export default function PresentationPage() {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [lang, setLang] = useState<Lang>("uz");
  const [audience, setAudience] = useState("");
  const [details, setDetails] = useState("");
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [deck, setDeck] = useState<SlideDeck | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const theme = THEMES.find((t) => t.id === themeId)!;

  async function generate() {
    if (topic.trim().length < 2 || loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await aiJson<SlideDeck>("/api/ai/presentation", {
        topic: topic.trim(),
        count,
        lang,
        audience: audience.trim() || undefined,
        details: details.trim() || undefined,
      });
      setDeck(res);
      logActivity("presentation", `${res.title} — ${res.slides.length + 1} slayd`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function download() {
    if (!deck) return;
    setExporting(true);
    try {
      const { buildPptx } = await import("@/lib/pptx");
      downloadBlob(await buildPptx(deck, theme), fileName(deck.title));
    } catch (e) {
      setError(`Faylni yaratib bo'lmadi: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.presentation}>
        {deck && (
          <div className="flex gap-2 self-start sm:self-auto">
            <button onClick={() => void generate()} disabled={loading} className="chip">
              {loading ? <Spinner className="size-4" /> : <RotateCw size={15} />} Qayta yaratish
            </button>
            <button onClick={() => void download()} disabled={exporting} className="btn-accent">
              {exporting ? <Spinner className="size-4" /> : <FileDown size={17} />} PowerPoint (.pptx)
            </button>
          </div>
        )}
      </ModuleHeader>
      <FormError message={error} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="glass h-fit space-y-5 rounded-3xl p-6">
          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">Mavzu</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 300))}
              onKeyDown={(e) => e.key === "Enter" && void generate()}
              placeholder="Masalan: Sun'iy intellekt ta'limda"
              className="field accent-ring"
            />
          </label>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <label htmlFor="count" className="text-zinc-400">Slaydlar soni</label>
              <span className="font-semibold tabular-nums">{count}</span>
            </div>
            <input id="count" type="range" min={5} max={25} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-fuchsia-500" />
          </div>

          <Group label="Til">
            {LANGS.map((l) => (
              <Pill key={l.id} active={lang === l.id} onClick={() => setLang(l.id)}>
                {l.label}
              </Pill>
            ))}
          </Group>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">Auditoriya (ixtiyoriy)</span>
            <input value={audience} onChange={(e) => setAudience(e.target.value.slice(0, 120))} placeholder="Masalan: 2-kurs talabalari" className="field accent-ring" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-zinc-400">Qo&apos;shimcha talablar (ixtiyoriy)</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 3000))}
              placeholder="Qaysi bo'limlar bo'lishi kerak, nimaga e'tibor berish kerak…"
              className="field accent-ring min-h-[90px] resize-y text-sm"
            />
          </label>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
              <Palette size={15} /> Dizayn
            </p>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  aria-pressed={themeId === t.id}
                  className={`group rounded-xl p-1 transition ${themeId === t.id ? "ring-2 ring-[color:var(--accent)]" : "ring-1 ring-white/10 hover:ring-white/30"}`}
                >
                  <span className="block aspect-video rounded-lg transition group-hover:scale-105" style={{ background: t.css }} />
                  <span className="mt-1 block truncate text-[11px] text-zinc-400">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => void generate()} disabled={topic.trim().length < 2 || loading} className="btn-accent w-full py-3.5">
            {loading ? <Spinner className="size-4" /> : <Sparkles size={18} />}
            {loading ? "AI slaydlar tuzmoqda…" : "Taqdimot yaratish"}
          </button>
        </div>

        <div>
          {deck ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SlideCard theme={theme} n={1} total={deck.slides.length + 1}>
                <div className="flex h-full flex-col justify-end">
                  <p className="text-[clamp(1rem,2.4vw,1.6rem)] font-bold leading-tight">{deck.title}</p>
                  <div className="mt-2 h-1 w-12 rounded-full" style={{ background: `#${theme.accent}` }} />
                  <p className="mt-2 text-xs" style={{ color: `#${theme.muted}` }}>
                    {deck.subtitle}
                  </p>
                </div>
              </SlideCard>
              {deck.slides.map((s, i) => (
                <SlideCard key={i} theme={theme} n={i + 2} total={deck.slides.length + 1}>
                  <SlideBody slide={s} theme={theme} />
                </SlideCard>
              ))}
            </div>
          ) : (
            <div className="glass grid min-h-[420px] place-items-center rounded-3xl p-8 text-center">
              {loading ? (
                <span className="flex items-center gap-2 text-sm text-zinc-400">
                  <Spinner className="size-4" /> Slaydlar tayyorlanmoqda — odatda 20–60 soniya
                </span>
              ) : (
                <div>
                  <Presentation size={36} className="mx-auto text-zinc-600" />
                  <p className="mt-3 text-sm text-zinc-500">
                    Mavzuni yozing — AI slaydlar matni va ma&apos;ruzachi izohlarini tuzadi.
                    <br />
                    Keyin dizaynni tanlab, PowerPoint faylini yuklab olasiz.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrap>
  );
}

function SlideCard({ theme, n, total, children }: { theme: Theme; n: number; total: number; children: React.ReactNode }) {
  return (
    <div
      className="animate-fade-in relative aspect-video overflow-hidden rounded-2xl border border-white/10 p-5 shadow-xl"
      style={{ background: theme.css, color: `#${theme.fg}` }}
    >
      {children}
      <span className="absolute bottom-2 right-3 text-[10px]" style={{ color: `#${theme.muted}` }}>
        {n} / {total}
      </span>
    </div>
  );
}

function SlideBody({ slide, theme }: { slide: Slide; theme: Theme }) {
  const accent = `#${theme.accent}`;
  if (slide.layout === "quote") {
    return (
      <div className="flex h-full flex-col justify-center">
        <p className="line-clamp-4 text-sm italic leading-snug">“{slide.bullets[0] ?? slide.title}”</p>
        <p className="mt-2 text-[11px]" style={{ color: `#${theme.muted}` }}>
          {slide.title}
        </p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <p className="line-clamp-2 text-sm font-bold leading-tight">{slide.title}</p>
      <div className="mt-1.5 h-0.5 w-8 rounded-full" style={{ background: accent }} />
      {slide.layout === "stats" ? (
        <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
          {slide.bullets.slice(0, 4).map((b, i) => {
            const [num, label] = splitStat(b);
            return (
              <div key={i} className="rounded-lg p-1.5" style={{ background: `#${theme.panel}` }}>
                <p className="truncate text-sm font-bold" style={{ color: accent }}>
                  {num}
                </p>
                <p className="line-clamp-2 text-[10px] leading-tight">{label}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className={`mt-2 space-y-0.5 text-[11px] leading-snug ${slide.layout === "two-column" ? "columns-2 gap-3" : ""}`}>
          {slide.bullets.map((b, i) => (
            <li key={i} className="line-clamp-2 break-inside-avoid">
              <span style={{ color: accent }}>●</span> {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
