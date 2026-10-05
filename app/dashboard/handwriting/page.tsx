"use client";

import { useEffect, useState } from "react";
import { Download, Eraser, FileDown, Loader2 } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { modules } from "@/lib/modules";
import { logActivity } from "@/lib/activity";
import { downloadBlob } from "@/lib/download";
import { pagesToPdf, pagesToPng, renderHandwriting } from "@/lib/handwriting";
import { handFont } from "./font";

export default function HandwritingPage() {
  const [input, setInput] = useState("");
  const [pages, setPages] = useState<HTMLCanvasElement[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);

  // Matn o'zgarganda varaqlarni qayta chizamiz (yozish to'xtagach)
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const family = handFont.style.fontFamily;
      await document.fonts.load(`40px ${family}`, input || "a");
      if (cancelled) return;
      const next = input.trim() ? renderHandwriting(input, family) : [];
      setPages(next);
      setPreviews(next.map((c) => c.toDataURL("image/jpeg", 0.85)));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [input]);

  async function download(kind: "pdf" | "png") {
    setBusy(kind);
    try {
      if (kind === "pdf") downloadBlob(await pagesToPdf(pages), "campusai-qolyozma.pdf");
      else {
        const { blob, ext } = await pagesToPng(pages);
        downloadBlob(blob, `campusai-qolyozma.${ext}`);
      }
      logActivity("handwriting", `Qo'lyozma yuklab olindi: ${kind.toUpperCase()}, ${pages.length} varaq`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.handwriting} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass flex flex-col rounded-3xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <label htmlFor="hw-in" className="text-sm font-medium text-zinc-300">Matn</label>
            <button
              onClick={() => setInput("")}
              disabled={!input}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            >
              <Eraser size={13} /> Tozalash
            </button>
          </div>
          <textarea
            id="hw-in"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Matnni shu yerga yozing yoki joylang…"
            className="field accent-ring min-h-[420px] flex-1 resize-y font-[inherit] leading-relaxed"
          />
        </div>

        <div className="glass flex flex-col rounded-3xl p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-zinc-300">
              Natija{pages.length > 0 && <span className="text-zinc-500"> · {pages.length} varaq</span>}
            </span>
            <div className="flex gap-2">
              <button className="chip disabled:opacity-40" disabled={!pages.length || !!busy} onClick={() => download("pdf")}>
                {busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} PDF
              </button>
              <button className="chip disabled:opacity-40" disabled={!pages.length || !!busy} onClick={() => download("png")}>
                {busy === "png" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} PNG
              </button>
            </div>
          </div>
          <div className={`${handFont.className} flex max-h-[70vh] min-h-[420px] flex-col gap-3 overflow-auto rounded-[0.875rem] border border-white/10 bg-black/30 p-3`}>
            {previews.length ? (
              previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`${i + 1}-varaq`} className="w-full rounded-md shadow-lg" />
              ))
            ) : (
              <span className="m-auto text-sm text-zinc-600">Qo&apos;lyozma shu yerda paydo bo&apos;ladi</span>
            )}
          </div>
        </div>
      </div>
    </PageWrap>
  );
}
