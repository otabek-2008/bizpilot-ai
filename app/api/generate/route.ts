import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { FALLBACK, MODEL, aiErrorMessage, authorize, client } from "@/lib/ai-server";
import type { GeneratedDocuments } from "@/types";

// Claude javobi bir necha o'n soniya davom etishi mumkin.
export const maxDuration = 300;

const InputSchema = z.object({
  idea: z.string().trim().min(1).max(4000),
  audience: z.string().max(500).default(""),
  budget: z.string().max(200).default(""),
  location: z.string().max(200).default(""),
});

const BusinessPlanSchema = z.object({
  summary: z.string(),
  mission: z.string(),
  vision: z.string(),
  products: z.array(z.string()),
  marketAnalysis: z.string(),
  competitors: z.array(z.string()),
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  operations: z.string(),
  team: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

const MarketingSchema = z.object({
  overview: z.string(),
  targetAudience: z.string(),
  uniqueValue: z.string(),
  channels: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      cost: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
  campaigns: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      duration: z.string(),
      budget: z.string(),
    }),
  ),
  brandGuidelines: z.string(),
  kpis: z.array(z.string()),
});

const FinanceSchema = z.object({
  overview: z.string(),
  startupCosts: z.array(z.object({ label: z.string(), amount: z.string() })),
  monthlyCosts: z.array(z.object({ label: z.string(), amount: z.string() })),
  revenueStreams: z.array(
    z.object({ label: z.string(), description: z.string() }),
  ),
  projections: z.array(
    z.object({
      year: z.number().int(),
      revenue: z.string(),
      costs: z.string(),
      profit: z.string(),
    }),
  ),
  breakEven: z.string(),
  fundingNeeds: z.string(),
  riskMitigation: z.array(z.string()),
});

const DocumentsSchema = z.object({
  businessPlan: BusinessPlanSchema,
  marketing: MarketingSchema,
  finance: FinanceSchema,
});

const SYSTEM_PROMPT = `Siz tajribali biznes maslahatchisisiz. Foydalanuvchi biznes g'oyasi asosida aniq, amaliy va shu g'oyaga xos biznes reja, marketing strategiyasi va moliyaviy reja tuzasiz.

Talablar:
- Barcha matnlar o'zbek tilida (lotin yozuvida) bo'lsin.
- Umumiy shablon gaplardan qoching: bozor, raqobatchilar, kanallar va xarajatlar aynan shu g'oya, auditoriya va hududga mos bo'lsin.
- Moliyaviy raqamlar foydalanuvchi ko'rsatgan byudjetga mos va o'zaro izchil bo'lsin (xarajatlar yig'indisi, foyda = daromad - xarajat). Summalarni "$12,500" ko'rinishida yozing; zarar bo'lsa "-$1,200".
- projections aynan 3 ta element (1, 2, 3-yil) bo'lsin.
- Ro'yxatlarda odatda 3-6 ta aniq band bo'lsin.
- priority qiymati faqat "high", "medium" yoki "low".`;

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = InputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Biznes g'oyasi kiritilmagan." }, { status: 400 });
  }
  const input = parsed.data;

  try {
    const response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: betaZodOutputFormat(DocumentsSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Biznes g'oyasi: ${input.idea}
Maqsadli auditoriya: ${input.audience || "ko'rsatilmagan"}
Byudjet: ${input.budget || "ko'rsatilmagan"}
Hudud: ${input.location || "ko'rsatilmagan"}`,
        },
      ],
      ...FALLBACK,
    });

    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "AI bu so'rov bo'yicha hujjat yarata olmadi. G'oyani boshqacha yozib ko'ring." },
        { status: 422 },
      );
    }

    if (!response.parsed_output) {
      console.error("Claude output parse failed, stop_reason:", response.stop_reason);
      return Response.json(
        { error: "AI javobini o'qib bo'lmadi. Qayta urinib ko'ring." },
        { status: 502 },
      );
    }

    const docs: GeneratedDocuments = {
      ...response.parsed_output,
      updated_at: new Date().toISOString(),
    };

    return Response.json(docs);
  } catch (error) {
    const { message, status } = aiErrorMessage(error);
    return Response.json({ error: message }, { status });
  }
}
