import "server-only";

// OpenAI audio API: nutqni matnga (transcription) va matnni nutqqa (speech) aylantirish.
// Kerakli env: OPENAI_API_KEY. Matnni tahrirlash esa Claude'da (lib/ai-server.ts).

const API = "https://api.openai.com/v1";
const STT_MODEL = "gpt-4o-transcribe";
const TTS_MODEL = "gpt-4o-mini-tts";

export const openaiConfigured = () => !!process.env.OPENAI_API_KEY;

/** OpenAI qabul qiladigan audio formatlar; fayl 25 MB dan oshmasligi kerak. */
export const AUDIO_EXT = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "ogg", "oga", "flac"];
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export const VOICES = ["nova", "shimmer", "coral", "alloy", "echo", "onyx"] as const;
export type Voice = (typeof VOICES)[number];

export class OpenAIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function failure(res: Response, what: string): Promise<OpenAIError> {
  const detail = await res.text().catch(() => "");
  console.error(`OpenAI ${what} error ${res.status}:`, detail.slice(0, 500));
  if (res.status === 401 || res.status === 403) return new OpenAIError("Audio xizmati sozlamalarida xatolik.", 503);
  if (res.status === 429) return new OpenAIError("Audio xizmati hozir band. Birozdan so'ng qayta urinib ko'ring.", 429);
  if (res.status === 400 && what === "transcribe") {
    return new OpenAIError("Audioni o'qib bo'lmadi: format qo'llanmaydi yoki yozuv juda uzun.", 422);
  }
  return new OpenAIError("Audio xizmatida xatolik yuz berdi.", 502);
}

const auth = () => ({ Authorization: `Bearer ${process.env.OPENAI_API_KEY}` });

export async function transcribe(file: File, language?: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("model", STT_MODEL);
  form.append("response_format", "json");
  if (language) form.append("language", language);

  const res = await fetch(`${API}/audio/transcriptions`, {
    method: "POST",
    headers: auth(),
    body: form,
    signal: AbortSignal.timeout(280_000),
  });
  if (!res.ok) throw await failure(res, "transcribe");
  const { text } = (await res.json()) as { text?: string };
  return (text ?? "").trim();
}

/** MP3 audio oqimini qaytaradi. */
export async function speech(text: string, voice: Voice): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${API}/audio/speech`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice,
      input: text,
      response_format: "mp3",
      instructions:
        "Read the text aloud in its own language (Uzbek, Russian, English or other) with correct native pronunciation. Speak clearly and naturally, at a calm pace, with pauses at punctuation.",
    }),
    signal: AbortSignal.timeout(280_000),
  });
  if (!res.ok || !res.body) throw await failure(res, "speech");
  return res.body;
}
