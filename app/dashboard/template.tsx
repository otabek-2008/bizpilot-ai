"use client";

import { usePathname } from "next/navigation";
import { moduleForPath } from "@/lib/modules";

// Har bir bo'limga o'tganda o'sha bo'limning o'ziga xos kirish animatsiyasi ishlaydi.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const mod = moduleForPath(usePathname());
  return <div className={`enter-${mod.enter}`}>{children}</div>;
}
