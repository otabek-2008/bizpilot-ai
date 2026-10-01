import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { FALLBACK, MODEL, aiErrorMessage, authorize, client } from "@/lib/ai-server";
import { isValidQuestion, shuffleOptions } from "@/lib/quiz";

export const maxDuration = 300;

const Input = z
  .object({
    topic: z.string().trim().max(300).optional(),
    text: z.string().trim().max(15000).optional(),
    count: z.number().int().min(3).max(30),
    difficulty: z.enum(["oson", "orta", "qiyin"]),
    lang: z.enum(["uz", "ru", "en"]),
  })
  .refine((v) => v.topic || v.text);

const Result = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correct: z.number().int(),
      explanation: z.string(),
    }),
  ),
});

const LANG_NAME = { uz: "o'zbek (lotin)", ru: "rus", en: "ingliz" };

const LEVEL = { oson: "oson (asosiy tushunchalar)", orta: "o'rta (imtihon darajasi)", qiyin: "qiyin (eng murakkab imtihon savollari darajasi)" };

const SYSTEM = `Siz O'zbekistondagi abituriyent va talabalar uchun test tuzuvchi tajribali o'qituvchisiz. Siz faqat O'ZINGIZ tuzgan yangi savollar yozasiz — hech qachon rasmiy imtihon bazasidagi savollarni aynan ko'chirmaysiz va "bu rasmiy savol" demaysiz.

Qoidalar:
- Har bir savolda bitta va faqat bitta to'g'ri javob bo'lsin. Javobni ikki marta tekshiring: hisob-kitobli savollarda yechimni oxirigacha bajaring.
- Odatda 4 ta variant (A–D). Variantlar bir-biriga o'xshash uzunlik va ko'rinishda bo'lsin; "Hammasi to'g'ri", "A va B" kabi boshqa variantlarga tayanadigan javoblar yozmang (variantlar aralashtiriladi).
- correct — to'g'ri variant indeksi, 0 dan boshlanadi.
- explanation — nima uchun shu javob to'g'ri ekanini 1–3 gapda tushuntiring (hisoblashda qisqa yechim). Izoh ham savol tilida.
- Formulalarni LaTeX'siz, oddiy matnda yozing: x², √2, π, ≤, ≥, ½, a/b.
- Savollar takrorlanmasin va mavzuning turli jihatlarini qamrab olsin.
- Matn berilgan bo'lsa — savollar faqat shu matn mazmuniga asoslansin.
- title — test uchun qisqa nom.`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Mavzu yoki matn kiriting (matn 15 000 belgigacha)." }, { status: 400 });
  const v = parsed.data;

  const lines = [
    `Til: ${LANG_NAME[v.lang]}. Savollar, variantlar va izohlar shu tilda bo'lsin.`,
    `Savollar soni: ${v.count}.`,
    `Qiyinlik: ${LEVEL[v.difficulty]}.`,
  ];
  if (v.topic) lines.push(`Mavzu: ${v.topic}.`);
  if (v.text) lines.push(`\nQuyidagi matn asosida savollar tuzing:\n<matn>\n${v.text}\n</matn>`);

  try {
    const response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 32000,
      output_config: { effort: "low", format: betaZodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: lines.join("\n") }],
      ...FALLBACK,
    });

    if (response.stop_reason === "refusal") return Response.json({ error: "AI bu mavzuda test tuza olmadi." }, { status: 422 });
    const out = response.parsed_output;
    if (!out) {
      console.error("Quiz parse failed, stop_reason:", response.stop_reason);
      return Response.json({ error: "AI javobini o'qib bo'lmadi. Savollar sonini kamaytirib, qayta urinib ko'ring." }, { status: 502 });
    }

    const questions = out.questions
      .map((q) => ({ ...q, options: q.options.map((o) => o.trim()), question: q.question.trim() }))
      .filter(isValidQuestion)
      .map((q) => shuffleOptions(q));
    if (!questions.length) return Response.json({ error: "AI yaroqli savol tuza olmadi. Qayta urinib ko'ring." }, { status: 502 });

    return Response.json({ title: out.title, questions });
  } catch (error) {
    const { message, status } = aiErrorMessage(error);
    return Response.json({ error: message }, { status });
  }
}
