import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { synthesizeMp3 } from "@/lib/tts";

// Matn → MP3 (eSpeak NG, serverda). AI ishlatilmaydi, shuning uchun AI kunlik limitiga kirmaydi.

export const maxDuration = 120;

const Input = z.object({
  text: z.string().trim().min(1).max(20000),
  lang: z.enum(["uz", "ru", "en"]),
  rate: z.number().min(0.5).max(2),
});

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return Response.json({ error: "Server sozlanmagan." }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 });

  // Foydalanuvchi nomidan: has_access() — sinov muddati yoki Premium
  const db = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return Response.json({ error: "Sessiya yaroqsiz. Qayta kiring." }, { status: 401 });
  const { data: access, error } = await db.rpc("has_access");
  if (error) {
    console.error("has_access error:", error.message);
    return Response.json({ error: "Obunani tekshirib bo'lmadi. Birozdan so'ng urinib ko'ring." }, { status: 503 });
  }
  if (!access) {
    return Response.json({ error: "Bepul sinov muddati tugagan. Bu bo'lim uchun Premium obuna kerak.", code: "subscription_required" }, { status: 402 });
  }

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Matn bo'sh yoki juda uzun (20 000 belgigacha)." }, { status: 400 });
  const { text, lang, rate } = parsed.data;

  try {
    const mp3 = await synthesizeMp3(text, lang, rate);
    return new Response(mp3 as BodyInit, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("TTS error:", e);
    return Response.json({ error: "Audio yaratib bo'lmadi. Qayta urinib ko'ring." }, { status: 500 });
  }
}
