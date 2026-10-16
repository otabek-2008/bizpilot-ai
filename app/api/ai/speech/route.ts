import { z } from "zod";
import { authorize } from "@/lib/ai-server";
import { OpenAIError, VOICES, openaiConfigured, speech } from "@/lib/openai";

export const maxDuration = 300;

// OpenAI bitta so'rovda ko'pi bilan 4096 belgi qabul qiladi.
const Input = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: z.enum(VOICES),
});

export async function POST(request: Request) {
  if (!openaiConfigured()) return Response.json({ error: "Audio xizmati hali ulanmagan." }, { status: 503 });
  const denied = await authorize(request);
  if (denied) return denied;

  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Matn bo'sh yoki juda uzun (4 000 belgigacha)." }, { status: 400 });

  try {
    const audio = await speech(parsed.data.text, parsed.data.voice);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof OpenAIError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Speech error:", e);
    return Response.json({ error: "Audio xizmatida xatolik yuz berdi." }, { status: 502 });
  }
}
