import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

// Octo (https://help.octo.uz) — karta orqali to'lov: Visa, Mastercard, Humo, Uzcard.
// Karta ma'lumotlari faqat Octo sahifasida kiritiladi, bizning serverga kelmaydi.
// Kerakli env: OCTO_SHOP_ID, OCTO_SECRET; ixtiyoriy: OCTO_UNIQUE_KEY (xabarnoma imzosi), OCTO_TEST=1 (test to'lovlar).

const API = "https://secure.octo.uz/prepare_payment";

export const octoConfigured = () => !!(process.env.OCTO_SHOP_ID && process.env.OCTO_SECRET);

export const octoTransactionId = (paymentId: number) => `campusai-${paymentId}`;

export function paymentIdFrom(shopTransactionId: unknown): number | null {
  const m = typeof shopTransactionId === "string" ? /^campusai-(\d+)$/.exec(shopTransactionId) : null;
  return m ? Number(m[1]) : null;
}

type OctoResponse = {
  error: number;
  errMessage?: string;
  data?: { shop_transaction_id: string; octo_payment_UUID: string; status: string; octo_pay_url?: string } | null;
};

async function call(body: Record<string, unknown>): Promise<NonNullable<OctoResponse["data"]>> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ octo_shop_id: Number(process.env.OCTO_SHOP_ID), octo_secret: process.env.OCTO_SECRET, ...body }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => null)) as OctoResponse | null;
  if (!json || json.error !== 0 || !json.data) throw new Error(`Octo: ${json?.errMessage ?? res.status}`);
  return json.data;
}

/** Toshkent vaqti, "yyyy-MM-dd HH:mm:ss". */
function tashkentTime(d = new Date()): string {
  return new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 19).replace("T", " ");
}

export async function createOctoPayment(opts: {
  paymentId: number;
  amountUzs: number;
  description: string;
  userId: string;
  email?: string;
  returnUrl: string;
  notifyUrl: string;
}): Promise<{ uuid: string; url: string }> {
  const data = await call({
    shop_transaction_id: octoTransactionId(opts.paymentId),
    auto_capture: true,
    test: process.env.OCTO_TEST === "1",
    init_time: tashkentTime(),
    user_data: { user_id: opts.userId, ...(opts.email ? { email: opts.email } : {}) },
    total_sum: opts.amountUzs,
    currency: "UZS",
    description: opts.description,
    payment_methods: [{ method: "bank_card" }, { method: "uzcard" }, { method: "humo" }],
    return_url: opts.returnUrl,
    notify_url: opts.notifyUrl,
    language: "uz",
    ttl: 15,
  });
  if (!data.octo_pay_url) throw new Error("Octo: octo_pay_url yo'q");
  return { uuid: data.octo_payment_UUID, url: data.octo_pay_url };
}

/** To'lov holatini Octo'ning o'zidan so'raydi (xabarnomaga ko'r-ko'rona ishonmaymiz). */
export async function octoStatus(paymentId: number): Promise<{ status: string; uuid: string }> {
  const data = await call({ shop_transaction_id: octoTransactionId(paymentId) });
  return { status: data.status, uuid: data.octo_payment_UUID };
}

/** Xabarnoma imzosi: sha1(unique_key + uuid + status). Kalit berilmagan bo'lsa tekshirilmaydi (holat baribir Octo'dan so'raladi). */
export function octoSignatureOk(uuid: string, status: string, signature: unknown): boolean {
  const key = process.env.OCTO_UNIQUE_KEY;
  if (!key) return true;
  if (typeof signature !== "string") return false;
  const expected = createHash("sha1").update(key + uuid + status).digest("hex").toUpperCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
