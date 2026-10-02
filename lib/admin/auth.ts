import "server-only";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, safeEqual, verifyToken } from "@/lib/admin/token";

// Admin panelga kirish: login va parol Render env'da (ADMIN_USERNAME, ADMIN_PASSWORD).
// Kirgandan so'ng HMAC bilan imzolangan httpOnly cookie beriladi. Parol o'zgarsa, eski sessiyalar bekor bo'ladi.

export const ADMIN_COOKIE = "campusai_admin";
const SESSION_SECONDS = 12 * 60 * 60;

// Parolni taxmin qilishdan himoya: bitta IP'dan 5 ta xato → 15 daqiqa blok (server xotirasida).
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();
// IP almashtirib urinishga qarshi umumiy chegara: soatiga ko'pi bilan 30 ta xato urinish (barcha IP'lardan).
const GLOBAL_MAX = 30;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
let globalFails: number[] = [];

export function adminConfigured(): boolean {
  return !!(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function signingKey(): Buffer {
  return createHash("sha256")
    .update(`campusai-admin:${process.env.ADMIN_PASSWORD}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
    .digest();
}

export const createSessionToken = (now = Date.now()) => createToken(signingKey(), SESSION_SECONDS, now);

export const verifySessionToken = (token: string | undefined, now = Date.now()) =>
  adminConfigured() && verifyToken(signingKey(), token, now);

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/** Sahifalar uchun: admin bo'lmasa kirish sahifasiga yuboradi. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** Server action'lar uchun: admin bo'lmasa xato tashlaydi. */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Ruxsat yo'q. Qayta kiring.");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  // Sayt Cloudflare orqali ishlaydi: cf-connecting-ip'ni Cloudflare o'zi yozadi, mijoz uni soxtalashtira olmaydi.
  // X-Forwarded-For'ning birinchi qiymatini esa mijoz o'zi yuborishi mumkin — u faqat zaxira.
  return h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function checkLogin(username: string, password: string): Promise<LoginResult> {
  if (!adminConfigured()) {
    return { ok: false, error: "Admin panel sozlanmagan (ADMIN_USERNAME / ADMIN_PASSWORD yo'q)." };
  }
  const ip = await clientIp();
  const now = Date.now();
  globalFails = globalFails.filter((t) => now - t < GLOBAL_WINDOW_MS);
  if (globalFails.length >= GLOBAL_MAX) {
    const minutes = Math.ceil((globalFails[0] + GLOBAL_WINDOW_MS - now) / 60000);
    return { ok: false, error: `Juda ko'p urinish. ${minutes} daqiqadan so'ng qayta urinib ko'ring.` };
  }
  const entry = fails.get(ip);
  if (entry && entry.until > now) {
    const minutes = Math.ceil((entry.until - now) / 60000);
    return { ok: false, error: `Juda ko'p urinish. ${minutes} daqiqadan so'ng qayta urinib ko'ring.` };
  }

  // Ikkala taqqoslash ham doim bajariladi — javob vaqti qaysi biri xato ekanini oshkor qilmasin
  const userOk = safeEqual(username, process.env.ADMIN_USERNAME!);
  const passOk = safeEqual(password, process.env.ADMIN_PASSWORD!);
  if (userOk && passOk) {
    fails.delete(ip);
    const store = await cookies();
    store.set(ADMIN_COOKIE, createSessionToken(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return { ok: true };
  }

  // Blok muddati tugagan bo'lsa, hisob noldan boshlanadi
  const lockExpired = !!entry && entry.until > 0 && entry.until <= now;
  const count = (entry && !lockExpired ? entry.count : 0) + 1;
  fails.set(ip, { count, until: count >= MAX_FAILS ? now + LOCK_MS : 0 });
  globalFails.push(now);
  return { ok: false, error: "Login yoki parol noto'g'ri." };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
