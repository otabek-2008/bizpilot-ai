import { createClient } from "@supabase/supabase-js";
import { PLANS, isPlan, usdToUzs } from "@/lib/billing";
import { checkoutUrl, paymeConfigured, usdRate } from "@/lib/payme";
import { site } from "@/lib/site";

// Obuna uchun buyurtma yaratadi va Payme to'lov sahifasi havolasini qaytaradi.

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!paymeConfigured() || !serviceKey) {
    return Response.json({ error: "Onlayn to'lov hali ulanmagan. Admin bilan bog'laning." }, { status: 503 });
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return Response.json({ error: "Sessiya yaroqsiz. Qayta kiring." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isPlan(body?.plan)) return Response.json({ error: "Tarifni tanlang." }, { status: 400 });
  const plan = PLANS[body.plan as keyof typeof PLANS];

  let rate: number;
  try {
    rate = await usdRate();
  } catch (e) {
    console.error("USD rate error:", e);
    return Response.json({ error: "Valyuta kursini olib bo'lmadi. Birozdan so'ng urinib ko'ring." }, { status: 503 });
  }
  const amount = usdToUzs(plan.usd, rate) * 100;

  const { data, error } = await db
    .from("payments")
    .insert({ user_id: auth.user.id, plan: plan.id, amount, usd: plan.usd, rate })
    .select("id")
    .single();
  if (error) {
    console.error("Payment insert error:", error.message);
    return Response.json({ error: "Buyurtma yaratib bo'lmadi." }, { status: 500 });
  }

  return Response.json({ url: checkoutUrl(data.id, amount, `${site.url}/dashboard/obuna?tolov=${data.id}`) });
}
