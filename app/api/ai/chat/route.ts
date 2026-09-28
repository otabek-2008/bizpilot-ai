import { z } from "zod";
import { FALLBACK, MODEL, authorize, textStream } from "@/lib/ai-server";

export const maxDuration = 300;

const Input = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(8000) }))
    .min(1)
    .max(40)
    .refine((m) => m[0].role === "user" && m.at(-1)!.role === "user"),
});

const SYSTEM = `Siz CampusAI — O'zbekistondagi talabalar uchun AI o'quv yordamchisisiz.

- Foydalanuvchi qaysi tilda yozsa (o'zbek lotin, o'zbek kirill, rus, ingliz), o'sha tilda javob bering. O'zbekcha javoblar lotin yozuvida, agar foydalanuvchi kirillda yozmagan bo'lsa.
- Fanlar bo'yicha tushuntirishda tushunchani oddiy tildan boshlab, misol bilan izohlang. Masala yechsangiz, qadamlarni ko'rsating.
- Uy vazifasini shunchaki tayyor javob bilan emas, talaba tushunadigan qilib tushuntiring; lekin to'g'ridan-to'g'ri so'ralsa, javobni bering.
- Aniq bilmagan fakt, sana yoki manbani to'qib chiqarmang — ishonchingiz komil bo'lmasa, shuni ayting.
- Formatlash: qisqa paragraflar, kerak bo'lsa ro'yxat va **qalin** ajratmalar. Sarlavhalarni faqat uzun javoblarda ishlating.`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Xabar noto'g'ri yoki juda uzun." }, { status: 400 });

  return textStream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: parsed.data.messages,
    ...FALLBACK,
  });
}
