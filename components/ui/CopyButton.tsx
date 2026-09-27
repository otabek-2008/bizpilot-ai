"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({
  text,
  onCopied,
  className = "",
}: {
  text: string;
  onCopied?: () => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Eski brauzerlar uchun zaxira usul
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    onCopied?.();
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      className={`chip disabled:opacity-40 ${className}`}
      data-active={copied}
    >
      <span className="relative grid size-4 place-items-center">
        <Copy size={15} className={`absolute transition ${copied ? "scale-0 opacity-0" : ""}`} />
        <Check size={15} className={`absolute transition ${copied ? "" : "scale-0 opacity-0"}`} />
      </span>
      {copied ? "Nusxalandi" : "Nusxalash"}
    </button>
  );
}
