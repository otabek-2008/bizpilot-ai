import "server-only";

import { timingSafeEqual } from "node:crypto";

// Payme Merchant API: https://developer.help.paycom.uz
// Kerakli env: PAYME_MERCHANT_ID (kassa ID), PAYME_KEY (kassa kaliti; test kassada — test kaliti), PAYME_TEST=1 (test muhit).

export const paymeConfigured = () => !!(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY);

/** Payme to'lov sahifasi havolasi. amount — tiyinda. */
export function checkoutUrl(orderId: number, amountTiyin: number, returnUrl: string): string {
  const params = `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${orderId};a=${amountTiyin};c=${returnUrl};l=uz`;
  const base = process.env.PAYME_TEST === "1" ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
  return `${base}/${Buffer.from(params).toString("base64")}`;
}

/** Payme so'rovidagi "Basic base64(Paycom:KEY)" sarlavhasini tekshiradi. */
export function paymeAuthorized(header: string | null): boolean {
  const key = process.env.PAYME_KEY;
  if (!key || !header?.startsWith("Basic ")) return false;
  const given = Buffer.from(header.slice(6).trim(), "base64").toString();
  const expected = `Paycom:${key}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Payme xato kodlari
export const E = {
  auth: -32504,
  method: -32601,
  parse: -32700,
  request: -32600,
  amount: -31001,
  notFound: -31003,
  cantCancel: -31007,
  cantPerform: -31008,
  order: -31050,
  orderBusy: -31051,
} as const;

const msg = (uz: string, ru: string, en: string) => ({ uz, ru, en });

export const MESSAGES: Record<number, ReturnType<typeof msg>> = {
  [E.auth]: msg("Ruxsat yo'q", "Недостаточно привилегий", "Insufficient privileges"),
  [E.method]: msg("Metod topilmadi", "Метод не найден", "Method not found"),
  [E.parse]: msg("JSON xato", "Ошибка JSON", "Parse error"),
  [E.request]: msg("So'rov noto'g'ri", "Неверный запрос", "Invalid request"),
  [E.amount]: msg("Summa noto'g'ri", "Неверная сумма", "Incorrect amount"),
  [E.notFound]: msg("Tranzaksiya topilmadi", "Транзакция не найдена", "Transaction not found"),
  [E.cantCancel]: msg("Bekor qilib bo'lmaydi", "Невозможно отменить", "Unable to cancel"),
  [E.cantPerform]: msg("Bajarib bo'lmaydi", "Невозможно выполнить операцию", "Unable to perform"),
  [E.order]: msg("Buyurtma topilmadi", "Заказ не найден", "Order not found"),
  [E.orderBusy]: msg("Buyurtma bo'yicha to'lov allaqachon boshlangan", "Заказ уже оплачивается", "Order is already being paid"),
};

// Tranzaksiya yaratilgandan 12 soat o'tsa, Payme uni bajarmaydi.
export const TIMEOUT_MS = 12 * 60 * 60 * 1000;

// Markaziy bank kursi (1 soat keshlanadi).
let rateCache: { rate: number; at: number } | null = null;

export async function usdRate(): Promise<number> {
  if (rateCache && Date.now() - rateCache.at < 60 * 60 * 1000) return rateCache.rate;
  const res = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/", { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CBU ${res.status}`);
  const [usd] = (await res.json()) as { Rate: string }[];
  const rate = Number(usd?.Rate);
  if (!Number.isFinite(rate) || rate < 1000 || rate > 100000) throw new Error(`CBU rate invalid: ${usd?.Rate}`);
  rateCache = { rate, at: Date.now() };
  return rate;
}
