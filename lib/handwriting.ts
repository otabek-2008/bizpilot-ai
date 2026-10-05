// Matnni oddiy oq A4 varaqqa ruchka bilan qo'lda yozilgandek chizadi — hammasi brauzerda, canvas orqali.

/** A4, 200 dpi. */
export const PAGE_W = 1654;
export const PAGE_H = 2339;
const MM = PAGE_W / 210;
const TEXT_LEFT = 25 * MM; // hoshiyalar: chap 25 mm, o'ng 15 mm, tepa 20 mm
const TEXT_RIGHT = PAGE_W - 15 * MM;
const LINE = 10 * MM; // qatorlar orasi
const FIRST_LINE = 2; // birinchi qator nechanchi qatorda
const LAST_LINE = Math.floor((PAGE_H - 15 * MM) / LINE);
const FONT_SIZE = 6.3 * MM;

/** Sharikli ruchka siyohi ranglari. */
export const INKS = {
  blue: { label: "Ko'k", rgb: [22, 48, 168] },
  black: { label: "Qora", rgb: [28, 28, 34] },
  red: { label: "Qizil", rgb: [196, 30, 40] },
} as const;
export type InkColor = keyof typeof INKS;

/** Shriftda yo'q belgilarni ko'rinishi bir xil bo'lganlariga almashtiradi. */
function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[ʻ`]/g, "‘")
    .replace(/ʼ/g, "’");
}

/** Bir xil matn har safar bir xil ko'rinsin — urug'li tasodifiy son. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Line = string[]; // so'zlar

/** Matnni varaq kengligiga qarab qatorlarga bo'ladi (bo'sh qatorlar saqlanadi). */
function wrap(ctx: CanvasRenderingContext2D, text: string): Line[] {
  const width = (TEXT_RIGHT - TEXT_LEFT) * 0.95; // so'zlar biroz kattalashsa ham hoshiyadan chiqmasin
  const space = ctx.measureText(" ").width * 1.3;
  const lines: Line[] = [];
  for (const para of text.split("\n")) {
    let line: string[] = [];
    let w = 0;
    for (let word of para.split(/ +/).filter(Boolean)) {
      // Juda uzun so'z — bo'laklarga
      while (ctx.measureText(word).width > width) {
        let n = word.length - 1;
        while (n > 1 && ctx.measureText(word.slice(0, n)).width > width) n--;
        if (line.length) lines.push(line);
        lines.push([word.slice(0, n)]);
        line = [];
        w = 0;
        word = word.slice(n);
      }
      const ww = ctx.measureText(word).width;
      if (line.length && w + space + ww > width) {
        lines.push(line);
        line = [];
        w = 0;
      }
      w += (line.length ? space : 0) + ww;
      line.push(word);
    }
    lines.push(line);
  }
  while (lines.length > 1 && !lines[lines.length - 1].length) lines.pop();
  return lines;
}

function drawPaper(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
}

/** Matnni bir yoki bir nechta varaqqa chizadi. fontFamily — yuklangan qo'lyozma shrift. */
export function renderHandwriting(text: string, fontFamily: string, ink: InkColor = "blue"): HTMLCanvasElement[] {
  const [ir, ig, ib] = INKS[ink].rgb;
  const clean = normalize(text);
  const random = rng(hash(clean));
  const jitter = (amp: number) => (random() * 2 - 1) * amp;

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${FONT_SIZE}px ${fontFamily}`;
  const lines = wrap(measure, clean);
  const perPage = LAST_LINE - FIRST_LINE + 1;

  const pages: HTMLCanvasElement[] = [];
  for (let start = 0; start < lines.length; start += perPage) {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext("2d")!;
    drawPaper(ctx);
    ctx.font = `${FONT_SIZE}px ${fontFamily}`;
    ctx.textBaseline = "alphabetic";
    const space = ctx.measureText(" ").width * 1.3;

    lines.slice(start, start + perPage).forEach((words, i) => {
      const baseline = (FIRST_LINE + i) * LINE;
      const slope = jitter(0.006); // qator biroz qiyshayadi
      let x = TEXT_LEFT + jitter(MM * 0.75);
      for (const word of words) {
        const scale = 1 + jitter(0.04);
        const y = baseline + (x - TEXT_LEFT) * slope + jitter(MM * 0.25);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(jitter(0.02));
        ctx.scale(scale, scale);
        ctx.fillStyle = `rgba(${ir}, ${ig}, ${ib}, ${0.86 + random() * 0.14})`;
        ctx.fillText(word, 0, 0);
        ctx.restore();
        x += ctx.measureText(word).width * scale + space * (0.85 + random() * 0.3);
      }
    });
    pages.push(canvas);
  }
  return pages;
}

const toBlob = (c: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Rasm yaratilmadi."))), type, quality));

export async function pagesToPdf(pages: HTMLCanvasElement[]): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  for (const c of pages) {
    const img = await pdf.embedJpg(await (await toBlob(c, "image/jpeg", 0.92)).arrayBuffer());
    const page = pdf.addPage([595.28, 841.89]);
    page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}

/** Bitta varaq — PNG, bir nechta — PNG'lar ZIP ichida. */
export async function pagesToPng(pages: HTMLCanvasElement[]): Promise<{ blob: Blob; ext: string }> {
  if (pages.length === 1) return { blob: await toBlob(pages[0], "image/png"), ext: "png" };
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [i, c] of pages.entries()) zip.file(`varaq-${i + 1}.png`, await toBlob(c, "image/png"));
  return { blob: await zip.generateAsync({ type: "blob" }), ext: "zip" };
}
