"use client";

import { useEffect, useState } from "react";
import { FolderPlus, X } from "lucide-react";
import { Spinner } from "@/components/LoadingScreen";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
};

export default function CreateProjectModal({
  open,
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);

    await onCreate(title);

    setLoading(false);
    setTitle("");

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleCreate}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        className="glass animate-fade-up relative w-full max-w-md rounded-3xl !bg-surface/90 p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>

        <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
          <FolderPlus size={22} />
        </span>

        <h2 id="create-project-title" className="mt-5 text-2xl font-semibold text-white">
          Yangi loyiha
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Loyihangizga nom bering. Tafsilotlarni keyingi qadamda kiritasiz.
        </p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Masalan: Specialty kofe shop"
          autoFocus
          className="field mt-6"
        />

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Bekor qilish
          </button>

          <button type="submit" disabled={loading || !title.trim()} className="btn-primary flex-1">
            {loading ? <Spinner className="size-4" /> : "Yaratish"}
          </button>
        </div>
      </form>
    </div>
  );
}
