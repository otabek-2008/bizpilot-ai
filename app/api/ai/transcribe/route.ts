import { authorize } from "@/lib/ai-server";
import { AUDIO_EXT, MAX_AUDIO_BYTES, OpenAIError, openaiConfigured, transcribe } from "@/lib/openai";

export const maxDuration = 300;

const LANGS = new Set(["uz", "ru", "en"]);

export async function POST(request: Request) {
  if (!openaiConfigured()) return Response.json({ error: "Audio xizmati hali ulanmagan." }, { status: 503 });
  const denied = await authorize(request);
  if (denied) return denied;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Audio faylni yuklang." }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES) return Response.json({ error: "Audio fayl 25 MB dan oshmasin." }, { status: 413 });
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!AUDIO_EXT.includes(ext)) {
    return Response.json({ error: `Bu format qo'llanmaydi. Mumkin: ${AUDIO_EXT.join(", ")}.` }, { status: 415 });
  }
  const language = String(form?.get("language") ?? "");

  try {
    const text = await transcribe(file, LANGS.has(language) ? language : undefined);
    if (!text) return Response.json({ error: "Audioda nutq topilmadi." }, { status: 422 });
    return Response.json({ text });
  } catch (e) {
    if (e instanceof OpenAIError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Transcribe error:", e);
    return Response.json({ error: "Audio xizmatida xatolik yuz berdi." }, { status: 502 });
  }
}
