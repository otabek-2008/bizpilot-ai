"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, FolderOpen, LayoutDashboard, LogOut, MessagesSquare, ShieldCheck, Users } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";

const links = [
  { href: "/admin", label: "Umumiy", icon: LayoutDashboard },
  { href: "/admin/users", label: "Foydalanuvchilar", icon: Users },
  { href: "/admin/messages", label: "Xabarlar", icon: MessagesSquare },
  { href: "/admin/activity", label: "Faoliyat", icon: Activity },
  { href: "/admin/files", label: "Fayllar", icon: FolderOpen },
];

export default function AdminNav() {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 z-20 border-b border-white/10 bg-ink/90 backdrop-blur lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2.5 px-4 py-4 lg:px-5 lg:py-6">
        <span className="accent-gradient grid size-9 place-items-center rounded-xl">
          <ShieldCheck size={18} />
        </span>
        <span className="font-semibold">
          Campus<span className="text-brand-400">AI</span> <span className="text-zinc-500">admin</span>
        </span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
              active(href) ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={17} /> {label}
          </Link>
        ))}
        <form action={logoutAction} className="shrink-0 lg:mt-4">
          <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-rose-300">
            <LogOut size={17} /> Chiqish
          </button>
        </form>
      </nav>
    </aside>
  );
}
