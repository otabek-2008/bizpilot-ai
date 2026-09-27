"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Combine,
  Download,
  FileImage,
  FileText,
  Images,
  Loader2,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Dropzone from "@/components/ui/Dropzone";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { baseName, downloadBlob, formatBytes } from "@/lib/download";

type ToolId = "pdf2word" | "word2pdf" | "img2pdf" | "pdf2img" | "merge";

type Tool = {
  id: ToolId;
  title: string;
  desc: string;
  icon: LucideIcon;
  accept: string;
  multiple: boolean;
  hint: string;
  from: string;
  to: string;
};

const TOOLS: Tool[] = [
  { id: "pdf2word", title: "PDF → Word", desc: "Matnni tahrirlanadigan .docx ga", icon: FileText, accept: "application/pdf,.pdf", multiple: false, hint: "Bitta PDF fayl", from: "PDF", to: "DOCX" },
  { id: "word2pdf", title: "Word → PDF", desc: ".docx hujjatni PDF ga", icon: FileText, accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", multiple: false, hint: "Bitta .docx fayl", from: "DOCX", to: "PDF" },
  { id: "img2pdf", title: "Rasm → PDF", desc: "Bir nechta rasmni bitta PDF ga", icon: FileImage, accept: "image/*", multiple: true, hint: "JPG, PNG, WEBP · bir nechta rasm", from: "IMG", to: "PDF" },
  { id: "pdf2img", title: "PDF → Rasm", desc: "Har bir sahifani rasmga", icon: Images, accept: "application/pdf,.pdf", multiple: false, hint: "Bitta PDF fayl", from: "PDF", to: "IMG" },
  { id: "merge", title: "PDF birlashtirish", desc: "Bir nechta PDF ni bittaga", icon: Combine, accept: "application/pdf,.pdf", multiple: true, hint: "Ikki yoki undan ko'p PDF", from: "PDF+", to: "PDF" },
];

type Result = { blob: Blob; name: string; note?: string };

export default function DocumentsPage() {
  const [toolId, setToolId] = useState<ToolId>("pdf2word");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const [fit, setFit] = useState<"a4" | "image">("a4");
  const [imgFormat, setImgFormat] = useState<"png" | "jpg">("png");
  const [imgScale, setImgScale] = useState(2);

  const tool = TOOLS.find((t) => t.id === toolId)!;

  function pick(id: ToolId) {
    setToolId(id);
    setFiles([]);
    setResult(null);
    setError("");
    setProgress(0);
  }

  function addFiles(list: File[]) {
    setResult(null);
    setError("");
    setFiles((cur) => (tool.multiple ? [...cur, ...list] : list.slice(0, 1)));
  }

  function move(i: number, d: -1 | 1) {
    setFiles((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    setProgress(0);
    const onProgress = (done: number, total: number) => setProgress(done / total);
    try {
      const lib = await import("@/lib/doc-convert");
      const first = files[0];
      let res: Result;
      switch (toolId) {
        case "pdf2word":
          res = { blob: await lib.pdfToWord(first, onProgress), name: `${baseName(first.name)}.docx`, note: "Matn va sarlavhalar saqlanadi; murakkab joylashuv soddalashtiriladi." };
          break;
        case "word2pdf":
          res = { blob: await lib.wordToPdf(first, onProgress), name: `${baseName(first.name)}.pdf` };
          break;
        case "img2pdf":
          res = { blob: await lib.imagesToPdf(files, fit, onProgress), name: `${baseName(first.name)}${files.length > 1 ? `-va-${files.length - 1}-ta` : ""}.pdf` };
          break;
        case "pdf2img": {
          const pages = await lib.pdfToImages(first, imgFormat, imgScale, onProgress);
          res =
            pages.length === 1
              ? { blob: pages[0].blob, name: `${baseName(first.name)}.${imgFormat}` }
              : { blob: await lib.zipFiles(pages), name: `${baseName(first.name)}-rasmlar.zip`, note: `${pages.length} ta sahifa ZIP arxivda` };
          break;
        }
        case "merge":
          res = { blob: await lib.mergePdfs(files, onProgress), name: "birlashtirilgan.pdf", note: `${files.length} ta fayl birlashtirildi` };
          break;
      }
      setResult(res);
      logActivity("documents", `${tool.title}: ${first.name}${files.length > 1 ? ` (+${files.length - 1})` : ""}`);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Konvertatsiyada xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  }

  const minFiles = toolId === "merge" ? 2 : 1;
  const ready = files.length >= minFiles && !busy;

  return (
    <PageWrap>
      <ModuleHeader module={modules.documents}>
        <span className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
          <ShieldCheck size={14} /> Fayllar serverga yuborilmaydi
        </span>
      </ModuleHeader>

      {/* Vosita tanlash */}
      <div className="stagger mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {TOOLS.map((t) => {
          const active = t.id === toolId;
          return (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`glass lift group relative overflow-hidden rounded-2xl p-4 text-left ${active ? "!border-[color:var(--accent)]" : ""}`}
            >
              {active && <span aria-hidden className="accent-gradient absolute inset-0 opacity-15" />}
              <span className={`lift-icon relative grid size-10 place-items-center rounded-xl ${active ? "accent-gradient" : "accent-soft"}`}>
                <t.icon size={18} />
              </span>
              <p className="relative mt-3 text-sm font-semibold">{t.title}</p>
              <p className="relative mt-0.5 text-xs text-zinc-500">{t.desc}</p>
            </button>
          );
        })}
      </div>

      <div key={toolId} className="enter-blur grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Dropzone accept={tool.accept} multiple={tool.multiple} onFiles={addFiles} title={files.length && !tool.multiple ? "Boshqa fayl tanlash" : "Faylni tashlang yoki tanlang"} hint={tool.hint} disabled={busy} />

          {/* Qo'shimcha sozlamalar */}
          {toolId === "img2pdf" && (
            <Options label="Sahifa o'lchami">
              <button className="chip" data-active={fit === "a4"} onClick={() => setFit("a4")}>A4</button>
              <button className="chip" data-active={fit === "image"} onClick={() => setFit("image")}>Rasm o&apos;lchamida</button>
            </Options>
          )}
          {toolId === "pdf2img" && (
            <>
              <Options label="Format">
                <button className="chip" data-active={imgFormat === "png"} onClick={() => setImgFormat("png")}>PNG</button>
                <button className="chip" data-active={imgFormat === "jpg"} onClick={() => setImgFormat("jpg")}>JPG</button>
              </Options>
              <Options label="Sifat">
                {[
                  [1.5, "O'rta"],
                  [2, "Yuqori"],
                  [3, "Juda yuqori"],
                ].map(([s, l]) => (
                  <button key={s} className="chip" data-active={imgScale === s} onClick={() => setImgScale(s as number)}>
                    {l}
                  </button>
                ))}
              </Options>
            </>
          )}
        </div>

        <div className="glass flex flex-col rounded-3xl p-5 lg:col-span-3">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-zinc-400">{tool.from}</span>
            <span className="accent-gradient h-px flex-1" />
            <span className="accent-soft rounded-lg px-2 py-1 font-mono text-xs">{tool.to}</span>
          </div>

          {files.length === 0 ? (
            <p className="grid flex-1 place-items-center rounded-2xl border border-dashed border-white/10 py-12 text-sm text-zinc-500">
              Fayl tanlanmagan
            </p>
          ) : (
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="animate-bubble-in flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 font-mono text-xs text-zinc-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{f.name}</p>
                    <p className="text-xs text-zinc-500">{formatBytes(f.size)}</p>
                  </div>
                  {tool.multiple && files.length > 1 && (
                    <div className="flex">
                      <IconBtn label="Yuqoriga" onClick={() => move(i, -1)} disabled={i === 0 || busy}><ArrowUp size={15} /></IconBtn>
                      <IconBtn label="Pastga" onClick={() => move(i, 1)} disabled={i === files.length - 1 || busy}><ArrowDown size={15} /></IconBtn>
                    </div>
                  )}
                  <IconBtn label="Olib tashlash" onClick={() => setFiles((c) => c.filter((_, k) => k !== i))} disabled={busy}><X size={15} /></IconBtn>
                </li>
              ))}
            </ul>
          )}

          {busy && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div className="accent-gradient h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(6, progress * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-zinc-500">Ishlanmoqda… {Math.round(progress * 100)}%</p>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="animate-bubble-in mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4">
              <CheckCircle2 className="shrink-0 text-emerald-300" size={22} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{result.name}</p>
                <p className="text-xs text-zinc-400">
                  {formatBytes(result.blob.size)}
                  {result.note && ` · ${result.note}`}
                </p>
              </div>
              <button onClick={() => downloadBlob(result.blob, result.name)} className="btn-accent !py-2 text-sm">
                <Download size={15} /> Yuklab olish
              </button>
            </div>
          )}

          <button onClick={run} disabled={!ready} className="btn-accent mt-5 w-full py-3.5">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <tool.icon size={18} />}
            {busy ? "Konvertatsiya qilinmoqda…" : `${tool.title} — boshlash`}
          </button>
          {toolId === "merge" && files.length === 1 && (
            <p className="mt-2 text-center text-xs text-zinc-500">Kamida yana bitta PDF qo&apos;shing</p>
          )}
        </div>
      </div>
    </PageWrap>
  );
}

function Options({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="mb-2.5 text-sm text-zinc-400">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} disabled={disabled} className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-30">
      {children}
    </button>
  );
}
