"use client";

import { useState } from "react";
import { Bell, BellRing, FileDown, ImageIcon, Layers, Palette, Sparkles } from "lucide-react";
import ModuleHeader, { PageWrap } from "@/components/ui/ModuleHeader";
import { useAuth } from "@/components/AuthProvider";
import { modules } from "@/lib/modules";

const THEMES = [
  { id: "aurora", name: "Aurora", bg: "linear-gradient(135deg,#1e1b4b,#581c87 60%,#0e7490)", fg: "#fff", accent: "#a78bfa" },
  { id: "paper", name: "Qog'oz", bg: "linear-gradient(135deg,#fafaf9,#e7e5e4)", fg: "#1c1917", accent: "#ea580c" },
  { id: "ocean", name: "Okean", bg: "linear-gradient(135deg,#0c4a6e,#0369a1 55%,#22d3ee)", fg: "#fff", accent: "#67e8f9" },
  { id: "forest", name: "O'rmon", bg: "linear-gradient(135deg,#052e16,#166534 60%,#65a30d)", fg: "#fff", accent: "#bef264" },
  { id: "sunset", name: "Shafaq", bg: "linear-gradient(135deg,#7c2d12,#db2777 60%,#f59e0b)", fg: "#fff", accent: "#fde68a" },
];

const NOTIFY_KEY = "campusai:notify:presentation";

export default function PresentationPage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [notified, setNotified] = useState(() => {
    try {
      return localStorage.getItem(`${NOTIFY_KEY}:${user.id}`) === "1";
    } catch {
      return false;
    }
  });

  const theme = THEMES.find((t) => t.id === themeId)!;
  const title = topic.trim() || "Sun'iy intellekt ta'limda";

  function notify() {
    try {
      localStorage.setItem(`${NOTIFY_KEY}:${user.id}`, "1");
    } catch {
      // Saqlab bo'lmasa ham, joriy seansda belgilab qo'yamiz
    }
    setNotified(true);
  }

  return (
    <PageWrap>
      <ModuleHeader module={modules.presentation}>
        <span className="accent-soft flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-xs font-medium">
          <Sparkles size={14} className="animate-spin-slow" /> Tez kunda
        </span>
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sozlamalar (ko'rinish) */}
        <div className="glass relative rounded-3xl p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="topic" className="mb-2 block text-sm text-zinc-400">Mavzu</label>
              <input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Masalan: Sun'iy intellekt ta'limda"
                className="field accent-ring"
              />
            </div>

            <div>
              <div className="mb-2 flex justify-between text-sm">
                <label htmlFor="count" className="text-zinc-400">Slaydlar soni</label>
                <span className="font-semibold tabular-nums">{count}</span>
              </div>
              <input
                id="count"
                type="range"
                min={5}
                max={25}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-fuchsia-500"
              />
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm text-zinc-400"><Palette size={15} /> Mavzu dizayni</p>
              <div className="grid grid-cols-5 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    aria-pressed={themeId === t.id}
                    className={`group rounded-xl p-1 transition ${themeId === t.id ? "ring-2 ring-[color:var(--accent)]" : "ring-1 ring-white/10 hover:ring-white/30"}`}
                  >
                    <span className="block aspect-video rounded-lg transition group-hover:scale-105" style={{ background: t.bg }} />
                    <span className="mt-1 block truncate text-[11px] text-zinc-400">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <ul className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-3">
              <li className="flex items-center gap-2"><ImageIcon size={15} className="text-fuchsia-300" /> Mos rasmlar</li>
              <li className="flex items-center gap-2"><Layers size={15} className="text-fuchsia-300" /> Tayyor tuzilma</li>
              <li className="flex items-center gap-2"><FileDown size={15} className="text-fuchsia-300" /> PPTX va PDF</li>
            </ul>

            <button onClick={notify} disabled={notified} className="btn-accent w-full py-3.5">
              {notified ? <BellRing size={18} /> : <Bell size={18} />}
              {notified ? "Ishga tushganda xabar beramiz" : "Ishga tushganda xabar berish"}
            </button>
          </div>
        </div>

        {/* Slaydlar ko'rinishi */}
        <div className="relative min-h-[360px] [perspective:1400px]">
          {[2, 1, 0].map((depth) => (
            <div
              key={`${themeId}-${depth}`}
              className="enter-skew absolute inset-x-4 top-6 aspect-video overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:inset-x-8"
              style={{
                background: theme.bg,
                color: theme.fg,
                transform: `translateY(${depth * 26}px) scale(${1 - depth * 0.06}) rotateX(${depth * 4}deg)`,
                zIndex: 3 - depth,
                opacity: 1 - depth * 0.25,
                animationDelay: `${(2 - depth) * 90}ms`,
              }}
            >
              {depth === 0 ? (
                <div className="flex h-full flex-col justify-between p-6 sm:p-8">
                  <span className="text-xs uppercase tracking-[0.2em] opacity-70">1 / {count}</span>
                  <div>
                    <p className="text-2xl font-bold leading-tight sm:text-3xl">{title}</p>
                    <div className="mt-3 h-1 w-16 rounded-full" style={{ background: theme.accent }} />
                    <p className="mt-3 text-sm opacity-75">CampusAI · Taqdimot</p>
                  </div>
                </div>
              ) : (
                <div className="grid h-full grid-cols-2 gap-4 p-6">
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 rounded-full opacity-60" style={{ background: theme.fg }} />
                    <div className="h-2 w-full rounded-full opacity-30" style={{ background: theme.fg }} />
                    <div className="h-2 w-5/6 rounded-full opacity-30" style={{ background: theme.fg }} />
                  </div>
                  <div className="rounded-xl opacity-40" style={{ background: theme.accent }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-sm text-zinc-500">
        Bu bo&apos;lim AI integratsiyasi bilan ishga tushiriladi: mavzu bo&apos;yicha slayd matnlari, internetdan mos rasmlar
        va tayyor PowerPoint/PDF eksport.
      </p>
    </PageWrap>
  );
}
