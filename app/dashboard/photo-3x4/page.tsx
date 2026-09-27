"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, ImagePlus, Loader2, Printer, RotateCcw, ScanFace, ZoomIn } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Dropzone from "@/components/ui/Dropzone";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";
import {
  autoCrop,
  canvasToBlob,
  centerCrop,
  loadImage,
  personMask,
  pxForCm,
  renderCrop,
  replaceBackground,
  type Crop,
  type PersonMask,
} from "@/lib/photo";

const BACKGROUNDS = [
  { id: "original", label: "Asl fon", color: "" },
  { id: "white", label: "Oq", color: "#ffffff" },
  { id: "blue", label: "Ko'k", color: "#1f5fbf" },
  { id: "sky", label: "Havorang", color: "#9fc5ee" },
  { id: "gray", label: "Kulrang", color: "#d9dde3" },
] as const;

type BgId = (typeof BACKGROUNDS)[number]["id"];

const PREVIEW_W = 600;
const PREVIEW_H = 800;

export default function Photo3x4Page() {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [fileName, setFileName] = useState("rasm");
  const [crop, setCrop] = useState<Crop | null>(null);
  const [baseW, setBaseW] = useState(1);
  const [bg, setBg] = useState<BgId>("original");
  const [mask, setMask] = useState<PersonMask | null>(null);
  const [busy, setBusy] = useState<"" | "face" | "mask" | "save">("");
  const [note, setNote] = useState("");
  const [dpi, setDpi] = useState<300 | 600>(300);
  const [format, setFormat] = useState<"jpg" | "png">("jpg");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const bgColor = BACKGROUNDS.find((b) => b.id === bg)!.color;
  const fillColor = bgColor || "#ffffff";

  // Fon almashtirilgan manba
  const processed = useMemo(() => {
    if (!source) return null;
    if (!bgColor || !mask) return source;
    return replaceBackground(source, mask, bgColor);
  }, [source, mask, bgColor]);

  // Oldindan ko'rish
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !processed || !crop) return;
    renderCrop(canvas.getContext("2d")!, processed, crop, PREVIEW_W, PREVIEW_H, fillColor);
  }, [processed, crop, fillColor]);

  async function onFile(files: File[]) {
    const file = files[0];
    setNote("");
    setMask(null);
    setBg("original");
    try {
      const img = await loadImage(file);
      setFileName(file.name.replace(/\.[^.]+$/, ""));
      setSource(img);
      const fallback = centerCrop(img.width, img.height);
      setCrop(fallback);
      setBaseW(fallback.w);
      void runAutoCrop(img);
    } catch {
      setNote("Rasmni ochib bo'lmadi. JPG, PNG yoki WEBP formatini sinab ko'ring.");
    }
  }

  async function runAutoCrop(img: HTMLCanvasElement) {
    setBusy("face");
    try {
      const { crop: c, found } = await autoCrop(img);
      setCrop(c);
      setBaseW(c.w);
      setNote(found ? "" : "Yuz topilmadi — rasmni qo'lda joylashtiring.");
    } catch (e) {
      console.error(e);
      setNote("Avtomatik kesish modeli yuklanmadi (internetni tekshiring). Qo'lda joylashtirishingiz mumkin.");
    } finally {
      setBusy("");
    }
  }

  async function chooseBg(id: BgId) {
    setBg(id);
    if (id === "original" || mask || !source) return;
    setBusy("mask");
    try {
      setMask(await personMask(source));
    } catch (e) {
      console.error(e);
      setNote("Fonni ajratish modeli yuklanmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.");
      setBg("original");
    } finally {
      setBusy("");
    }
  }

  // Surish
  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !crop) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const k = crop.w / rect.width;
    const dx = (e.clientX - drag.current.x) * k;
    const dy = (e.clientY - drag.current.y) * k;
    drag.current = { x: e.clientX, y: e.clientY };
    setCrop({ ...crop, x: crop.x - dx, y: crop.y - dy });
  }
  const onPointerUp = () => (drag.current = null);

  const zoom = crop ? baseW / crop.w : 1;
  function setZoom(z: number) {
    if (!crop) return;
    const w = baseW / Math.min(4, Math.max(0.4, z));
    const h = (w * 4) / 3;
    setCrop({ x: crop.x + (crop.w - w) / 2, y: crop.y + (crop.h - h) / 2, w, h });
  }

  // Sichqoncha g'ildiragi bilan zoom (sahifa aylanmasligi uchun passive: false)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCrop((c) => {
        if (!c) return c;
        const f = e.deltaY > 0 ? 1.06 : 1 / 1.06;
        const w = Math.min(baseW / 0.4, Math.max(baseW / 4, c.w * f));
        const h = (w * 4) / 3;
        return { x: c.x + (c.w - w) / 2, y: c.y + (c.h - h) / 2, w, h };
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [baseW, source]);

  async function download(kind: "single" | "sheet") {
    if (!processed || !crop) return;
    setBusy("save");
    try {
      const pw = pxForCm(3, dpi);
      const ph = pxForCm(4, dpi);
      const out = document.createElement("canvas");
      if (kind === "single") {
        out.width = pw;
        out.height = ph;
        renderCrop(out.getContext("2d")!, processed, crop, pw, ph, fillColor);
      } else {
        // 10×15 sm varaq: 3×3 = 9 ta rasm, kesish chiziqlari bilan
        out.width = pxForCm(10, dpi);
        out.height = pxForCm(15, dpi);
        const ctx = out.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, out.width, out.height);
        const gap = pxForCm(0.25, dpi);
        const x0 = (out.width - (3 * pw + 2 * gap)) / 2;
        const y0 = pxForCm(0.6, dpi);
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const x = Math.round(x0 + c * (pw + gap));
            const y = Math.round(y0 + r * (ph + gap));
            renderCrop(ctx, processed, crop, pw, ph, fillColor, x, y);
            ctx.strokeStyle = "#c8c8c8";
            ctx.lineWidth = Math.max(1, dpi / 300);
            ctx.strokeRect(x, y, pw, ph);
          }
        }
      }
      const blob = await canvasToBlob(out, format, dpi);
      const suffix = kind === "single" ? "3x4" : "3x4-varaq-10x15";
      downloadBlob(blob, `${fileName}-${suffix}.${format}`);
      logActivity("photo", kind === "single" ? `3×4 rasm tayyorlandi (${format.toUpperCase()}, ${dpi} DPI)` : "10×15 chop etish varag'i tayyorlandi");
    } finally {
      setBusy("");
    }
  }

  function reset() {
    setSource(null);
    setCrop(null);
    setMask(null);
    setBg("original");
    setNote("");
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.photo}>
        {source && (
          <button onClick={reset} className="chip self-start">
            <ImagePlus size={15} /> Boshqa rasm
          </button>
        )}
      </ModuleHeader>

      <Steps step={!source ? 1 : bg === "original" ? 2 : 3} />

      {!source ? (
        <div className="enter-zoom mx-auto max-w-2xl">
          <Dropzone
            accept="image/*"
            onFiles={onFile}
            title="Rasmingizni yuklang"
            hint="JPG, PNG, WEBP · yuzingiz aniq ko'rinadigan, old tomondan olingan rasm"
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["Yorug' joyda", "Yuzga soya tushmasin"],
              ["To'g'ri qarang", "Bosh va yelkalar ko'rinsin"],
              ["Oddiy fon", "Fonni keyin almashtirish mumkin"],
            ].map(([t, d]) => (
              <div key={t} className="glass rounded-2xl p-4 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <Check size={15} className="text-amber-300" /> {t}
                </p>
                <p className="mt-1 text-zinc-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Tahrirlash oynasi */}
          <div className="enter-zoom">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_30px_80px_-30px_var(--accent)]">
              <canvas
                ref={canvasRef}
                width={PREVIEW_W}
                height={PREVIEW_H}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="size-full cursor-grab touch-none active:cursor-grabbing"
                aria-label="3×4 rasm ko'rinishi. Surish uchun torting."
              />
              {/* Yo'naltiruvchi chiziqlar */}
              <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
                <ellipse cx="150" cy="170" rx="80" ry="108" fill="none" stroke="rgb(245 158 11 / 0.75)" strokeWidth="1.5" strokeDasharray="6 5" />
                <line x1="0" y1="40" x2="300" y2="40" stroke="rgb(245 158 11 / 0.45)" strokeDasharray="4 6" />
                <line x1="150" y1="0" x2="150" y2="400" stroke="rgb(255 255 255 / 0.25)" strokeDasharray="2 6" />
              </svg>
              {busy && busy !== "save" && (
                <div className="animate-fade-in absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 text-sm text-white">
                    <div className="relative grid size-14 place-items-center">
                      <span className="animate-pulse-ring absolute inset-0 rounded-full bg-amber-400/40" />
                      <ScanFace size={28} className="relative" />
                    </div>
                    {busy === "face" ? "Yuz aniqlanmoqda…" : "Fon ajratilmoqda…"}
                  </div>
                </div>
              )}
            </div>
            <div className="mx-auto mt-4 flex max-w-[420px] items-center gap-3">
              <ZoomIn size={16} className="shrink-0 text-zinc-500" />
              <input
                type="range"
                min={0.4}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-amber-400"
                aria-label="Kattalashtirish"
              />
              <button onClick={() => runAutoCrop(source)} className="chip shrink-0 !py-1.5" disabled={!!busy}>
                <RotateCcw size={14} /> Avto
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500">Rasmni surib joylashtiring · g&apos;ildirak yoki slayder bilan kattalashtiring</p>
          </div>

          {/* Sozlamalar */}
          <div className="stagger space-y-4">
            {note && (
              <div role="status" className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-200">
                {note}
              </div>
            )}

            <Panel title="Fon rangi" hint="Odam siluetini brauzerda ajratib, fonni almashtiradi">
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => chooseBg(b.id)}
                    disabled={!!busy}
                    data-active={bg === b.id}
                    className="chip"
                  >
                    <span
                      className="size-5 rounded-full ring-1 ring-white/20"
                      style={{
                        background: b.color || "conic-gradient(#f59e0b,#10b981,#3b82f6,#ec4899,#f59e0b)",
                      }}
                    />
                    {b.label}
                    {busy === "mask" && bg === b.id && <Loader2 size={14} className="animate-spin" />}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Sifat va format">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setDpi(300)} data-active={dpi === 300} className="chip">
                  300 DPI · {pxForCm(3, 300)}×{pxForCm(4, 300)}
                </button>
                <button onClick={() => setDpi(600)} data-active={dpi === 600} className="chip">
                  600 DPI · {pxForCm(3, 600)}×{pxForCm(4, 600)}
                </button>
                <span className="mx-1 hidden w-px bg-white/10 sm:block" />
                <button onClick={() => setFormat("jpg")} data-active={format === "jpg"} className="chip">JPG</button>
                <button onClick={() => setFormat("png")} data-active={format === "png"} className="chip">PNG</button>
              </div>
            </Panel>

            <Panel title="Yuklab olish" hint="Rasm 3×4 sm o'lchamda chop etiladi (DPI fayl ichiga yozilgan)">
              <div className="flex flex-wrap gap-3">
                <button onClick={() => download("single")} disabled={!!busy} className="btn-accent">
                  {busy === "save" ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                  3×4 rasm (.{format})
                </button>
                <button onClick={() => download("sheet")} disabled={!!busy} className="btn-ghost">
                  <Printer size={17} /> 10×15 varaq (9 dona)
                </button>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </PageWrap>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-zinc-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Steps({ step }: { step: number }) {
  const items = ["Rasm yuklash", "Joylashtirish", "Fon va yuklab olish"];
  return (
    <ol className="mb-6 flex items-center gap-2 overflow-x-auto text-sm">
      {items.map((t, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={t} className="flex shrink-0 items-center gap-2">
            <span
              className={`grid size-7 place-items-center rounded-full text-xs font-semibold transition duration-500 ${
                active ? "accent-gradient scale-110 shadow-lg" : done ? "accent-soft" : "bg-white/5 text-zinc-500"
              }`}
            >
              {done ? <Check size={14} /> : n}
            </span>
            <span className={active ? "text-white" : "text-zinc-500"}>{t}</span>
            {n < items.length && <span className="mx-1 h-px w-8 bg-white/10" />}
          </li>
        );
      })}
    </ol>
  );
}
