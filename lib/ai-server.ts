import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// AI route'lari uchun umumiy yordamchilar: kirish tekshiruvi, Claude mijozi va xatolarni o'zbekchaga o'girish.

export const MODEL = "claude-opus-5";

// Siyosat sababli rad etilsa, API so'rovni avtomatik ravishda mos zaxira modelda qayta bajaradi.
export const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

export const client = () => new Anthropic();

// Sinov yoki obuna davrida har bir foydalanuvchiga kuniga shuncha AI so'rovi (suiiste'moldan himoya).
export const AI_DAILY_LIMIT = 50;

/** Xato bo'lsa tayyor Response qaytaradi, aks holda null. Obunani tekshiradi va kunlik limitdan bitta so'rov oladi. */
export async function authorize(request: Request): Promise<Response | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.ANTHROPIC_API_KEY || !serviceKey) {
    return Response.json({ error: "AI sozlanmagan." }, { status: 503 });
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.auth.getUser(token);
  if (!data.user) return Response.json({ error: "Sessiya yaroqsiz. Qayta kiring." }, { status: 401 });

  const { data: verdict, error } = await supabase.rpc("ai_take", { p_user: data.user.id, p_limit: AI_DAILY_LIMIT });
  if (error) {
    console.error("ai_take error:", error.message);
    return Response.json({ error: "Obunani tekshirib bo'lmadi. Birozdan so'ng urinib ko'ring." }, { status: 503 });
  }
  if (verdict === "no_access") {
    return Response.json({ error: "Bepul sinov muddati tugagan. AI vositalari uchun obuna kerak.", code: "subscription_required" }, { status: 402 });
  }
  if (verdict === "limit") {
    return Response.json({ error: `Bugungi AI limiti (${AI_DAILY_LIMIT} ta so'rov) tugadi. Ertaga yana foydalanishingiz mumkin.` }, { status: 429 });
  }
  return null;
}

export function aiErrorMessage(error: unknown): { message: string; status: number } {
  if (error instanceof Anthropic.RateLimitError) {
    return { message: "AI hozir band. Bir ozdan so'ng qayta urinib ko'ring.", status: 429 };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic API key is invalid");
    return { message: "AI sozlamalarida xatolik.", status: 503 };
  }
  if (error instanceof Anthropic.APIError) {
    console.error(`Anthropic API error ${error.status}:`, error.message);
    return { message: "AI xizmatida xatolik yuz berdi.", status: 502 };
  }
  console.error(error);
  return { message: "Kutilmagan xatolik yuz berdi.", status: 500 };
}

// Oqim o'rtasidagi xatoni klient shu belgidan keyingi matn orqali taniydi.
export const STREAM_ERROR = "\u0000ERR:";

/** Claude matn oqimini oddiy text/plain oqimiga aylantiradi. */
export function textStream(params: Parameters<Anthropic["beta"]["messages"]["stream"]>[0]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client().beta.messages.stream(params);
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode(`${STREAM_ERROR}AI bu so'rovga javob bera olmadi. Boshqacha yozib ko'ring.`));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode(`${STREAM_ERROR}Javob juda uzun bo'lib, oxirigacha yozilmadi.`));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(STREAM_ERROR + aiErrorMessage(error).message));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
