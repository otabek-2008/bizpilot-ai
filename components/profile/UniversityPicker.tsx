"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, PenLine, Search, X } from "lucide-react";
import { searchUniversities, universityById, type UniversityType } from "@/lib/universities";

type Value = { id: string | null; name: string | null };

const TYPES: { id: UniversityType | null; label: string }[] = [
  { id: null, label: "Hammasi" },
  { id: "davlat", label: "Davlat" },
  { id: "nodavlat", label: "Nodavlat / xorijiy" },
];

/** Oliygoh tanlash: qidiruv, davlat/nodavlat filtri va "ro'yxatda yo'q" — qo'lda yozish. */
export default function UniversityPicker({
  value,
  onChange,
  allowCustom = true,
  placeholder = "Oliygohni tanlang",
}: {
  value: Value;
  onChange: (v: Value) => void;
  allowCustom?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<UniversityType | null>(null);
  const [custom, setCustom] = useState(!value.id && !!value.name);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const selected = universityById(value.id);
  const results = useMemo(() => searchUniversities(query, 400).filter((u) => !type || u.type === type).slice(0, 80), [query, type]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          value={value.name ?? ""}
          onChange={(e) => onChange({ id: null, name: e.target.value.slice(0, 200) })}
          placeholder="Oliygoh to'liq nomi"
          aria-label="Oliygoh nomi"
          autoFocus
          className="field accent-ring"
        />
        <button
          type="button"
          onClick={() => {
            setCustom(false);
            onChange({ id: null, name: null });
          }}
          className="chip shrink-0"
          title="Ro'yxatdan tanlash"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="field accent-ring flex items-center gap-2 text-left"
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-zinc-500"}`}>{selected?.name ?? placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="animate-fade-in absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-2xl backdrop-blur-2xl">
          <div className="border-b border-white/5 p-2">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3">
              <Search size={15} className="shrink-0 text-zinc-500" />
              <input
                ref={search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Qidirish: nomi, shahar yoki qisqartma"
                aria-label="Oliygoh qidirish"
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-zinc-500"
              />
            </div>
            <div className="mt-2 flex gap-1">
              {TYPES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs transition ${type === t.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto p-1">
            {results.map((u) => (
              <li key={u.id} role="option" aria-selected={u.id === value.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ id: u.id, name: u.name });
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block">{u.name}</span>
                    <span className="text-xs text-zinc-500">
                      {u.region} · {u.type === "davlat" ? "Davlat" : "Nodavlat"}
                    </span>
                  </span>
                  {u.id === value.id && <Check size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />}
                </button>
              </li>
            ))}
            {!results.length && <li className="px-3 py-4 text-center text-sm text-zinc-500">Hech narsa topilmadi</li>}
          </ul>

          {allowCustom && (
            <button
              type="button"
              onClick={() => {
                setCustom(true);
                setOpen(false);
                onChange({ id: null, name: query.trim() || null });
              }}
              className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-3 text-sm text-[var(--accent)] transition hover:bg-white/[0.04]"
            >
              <PenLine size={15} /> Ro&apos;yxatda yo&apos;q — o&apos;zim yozaman
            </button>
          )}
        </div>
      )}
    </div>
  );
}
