// Qo'llab-quvvatlanadigan formatlar va ular orasidagi yo'nalishlar.

export type FormatId =
  | "pdf"
  | "docx"
  | "odt"
  | "rtf"
  | "txt"
  | "md"
  | "html"
  | "epub"
  | "pptx"
  | "xlsx"
  | "csv"
  | "json"
  | "jpg"
  | "png"
  | "webp"
  | "gif"
  | "bmp";

export type FormatKind = "doc" | "data" | "image";

export type Format = {
  id: FormatId;
  label: string;
  desc: string;
  kind: FormatKind;
  exts: string[];
  mime: string;
  read: boolean;
  write: boolean;
};

export const FORMATS: Format[] = [
  { id: "pdf", label: "PDF", desc: "Portable Document", kind: "doc", exts: ["pdf"], mime: "application/pdf", read: true, write: true },
  { id: "docx", label: "Word", desc: "Microsoft Word (.docx)", kind: "doc", exts: ["docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", read: true, write: true },
  { id: "odt", label: "ODT", desc: "LibreOffice / OpenOffice", kind: "doc", exts: ["odt"], mime: "application/vnd.oasis.opendocument.text", read: true, write: true },
  { id: "rtf", label: "RTF", desc: "Rich Text Format", kind: "doc", exts: ["rtf"], mime: "application/rtf", read: true, write: true },
  { id: "txt", label: "TXT", desc: "Oddiy matn", kind: "doc", exts: ["txt", "text"], mime: "text/plain", read: true, write: true },
  { id: "md", label: "Markdown", desc: "Markdown (.md)", kind: "doc", exts: ["md", "markdown"], mime: "text/markdown", read: true, write: true },
  { id: "html", label: "HTML", desc: "Veb sahifa", kind: "doc", exts: ["html", "htm"], mime: "text/html", read: true, write: true },
  { id: "epub", label: "EPUB", desc: "Elektron kitob", kind: "doc", exts: ["epub"], mime: "application/epub+zip", read: true, write: true },
  { id: "pptx", label: "PowerPoint", desc: "Taqdimot (.pptx)", kind: "doc", exts: ["pptx"], mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", read: true, write: true },
  { id: "xlsx", label: "Excel", desc: "Jadval (.xlsx)", kind: "data", exts: ["xlsx"], mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", read: true, write: true },
  { id: "csv", label: "CSV", desc: "Vergul bilan ajratilgan", kind: "data", exts: ["csv", "tsv"], mime: "text/csv", read: true, write: true },
  { id: "json", label: "JSON", desc: "Tuzilmali ma'lumot", kind: "data", exts: ["json"], mime: "application/json", read: true, write: true },
  { id: "jpg", label: "JPG", desc: "Rasm (JPEG)", kind: "image", exts: ["jpg", "jpeg", "jfif"], mime: "image/jpeg", read: true, write: true },
  { id: "png", label: "PNG", desc: "Rasm (shaffof fon)", kind: "image", exts: ["png"], mime: "image/png", read: true, write: true },
  { id: "webp", label: "WEBP", desc: "Zamonaviy rasm formati", kind: "image", exts: ["webp"], mime: "image/webp", read: true, write: true },
  { id: "gif", label: "GIF", desc: "Rasm (faqat o'qish)", kind: "image", exts: ["gif"], mime: "image/gif", read: true, write: false },
  { id: "bmp", label: "BMP", desc: "Rasm (faqat o'qish)", kind: "image", exts: ["bmp"], mime: "image/bmp", read: true, write: false },
];

export const format = (id: FormatId) => FORMATS.find((f) => f.id === id)!;

export const SOURCES = FORMATS.filter((f) => f.read);
export const TARGETS = FORMATS.filter((f) => f.write);

// Rasmdan matn chiqarish uchun OCR kerak — rasmlar faqat rasm saqlay oladigan formatlarga o'tadi
const IMAGE_TARGETS: FormatId[] = ["pdf", "docx", "odt", "rtf", "html", "md", "epub", "pptx", "jpg", "png", "webp"];

export function targetsFor(src: FormatId): Format[] {
  const s = format(src);
  return TARGETS.filter((t) => t.id !== src && (s.kind !== "image" || IMAGE_TARGETS.includes(t.id)));
}

export const combinationCount = () => SOURCES.reduce((n, s) => n + targetsFor(s.id).length, 0);

export function detectFormat(file: { name: string; type: string }): FormatId | null {
  const ext = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase();
  const byExt = ext && FORMATS.find((f) => f.exts.includes(ext));
  if (byExt) return byExt.id;
  const byMime = FORMATS.find((f) => f.mime === file.type);
  return byMime?.id ?? null;
}

export const acceptFor = (id: FormatId) => {
  const f = format(id);
  return [...f.exts.map((e) => `.${e}`), f.mime].join(",");
};

export const ACCEPT_ALL = SOURCES.map((f) => acceptFor(f.id)).join(",");
