import { createHmac, timingSafeEqual } from "node:crypto";

// Standard Webhooks imzosini tekshiradi (Supabase Auth Hooks shu formatdan foydalanadi).
// secret: "v1,whsec_<base64>" yoki "whsec_<base64>"; imzolangan matn: `${id}.${timestamp}.${body}`.

const TOLERANCE_SECONDS = 5 * 60;

export function signWebhook(secret: string, id: string, timestamp: number, body: string): string {
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  now = Date.now() / 1000,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signWebhook(secret, id, ts, body));
  // Sarlavhada bir nechta imzo bo'lishi mumkin: "v1,abc v1,def"
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
