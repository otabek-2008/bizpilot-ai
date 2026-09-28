import { z } from "zod";
import { verifyWebhook } from "@/lib/webhook";
import { eskizConfigured, sendSms } from "@/lib/eskiz";

// Supabase Auth "Send SMS Hook": Supabase OTP kodni shu yerga yuboradi, biz uni Eskiz.uz orqali jo'natamiz.
// Kerakli env: SMS_HOOK_SECRET (Supabase'dagi "v1,whsec_..." qiymat), ESKIZ_EMAIL, ESKIZ_PASSWORD.

const Payload = z.object({
  user: z.object({ phone: z.string().min(9) }),
  sms: z.object({ otp: z.string().min(4).max(10) }),
});

function hookError(message: string, status: number) {
  return Response.json({ error: { http_code: status, message } }, { status });
}

export async function POST(request: Request) {
  const secret = process.env.SMS_HOOK_SECRET;
  if (!secret || !eskizConfigured()) return hookError("SMS xizmati serverda sozlanmagan.", 503);

  const body = await request.text();
  const ok = verifyWebhook(
    secret,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    body,
  );
  if (!ok) return hookError("Imzo tasdiqlanmadi.", 401);

  let parsed;
  try {
    parsed = Payload.safeParse(JSON.parse(body));
  } catch {
    return hookError("Noto'g'ri so'rov.", 400);
  }
  if (!parsed.success) return hookError("Noto'g'ri so'rov.", 400);

  const { user, sms } = parsed.data;
  // Matn Eskiz kabinetida tasdiqlangan shablon bilan aynan mos bo'lishi shart.
  const text = (process.env.ESKIZ_TEMPLATE || "CampusAI tasdiqlash kodi: {code}").replace("{code}", sms.otp);
  try {
    await sendSms(user.phone, text);
  } catch (e) {
    console.error(e);
    return hookError("SMS yuborib bo'lmadi. Birozdan so'ng urinib ko'ring.", 502);
  }
  return Response.json({});
}
