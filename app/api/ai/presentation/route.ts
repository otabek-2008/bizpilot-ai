import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { FALLBACK, MODEL, aiErrorMessage, authorize, client } from "@/lib/ai-server";

export const maxDuration = 300;

const Input = z.object({
  topic: z.string().trim().min(2).max(300),
  count: z.number().int().min(5).max(25),
  lang: z.enum(["uz", "ru", "en"]),
  audience: z.string().trim().max(120).optional(),
  details: z.string().trim().max(3000).optional(),
});

const SlideDeck = z.object({
  title: z.string(),
  subtitle: z.string(),
  slides: z.array(
    z.object({
      title: z.string(),
      layout: z.enum(["bullets", "two-column", "quote", "stats"]),
      bullets: z.array(z.string()),
      notes: z.string(),
    }),
  ),
});

const LANG = { uz: "o'zbek tili (lotin yozuvi)", ru: "rus tili", en: "ingliz tili" };

const SYSTEM = `Siz taqdimot (slayd) tuzish bo'yicha mutaxassissiz. Talaba va o'qituvchilar uchun aniq, mazmunli va chiroyli tuzilgan slaydlar matnini yozasiz.

Qoidalar:
- Birinchi slayd — sarlavha (title + subtitle) alohida maydonlarda; slides ro'yxatiga kirmaydi.
- slides — mazmun slaydlari, mantiqiy ketma-ketlikda: kirish → asosiy qism → xulosa. Oxirgi slayd "Xulosa" bo'lsin.
- Har slaydda 3–5 ta qisqa band (bullets), har biri 4–14 so'z. Uzun paragraf yozmang.
- notes — ma'ruzachi uchun 2–4 gaplik izoh (slaydda nima deyish kerak).
- Faktlar, sanalar va raqamlar aniq bo'lsin. Ishonchingiz komil bo'lmagan statistikani yozmang.
- layout: "bullets" (oddiy ro'yxat), "two-column" (taqqoslash — bullets ning birinchi yarmi chap, ikkinchi yarmi o'ng ustun), "quote" (bitta muhim fikr/iqtibos — bullets[0]), "stats" (2–4 ta raqamli ko'rsatkich — har band "raqam — izoh" ko'rinishida). Ko'pi "bullets" bo'lsin, boshqalari xilma-xillik uchun.`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Mavzuni kiriting (300 belgigacha)." }, { status: 400 });
  const v = parsed.data;

  const prompt = [
    `Mavzu: ${v.topic}`,
    `Til: ${LANG[v.lang]}`,
    `Mazmun slaydlari soni: ${v.count - 1} (sarlavha slaydidan tashqari)`,
    v.audience ? `Auditoriya: ${v.audience}` : "",
    v.details ? `Qo'shimcha talablar:\n${v.details}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 24000,
      output_config: { effort: "low", format: betaZodOutputFormat(SlideDeck) },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      ...FALLBACK,
    });
    if (response.stop_reason === "refusal") return Response.json({ error: "AI bu mavzuda taqdimot tuza olmadi." }, { status: 422 });
    if (!response.parsed_output) {
      console.error("Presentation parse failed, stop_reason:", response.stop_reason);
      return Response.json({ error: "AI javobini o'qib bo'lmadi. Qayta urinib ko'ring." }, { status: 502 });
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    const { message, status } = aiErrorMessage(error);
    return Response.json({ error: message }, { status });
  }
}
