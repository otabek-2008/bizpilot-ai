"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Combine,
  Download,
  FileStack,
  Loader2,
  Repeat,
  ShieldCheck,
  X,
} from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Dropzone from "@/components/ui/Dropzone";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { downloadBlob, formatBytes } from "@/lib/download";
import { ACCEPT_ALL, SOURCES, acceptFor, combinationCount, detectFormat, format, targetsFor, TARGETS, type FormatId, type FormatKind } from "@/lib/convert/formats";

type Mode = "convert" | "merge";
type Result = { blob: Blob; name: string; note?: string };

const GROUPS: { kind: FormatKind; label: string }[] = [
  { kind: "doc", label: "Hujjatlar" },
  { kind: "data", label: "Jadval va ma'lumot" },
  { kind: "image", label: "Rasmlar" },
];

// Eng ko'p ishlatiladigan yo'nalishlar — bir bosishda tanlash
const POPULAR: [FormatId, FormatId][] = [
  ["pdf", "docx"],
  ["docx", "pdf"],
  ["jpg", "pdf"],
  ["pdf", "jpg"],
  ["pptx", "pdf"],
  ["xlsx", "csv"],
  ["csv", "xlsx"],
  ["docx", "txt"],
  ["md", "docx"],
  ["png", "jpg"],
];

const COMBOS = combinationCount();

