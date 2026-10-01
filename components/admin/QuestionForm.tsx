"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { createUploadUrlAction, saveQuestionAction } from "@/app/admin/actions";
import { Spinner } from "@/components/LoadingScreen";
import { safeName } from "@/components/admin/FileTools";
import { supabase } from "@/lib/supabase";
import { imageUrl } from "@/lib/prava-db";
import { MAX_OPTIONS, MIN_OPTIONS, PRAVA_BUCKET, type PravaQuestion } from "@/lib/prava";

const LETTERS = "ABCDEF";

export default function QuestionForm({
  question: q,
  topics,
  defaultTicket,
}: {
  question: PravaQuestion | null;
  topics: string[];
  defaultTicket: number | null;
}) {
  const [state, action, pending] = useActionState(saveQuestionAction, null);
  const [options, setOptions] = useState<string[]>(q?.options ?? ["", "", ""]);
  const [correct, setCorrect] = useState<number>(q?.correct ?? -1);
  const [image, setImage] = useState(q?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function removeOption(i: number) {
    setOptions((o) => o.filter((_, j) => j !== i));
    setCorrect((c) => (c === i ? -1 : c > i ? c - 1 : c));
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) return setUploadError("Faqat rasm fayli (JPG, PNG, WEBP, GIF).");
    if (file.size > 5 * 1024 * 1024) return setUploadError("Rasm 5 MB dan oshmasin.");
    setUploading(true);
    try {
      const path = `savollar/${Date.now().toString(36)}-${safeName(file.name)}`;
      const { token } = await createUploadUrlAction(PRAVA_BUCKET, path);
      const { error } = await supabase.storage.from(PRAVA_BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      setImage(path);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      // action={...} o'rniga onSubmit: React forma yuborilgach maydonlarni tozalaydi, xato bo'lsa yozilgan matn yo'qolmasin
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-6 xl:grid-cols-[1fr_320px]"
    >
      {q && <input type="hidden" name="id" value={q.id} />}
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="correct" value={correct} />

      <div className="glass space-y-5 rounded-2xl p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-zinc-400">Savol matni</span>
          <textarea name="question" defaultValue={q?.question} required rows={4} maxLength={2000} className="field" />
        </label>

        <fieldset>
          <legend className="mb-1.5 text-sm text-zinc-400">Javob variantlari — to&apos;g&apos;risini belgilang</legend>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <label
                  className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border text-sm font-semibold transition ${
                    correct === i ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100" : "border-white/10 text-zinc-400 hover:border-white/25"
                  }`}
                  title="To'g'ri javob"
                >
                  <input type="radio" name="correctPick" checked={correct === i} onChange={() => setCorrect(i)} className="sr-only" />
                  {LETTERS[i]}
                </label>
                <input
                  name="option"
                  value={opt}
                  onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                  maxLength={500}
                  placeholder={`${i + 1}-variant`}
                  aria-label={`${i + 1}-variant`}
                  className="field !py-2.5"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={options.length <= MIN_OPTIONS}
                  className="shrink-0 p-2 text-zinc-500 transition hover:text-rose-300 disabled:opacity-30"
                  title="Variantni olib tashlash"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          {options.length < MAX_OPTIONS && (
            <button type="button" onClick={() => setOptions((o) => [...o, ""])} className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300">
              <Plus size={15} /> Variant qo&apos;shish
            </button>
          )}
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-sm text-zinc-400">Izoh (ixtiyoriy) — javobdan keyin ko&apos;rsatiladi</span>
          <textarea name="explanation" defaultValue={q?.explanation ?? ""} rows={3} maxLength={3000} className="field text-sm" />
        </label>
      </div>

      <div className="space-y-4">
        <div className="glass space-y-4 rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Bilet</span>
              <input name="ticket" type="number" min={1} max={9999} defaultValue={q?.ticket ?? defaultTicket ?? ""} className="field !py-2.5" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Tartib</span>
              <input name="position" type="number" min={1} max={9999} defaultValue={q?.position ?? ""} className="field !py-2.5" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-400">Mavzu (ixtiyoriy)</span>
            <input name="topic" list="prava-topics" defaultValue={q?.topic ?? ""} maxLength={120} className="field !py-2.5" />
            <datalist id="prava-topics">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="active" defaultChecked={q?.active ?? true} className="size-4 accent-emerald-500" />
            Faol (foydalanuvchilarga ko&apos;rinadi)
          </label>
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="mb-3 text-sm text-zinc-400">Rasm (ixtiyoriy)</p>
          {image ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(image)} alt="" className="max-h-56 w-full rounded-xl border border-white/10 bg-black/30 object-contain" />
              <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                <span className="truncate">{image}</span>
                <button type="button" onClick={() => setImage("")} className="inline-flex shrink-0 items-center gap-1 text-rose-300 hover:text-rose-200">
                  <Trash2 size={13} /> Olib tashlash
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void upload(e.dataTransfer.files[0]);
              }}
              disabled={uploading}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 p-6 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white"
            >
              {uploading ? <Spinner className="size-5" /> : <ImagePlus size={22} />}
              {uploading ? "Yuklanmoqda..." : "Rasm yuklash"}
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {uploadError && <p className="mt-2 text-xs text-rose-300">{uploadError}</p>}
        </div>

        <button type="submit" disabled={pending || uploading} className="btn-primary w-full">
          {pending ? <Spinner className="size-4" /> : <Save size={16} />} Saqlash
        </button>
        {state?.ok && <p className="text-center text-sm text-emerald-300">{state.ok}</p>}
        {state?.error && <p className="text-center text-sm text-rose-300">{state.error}</p>}
      </div>
    </form>
  );
}
