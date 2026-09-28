// Rezyume ma'lumotlari va PDF eksporti. Hammasi brauzerda — ma'lumotlar serverga yuborilmaydi.

export type CvEntry = { id: string; title: string; place: string; period: string; details: string };

export type CvData = {
  name: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  links: string;
  photo: string; // data URL
  summary: string;
  experience: CvEntry[];
  education: CvEntry[];
  skills: string;
  languages: string;
  extra: string;
};

export type CvTemplate = "modern" | "classic" | "minimal";

export const CV_TEMPLATES: { id: CvTemplate; name: string }[] = [
  { id: "modern", name: "Zamonaviy" },
  { id: "classic", name: "Klassik" },
  { id: "minimal", name: "Minimal" },
];

export const CV_COLORS = ["#4f46e5", "#0f766e", "#b91c1c", "#1e293b", "#c2410c", "#7e22ce"];

export const newEntry = (): CvEntry => ({ id: crypto.randomUUID(), title: "", place: "", period: "", details: "" });

export const emptyCv = (name = "", email = ""): CvData => ({
  name,
  role: "",
  email,
  phone: "",
  city: "",
  links: "",
  photo: "",
  summary: "",
  experience: [newEntry()],
  education: [newEntry()],
  skills: "",
  languages: "",
  extra: "",
});

/** Vergul yoki yangi qator bilan ajratilgan ro'yxat. */
export const splitList = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

// A4: 210×297 mm → 96 dpi da 794×1123 px
export const A4_PX = { w: 794, h: 1123 };

export async function cvToPdf(node: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { PDFDocument }] = await Promise.all([import("html2canvas-pro"), import("pdf-lib")]);
  const scale = 2;
  const canvas = await html2canvas(node, { scale, backgroundColor: "#ffffff", useCORS: true });

  const pdf = await PDFDocument.create();
  const pageW = 595.28;
  const pageH = 841.89;
  const slice = A4_PX.h * scale;

  // Uzun rezyume bir necha sahifaga bo'linadi
  for (let y = 0; y < canvas.height; y += slice) {
    const part = document.createElement("canvas");
    part.width = canvas.width;
    part.height = Math.min(slice, canvas.height - y);
    const ctx = part.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, part.width, part.height);
    ctx.drawImage(canvas, 0, -y);

    const jpg = await pdf.embedJpg(part.toDataURL("image/jpeg", 0.92));
    const page = pdf.addPage([pageW, pageH]);
    const h = (part.height / canvas.width) * pageW;
    page.drawImage(jpg, { x: 0, y: pageH - h, width: pageW, height: h });
  }
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/** Rasmni 400px gacha kichraytirib, data URL qaytaradi (localStorage'ga sig'ishi uchun). */
export function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi."));
    img.src = URL.createObjectURL(file);
  });
}
