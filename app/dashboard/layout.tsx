import type { Metadata } from "next";
import AppShell from "@/components/shell/AppShell";

// Shaxsiy kabinet qidiruv natijalarida chiqmasin
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
