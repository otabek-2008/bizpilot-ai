"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import Avatar from "@/components/shell/Avatar";
import { useAuth } from "@/components/AuthProvider";
import { moduleForPath, modules, navGroups } from "@/lib/modules";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = moduleForPath(pathname);
  const { profile, signOut } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-3">
        <Logo href="/dashboard" />
      </div>

      <nav className="flex-1 space-y-3.5 overflow-y-auto px-3 pb-3">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((id) => {
                const m = modules[id];
                const Icon = m.icon;
                const isActive = active.id === id;
                return (
                  <li key={id}>
                    <Link
                      href={m.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      style={{ "--accent": m.from, "--accent-2": m.to } as React.CSSProperties}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        isActive
                          ? "bg-white/[0.06] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <span className="accent-gradient absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" />
                      )}
                      <span
                        className={`grid size-7 place-items-center rounded-lg transition group-hover:scale-110 ${
                          isActive ? "accent-gradient text-white shadow-lg" : "bg-white/[0.04]"
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="flex-1 truncate">{m.short}</span>
                      {m.badge && (
                        <span className="accent-soft rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                          {m.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Link href="/dashboard/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar profile={profile} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{profile.name}</span>
              <span className="block truncate text-xs text-zinc-500">
                {profile.email || profile.phone || "Profil"}
              </span>
            </span>
          </Link>
          <button
            onClick={signOut}
            title="Chiqish"
            aria-label="Chiqish"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-red-300"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
