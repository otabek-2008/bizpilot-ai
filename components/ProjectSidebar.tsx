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

export default function ProjectSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;

  const base = `/dashboard/project/${projectId}`;

  const items = [
    { title: "Dashboard", href: base, icon: LayoutDashboard },
    { title: "Business Plan", href: `${base}/biznes-plan`, icon: Briefcase },
    { title: "Marketing", href: `${base}/marketing`, icon: Megaphone },
    { title: "Finance", href: `${base}/finance`, icon: Wallet },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 min-h-screen p-6 flex flex-col shrink-0">
      <Link
        href="/dashboard"
        className="text-2xl font-bold text-purple-500"
      >
        BizPilot AI
      </Link>

      <div className="mt-8 space-y-2 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 w-full p-3 rounded-xl transition ${
                active
                  ? "bg-purple-600/20 text-purple-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon size={20} />
              {item.title}
            </Link>
          );
        })}
      </div>

      <Link
        href="/dashboard"
        className="flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition mt-4"
      >
        <ArrowLeft size={20} />
        All Projects
      </Link>
    </aside>
  );
}
