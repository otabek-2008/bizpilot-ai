"use client";

import { useState } from "react";

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

  if (!open) return null;

  async function handleCreate() {
    if (!title.trim()) return;

    setLoading(true);

    await onCreate(title);

    setLoading(false);
    setTitle("");

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-8 rounded-2xl w-full max-w-md">

        <h2 className="text-2xl font-bold text-white mb-6">
          Create Project
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project name..."
          className="w-full p-3 rounded-lg bg-zinc-800 text-white outline-none"
        />

        <div className="flex gap-3 mt-6">

          <button
            onClick={onClose}
            className="flex-1 bg-zinc-700 py-3 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded-lg"
          >
            {loading ? "Creating..." : "Create"}
          </button>

        </div>

      </div>
    </div>
  );
}
