"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, CalendarDays, Clock, Flame, Headset, MessagesSquare, Zap } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { PageWrap } from "@/components/ui/ModuleHeader";
import { modules, toolIds, type ModuleId } from "@/lib/modules";
import { timeAgo, useActivity, type ActivityItem } from "@/lib/activity";
import { supabase } from "@/lib/supabase";
import { formatShortDate, formatToday, weekdayShort } from "@/lib/date";

const DAY = 86_400_000;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Xayrli tun";
  if (h < 12) return "Xayrli tong";
  if (h < 18) return "Xayrli kun";
  return "Xayrli kech";
}

export default function DashboardHome() {
  const { profile } = useAuth();
  const activity = useActivity();
  const [projects, setProjects] = useState<number | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .then(({ count }) => setProjects(count ?? 0));
  }, [profile.id]);

  const stats = useMemo(() => {
    const weekAgo = now - 7 * DAY;
    const week = activity.filter((a) => a.at >= weekAgo);
    const counts = new Map<ModuleId, number>();
    for (const a of activity) counts.set(a.module, (counts.get(a.module) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

    // So'nggi 7 kun bo'yicha kunlik amallar soni
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const from = start.getTime() - (6 - i) * DAY;
      return {
        label: weekdayShort(from),
        date: formatShortDate(from),
        count: activity.filter((a) => a.at >= from && a.at < from + DAY).length,
      };
    });

    return { total: activity.length, week: week.length, top: top ? modules[top[0]] : null, days };
  }, [activity, now]);

  const today = formatToday(now);

  return (
    <PageWrap>
      {/* Salomlashish */}
      <section className="glass relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
        <div aria-hidden className="absolute -right-20 -top-24 size-80 rounded-full bg-brand-500/30 blur-3xl animate-aurora" />
        <div aria-hidden className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-cyan-500/15 blur-3xl animate-aurora [animation-delay:-6s]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <CalendarDays size={15} /> <span>{today}</span>
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              {greeting()}, <span className="text-gradient">{profile.firstName}</span> 👋
            </h1>
            <p className="mt-3 max-w-xl text-zinc-400">
              Bugun nima qilamiz? Matn, rasm va hujjatlar bilan ishlash uchun barcha vositalar shu yerda.
            </p>
          </div>
          <Link href={modules.translit.href} className="btn-primary shrink-0 self-start md:self-auto">
            <Zap size={17} /> Tezkor boshlash
          </Link>
        </div>
      </section>

      {/* Statistika */}
      <section className="stagger mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile icon={Activity} label="Jami amallar" value={String(stats.total)} tint="#8b5cf6" />
        <StatTile icon={Flame} label="Shu hafta" value={String(stats.week)} tint="#f97316" />
        <StatTile
          icon={stats.top?.icon ?? Zap}
          label="Eng ko'p ishlatilgan"
          value={stats.top?.short ?? "—"}
          tint={stats.top?.from ?? "#06b6d4"}
          small
        />
        <StatTile
          icon={modules.business.icon}
          label="Biznes loyihalar"
          value={projects === null ? "…" : String(projects)}
          tint={modules.business.from}
          href={modules.business.href}
        />
      </section>

      {/* Vositalar */}
      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Vositalar</h2>
          <p className="text-sm text-zinc-500">{toolIds.length} ta modul</p>
        </div>
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {toolIds.map((id) => (
            <ToolCard key={id} id={id} />
          ))}
        </div>
      </section>

      {/* Faoliyat */}
      <section className="mt-10 grid gap-4 lg:grid-cols-5">
        <div className="glass rounded-3xl p-6 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Clock size={18} className="text-zinc-400" /> So&apos;nggi faoliyat
            </h2>
          </div>
          <ActivityFeed items={activity.slice(0, 8)} />
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <WeekChart days={stats.days} />
          <div className="grid grid-cols-2 gap-4">
            {[modules.chat, modules.contact].map((m) => (
              <Link
                key={m.id}
                href={m.href}
                style={{ "--accent": m.from, "--accent-2": m.to } as React.CSSProperties}
                className="glass lift group rounded-3xl p-5"
              >
                <span className="accent-gradient lift-icon grid size-10 place-items-center rounded-xl">
                  {m.id === "chat" ? <MessagesSquare size={18} /> : <Headset size={18} />}
                </span>
                <p className="mt-4 font-medium">{m.short}</p>
                <p className="text-xs text-zinc-500">{m.id === "chat" ? "Savol bering" : "Admin bilan"}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageWrap>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tint,
  small,
  href,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  tint: string;
  small?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl"
        style={{ background: `color-mix(in oklab, ${tint} 18%, transparent)`, color: `color-mix(in oklab, ${tint} 60%, white)` }}
      >
        <Icon size={20} />
      </span>
      <div className="w-full min-w-0">
        <p className={`truncate font-semibold tabular-nums ${small ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}>{value}</p>
        <p className="text-xs text-zinc-500 sm:text-sm">{label}</p>
      </div>
    </>
  );
  const cls = "glass lift flex flex-col items-start gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5";
  const style = { "--accent": tint, "--accent-2": tint } as React.CSSProperties;
  return href ? (
    <Link href={href} className={cls} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

function ToolCard({ id }: { id: ModuleId }) {
  const m = modules[id];
  const Icon = m.icon;
  return (
    <Link
      href={m.href}
      style={{ "--accent": m.from, "--accent-2": m.to } as React.CSSProperties}
      className="glass lift group relative flex min-h-[180px] flex-col overflow-hidden rounded-3xl p-6"
    >
      <div
        aria-hidden
        className="absolute -right-14 -top-14 size-44 rounded-full opacity-30 blur-2xl transition duration-500 group-hover:scale-125 group-hover:opacity-50"
        style={{ background: m.from }}
      />
      <div className="relative flex items-start justify-between">
        <span className="accent-gradient lift-icon grid size-12 place-items-center rounded-2xl shadow-lg">
          <Icon size={22} />
        </span>
        {m.badge ? (
          <span className="accent-soft rounded-full px-2.5 py-1 text-xs font-medium">{m.badge}</span>
        ) : (
          <ArrowUpRight size={18} className="text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
        )}
      </div>
      <h3 className="relative mt-5 text-lg font-semibold">{m.title}</h3>
      <p className="relative mt-1.5 text-sm text-zinc-400">{m.desc}</p>
    </Link>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
        <p className="text-zinc-400">Hali faoliyat yo&apos;q.</p>
        <p className="mt-1 text-sm text-zinc-600">Vositalardan birini ishlatib ko&apos;ring — bu yerda ko&apos;rinadi.</p>
      </div>
    );
  }
  return (
    <ol className="relative space-y-1">
      <span aria-hidden className="absolute bottom-3 left-[19px] top-3 w-px bg-white/5" />
      {items.map((a, i) => {
        const m = modules[a.module];
        const Icon = m.icon;
        return (
          <li
            key={a.id}
            className="animate-bubble-in relative flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/[0.03]"
            style={{ animationDelay: `${i * 40}ms`, "--accent": m.from, "--accent-2": m.to } as React.CSSProperties}
          >
            <span className="accent-gradient relative grid size-6 shrink-0 place-items-center rounded-lg ring-4 ring-ink">
              <Icon size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-200">{a.title}</p>
              <p className="text-xs text-zinc-500">{m.short}</p>
            </div>
            <time className="shrink-0 text-xs text-zinc-500" dateTime={new Date(a.at).toISOString()}>
              {timeAgo(a.at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

// Oxirgi 7 kun: bitta seriya, bitta rang, ustun ustiga kelganda qiymat ko'rinadi.
function WeekChart({ days }: { days: { label: string; date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? days.length - 1;

  return (
    <figure className="glass rounded-3xl p-6">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-300">Kunlik amallar · 7 kun</span>
        <span className="text-sm tabular-nums text-zinc-400">
          {days[shown].date}: <span className="font-semibold text-white">{days[shown].count}</span>
        </span>
      </figcaption>
      <div className="mt-5 flex h-28 items-end gap-2 border-b border-white/10" onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${d.date}: ${d.count} ta amal`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="group flex h-full flex-1 items-end justify-center outline-none"
          >
            <span
              className={`w-full max-w-7 rounded-t-[4px] transition-all duration-500 ${
                shown === i ? "bg-brand-400" : "bg-brand-500/45 group-hover:bg-brand-400/80"
              }`}
              style={{ height: `${Math.max(d.count ? 6 : 2, (d.count / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {days.map((d, i) => (
          <span key={i} className={`flex-1 text-center text-[11px] ${shown === i ? "text-zinc-200" : "text-zinc-500"}`}>
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
