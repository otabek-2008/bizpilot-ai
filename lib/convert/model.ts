// Universal konvertorning oraliq modeli: har bir format avval shu modelga o'qiladi,
// keyin modeldan istalgan formatga yoziladi — N ta format N×N yo'nalish beradi.

export type Run = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean; href?: string };

export type HLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Block =
  | { t: "h"; level: HLevel; runs: Run[] }
  | { t: "p"; runs: Run[] }
  | { t: "list"; ordered: boolean; items: Run[][] }
  | { t: "quote"; runs: Run[] }
  | { t: "code"; text: string }
  | { t: "table"; rows: string[][]; header: boolean; name?: string }
  // src — data: URL. Konvertatsiyadan oldin PNG/JPG ga keltiriladi va o'lchami to'ldiriladi.
  | { t: "img"; src: string; alt?: string; w?: number; h?: number }
  | { t: "hr" }
  // Sahifa / slayd chegarasi
  | { t: "break" };

export type Doc = { title: string; blocks: Block[] };

export const runsText = (runs: Run[]) => runs.map((r) => r.text).join("");

export function blockText(b: Block): string {
  switch (b.t) {
    case "h":
    case "p":
    case "quote":
      return runsText(b.runs);
    case "list":
      return b.items.map(runsText).join("\n");
    case "code":
      return b.text;
    case "table":
      return b.rows.map((r) => r.join("\t")).join("\n");
    case "img":
      return b.alt ?? "";
    default:
      return "";
  }
}

// Bo'sh matnli bo'laklarni olib tashlab, qo'shni bir xil uslubli bo'laklarni birlashtiradi
export function tidyRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = out.at(-1);
    if (last && last.bold === r.bold && last.italic === r.italic && last.underline === r.underline && last.code === r.code && last.href === r.href) {
      last.text += r.text;
    } else out.push({ ...r });
  }
  if (out.length) {
    out[0].text = out[0].text.replace(/^\s+/, "");
    out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, "");
  }
  return out.filter((r) => r.text);
}

// Jadval qatorlarini bir xil uzunlikka keltiradi
export function squareRows(rows: string[][]): string[][] {
  const n = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => [...r, ...Array<string>(Math.max(0, n - r.length)).fill("")]);
}

export const tables = (doc: Doc) => doc.blocks.filter((b): b is Extract<Block, { t: "table" }> => b.t === "table");

// Hujjat faqat jadvallardan iborat bo'lsa (Excel, CSV, JSON) — ma'lumotlar fayli
export const isDataOnly = (doc: Doc) => doc.blocks.length > 0 && doc.blocks.every((b) => b.t === "table" || b.t === "break");

export const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // XML 1.0 da ruxsat etilmagan boshqaruv belgilari
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

export function dataUrlParts(src: string): { mime: string; base64: string } | null {
  const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(src);
  if (!m) return null;
  return { mime: m[1], base64: m[2] ? m[3] : bytesToBase64(new TextEncoder().encode(decodeURIComponent(m[3]))) };
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// Rasmni maksimal kenglikka sig'diradi (nisbat saqlanadi)
export function fitSize(w = 600, h = 400, maxW: number, maxH = Infinity) {
  const s = Math.min(1, maxW / w, maxH / h);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}