export default function DocumentsPage() {
  const [mode, setMode] = useState<Mode>("convert");
  const [from, setFrom] = useState<FormatId>("pdf");
  const [to, setTo] = useState<FormatId>("docx");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  const [fit, setFit] = useState<"a4" | "image">("a4");
  const [scale, setScale] = useState(2);

  const targets = useMemo(() => targetsFor(from), [from]);
  const src = format(from);
  const dst = format(to);

  function reset() {
    setResult(null);
    setError("");
    setProgress(0);
  }

  function chooseFrom(id: FormatId, keepFiles = false) {
    setFrom(id);
    const valid = targetsFor(id);
    if (!valid.some((t) => t.id === to)) setTo(valid[0].id);
    if (!keepFiles && id !== from) setFiles([]);
    reset();
  }

  function chooseMode(m: Mode) {
    setMode(m);
    setFiles([]);
    reset();
  }

  function addFiles(list: File[]) {
    reset();
    if (mode === "merge") {
      const pdfs = list.filter((f) => detectFormat(f) === "pdf");
      if (pdfs.length < list.length) setError("Birlashtirish uchun faqat PDF fayllar qabul qilinadi.");
      setFiles((cur) => [...cur, ...pdfs]);
      return;
    }
    // Birinchi fayl bo'yicha manba formatini avtomatik aniqlaymiz
    let source = from;
    if (!files.length) {
      const detected = list.map(detectFormat).find(Boolean);
      if (!detected) {
        setError("Bu fayl formati qo'llab-quvvatlanmaydi.");
        return;
      }
      source = detected;
      if (detected !== from) chooseFrom(detected, true);
    }
    const sameKind = (f: File) => {
      const d = detectFormat(f);
      return d === source || (format(source).kind === "image" && !!d && format(d).kind === "image");
    };
    const ok = list.filter(sameKind);
    if (ok.length < list.length) {
      const what = format(source).kind === "image" ? "rasm emas" : `${format(source).label} formatida emas`;
      setError(`${list.length - ok.length} ta fayl ${what} — ular qo'shilmadi. Boshqa formatdagi fayl uchun avval ro'yxatni tozalang.`);
    }
    setFiles((cur) => [...cur, ...ok]);
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
    reset();
    const onProgress = (done: number, total: number) => setProgress(Math.min(1, done / total));
    try {
      let res: Result;
      if (mode === "merge") {
        const { mergePdfs } = await import("@/lib/doc-convert");
        res = { blob: await mergePdfs(files, onProgress), name: "birlashtirilgan.pdf", note: `${files.length} ta fayl birlashtirildi` };
        logActivity("documents", `PDF birlashtirish: ${files[0].name} (+${files.length - 1})`);
      } else {
        const { convert } = await import("@/lib/convert");
        res = await convert(files, from, to, { fit, scale }, onProgress);
        logActivity("documents", `${src.label} → ${dst.label}: ${files[0].name}${files.length > 1 ? ` (+${files.length - 1})` : ""}`);
      }
      setResult(res);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Konvertatsiyada xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  }

  const ready = files.length >= (mode === "merge" ? 2 : 1) && !busy;
  const showFit = mode === "convert" && src.kind === "image" && to === "pdf";
  const showScale = mode === "convert" && dst.kind === "image" && src.kind !== "image";

  return (
    <PageWrap>
      <ModuleHeader module={modules.documents}>
        <span className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
          <ShieldCheck size={14} /> Fayllar serverga yuborilmaydi
        </span>
      </ModuleHeader>

      {/* Rejim */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button className="chip" data-active={mode === "convert"} onClick={() => chooseMode("convert")}>
          <Repeat size={14} /> Format o&apos;zgartirish
        </button>
        <button className="chip" data-active={mode === "merge"} onClick={() => chooseMode("merge")}>
          <Combine size={14} /> PDF birlashtirish
        </button>
        {mode === "convert" && (
          <span className="ml-auto text-xs text-zinc-500">
            {SOURCES.length} ta format · {COMBOS} ta yo&apos;nalish
          </span>
        )}
      </div>

      {mode === "convert" && (
        <>
          {/* Mashhur yo'nalishlar */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {POPULAR.map(([a, b]) => {
              const active = from === a && to === b;
              return (
                <button
                  key={`${a}-${b}`}
                  onClick={() => {
                    chooseFrom(a);
                    setTo(b);
                  }}
                  data-active={active}
                  className="chip shrink-0 whitespace-nowrap"
                >
                  {format(a).label} <ArrowRight size={12} className="opacity-60" /> {format(b).label}
                </button>
              );
            })}
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <FormatPicker
              title="Qaysi formatdan"
              selected={from}
              onSelect={(id) => chooseFrom(id)}
              items={SOURCES.map((f) => ({ id: f.id, enabled: true }))}
            />
            <FormatPicker
              title={`Qaysi formatga · ${targets.length} ta variant`}
              selected={to}
              onSelect={(id) => {
                setTo(id);
                reset();
              }}
              items={TARGETS.map((f) => ({ id: f.id, enabled: targets.some((t) => t.id === f.id) }))}
              disabledHint={src.kind === "image" ? "Rasmdan matn olish (OCR) hozircha mavjud emas" : "Bir xil format"}
            />
          </div>
        </>
      )}

      <div key={mode} className="enter-blur grid gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Dropzone
            accept={mode === "merge" ? acceptFor("pdf") : files.length ? (src.kind === "image" ? SOURCES.filter((f) => f.kind === "image").map((f) => acceptFor(f.id)).join(",") : acceptFor(from)) : ACCEPT_ALL}
            multiple
            onFiles={addFiles}
            title={files.length ? "Yana fayl qo'shish" : "Faylni tashlang yoki tanlang"}
            hint={mode === "merge" ? "Ikki yoki undan ko'p PDF" : files.length ? `${src.label} · bir nechta fayl mumkin` : "Format avtomatik aniqlanadi · bir nechta fayl mumkin"}
            disabled={busy}
          />

          {showFit && (
            <Options label="Sahifa o'lchami">
              <button className="chip" data-active={fit === "a4"} onClick={() => setFit("a4")}>A4</button>
              <button className="chip" data-active={fit === "image"} onClick={() => setFit("image")}>Rasm o&apos;lchamida</button>
            </Options>
          )}
          {showScale && (
            <Options label="Rasm sifati">
              {[
                [1.5, "O'rta"],
                [2, "Yuqori"],
                [3, "Juda yuqori"],
              ].map(([s, l]) => (
                <button key={s} className="chip" data-active={scale === s} onClick={() => setScale(s as number)}>
                  {l}
                </button>
              ))}
            </Options>
          )}
          {mode === "convert" && <p className="px-1 text-xs leading-relaxed text-zinc-500">{conversionHint(from, to)}</p>}
        </div>

        <div className="glass flex flex-col rounded-3xl p-5 lg:col-span-3">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-zinc-400">{mode === "merge" ? "PDF+" : src.label.toUpperCase()}</span>
            <span className="accent-gradient h-px flex-1" />
            <span className="accent-soft rounded-lg px-2 py-1 font-mono text-xs">{mode === "merge" ? "PDF" : dst.label.toUpperCase()}</span>
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
                  {files.length > 1 && (
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
            {busy ? <Loader2 size={18} className="animate-spin" /> : mode === "merge" ? <Combine size={18} /> : <FileStack size={18} />}
            {busy ? "Ishlanmoqda…" : mode === "merge" ? "PDF birlashtirish — boshlash" : `${src.label} → ${dst.label} — boshlash`}
          </button>
          {mode === "merge" && files.length === 1 && (
            <p className="mt-2 text-center text-xs text-zinc-500">Kamida yana bitta PDF qo&apos;shing</p>
          )}
        </div>
      </div>
    </PageWrap>
  );
}

function conversionHint(from: FormatId, to: FormatId): string {
  const s = format(from);
  const d = format(to);
  if (s.kind === "image" && d.kind !== "image") return "Bir nechta rasm tanlasangiz, hammasi bitta faylga — har biri alohida sahifa yoki slaydga joylanadi.";
  if (from === "pdf" && to === "docx") return "Matn, sarlavhalar va chegarali jadvallar saqlanadi. Skanerlangan PDF (rasm) uchun matn chiqmaydi.";
  if (from === "pdf") return "PDF'dagi matn va jadvallar o'qiladi; skanerlangan sahifalardan matn chiqmaydi. Shrift va joylashuv soddalashtiriladi.";
  if (d.kind === "image") return "Hujjat A4 sahifalarga chiziladi; bir nechta sahifa bo'lsa — ZIP arxivda.";
  if (to === "pdf") return "Hujjat A4 sahifalarga joylab chiziladi.";
  if (d.kind === "data" && s.kind !== "data") return "Hujjatdagi jadvallar ustun va qatorlarga o'tadi; jadval bo'lmasa, har bir xatboshi alohida qator bo'ladi.";
  if (s.kind === "data" && d.kind === "doc") return "Har bir jadval (varaq) hujjatda alohida jadval bo'lib chiqadi.";
  if (to === "pptx") return "Har bir sarlavha yangi slayd boshlaydi; uzun matn keyingi slaydga o'tadi.";
  if (to === "txt") return "Faqat matn saqlanadi — rasmlar va formatlash tushib qoladi.";
  if (to === "epub") return "Hujjat sarlavhalar bo'yicha boblarga bo'linadi.";
  return "Sarlavhalar, ro'yxatlar, jadvallar, qalin/kursiv matn va rasmlar imkon qadar saqlanadi.";
}

function FormatPicker({
  title,
  items,
  selected,
  onSelect,
  disabledHint,
}: {
  title: string;
  items: { id: FormatId; enabled: boolean }[];
  selected: FormatId;
  onSelect: (id: FormatId) => void;
  disabledHint?: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="mb-3 text-sm text-zinc-400">{title}</p>
      <div className="space-y-3">
        {GROUPS.map((g) => {
          const group = items.filter((it) => format(it.id).kind === g.kind);
          if (!group.length) return null;
          return (
            <div key={g.kind}>
              <p className="mb-1.5 text-[11px] uppercase tracking-wider text-zinc-600">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.map(({ id, enabled }) => {
                  const f = format(id);
                  return (
                    <button
                      key={id}
                      className="chip disabled:cursor-not-allowed disabled:opacity-30"
                      data-active={selected === id}
                      disabled={!enabled}
                      title={enabled ? f.desc : disabledHint}
                      onClick={() => onSelect(id)}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
