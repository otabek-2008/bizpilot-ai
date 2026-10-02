import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { E, MESSAGES, TIMEOUT_MS, paymeAuthorized } from "@/lib/payme";

// Payme Merchant API (JSON-RPC). Payme kassa sozlamalarida "endpoint" sifatida shu manzil ko'rsatiladi:
//   https://<sayt>/api/payme
// Javob HTTP 200 bilan, xatolar esa { error: { code, message } } ko'rinishida qaytariladi.

type Rpc = { id?: number | string; method?: string; params?: Record<string, unknown> };

type Payment = {
  id: number;
  user_id: string;
  plan: string;
  amount: number;
  state: number;
  payme_id: string | null;
  payme_time: number | null;
  create_time: number | null;
  perform_time: number | null;
  cancel_time: number | null;
  reason: number | null;
};

class RpcError extends Error {
  constructor(
    public code: number,
    public data?: string,
  ) {
    super(String(code));
  }
}

let client: SupabaseClient | null = null;
const db = () =>
  (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

const ok = (id: Rpc["id"], result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
const fail = (id: Rpc["id"], code: number, data?: string) =>
  Response.json({ jsonrpc: "2.0", id, error: { code, message: MESSAGES[code] ?? MESSAGES[E.request], data } });

export async function POST(request: Request) {
  let rpc: Rpc = {};
  try {
    rpc = await request.json();
  } catch {
    return fail(null as unknown as undefined, E.parse);
  }
  if (!paymeAuthorized(request.headers.get("authorization"))) return fail(rpc.id, E.auth);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return fail(rpc.id, E.request, "server");

  try {
    const p = rpc.params ?? {};
    switch (rpc.method) {
      case "CheckPerformTransaction":
        await orderFor(p);
        return ok(rpc.id, { allow: true });
      case "CreateTransaction":
        return ok(rpc.id, await createTransaction(p));
      case "PerformTransaction":
        return ok(rpc.id, await performTransaction(p));
      case "CancelTransaction":
        return ok(rpc.id, await cancelTransaction(p));
      case "CheckTransaction":
        return ok(rpc.id, view(await byPaymeId(p.id)));
      case "GetStatement":
        return ok(rpc.id, await statement(p));
      default:
        return fail(rpc.id, E.method);
    }
  } catch (e) {
    if (e instanceof RpcError) return fail(rpc.id, e.code, e.data);
    console.error("Payme error:", e);
    return fail(rpc.id, E.request, "internal");
  }
}

/** Buyurtma mavjud, to'lanmagan va summasi to'g'ri ekanini tekshiradi. */
async function orderFor(p: Record<string, unknown>): Promise<Payment> {
  const account = (p.account ?? {}) as Record<string, unknown>;
  const orderId = Number(account.order_id);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new RpcError(E.order, "order_id");
  const { data, error } = await db().from("payments").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  if (!data) throw new RpcError(E.order, "order_id");
  const order = data as Payment;
  if (Number(p.amount) !== Number(order.amount)) throw new RpcError(E.amount);
  if (order.state === 2 || order.state === -2) throw new RpcError(E.order, "order_id");
  return order;
}

async function byPaymeId(id: unknown): Promise<Payment> {
  if (typeof id !== "string" || !id) throw new RpcError(E.notFound);
  const { data, error } = await db().from("payments").select("*").eq("payme_id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new RpcError(E.notFound);
  return data as Payment;
}

const view = (t: Payment) => ({
  create_time: t.create_time ?? 0,
  perform_time: t.perform_time ?? 0,
  cancel_time: t.cancel_time ?? 0,
  transaction: String(t.id),
  state: t.state,
  reason: t.reason,
});

async function cancelRpc(paymeId: string, reason: number): Promise<Payment> {
  const { data, error } = await db().rpc("payme_cancel", { p_payme_id: paymeId, p_time: Date.now(), p_reason: reason });
  if (error) throw error;
  return (data as Payment[])[0];
}

async function createTransaction(p: Record<string, unknown>) {
  const paymeId = p.id;
  if (typeof paymeId !== "string" || !paymeId) throw new RpcError(E.request, "id");

  const { data: existing } = await db().from("payments").select("*").eq("payme_id", paymeId).maybeSingle();
  if (existing) {
    const t = existing as Payment;
    if (t.state !== 1) throw new RpcError(E.cantPerform);
    if (Date.now() - (t.create_time ?? 0) > TIMEOUT_MS) {
      await cancelRpc(paymeId, 4);
      throw new RpcError(E.cantPerform);
    }
    return { create_time: t.create_time, transaction: String(t.id), state: t.state };
  }

  const order = await orderFor(p);
  // Bitta buyurtmaga faqat bitta tranzaksiya
  if (order.state !== 0) throw new RpcError(E.orderBusy, "order_id");

  const now = Date.now();
  const { data, error } = await db()
    .from("payments")
    .update({ state: 1, payme_id: paymeId, payme_time: Number(p.time) || now, create_time: now })
    .eq("id", order.id)
    .eq("state", 0)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new RpcError(E.orderBusy, "order_id");
  const t = data as Payment;
  return { create_time: t.create_time, transaction: String(t.id), state: t.state };
}

async function performTransaction(p: Record<string, unknown>) {
  const t = await byPaymeId(p.id);
  if (t.state === 1) {
    if (Date.now() - (t.create_time ?? 0) > TIMEOUT_MS) {
      await cancelRpc(t.payme_id!, 4);
      throw new RpcError(E.cantPerform);
    }
    const { data, error } = await db().rpc("payme_perform", { p_payme_id: t.payme_id, p_time: Date.now() });
    if (error) throw error;
    const done = (data as Payment[])[0];
    if (done.state !== 2) throw new RpcError(E.cantPerform);
    return { transaction: String(done.id), perform_time: done.perform_time, state: done.state };
  }
  if (t.state === 2) return { transaction: String(t.id), perform_time: t.perform_time, state: t.state };
  throw new RpcError(E.cantPerform);
}

async function cancelTransaction(p: Record<string, unknown>) {
  const t = await byPaymeId(p.id);
  const done = t.state === 1 || t.state === 2 ? await cancelRpc(t.payme_id!, Number(p.reason) || 0) : t;
  return { transaction: String(done.id), cancel_time: done.cancel_time, state: done.state };
}

async function statement(p: Record<string, unknown>) {
  const from = Number(p.from);
  const to = Number(p.to);
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new RpcError(E.request, "from/to");
  const { data, error } = await db()
    .from("payments")
    .select("*")
    .not("payme_id", "is", null)
    .gte("create_time", from)
    .lte("create_time", to)
    .order("create_time");
  if (error) throw error;
  return {
    transactions: (data as Payment[]).map((t) => ({
      id: t.payme_id,
      time: t.payme_time,
      amount: t.amount,
      account: { order_id: String(t.id) },
      create_time: t.create_time,
      perform_time: t.perform_time ?? 0,
      cancel_time: t.cancel_time ?? 0,
      transaction: String(t.id),
      state: t.state,
      reason: t.reason,
    })),
  };
}
