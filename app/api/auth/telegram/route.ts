import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { telegramEmail, verifyTelegram } from "@/lib/telegram";

// Telegram Login ma'lumotlarini tekshiradi va Supabase sessiyasi uchun bir martalik token qaytaradi.
// Kerakli env: TELEGRAM_BOT_TOKEN, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL.

const TelegramAuth = z.object({
  id: z.coerce.number().int().positive(),
  first_name: z.string().max(256).optional(),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.coerce.number().int(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

const MAX_AGE_SECONDS = 60 * 60;

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!botToken || !serviceKey || !url) {
    return Response.json({ error: "Telegram orqali kirish serverda sozlanmagan." }, { status: 503 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Noto'g'ri so'rov." }, { status: 400 });
  }

  const parsed = TelegramAuth.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Telegram ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  // Imzo Telegram yuborgan barcha maydonlar bo'yicha tekshiriladi (hujjatdagi talab)
  const original = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => typeof v === "string" || typeof v === "number"),
  );
  if (!verifyTelegram(original, botToken)) {
    return Response.json({ error: "Telegram imzosi tasdiqlanmadi." }, { status: 401 });
  }
  if (Date.now() / 1000 - parsed.data.auth_date > MAX_AGE_SECONDS) {
    return Response.json({ error: "Telegram sessiyasi eskirgan. Qayta urinib ko'ring." }, { status: 401 });
  }

  const tg = parsed.data;
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = telegramEmail(tg.id);

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    // app_metadata'ni faqat service role yoza oladi — hisob egaligini shu orqali tekshiramiz
    app_metadata: { telegram_id: tg.id },
    user_metadata: {
      full_name: [tg.first_name, tg.last_name].filter(Boolean).join(" "),
      avatar_url: tg.photo_url ?? "",
      telegram_id: tg.id,
      telegram_username: tg.username ?? "",
    },
  });
  if (createError && createError.code !== "email_exists" && createError.status !== 422) {
    console.error("Telegram createUser error:", createError);
    return Response.json({ error: "Hisob yaratib bo'lmadi." }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    console.error("Telegram generateLink error:", error);
    return Response.json({ error: "Sessiya yaratib bo'lmadi." }, { status: 500 });
  }
  // Shu emailni kimdir boshqa usulda (masalan parol bilan) oldindan egallagan bo'lsa, kiritmaymiz
  if (data.user.app_metadata?.telegram_id !== tg.id) {
    console.error("Telegram email is owned by a non-Telegram account:", data.user.id);
    return Response.json({ error: "Bu Telegram hisobini ulab bo'lmadi. Admin bilan bog'laning." }, { status: 409 });
  }

  return Response.json({ token_hash: data.properties.hashed_token });
}
