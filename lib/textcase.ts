// Matn registrini o'zgartirish. O'zbek (o', g', tutuq), rus va ingliz matnlari uchun.

export type CaseMode = "upper" | "lower" | "title" | "sentence" | "toggle";

// So'z: harflar, ichida apostrof bo'lishi mumkin (o'zbek, g'alaba, ta'lim, don't).
const WORD = /[\p{L}\p{M}\p{N}]+(?:['ʻʼ‘’`][\p{L}\p{M}]+)*/gu;

const upperFirst = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

export function toTitleCase(text: string): string {
  return text.replace(WORD, upperFirst);
}

export function toSentenceCase(text: string): string {
  const lower = text.toLowerCase();
  // Matn boshida, gap oxiri belgisidan va yangi qatordan keyin katta harf.
  return lower.replace(
    /(^|[.!?…]\s+|\n\s*)([^\p{L}]*)(\p{L})/gu,
    (_, lead: string, mid: string, ch: string) => lead + mid + ch.toUpperCase(),
  );
}

export function toggleCase(text: string): string {
  let out = "";
  for (const ch of text) {
    const up = ch.toUpperCase();
    out += ch === up ? ch.toLowerCase() : up;
  }
  return out;
}

export function convertCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return toTitleCase(text);
    case "sentence":
      return toSentenceCase(text);
    case "toggle":
      return toggleCase(text);
  }
}

export function textStats(text: string) {
  const words = text.match(WORD)?.length ?? 0;
  const lines = text ? text.split("\n").length : 0;
  return { chars: [...text].length, words, lines };
}
