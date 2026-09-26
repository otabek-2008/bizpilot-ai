import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizPilot AI",
  description: "AI-powered business planning assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
