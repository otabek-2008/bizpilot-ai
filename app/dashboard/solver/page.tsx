"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Lightbulb, Sigma, Square, Trash2 } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import Markdown from "@/components/ui/Markdown";
import CopyButton from "@/components/ui/CopyButton";
import { Group, Pill } from "@/components/ui/Pills";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { modules } from "@/lib/modules";
import { aiStream } from "@/lib/ai-client";
import { logActivity } from "@/lib/activity";

const SUBJECTS = ["Matematika", "Fizika", "Kimyo", "Geometriya", "Informatika", "Iqtisodiyot"];
const MAX_SIDE = 1600;

type Picked = { url: string; data: string; mediaType: "image/jpeg" };

/** Rasmni brauzerda kichraytiradi (uzun tomoni 1600px, JPEG) — so'rov yengil va tez bo'ladi. */
async function compress(file: File): Promise<Picked> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.88);
  return { url, data: url.slice(url.indexOf(",") + 1), mediaType: "image/jpeg" };
}

export default function SolverPage() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<Picked | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => abort.current?.abort(), []);

  // Ctrl+V bilan rasm qo'yish (skrinshotdan)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        void pick(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Faqat rasm fayli (JPG, PNG, WEBP).");
    if (file.size > 15 * 1024 * 1024) return setError("Rasm 15 MB dan oshmasin.");
    try {
      setImage(await compress(file));
    } catch {
      setError("Rasmni o'qib bo'lmadi. Boshqa formatda (JPG/PNG) urinib ko'ring.");
    }
  }

  async function solve(mode: "full" | "hint") {
    if ((!text.trim() && !image) || busy) return;
    setError("");
    setAnswer("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      await aiStream(
        "/api/ai/solve",
        {
          text: text.trim() || undefined,
          image: image ? { data: image.data, mediaType: image.mediaType } : undefined,
          subject: subject ?? undefined,
          mode,
        },
        setAnswer,
        controller.signal,
      );
      logActivity("solver", (subject ? `${subject}: ` : "") + (text.trim().slice(0, 50) || "rasmdagi masala"));
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const ready = (text.trim() || image) && !busy;

  return (
    <PageWrap>
      <ModuleHeader module={modules.solver} />
      <FormError message={error} />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="glass h-fit space-y-5 rounded-3xl p-5">
          {image ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="Masala rasmi" className="max-h-72 w-full rounded-2xl border border-white/10 bg-black/30 object-contain" />
              <button onClick={() => setImage(null)} className="chip absolute right-2 top-2 !bg-black/60" title="Rasmni olib tashlash">
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void pick(e.dataTransfer.files[0]);
              }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 p-7 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
            >
              <ImagePlus size={24} className="text-[var(--accent)]" />
              Masala rasmini yuklang
              <span className="text-xs text-zinc-600">yoki skrinshotni Ctrl+V bilan qo&apos;ying</span>
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 6000))}
            placeholder={image ? "Qo'shimcha izoh (ixtiyoriy): masalan, faqat 3-masalani yech" : "Masala shartini yozing…"}
            aria-label="Masala sharti"
            className="field accent-ring min-h-[140px] resize-y leading-relaxed"
          />

          <Group label="Fan (ixtiyoriy)">
            {SUBJECTS.map((s) => (
              <Pill key={s} active={subject === s} onClick={() => setSubject(subject === s ? null : s)}>
                {s}
              </Pill>
            ))}
          </Group>

          {busy ? (
            <button onClick={() => abort.current?.abort()} className="chip w-full justify-center py-3">
              <Square size={15} /> To&apos;xtatish
            </button>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button onClick={() => void solve("full")} disabled={!ready} className="btn-accent py-3">
                <Sigma size={17} /> Yechish
              </button>
              <button onClick={() => void solve("hint")} disabled={!ready} className="chip px-4" title="Javobsiz, faqat yo'l-yo'riq">
                <Lightbulb size={15} /> Maslahat
              </button>
            </div>
          )}
        </div>

        <div className="glass relative min-h-[420px] overflow-hidden rounded-3xl p-6">
          <div aria-hidden className="accent-gradient absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
          {answer ? (
            <div className="relative">
              <Markdown text={answer} className="text-zinc-200" />
              {busy ? <Spinner className="mt-4 size-4" /> : <div className="mt-5"><CopyButton text={answer} /></div>}
            </div>
          ) : (
            <div className="relative grid h-full min-h-[380px] place-items-center text-center text-sm text-zinc-600">
              {busy ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" /> Yechilmoqda…
                </span>
              ) : (
                <span>
                  Yechim shu yerda bosqichma-bosqich chiqadi.
                  <br />
                  &quot;Maslahat&quot; — javobni aytmasdan, qanday yechishni ko&apos;rsatadi.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </PageWrap>
  );
}
