"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Download, Eraser, FileText, Loader2, Sparkles, Type, Upload, X } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import CopyButton from "@/components/ui/CopyButton";
import Dropzone from "@/components/ui/Dropzone";
import { modules } from "@/lib/modules";
import { cyrillicToLatin, detectScript, latinToCyrillic, type ApostropheStyle } from "@/lib/translit";
import { logActivity } from "@/lib/activity";
import { baseName, downloadBlob, formatBytes } from "@/lib/download";

type Direction = "auto" | "l2c" | "c2l";
type FileJob = { id: string; file: File; status: "wait" | "work" | "done" | "error"; result?: Blob; error?: string };

const MAX_BYTES = 50 * 1024 * 1024;

export default function TransliteratePage() {
  const [tab, setTab] = useState<"text" | "file">("text");
  const [direction, setDirection] = useState<Direction>("auto");
  const [style, setStyle] = useState<ApostropheStyle>("official");
  const [input, setInput] = useState("");
  const [jobs, setJobs] = useState<FileJob[]>([]);

  const detected = useMemo(() => detectScript(input), [input]);
  const effective: "l2c" | "c2l" =
    direction === "auto" ? (detected === "cyrillic" ? "c2l" : "l2c") : direction;

  const convert = useMemo(
    () =>
      (text: string, prev = "") =>
        effective === "l2c" ? latinToCyrillic(text, prev) : cyrillicToLatin(text, style, prev),
    [effective, style],
  );

  const output = useMemo(() => convert(input), [convert, input]);
  const fromLabel = effective === "l2c" ? "Lotin" : "Кирилл";
  const toLabel = effective === "l2c" ? "Кирилл" : "Lotin";

  function swap() {
    setDirection(effective === "l2c" ? "c2l" : "l2c");
    setInput(output);
  }

  function addFiles(files: File[]) {
    const next: FileJob[] = files.map((file) => {
      const id = crypto.randomUUID();
      if (file.size > MAX_BYTES) return { id, file, status: "error", error: "Fayl 50 MB dan katta" };
      if (!/\.(txt|docx)$/i.test(file.name)) return { id, file, status: "error", error: "Faqat .txt yoki .docx" };
      return { id, file, status: "wait" };
    });
    setJobs((cur) => [...cur, ...next]);
  }

  async function runAll() {
    const update = (id: string, patch: Partial<FileJob>) =>
      setJobs((cur) => cur.map((j) => (j.id === id ? { ...j, ...patch } : j)));

    for (const job of jobs.filter((j) => j.status === "wait")) {
      update(job.id, { status: "work" });
      try {
        let result: Blob;
        if (/\.docx$/i.test(job.file.name)) {
          const { transliterateDocx } = await import("@/lib/docx-translit");
          // Faylning o'z yozuvini aniqlash (avto rejimda)
          let dir = direction;
          if (dir === "auto") {
            const JSZip = (await import("jszip")).default;
            const zip = await JSZip.loadAsync(job.file);
            const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
            dir = detectScript(xml.replace(/<[^>]+>/g, " ")) === "cyrillic" ? "c2l" : "l2c";
          }
          result = await transliterateDocx(job.file, (t, prev) =>
            dir === "l2c" ? latinToCyrillic(t, prev) : cyrillicToLatin(t, style, prev),
          );
        } else {
          const text = await job.file.text();
          const dir = direction === "auto" ? (detectScript(text) === "cyrillic" ? "c2l" : "l2c") : direction;
          const converted = dir === "l2c" ? latinToCyrillic(text) : cyrillicToLatin(text, style);
          result = new Blob([converted], { type: "text/plain;charset=utf-8" });
        }
        update(job.id, { status: "done", result });
        logActivity("translit", `Fayl o'girildi: ${job.file.name}`);
      } catch (e) {
        console.error(e);
        update(job.id, { status: "error", error: "Faylni o'qib bo'lmadi" });
      }
    }
  }

  const outName = (f: File) => {
    const ext = f.name.match(/\.[^.]+$/)?.[0] ?? ".txt";
    return `${baseName(f.name)}-${effective === "l2c" ? "kirill" : "lotin"}${ext}`;
  };

  return (
    <PageWrap>
      <ModuleHeader module={modules.translit}>
        <div className="glass flex gap-1 self-start rounded-2xl p-1">
          {[
            { id: "text" as const, label: "Matn", icon: Type },
            { id: "file" as const, label: "Fayl", icon: Upload },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${
                tab === t.id ? "accent-gradient text-white shadow-lg" : "text-zinc-400 hover:text-white"
              }`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      </ModuleHeader>

      {/* Yo'nalish va sozlamalar */}
      <div className="glass mb-5 flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "auto" as const, label: "Avto" },
            { id: "l2c" as const, label: "Lotin → Кирилл" },
            { id: "c2l" as const, label: "Кирилл → Lotin" },
          ].map((d) => (
            <button key={d.id} onClick={() => setDirection(d.id)} data-active={direction === d.id} className="chip">
              {d.id === "auto" && <Sparkles size={14} />}
              {d.label}
            </button>
          ))}
        </div>
        {direction === "auto" && input && tab === "text" && (
          <span className="animate-fade-in text-xs text-zinc-500">
            Aniqlandi: <span className="text-zinc-300">{detected === "cyrillic" ? "kirill" : "lotin"}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
          <span className="hidden sm:inline">Lotinda o&apos;/g&apos;:</span>
          <button onClick={() => setStyle("official")} data-active={style === "official"} className="chip !py-1.5">
            oʻ gʻ taʼlim
          </button>
          <button onClick={() => setStyle("simple")} data-active={style === "simple"} className="chip !py-1.5">
            o&apos; g&apos; ta&apos;lim
          </button>
        </div>
      </div>

      {tab === "text" ? (
        <div className="relative grid gap-4 lg:grid-cols-2">
          <Pane label={fromLabel}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={effective === "l2c" ? "O'zbekcha lotin matnni kiriting…" : "Ўзбекча кирилл матнни киритинг…"}
              className="field accent-ring min-h-[320px] flex-1 resize-y leading-relaxed"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setInput("")}
                disabled={!input}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <Eraser size={13} /> Tozalash
              </button>
            </div>
          </Pane>

          <button
            onClick={swap}
            aria-label="Yo'nalishni almashtirish"
            className="accent-gradient absolute left-1/2 top-1/2 z-10 hidden size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-[0_10px_30px_-8px_var(--accent)] ring-4 ring-ink transition duration-500 hover:rotate-180 lg:grid"
          >
            <ArrowLeftRight size={18} />
          </button>

          <Pane label={toLabel} highlight>
            <output
              key={effective}
              className="enter-flip min-h-[320px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-[0.875rem] border border-white/10 bg-black/30 px-4 py-3 leading-relaxed"
            >
              {output || <span className="text-zinc-600">Natija shu yerda</span>}
            </output>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={output} onCopied={() => logActivity("translit", `${fromLabel} → ${toLabel}: matn nusxalandi`)} />
              <button
                className="chip disabled:opacity-40"
                disabled={!output}
                onClick={() => {
                  downloadBlob(new Blob([output], { type: "text/plain;charset=utf-8" }), `campusai-${effective === "l2c" ? "kirill" : "lotin"}.txt`);
                  logActivity("translit", `${fromLabel} → ${toLabel}: .txt yuklab olindi`);
                }}
              >
                <Download size={15} /> .txt
              </button>
              <button className="chip lg:hidden" onClick={swap}>
                <ArrowLeftRight size={15} /> Almashtirish
              </button>
            </div>
          </Pane>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Dropzone
              accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onFiles={addFiles}
              title="Faylni tashlang yoki tanlang"
              hint=".txt va .docx · 50 MB gacha · bir nechta fayl"
            />
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              .docx fayllarda shrift, jadval, rasm va formatlash to&apos;liq saqlanadi. Fayllar
              serverga yuborilmaydi — hammasi brauzeringizda bajariladi.
            </p>
          </div>
          <div className="glass rounded-3xl p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Fayllar ({jobs.length})</p>
              <div className="flex gap-2">
                {jobs.length > 0 && (
                  <button onClick={() => setJobs([])} className="chip !py-1.5">
                    Tozalash
                  </button>
                )}
                <button
                  onClick={runAll}
                  disabled={!jobs.some((j) => j.status === "wait")}
                  className="btn-accent !py-2 text-sm"
                >
                  <Sparkles size={15} /> O&apos;girish
                </button>
              </div>
            </div>
            {jobs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-zinc-500">
                Hali fayl tanlanmagan
              </p>
            ) : (
              <ul className="stagger space-y-2">
                {jobs.map((j) => (
                  <li key={j.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="accent-soft grid size-10 shrink-0 place-items-center rounded-xl">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{j.file.name}</p>
                      <p className={`text-xs ${j.status === "error" ? "text-red-300" : "text-zinc-500"}`}>
                        {j.status === "error" ? j.error : formatBytes(j.file.size)}
                        {j.status === "done" && " · tayyor ✓"}
                      </p>
                    </div>
                    {j.status === "work" && <Loader2 size={18} className="animate-spin text-zinc-400" />}
                    {j.status === "done" && j.result && (
                      <button onClick={() => downloadBlob(j.result!, outName(j.file))} className="btn-accent !px-3 !py-2 text-sm">
                        <Download size={15} />
                      </button>
                    )}
                    {j.status !== "work" && (
                      <button
                        aria-label="Olib tashlash"
                        onClick={() => setJobs((cur) => cur.filter((x) => x.id !== j.id))}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </PageWrap>
  );
}

function Pane({ label, highlight, children }: { label: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div className="glass relative flex flex-col overflow-hidden rounded-3xl p-5">
      {highlight && <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />}
      <p className="relative mb-3 text-sm font-medium text-zinc-300">{label}</p>
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
