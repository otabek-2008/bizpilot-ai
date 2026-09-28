import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { FALLBACK, MODEL, aiErrorMessage, authorize, client } from "@/lib/ai-server";

export const maxDuration = 300;

const Input = z.object({ text: z.string().trim().min(1).max(12000) });

const Result = z.object({
  corrected: z.string(),
  issues: z.array(
    z.object({
      original: z.string(),
      suggestion: z.string(),
      kind: z.enum(["imlo", "grammatika", "punktuatsiya", "uslub"]),
      reason: z.string(),
    }),
  ),
});

const SYSTEM = `Siz o'zbek tili (lotin va kirill), rus va ingliz tillari bo'yicha tajribali muharrirsiz. Berilgan matndagi xatolarni tuzatasiz.

Qoidalar:
- Matn tilini va yozuvini o'zgartirmang. O'zbek lotin matnida 2023-yilgi imlo qoidalariga amal qiling: o', g' (tutuq belgisi ʻ yoki ' — muallif qaysini ishlatgan bo'lsa, shuni saqlang), qo'shma so'zlar, -mi/-chi kabi yuklamalar, ko'chirma gaplar.
- Faqat haqiqiy xatolarni tuzating: imlo, grammatika, tinish belgilari. Uslubni faqat jiddiy g'aliz joylarda yaxshilang (kind: "uslub").
- Ma'noni, atamalarni, ismlarni va formatlashni (qatorlar, bo'sh qatorlar) saqlang.
- corrected — tuzatilgan to'liq matn. issues — har bir o'zgarish: original (asl bo'lak, matndagidek aynan), suggestion, kind va reason (qisqa izoh, o'zbek tilida).
- Xato bo'lmasa, corrected asl matnga teng va issues bo'sh bo'lsin.`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Matn bo'sh yoki juda uzun (12 000 belgigacha)." }, { status: 400 });

  try {
    const response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low", format: betaZodOutputFormat(Result) },
      system: SYSTEM,
      messages: [{ role: "user", content: parsed.data.text }],
      ...FALLBACK,
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "AI bu matnni tekshira olmadi." }, { status: 422 });
    }
    if (!response.parsed_output) {
      console.error("Spellcheck parse failed, stop_reason:", response.stop_reason);
      return Response.json({ error: "AI javobini o'qib bo'lmadi. Qayta urinib ko'ring." }, { status: 502 });
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    const { message, status } = aiErrorMessage(error);
    return Response.json({ error: message }, { status });
  }
}
