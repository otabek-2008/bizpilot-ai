import { createClient } from "@supabase/supabase-js";
import { PLANS, isPlan, usdToUzs } from "@/lib/billing";
import { checkoutUrl, paymeConfigured, usdRate } from "@/lib/payme";
import { createOctoPayment, octoConfigured } from "@/lib/octo";
import { site } from "@/lib/site";

// Obuna uchun buyurtma yaratadi va to'lov sahifasi havolasini qaytaradi:
//   provider "octo"  — Octo (Visa, Mastercard, Humo, Uzcard karta bilan)
//   provider "payme" — Payme

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const body = await request.json().catch(() => null);
  const provider = body?.provider === "payme" ? "payme" : "octo";
  const configured = provider === "payme" ? paymeConfigured() : octoConfigured();
  if (!configured || !serviceKey) {
    return Response.json(
      { error: provider === "payme" ? "Payme hali ulanmagan. Karta bilan to'lab ko'ring." : "Karta orqali to'lov hali ulanmagan. Admin bilan bog'laning." },
      { status: 503 },
    );
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return Response.json({ error: "Sessiya yaroqsiz. Qayta kiring." }, { status: 401 });

  if (!isPlan(body?.plan)) return Response.json({ error: "Tarifni tanlang." }, { status: 400 });
  const plan = PLANS[body.plan as keyof typeof PLANS];

  let rate: number;
  try {
    rate = await usdRate();
  } catch (e) {
    console.error("USD rate error:", e);
    return Response.json({ error: "Valyuta kursini olib bo'lmadi. Birozdan so'ng urinib ko'ring." }, { status: 503 });
  }
  const sum = usdToUzs(plan.usd, rate);
  // amount — tiyinda (Payme talabi); Octo'ga so'mda yuboriladi
  const amount = sum * 100;

  const { data, error } = await db
    .from("payments")
    .insert({ user_id: auth.user.id, plan: plan.id, amount, usd: plan.usd, rate, provider })
    .select("id")
    .single();
  if (error) {
    console.error("Payment insert error:", error.message);
    return Response.json({ error: "Buyurtma yaratib bo'lmadi." }, { status: 500 });
  }

  const returnUrl = `${site.url}/dashboard/premium?tolov=${data.id}`;
  if (provider === "payme") return Response.json({ url: checkoutUrl(data.id, amount, returnUrl) });

  try {
    const octo = await createOctoPayment({
      paymentId: data.id,
      amountUzs: sum,
      description: `CampusAI Premium - ${plan.title}`,
      userId: auth.user.id,
      email: auth.user.email && !auth.user.email.endsWith("@telegram.campusai.app") ? auth.user.email : undefined,
      returnUrl,
      notifyUrl: `${site.url}/api/octo`,
    });
    await db.from("payments").update({ octo_uuid: octo.uuid }).eq("id", data.id);
    return Response.json({ url: octo.url });
  } catch (e) {
    console.error("Octo prepare_payment error:", e);
    await db.from("payments").update({ state: -1 }).eq("id", data.id);
    return Response.json({ error: "Karta orqali to'lovni boshlab bo'lmadi. Birozdan so'ng urinib ko'ring." }, { status: 502 });
  }
}
