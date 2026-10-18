import "server-only";
import ESpeakNg from "espeak-ng";
import { Mp3Encoder } from "@breezystack/lamejs";
import type { DictLang } from "@/lib/dictation";
import { cyrillicToLatin, detectScript } from "@/lib/translit";

// Matnni MP3 ovozga aylantirish — eSpeak NG (qoidaga asoslangan sintezator, AI emas) serverda
// WASM sifatida ishlaydi, natija lamejs bilan MP3'ga siqiladi. Tashqi xizmat va API kalit kerak emas.

const VOICE: Record<DictLang, string> = { uz: "uz", ru: "ru", en: "en-us" };
const KBPS = 48; // nutq uchun yetarli, fayl kichikroq

type ESpeakModule = { FS: { writeFile(path: string, data: string): void; readFile(path: string): Uint8Array } };

function prepare(text: string, lang: DictLang): string {
  let s = text.normalize("NFC");
  // eSpeak'ning o'zbek ovozi lotin yozuvini o'qiydi
  if (lang === "uz" && detectScript(s) === "cyrillic") s = cyrillicToLatin(s, "simple");
  // o‘, g‘ va tutuq belgisining barcha ko'rinishlari → oddiy apostrof
  return s.replace(/[‘’ʻʼ`´]/g, "'");
}

/** WAV fayldan 16-bit PCM namunalar va chastotasini ajratadi. */
function readWav(wav: Uint8Array): { samples: Int16Array; rate: number } {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  let rate = 22050;
  for (let p = 12; p + 8 <= wav.length; ) {
    const id = String.fromCharCode(...wav.subarray(p, p + 4));
    let size = view.getUint32(p + 4, true);
    if (id === "fmt ") rate = view.getUint32(p + 12, true);
    if (id === "data") {
      // eSpeak oqimga yozganda hajm maydoni to'ldirilmasligi mumkin
      if (!size || p + 8 + size > wav.length) size = wav.length - p - 8;
      const bytes = wav.slice(p + 8, p + 8 + (size & ~1));
      return { samples: new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2), rate };
    }
    p += 8 + size + (size & 1);
  }
  throw new Error("eSpeak WAV ma'lumoti topilmadi");
}

function toMp3(samples: Int16Array, rate: number): Uint8Array {
  const enc = new Mp3Encoder(1, rate, KBPS);
  const parts: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += 1152) parts.push(enc.encodeBuffer(samples.subarray(i, i + 1152)));
  parts.push(enc.flush());
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** rate — 1 oddiy tezlik (0.75–1.5). */
export async function synthesizeMp3(text: string, lang: DictLang, rate: number): Promise<Uint8Array> {
  const wpm = Math.round(160 * rate); // eSpeak tezligi: daqiqasiga so'z
  const input = prepare(text, lang);
  // Har so'rovga alohida nusxa: eSpeak CLI bir martalik ishga tushadi
  const mod: { arguments: string[]; preRun: (() => void)[]; print: () => void; printErr: (s: string) => void } & Partial<ESpeakModule> = {
    arguments: ["-v", VOICE[lang], "-s", String(wpm), "-f", "/input.txt", "-w", "/output.wav"],
    preRun: [() => mod.FS!.writeFile("/input.txt", input)],
    print: () => {},
    printErr: (s) => {
      if (!s.includes("keepRuntimeAlive")) console.error("espeak:", s);
    },
  };
  const es = (await ESpeakNg(mod)) as ESpeakModule;
  const { samples, rate: hz } = readWav(es.FS.readFile("/output.wav"));
  if (!samples.length) throw new Error("eSpeak bo'sh audio qaytardi");
  return toMp3(samples, hz);
}
