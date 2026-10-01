"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { FileUp, Plus } from "lucide-react";
import { addMaterialAction, createUploadUrlAction } from "@/app/admin/actions";
import { Spinner } from "@/components/LoadingScreen";
import { safeName } from "@/components/admin/FileTools";
import ExamSubjectSelect from "@/components/admin/ExamSubjectSelect";
import { supabase } from "@/lib/supabase";

const BUCKET = "exam-files";
const MAX_MB = 50;

/** Material qo'shish: fayl (exam-files bucket'ga yuklanadi) yoki tashqi havola. */
export default function MaterialForm() {
  const [state, action, pending] = useActionState(addMaterialAction, null);
  const [kind, setKind] = useState<"file" | "link">("file");
  const [path, setPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    if (file.size > MAX_MB * 1024 * 1024) return setUploadError(`Fayl ${MAX_MB} MB dan oshmasin.`);
    setUploading(true);
    try {
      const p = `materiallar/${Date.now().toString(36)}-${safeName(file.name)}`;
      const { token } = await createUploadUrlAction(BUCKET, p);
      const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(p, token, file, { contentType: file.type || undefined });
      if (error) throw error;
      setPath(p);
      setFileName(file.name);
      if (titleInput.current && !titleInput.current.value) titleInput.current.value = file.name.replace(/\.[^.]+$/, "");
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          action(fd);
          // Muvaffaqiyatli bo'lsa forma tozalanadi (xato bo'lsa yozilgan matn qoladi — React holati saqlanadi)
          setPath("");
          setFileName("");
        });
      }}
      className="glass space-y-4 rounded-2xl p-5"
    >
      <p className="font-medium">Yangi material</p>
      <ExamSubjectSelect allowAnySubject />
      <input type="hidden" name="kind" value={kind} />
      {kind === "file" && <input type="hidden" name="url" value={path} />}

      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 text-sm">
        {(["file", "link"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded-lg px-3 py-1.5 transition ${kind === k ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            {k === "file" ? "Fayl (PDF, DOCX…)" : "Havola"}
          </button>
        ))}
      </div>

      {kind === "file" ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 p-5 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white">
          {uploading ? <Spinner className="size-5" /> : <FileUp size={22} />}
          {uploading ? "Yuklanmoqda..." : fileName || `Faylni tanlang (${MAX_MB} MB gacha)`}
          <input
            type="file"
            hidden
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <input name="url" type="url" placeholder="https://…" required className="field !py-2.5" />
      )}
      {uploadError && <p className="text-xs text-rose-300">{uploadError}</p>}

      <input ref={titleInput} name="title" placeholder="Sarlavha" required maxLength={200} className="field !py-2.5" />
      <textarea name="description" placeholder="Qisqa izoh (ixtiyoriy)" maxLength={1000} rows={2} className="field text-sm" />

      <button type="submit" disabled={pending || uploading || (kind === "file" && !path)} className="btn-primary w-full">
        {pending ? <Spinner className="size-4" /> : <Plus size={16} />} Qo&apos;shish
      </button>
      {state?.ok && <p className="text-center text-sm text-emerald-300">{state.ok}</p>}
      {state?.error && <p className="text-center text-sm text-rose-300">{state.error}</p>}
    </form>
  );
}
