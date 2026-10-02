import { createClient } from "@supabase/supabase-js";
import { octoConfigured, octoSignatureOk, octoStatus, paymentIdFrom } from "@/lib/octo";

// Octo xabarnomasi (notify_url). Holat har doim Octo API'dan qayta so'raladi — faqat "succeeded" bo'lsa obuna yoqiladi.

const FAILED = new Set(["canceled", "cancelled", "failed", "expired", "rejected"]);

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!octoConfigured() || !serviceKey) return Response.json({ error: "not configured" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = paymentIdFrom(body?.shop_transaction_id);
  if (!body || !id) return Response.json({ error: "bad request" }, { status: 400 });
  if (!octoSignatureOk(String(body.octo_payment_UUID ?? ""), String(body.status ?? ""), body.signature)) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: payment } = await db.from("payments").select("id, provider, state, octo_uuid").eq("id", id).maybeSingle();
  if (!payment || payment.provider !== "octo") return Response.json({ error: "not found" }, { status: 404 });
  if (payment.state !== 0) return Response.json({ ok: true });

  let status: string;
  try {
    ({ status } = await octoStatus(id));
  } catch (e) {
    console.error("Octo status error:", e);
    // Octo xabarnomani qayta yuboradi
    return Response.json({ error: "status check failed" }, { status: 502 });
  }

  if (status === "succeeded") {
    const { error } = await db.rpc("octo_complete", { p_id: id });
    if (error) {
      console.error("octo_complete error:", error.message);
      return Response.json({ error: "db" }, { status: 500 });
    }
  } else if (FAILED.has(status)) {
    await db.from("payments").update({ state: -1, cancel_time: Date.now() }).eq("id", id).eq("state", 0);
  }
  return Response.json({ ok: true });
}
