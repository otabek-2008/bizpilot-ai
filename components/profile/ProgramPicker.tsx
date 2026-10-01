"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, PenLine, Search, X } from "lucide-react";
import { Spinner } from "@/components/LoadingScreen";
import { loadPrograms, searchPrograms, type Program } from "@/lib/programs";

/**
 * Yo'nalish tanlash: tanlangan oliygohning o'z yo'nalishlari ro'yxatidan.
 * Oliygohning yo'nalishlari ma'lum bo'lmasa — barcha yo'nalishlar; topilmasa qo'lda yoziladi.
 */
const MAX_SHOWN = 150;

export default function ProgramPicker({
  universityId,
  value,
  onChange,
}: {
  universityId: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const listId = useId();
  const [programs, setPrograms] = useState<{ list: Program[]; own: boolean } | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  // Oliygoh almashsa — uning ro'yxatini yuklaymiz (ma'lumot alohida chunk'da)
  const [prevUni, setPrevUni] = useState(universityId);
  if (prevUni !== universityId) {
    setPrevUni(universityId);
    setCustom(false);
    setQuery("");
  }

  useEffect(() => {
    let active = true;
    loadPrograms(universityId).then((result) => {
      if (!active) return;
      setPrograms(result);
      setLoadedFor(universityId);
    });
    return () => {
      active = false;
    };
  }, [universityId]);

  const loading = loadedFor !== universityId;
  const list = loading ? null : programs!.list;
  const results = useMemo(() => (list ? searchPrograms(list, query) : []), [list, query]);
  const shown = results.slice(0, MAX_SHOWN);
  const selected = list?.find((p) => p.name === value);
  // Avval saqlangan, ro'yxatda yo'q yo'nalish — qo'lda yozilgan deb ko'rsatamiz
  const manual = custom || !list?.length || (!!value && !selected);

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

  if (loading) {
    return (
      <div className="field flex items-center gap-2 text-zinc-500">
        <Spinner className="size-4" /> Yo&apos;nalishlar yuklanmoqda…
      </div>
    );
  }

  if (manual) {
    return (
      <div className="flex gap-2">
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value.slice(0, 200))}
          placeholder="Masalan: Dasturiy injiniring"
          aria-label="Yo'nalish"
          className="field accent-ring"
        />
        {!!list?.length && (
          <button
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(null);
            }}
            className="chip shrink-0"
            title="Ro'yxatdan tanlash"
          >
            <X size={15} />
          </button>
        )}
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
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-zinc-500"}`}>
          {selected?.name ?? `Yo'nalishni tanlang (${list!.length} ta)`}
        </span>
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
                placeholder="Qidirish: nomi yoki kodi"
                aria-label="Yo'nalish qidirish"
                className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-zinc-500"
              />
            </div>
            {!programs!.own && (
              <p className="px-1 pt-2 text-xs text-zinc-500">Bu oliygoh yo&apos;nalishlari bazada yo&apos;q — barcha yo&apos;nalishlar ko&apos;rsatilmoqda.</p>
            )}
          </div>

          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto p-1">
            {shown.map((p) => (
              <li key={p.code} role="option" aria-selected={p.name === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block">{p.name}</span>
                    <span className="text-xs text-zinc-500">{p.code}</span>
                  </span>
                  {p.name === value && <Check size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />}
                </button>
              </li>
            ))}
            {!results.length && <li className="px-3 py-4 text-center text-sm text-zinc-500">Hech narsa topilmadi</li>}
            {results.length > MAX_SHOWN && (
              <li className="px-3 py-3 text-center text-xs text-zinc-500">Yana {results.length - MAX_SHOWN} ta — qidiruvdan foydalaning</li>
            )}
          </ul>

          <button
            type="button"
            onClick={() => {
              setCustom(true);
              setOpen(false);
              onChange(query.trim() || null);
            }}
            className="flex w-full items-center gap-2 border-t border-white/5 px-4 py-3 text-sm text-[var(--accent)] transition hover:bg-white/[0.04]"
          >
            <PenLine size={15} /> Ro&apos;yxatda yo&apos;q — o&apos;zim yozaman
          </button>
        </div>
      )}
    </div>
  );
}
