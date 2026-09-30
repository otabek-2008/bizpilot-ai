import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const geistSans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const description =
  "CampusAI — O'zbekistondagi talabalar uchun bepul AI platforma: AI yordamchi, referat va esse yozish, imlo tekshiruvchi, CV, Lotin ↔ Kirill, 3×4 rasm, PDF ↔ Word konvertori.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  title: {
    default: "CampusAI — talabalar uchun aqlli AI vositalar",
    template: "%s · CampusAI",
  },
  description,
  keywords: [
    "CampusAI",
    "Campus AI",
    "campusai",
    "talabalar uchun AI",
    "referat yozish",
    "esse yozish",
    "lotin kirill",
    "3x4 rasm",
    "PDF Word konvertor",
    "imlo tekshirish",
    "CV yaratish",
    "o'zbekcha AI",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "uz_UZ",
    url: "/",
    title: "CampusAI — talabalar uchun aqlli AI vositalar",
    description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  // Google Search Console'dagi "HTML tag" usuli uchun kod (faqat content="..." ichidagi qism)
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
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
