import type { NextConfig } from "next";

// Himoya sarlavhalari: sayt boshqa sahifalarga iframe orqali joylanmaydi (clickjacking), HTTPS majburiy.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// O'z domen ulangach (NEXT_PUBLIC_SITE_URL), eski Render manzilidan unga doimiy yo'naltiriladi — SEO uchun bitta asosiy manzil.
// /api/ yo'naltirilmaydi: Payme, Octo kabi tashqi xizmatlar eski manzilga so'rov yuborsa ham ishlayversin.
const RENDER_HOST = "bizpilot-ai-upl1.onrender.com";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.5", "localhost", "127.0.0.1"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    if (!siteUrl || new URL(siteUrl).host === RENDER_HOST) return [];
    return [
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: RENDER_HOST }],
        destination: `${siteUrl}/:path`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
