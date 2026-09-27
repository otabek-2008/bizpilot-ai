"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, Briefcase, LayoutDashboard, Megaphone, Wallet } from "lucide-react";

// Loyiha ichidagi bo'limlar — asosiy sidebar ichida gorizontal tab ko'rinishida.
export default function ProjectTabs() {
  const params = useParams();
  const pathname = usePathname();
  const base = `/dashboard/project/${params.id as string}`;

  const items = [
    { title: "Umumiy", href: base, icon: LayoutDashboard },
    { title: "Biznes reja", href: `${base}/biznes-plan`, icon: Briefcase },
    { title: "Marketing", href: `${base}/marketing`, icon: Megaphone },
    { title: "Moliya", href: `${base}/finance`, icon: Wallet },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-6 sm:px-8">
      <div className="flex items-center gap-2 overflow-x-auto">
        <Link
          href="/dashboard/business"
          aria-label="Barcha loyihalar"
          className="chip shrink-0 !px-2.5"
        >
          <ArrowLeft size={16} />
        </Link>
        <nav className="glass flex gap-1 rounded-2xl p-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.title}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition ${
                  active ? "accent-gradient text-white shadow-lg" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
