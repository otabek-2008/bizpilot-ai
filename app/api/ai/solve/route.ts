import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { FALLBACK, MODEL, authorize, textStream } from "@/lib/ai-server";

export const maxDuration = 300;

const Input = z
  .object({
    text: z.string().trim().max(6000).optional(),
    image: z
      .object({
        data: z.string().max(7_000_000),
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      })
      .optional(),
    subject: z.string().trim().max(60).optional(),
    mode: z.enum(["full", "hint"]),
  })
  .refine((v) => v.text || v.image);

const SYSTEM = `Siz matematika, fizika, kimyo, informatika va boshqa aniq fanlar bo'yicha tajribali o'qituvchisiz. Talaba yuborgan masalani yechasiz.

Javob tuzilmasi (Markdown):
**Berilgan:** — masala shartidan nima ma'lum va nima topilishi kerak.
**Yechim:** — raqamlangan qadamlar. Har qadamda nima qilinayotgani va qaysi formula/qoida ishlatilayotgani qisqa izoh bilan.
**Javob:** — yakuniy natija (birlik bilan, agar bor bo'lsa).
Oxirida, kerak bo'lsa, bitta qatorli **Tekshiruv** (javobni o'rniga qo'yib yoki boshqa usul bilan tekshirish).

Qoidalar:
- Formulalarni LaTeX'siz, oddiy matnda yozing: x², √(b² − 4ac), π, ≤, ≥, ½, a/b, Δ, α. Kasrlarni (a + b)/c ko'rinishida.
- Hisob-kitobni oxirigacha aniq bajaring va tekshiring. Taxminiy qiymat bo'lsa, buni ayting.
- Rasmda bir nechta masala bo'lsa, har birini alohida sarlavha bilan yeching.
- Rasm o'qilmasa yoki shart to'liq bo'lmasa — nimani ko'ra olmaganingizni ayting, to'qib chiqarmang.
- Talaba qaysi tilda yozgan bo'lsa (yoki rasmda qaysi til bo'lsa), o'sha tilda javob bering; noaniq bo'lsa — o'zbek (lotin).
- Test savoli bo'lsa (A, B, C, D variantlar bilan), oxirida to'g'ri variant harfini aniq ko'rsating.`;

const HINT = `Hozir talaba to'liq yechimni emas, faqat YO'L-YO'RIQ so'rayapti: masalani qanday boshlash kerakligi, qaysi formula yoki g'oya kerakligini 2–4 qadamda ayting, lekin yakuniy javobni va to'liq hisob-kitobni bermang.`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Masala matnini yozing yoki rasmini yuklang (rasm 5 MB gacha)." }, { status: 400 });
  const { text, image, subject, mode } = parsed.data;

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  content.push({
    type: "text",
    text: [subject ? `Fan: ${subject}.` : "", text ? `Masala:\n${text}` : "Rasmdagi masalani yeching."].filter(Boolean).join("\n"),
  });

  return textStream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: mode === "hint" ? "low" : "medium" },
    system: mode === "hint" ? `${SYSTEM}\n\n${HINT}` : SYSTEM,
    messages: [{ role: "user", content }],
    ...FALLBACK,
  });
}
