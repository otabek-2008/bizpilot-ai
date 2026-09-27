"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Megaphone,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import Logo from "@/components/Logo";

export default function ProjectSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;

  const base = `/dashboard/project/${projectId}`;

  const items = [
    { title: "Umumiy", href: base, icon: LayoutDashboard },
    { title: "Biznes reja", href: `${base}/biznes-plan`, icon: Briefcase },
    { title: "Marketing", href: `${base}/marketing`, icon: Megaphone },
    { title: "Moliya", href: `${base}/finance`, icon: Wallet },
  ];

  return (
    <aside className="sticky top-0 z-30 border-b border-white/5 bg-ink/70 backdrop-blur-xl lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-white/[0.02]">
      <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <Logo href="/dashboard" />
          <Link
            href="/dashboard"
            aria-label="Barcha loyihalar"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            <ArrowLeft size={18} />
          </Link>
        </div>

        <p className="mt-6 hidden px-3 text-xs font-medium uppercase tracking-wider text-zinc-600 lg:block">
          Ish maydoni
        </p>

        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-1 lg:flex-col lg:overflow-visible">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.title}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-gradient-to-r from-brand-500/20 to-brand-500/5 text-white shadow-[inset_0_0_0_1px_rgb(167_139_250/0.25)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-400 lg:block" />
                )}
                <Icon size={18} className={active ? "text-brand-300" : ""} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/dashboard"
          className="hidden items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white lg:flex"
        >
          <ArrowLeft size={18} />
          Barcha loyihalar
        </Link>
      </div>
    </aside>
  );
}
