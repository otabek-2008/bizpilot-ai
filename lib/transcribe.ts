// Audio/video fayldan matn — Vosk (Kaldi) nutq modeli brauzerning o'zida WASM'da ishlaydi.
// Fayl serverga yuborilmaydi, API kalit kerak emas. Model birinchi marta yuklanadi va brauzerda (IndexedDB) saqlanadi.
import type { Model } from "vosk-browser";
import type { DictLang } from "@/lib/dictation";

// scripts/fetch-vosk-models.mjs dagi ro'yxat bilan bir xil
export const VOSK_MODELS: Record<DictLang, { file: string; mb: number }> = {
  uz: { file: "vosk-model-small-uz-0.22", mb: 51 },
  ru: { file: "vosk-model-small-ru-0.22", mb: 46 },
  en: { file: "vosk-model-small-en-us-0.15", mb: 41 },
};

const RATE = 16000; // Vosk modellari 16 kHz mono bilan o'qitilgan
const CHUNK = RATE / 2; // 0.5 s

export type TranscribeStage = "decode" | "model" | "recognize";
export type TranscribeProgress = (stage: TranscribeStage, ratio: number) => void;

/** Har qanday brauzer o'qiy oladigan audio/videoni 16 kHz mono PCM ga aylantiradi. */
async function decodeAudio(file: File): Promise<Float32Array> {
  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("Faylni o'qib bo'lmadi. MP3, WAV, M4A, OGG, WEBM yoki MP4 formatidagi fayl yuklang.");
  } finally {
    void ctx.close();
  }
  const length = Math.ceil(decoded.duration * RATE);
  if (!length) throw new Error("Faylda ovoz topilmadi.");
  // OfflineAudioContext kanallarni monoga qo'shadi va chastotani 16 kHz ga o'zgartiradi
  const offline = new OfflineAudioContext(1, length, RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  return (await offline.startRendering()).getChannelData(0);
}

const models = new Map<DictLang, Promise<Model>>();

// vosk-browser'ning createModel() yuklashda xatolik bo'lsa hech qachon tugamaydi — shuning uchun o'zimiz kutamiz
function loadModel(lang: DictLang): Promise<Model> {
  let p = models.get(lang);
  if (!p) {
    p = import("vosk-browser").then(
      ({ Model }) =>
        new Promise<Model>((resolve, reject) => {
          const model = new Model(`/vosk/${VOSK_MODELS[lang].file}.tar.gz`, -1);
          model.on("load", (m) => (m.event === "load" && m.result ? resolve(model) : reject(new Error("load"))));
          model.on("error", (m) => reject(new Error(m.event === "error" ? m.error : "load")));
        }),
    );
    p.catch(() => models.delete(lang));
    models.set(lang, p);
  }
  return p;
}

// Bekor qilinganda worker navbatidagi bo'laklarni oxirigacha ishlamasin — worker to'xtatiladi, keyingi safar qayta yaratiladi
function killModel(lang: DictLang, model: Model) {
  (model as unknown as { worker: Worker }).worker.terminate();
  models.delete(lang);
}

/** Faylni matnga aylantiradi. Har bir gap (pauza bilan ajratilgan bo'lak) alohida qatorda qaytadi. */
export async function transcribeFile(file: File, lang: DictLang, onProgress: TranscribeProgress, signal: AbortSignal): Promise<string[]> {
  onProgress("decode", 0);
  const samples = await decodeAudio(file);
  signal.throwIfAborted();

  onProgress("model", 0);
  let model: Model;
  try {
    model = await loadModel(lang);
  } catch {
    throw new Error("Nutq modelini yuklab bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.");
  }
  signal.throwIfAborted();

  const rec = new model.KaldiRecognizer(RATE);
  const chunks = Math.ceil(samples.length / CHUNK);
  const lines: string[] = [];
  try {
    return await new Promise<string[]>((resolve, reject) => {
      // Worker har bir bo'lakka aniq bitta javob qaytaradi (result yoki partialresult), oxirida — yakuniy natija
      let answered = 0;
      const onAnswer = () => {
        answered++;
        if (answered <= chunks) onProgress("recognize", answered / chunks);
        if (answered === chunks + 1) resolve(lines);
      };
      rec.on("result", (m) => {
        if (m.event !== "result") return;
        const text = m.result.text.trim();
        if (text) lines.push(text);
        onAnswer();
      });
      rec.on("partialresult", onAnswer);
      rec.on("error", (m) => reject(new Error(m.event === "error" ? m.error : "Nutqni tanishda xatolik")));
      signal.addEventListener(
        "abort",
        () => {
          killModel(lang, model);
          reject(signal.reason);
        },
        { once: true },
      );

      onProgress("recognize", 0);
      for (let i = 0; i < samples.length; i += CHUNK) rec.acceptWaveformFloat(samples.subarray(i, i + CHUNK), RATE);
      rec.retrieveFinalResult();
    });
  } finally {
    rec.remove();
  }
}
