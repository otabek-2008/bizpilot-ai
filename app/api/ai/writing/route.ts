import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { FALLBACK, MODEL, aiErrorMessage, authorize, client } from "@/lib/ai-server";
import { examById } from "@/lib/exams";

export const maxDuration = 300;

const Input = z.object({
  exam: z.enum(["ielts", "cefr"]),
  task: z.string().max(20),
  prompt: z.string().trim().max(3000).optional(),
  essay: z.string().trim().min(20).max(12000),
});

const Review = z.object({
  overall: z.string(),
  score100: z.number(),
  wordCount: z.number().int(),
  criteria: z.array(z.object({ name: z.string(), score: z.string(), comment: z.string() })),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  mistakes: z.array(z.object({ original: z.string(), fix: z.string(), why: z.string() })),
  improved: z.string(),
});

const SYSTEM = `Siz tajribali IELTS/CEFR Writing imtihonchisisiz. Talabaning inshosini rasmiy baholash mezonlari asosida xolis baholaysiz va o'zbek tilida (lotin) tushunarli fikr-mulohaza berasiz.

Qoidalar:
- Bahoni oshirib ham, pasaytirib ham yubormang — haqiqiy imtihonchi qanday baholasa, shunday. Bu taxminiy baho ekanini unutmang.
- IELTS: overall — band (masalan "6.5", 0.5 qadam bilan); criteria — 4 mezon: Task Achievement (Task 1) yoki Task Response (Task 2), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy; har birida score band ko'rinishida.
- CEFR: overall — "B1 dan past", "B1", "B2" yoki "C1"; criteria — Task fulfilment, Organisation, Vocabulary, Grammar; score — daraja.
- score100 — umumiy natija 0–100 shkalada (IELTS 9 band = 100).
- wordCount — inshodagi so'zlar soni (taxminan). Minimal so'z sonidan kam bo'lsa, buni baho va izohda hisobga oling.
- comment, strengths, improvements va why — o'zbek tilida, aniq va amaliy (nima uchun va qanday yaxshilash).
- mistakes — eng muhim 5–15 ta xato: original (inshodan aynan bo'lak), fix (tuzatilgan), why (qisqa izoh).
- improved — talabaning inshosining yaxshilangan versiyasi (ingliz tilida, xuddi shu g'oyalar bilan, taxminan bir daraja yuqori), talabaning fikrini o'zgartirmasdan.
- Topshiriq berilmagan bo'lsa, insho mazmunidan topshiriqni taxmin qiling.`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Inshoni kiriting (20–12 000 belgi)." }, { status: 400 });
  const v = parsed.data;

  const exam = examById(v.exam)!;
  const task = exam.writing?.tasks.find((t) => t.id === v.task);
  if (!task) return Response.json({ error: "Topshiriq turi noto'g'ri." }, { status: 400 });

  const content = [
    `Imtihon: ${exam.name}. Baholash shkalasi: ${exam.writing!.scale}.`,
    `Topshiriq turi: ${task.label}, minimal hajm: ${task.minWords} so'z.`,
    v.prompt ? `Topshiriq matni:\n${v.prompt}` : "Topshiriq matni berilmagan.",
    `\nTalabaning inshosi:\n<insho>\n${v.essay}\n</insho>`,
  ].join("\n");

  try {
    const response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(Review) },
      system: SYSTEM,
      messages: [{ role: "user", content }],
      ...FALLBACK,
    });
    if (response.stop_reason === "refusal") return Response.json({ error: "AI bu matnni baholay olmadi." }, { status: 422 });
    if (!response.parsed_output) {
      console.error("Writing parse failed, stop_reason:", response.stop_reason);
      return Response.json({ error: "AI javobini o'qib bo'lmadi. Qayta urinib ko'ring." }, { status: 502 });
    }
    const r = response.parsed_output;
    return Response.json({ ...r, score100: Math.max(0, Math.min(100, Math.round(r.score100))) });
  } catch (error) {
    const { message, status } = aiErrorMessage(error);
    return Response.json({ error: message }, { status });
  }
}
