import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Telegram Login Widget ma'lumotlari imzosini tekshiradi:
// https://core.telegram.org/widgets/login#checking-authorization

export function telegramHash(fields: Record<string, unknown>, botToken: string): Buffer {
  const checkString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  return createHmac("sha256", secret).update(checkString).digest();
}

export function verifyTelegram(data: Record<string, unknown>, botToken: string): boolean {
  const { hash, ...fields } = data;
  const expected = telegramHash(fields, botToken);
  const given = Buffer.from(String(hash), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Telegram email bermaydi — ichki, hech qachon xat yuborilmaydigan manzil. */
export const telegramEmail = (id: number) => `tg${id}@telegram.campusai.app`;
