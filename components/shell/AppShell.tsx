"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import AuthProvider, { useAuth } from "@/components/AuthProvider";
import Backdrop from "@/components/Backdrop";
import Sidebar from "@/components/shell/Sidebar";
import Avatar from "@/components/shell/Avatar";
import BootScreen from "@/components/shell/BootScreen";
import { moduleForPath } from "@/lib/modules";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider fallback={<BootScreen />}>
      <Frame>{children}</Frame>
    </AuthProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mod = moduleForPath(pathname);
  const { profile } = useAuth();
  const [drawer, setDrawer] = useState(false);

  // Sahifa almashganda mobil menyuni yopamiz.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawer(false);
  }

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const Icon = mod.icon;

  return (
    <div
      className="module-scope relative min-h-screen text-white"
      style={{ "--accent": mod.from, "--accent-2": mod.to } as React.CSSProperties}
    >
      <Backdrop />
      {/* Bo'lim rangidagi yumshoq nur — bo'lim almashganda silliq o'zgaradi */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 right-[-10%] -z-10 h-[480px] w-[640px] rounded-full opacity-25 blur-[140px] transition-colors duration-700"
        style={{ background: mod.from }}
      />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/5 bg-ink/40 backdrop-blur-2xl lg:block">
        <Sidebar />
      </aside>

      {/* Mobil drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menyu">
          <button
            aria-label="Menyuni yopish"
            className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <aside className="animate-drawer-in absolute inset-y-0 left-0 w-[82%] max-w-xs border-r border-white/10 bg-surface/95 backdrop-blur-2xl">
            <button
              onClick={() => setDrawer(false)}
              aria-label="Yopish"
              className="absolute right-3 top-6 rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/50 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              onClick={() => setDrawer(true)}
              aria-label="Menyuni ochish"
              className="rounded-lg p-2 text-zinc-300 hover:bg-white/5 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div key={mod.id} className="animate-fade-in flex min-w-0 items-center gap-2.5">
              <span className="accent-gradient grid size-8 shrink-0 place-items-center rounded-lg shadow-lg">
                <Icon size={16} />
              </span>
              <span className="truncate text-sm font-medium text-zinc-200">{mod.title}</span>
            </div>

            <Link
              href="/dashboard/profile"
              className="ml-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-1 transition hover:border-white/20 sm:pr-4"
            >
              <Avatar profile={profile} className="size-8 text-xs" />
              <span className="hidden max-w-[160px] truncate text-sm text-zinc-300 sm:block">
                {profile.firstName}
              </span>
            </Link>
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
