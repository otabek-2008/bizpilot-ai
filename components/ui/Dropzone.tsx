"use client";

import { useId, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

export default function Dropzone({
  accept,
  multiple = false,
  onFiles,
  title,
  hint,
  compact = false,
  disabled = false,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  hint?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function take(list: FileList | null) {
    if (!list?.length || disabled) return;
    const files = Array.from(list);
    onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed text-center transition ${
        compact ? "px-5 py-6" : "px-6 py-14"
      } ${
        over
          ? "scale-[1.01] border-[color:var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <span
        className={`accent-soft grid place-items-center rounded-2xl transition duration-500 group-hover:-translate-y-1 ${
          compact ? "size-11" : "size-16"
        } ${over ? "-translate-y-1 scale-110" : ""}`}
      >
        <UploadCloud size={compact ? 20 : 28} />
      </span>
      <div>
        <p className="font-medium text-white">{title}</p>
        {hint && <p className="mt-1 text-sm text-zinc-500">{hint}</p>}
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
