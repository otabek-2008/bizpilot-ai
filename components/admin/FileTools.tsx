"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, FolderPlus, Pencil, UploadCloud, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  afterUploadAction,
  createFolderAction,
  createUploadUrlAction,
  downloadUrlAction,
  renameFileAction,
} from "@/app/admin/actions";
import { Spinner } from "@/components/LoadingScreen";

/** Supabase Storage kalitlarida faqat xavfsiz belgilar bo'lsin (kirill va boshqalar "_" ga almashtiriladi). */
export const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.\- ()]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 180) || "fayl";

type Status = { name: string; state: "wait" | "done" | "error"; error?: string };

export function Uploader({ bucket, prefix }: { bucket: string; prefix: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [items, setItems] = useState<Status[]>([]);
  const busy = items.some((i) => i.state === "wait");

  async function upload(files: File[]) {
    if (!files.length) return;
    setItems(files.map((f) => ({ name: f.name, state: "wait" })));
    await Promise.all(
      files.map(async (file, i) => {
        const path = [prefix, safeName(file.name)].filter(Boolean).join("/");
        try {
          const { token } = await createUploadUrlAction(bucket, path);
          const { error } = await supabase.storage
            .from(bucket)
            .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
          if (error) throw error;
          setItems((s) => s.map((x, j) => (j === i ? { ...x, state: "done" } : x)));
        } catch (e) {
          setItems((s) => s.map((x, j) => (j === i ? { ...x, state: "error", error: (e as Error).message } : x)));
        }
      }),
    );
    await afterUploadAction();
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void upload([...e.dataTransfer.files]);
        }}
        className={`glass flex w-full items-center justify-center gap-3 rounded-2xl border-dashed p-5 text-sm transition ${
          drag ? "!border-brand-400 bg-brand-500/10" : "hover:!border-white/25"
        }`}
      >
        {busy ? <Spinner className="size-5" /> : <UploadCloud size={20} className="text-brand-400" />}
        {busy ? "Yuklanmoqda..." : "Fayl yuklash — bosing yoki shu yerga tashlang"}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      {!!items.length && (
        <ul className="mt-2 space-y-1 text-xs">
          {items.map((i, k) => (
            <li key={k} className={i.state === "error" ? "text-rose-300" : i.state === "done" ? "text-emerald-300" : "text-zinc-400"}>
              {i.state === "done" ? "✓" : i.state === "error" ? "✗" : "…"} {i.name}
              {i.error && ` — ${i.error}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function NewFolderForm({ bucket, prefix }: { bucket: string; prefix: string }) {
  const [state, action, pending] = useActionState(createFolderAction, null);
  return (
    <form action={action} className="glass flex items-center gap-2 rounded-2xl p-3">
      <input type="hidden" name="bucket" value={bucket} />
      <input type="hidden" name="prefix" value={prefix} />
      <input name="name" required placeholder="Yangi papka nomi" aria-label="Papka nomi" className="field !py-2 text-sm" />
      <button type="submit" disabled={pending} className="btn-ghost shrink-0 !px-3 !py-2" title="Papka yaratish">
        {pending ? <Spinner className="size-4" /> : <FolderPlus size={17} />}
      </button>
      {state?.error && <span className="text-xs text-rose-300">{state.error}</span>}
    </form>
  );
}

export function DownloadButton({ bucket, path }: { bucket: string; path: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          window.location.href = await downloadUrlAction(bucket, path);
        } catch (e) {
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1.5 text-zinc-300 transition hover:text-white disabled:opacity-50"
    >
      {busy ? <Spinner className="size-4" /> : <Download size={15} />} Yuklab olish
    </button>
  );
}

export function RenameForm({ bucket, path, name }: { bucket: string; path: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof renameFileAction>[0], fd: FormData) => {
    const result = await renameFileAction(prev, fd);
    if (result?.ok) setEditing(false);
    return result;
  }, null);
  const dir = path.slice(0, path.length - name.length);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="group flex max-w-full items-center gap-1.5 text-left" title="Nomini o'zgartirish">
        <span className="truncate">{name}</span>
        <Pencil size={12} className="shrink-0 text-zinc-600 group-hover:text-zinc-300" />
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set("to", dir + safeName(String(fd.get("newName") ?? "")));
        return action(fd);
      }}
      className="flex items-center gap-1.5"
    >
      <input type="hidden" name="bucket" value={bucket} />
      <input type="hidden" name="from" value={path} />
      <input name="newName" defaultValue={name} autoFocus aria-label="Yangi nom" className="field !w-64 !py-1 text-sm" />
      <button type="submit" disabled={pending} className="text-emerald-300" title="Saqlash">
        {pending ? <Spinner className="size-4" /> : <Check size={16} />}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-zinc-400" title="Bekor qilish">
        <X size={16} />
      </button>
      {state?.error && <span className="text-xs text-rose-300">{state.error}</span>}
    </form>
  );
}
