import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Admin sessiya tokeni: base64url({exp}) + "." + HMAC-SHA256 imzo.

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const sign = (key: Buffer, payload: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function createToken(key: Buffer, ttlSeconds: number, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + ttlSeconds })).toString("base64url");
  return `${payload}.${sign(key, payload)}`;
}

export function verifyToken(key: Buffer, token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined || !safeEqual(signature, sign(key, payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > now / 1000;
  } catch {
    return false;
  }
}
