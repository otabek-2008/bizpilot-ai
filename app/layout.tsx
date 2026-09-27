import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "CampusAI — talabalar uchun aqlli vositalar",
    template: "%s · CampusAI",
  },
  description:
    "Lotin ↔ Kirill, 3×4 rasm, PDF ↔ Word konvertori, harf registri va AI biznes reja — talabalar uchun bitta platformada.",
};

export const viewport: Viewport = {
  themeColor: "#07070b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
