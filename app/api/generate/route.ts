import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { GeneratedDocuments } from "@/types";

// Claude javobi bir necha o'n soniya davom etishi mumkin.
export const maxDuration = 300;

const MODEL = "claude-opus-5";

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

function supabaseForToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "AI sozlanmagan (ANTHROPIC_API_KEY yo'q)." },
      { status: 503 },
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabaseForToken(token).auth.getUser(token);
  if (!user) {
    return Response.json({ error: "Sessiya yaroqsiz." }, { status: 401 });
  }

  const parsed = InputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Biznes g'oyasi kiritilmagan." }, { status: 400 });
  }
  const input = parsed.data;

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(DocumentsSchema),
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
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "AI hozir band. Bir ozdan so'ng qayta urinib ko'ring." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic API key is invalid");
      return Response.json({ error: "AI sozlamalarida xatolik." }, { status: 503 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return Response.json({ error: "AI xizmatida xatolik yuz berdi." }, { status: 502 });
    }
    throw error;
  }
}
