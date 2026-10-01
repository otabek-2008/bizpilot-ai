"use client";

// Sozlamalar uchun kichik tanlov tugmalari guruhi.

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && <p className="mb-2 text-sm text-zinc-400">{label}</p>}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg px-3 py-1.5 text-sm tabular-nums transition ${
        active ? "accent-soft text-white ring-1 ring-[color:var(--accent)]" : "bg-white/[0.04] text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
