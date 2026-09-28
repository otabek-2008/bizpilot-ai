import { z } from "zod";
import { FALLBACK, MODEL, authorize, textStream } from "@/lib/ai-server";
import { ESSAY_KINDS, type EssayKind } from "@/lib/essay";

export const maxDuration = 800;

const LANGS = { uz: "o'zbek tilida (lotin yozuvi)", ru: "rus tilida", en: "ingliz tilida" } as const;

const Input = z.object({
  kind: z.enum(Object.keys(ESSAY_KINDS) as [EssayKind]),
  topic: z.string().trim().min(3).max(300),
  subject: z.string().trim().max(120).default(""),
  pages: z.coerce.number().int().min(1).max(25),
  language: z.enum(["uz", "ru", "en"]),
  notes: z.string().trim().max(1500).default(""),
});

// Bir sahifa (Times New Roman 14, 1.5 interval) taxminan 250-280 so'z.
const WORDS_PER_PAGE = 260;

const SYSTEM = `Siz O'zbekiston oliy ta'lim muassasalari talablarini yaxshi biladigan akademik yozuv bo'yicha mutaxassissiz. Talaba uchun so'ralgan turdagi ishni to'liq, mazmunli va mustaqil fikrlangan holda yozasiz.

Format (Markdown):
- "# " — faqat bo'lim sarlavhalari (MUNDARIJA, KIRISH, I BOB..., XULOSA, FOYDALANILGAN ADABIYOTLAR); "## " — paragraf/bo'limchalar.
- Oddiy matn paragraflar bilan; ro'yxatlarni kam ishlating.
- Titul varag'ini yozmang — u alohida qo'shiladi.

Mazmun:
- Kirishda mavzuning dolzarbligi, maqsad va vazifalar (referat, kurs ishi, mustaqil ishda obyekt va predmet ham).
- Faktlar, raqamlar va qonunlarni faqat ishonchingiz komil bo'lsa keltiring; noaniq bo'lsa umumiyroq yozing.
- Foydalanilgan adabiyotlar ro'yxatida faqat haqiqatan mavjud, taniqli manbalarni keltiring (darsliklar, rasmiy saytlar, qonunlar). Sahifa raqami yoki DOI to'qib chiqarmang.
- Esse bo'lsa: mundarija va boblarsiz, muallif fikri, dalillar va xulosa bilan yaxlit matn.`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Mavzu va parametrlarni to'g'ri kiriting." }, { status: 400 });
  const { kind, topic, subject, pages, language, notes } = parsed.data;

  const words = pages * WORDS_PER_PAGE;
  const prompt = `Ish turi: ${ESSAY_KINDS[kind]}
Mavzu: ${topic}
Fan: ${subject || "ko'rsatilmagan"}
Hajm: taxminan ${pages} sahifa (~${words} so'z)
Til: ${LANGS[language]}
${notes ? `Talabaning qo'shimcha talablari: ${notes}` : ""}

Ishni to'liq yozing, hajmga yaqin bo'lsin.`;

  return textStream({
    model: MODEL,
    // Uzun kurs ishlari uchun ham yetarli; ~1.5 token/so'z + zaxira
    max_tokens: Math.min(64000, Math.ceil(words * 3) + 4000),
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
    ...FALLBACK,
  });
}
