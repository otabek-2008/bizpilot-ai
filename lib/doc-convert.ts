// Hujjat konvertatsiyasi — to'liq brauzerda (fayllar serverga yuborilmaydi).
// Og'ir kutubxonalar faqat kerak bo'lganda yuklanadi.

export type Progress = (done: number, total: number) => void;

const A4 = { w: 595.28, h: 841.89 }; // pt
const PX_TO_PT = 0.75; // 96 dpi CSS px → 72 dpi pt

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
  return pdfjs;
}

async function openPdf(file: File) {
  const pdfjs = await loadPdfJs();
  try {
    return await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (e) {
    if (e instanceof Error && e.name === "PasswordException") {
      throw new Error("PDF parol bilan himoyalangan. Avval himoyani olib tashlang.");
    }
    throw new Error("PDF faylni o'qib bo'lmadi.");
  }
}

// ---------------- PDF → Word ----------------

type Line = { text: string; size: number; y: number };

export async function pdfToWord(file: File, onProgress?: Progress): Promise<Blob> {
  const pdf = await openPdf(file);
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const pages: Line[][] = [];
  const sizes = new Map<number, number>();

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lines: Line[] = [];
    let current: Line | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      const size = Math.round(Math.hypot(item.transform[2], item.transform[3]) || item.height || 11);
      if (!current || Math.abs(current.y - y) > size * 0.5) {
        if (current?.text.trim()) lines.push(current);
        current = { text: "", size, y };
      }
      current.text += item.str;
      current.size = Math.max(current.size, size);
      if (item.hasEOL) {
        if (current.text.trim()) lines.push(current);
        current = null;
      }
    }
    if (current?.text.trim()) lines.push(current);

    for (const l of lines) sizes.set(l.size, (sizes.get(l.size) ?? 0) + l.text.length);
    pages.push(lines);
    onProgress?.(p, pdf.numPages);
  }

  if (pages.every((l) => l.length === 0)) {
    throw new Error("PDF ichida matn topilmadi (skanerlangan rasm bo'lishi mumkin). Bunday fayllar uchun matnni tanib olish (OCR) kerak.");
  }

  // Asosiy matn o'lchami — eng ko'p uchraydigan shrift o'lchami
  const body = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;

  const sections = pages.map((lines) => {
    const paragraphs: InstanceType<typeof Paragraph>[] = [];
    let buf: Line | null = null;

    const flush = () => {
      if (!buf) return;
      const heading = buf.size >= body * 1.25;
      paragraphs.push(
        new Paragraph({
          heading: heading ? (buf.size >= body * 1.6 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2) : undefined,
          spacing: { after: 120 },
          children: [new TextRun({ text: buf.text.trim(), size: Math.round(buf.size * 2), bold: heading })],
        }),
      );
      buf = null;
    };

    lines.forEach((line, i) => {
      const prev = lines[i - 1];
      const sameBlock =
        buf && prev && Math.abs(prev.size - line.size) <= 1 && prev.y - line.y > 0 && prev.y - line.y < line.size * 1.8;
      if (sameBlock && buf) {
        buf.text = buf.text.endsWith("-") ? buf.text.slice(0, -1) + line.text : `${buf.text} ${line.text}`;
      } else {
        flush();
        buf = { ...line };
      }
    });
    flush();

    return { children: paragraphs.length ? paragraphs : [new Paragraph("")] };
  });

  return Packer.toBlob(new Document({ sections }));
}

// ---------------- Word → PDF ----------------

export async function wordToPdf(file: File, onProgress?: Progress): Promise<Blob> {
  if (/\.doc$/i.test(file.name)) {
    throw new Error("Eski .doc formati qo'llab-quvvatlanmaydi. Faylni Word'da .docx sifatida saqlang.");
  }
  const mammoth = (await import("mammoth")).default;
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const html2canvas = (await import("html2canvas-pro")).default;
  const { PDFDocument } = await import("pdf-lib");

  const PAGE_W = 794; // A4 kengligi, CSS px
  const MARGIN_X = 76;
  const MARGIN_Y = 72;
  const CONTENT_H = 1123 - MARGIN_Y * 2;

  // Hujjat alohida iframe ichida chiziladi — sayt stillari ta'sir qilmaydi.
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;height:1123px;border:0;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{margin:0;background:#fff;color:#111}
      body{width:${PAGE_W - MARGIN_X * 2}px;padding:0 ${MARGIN_X}px;font:12pt/1.45 "Times New Roman",Times,serif}
      p{margin:0 0 8pt}
      h1{font-size:20pt;margin:12pt 0 8pt} h2{font-size:16pt;margin:10pt 0 6pt} h3{font-size:13pt;margin:8pt 0 6pt}
      img{max-width:100%;height:auto}
      table{border-collapse:collapse;width:100%;margin:6pt 0 10pt}
      td,th{border:1px solid #999;padding:4px 6px;vertical-align:top}
      ul,ol{margin:0 0 8pt;padding-left:22pt}
    </style></head><body>${html}</body></html>`);
    doc.close();

    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r))),
      ),
    );

    const bodyEl = doc.body;
    const total = bodyEl.scrollHeight;

    // Sahifa chegarasini matn qatori o'rtasiga tushirmaslik uchun blok elementlar chegaralaridan foydalanamiz
    const edges = Array.from(bodyEl.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,tr,img,hr,table"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom;
      })
      .sort((a, b) => a - b);

    const breaks: [number, number][] = [];
    let start = 0;
    while (start < total - 1) {
      const limit = start + CONTENT_H;
      if (limit >= total) {
        breaks.push([start, total]);
        break;
      }
      const fit = edges.filter((e) => e > start + CONTENT_H * 0.3 && e <= limit).pop();
      const end = Math.ceil(fit ?? limit);
      breaks.push([start, end]);
      start = end;
    }
    if (!breaks.length) breaks.push([0, Math.max(1, total)]);

    const pdf = await PDFDocument.create();
    for (let i = 0; i < breaks.length; i++) {
      const [y0, y1] = breaks[i];
      const canvas = await html2canvas(bodyEl, {
        x: 0,
        y: y0,
        width: PAGE_W,
        height: y1 - y0,
        windowWidth: PAGE_W,
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const jpg = await pdf.embedJpg(canvas.toDataURL("image/jpeg", 0.92));
      const page = pdf.addPage([A4.w, A4.h]);
      const h = (y1 - y0) * PX_TO_PT;
      page.drawImage(jpg, { x: 0, y: A4.h - MARGIN_Y * PX_TO_PT - h, width: PAGE_W * PX_TO_PT, height: h });
      onProgress?.(i + 1, breaks.length);
    }

    const bytes = await pdf.save();
    return new Blob([bytes as BlobPart], { type: "application/pdf" });
  } finally {
    iframe.remove();
  }
}

// ---------------- Rasm → PDF ----------------

export type PageFit = "a4" | "image";

// PNG to'g'ridan-to'g'ri joylanadi. JPG (EXIF burilishi bo'lishi mumkin), WEBP, GIF va boshqalar
// canvas orqali to'g'ri burilgan holda JPG'ga qayta kodlanadi.
async function imageBytes(file: File): Promise<{ bytes: Uint8Array; type: "jpg" | "png"; w: number; h: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width: w, height: h } = bitmap;
  if (file.type === "image/png") {
    bitmap.close();
    return { bytes: new Uint8Array(await file.arrayBuffer()), type: "png", w, h };
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.92));
  canvas.width = canvas.height = 0;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: "jpg", w, h };
}

export async function imagesToPdf(files: File[], fit: PageFit, onProgress?: Progress): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const { bytes, type, w, h } = await imageBytes(files[i]);
    const img = type === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);

    if (fit === "image") {
      const page = pdf.addPage([w * PX_TO_PT, h * PX_TO_PT]);
      page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    } else {
      const landscape = w > h;
      const pw = landscape ? A4.h : A4.w;
      const ph = landscape ? A4.w : A4.h;
      const margin = 28;
      const s = Math.min((pw - margin * 2) / w, (ph - margin * 2) / h);
      const page = pdf.addPage([pw, ph]);
      page.drawImage(img, { x: (pw - w * s) / 2, y: (ph - h * s) / 2, width: w * s, height: h * s });
    }
    onProgress?.(i + 1, files.length);
  }

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

// ---------------- PDF → Rasm ----------------

export async function pdfToImages(
  file: File,
  format: "png" | "jpg",
  scale: number,
  onProgress?: Progress,
): Promise<{ blob: Blob; name: string }[]> {
  const pdf = await openPdf(file);
  const out: { blob: Blob; name: string }[] = [];
  const type = format === "png" ? "image/png" : "image/jpeg";

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), type, 0.92));
    out.push({ blob, name: `sahifa-${String(p).padStart(3, "0")}.${format}` });
    canvas.width = canvas.height = 0;
    onProgress?.(p, pdf.numPages);
  }
  return out;
}

export async function zipFiles(files: { blob: Blob; name: string }[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  return zip.generateAsync({ type: "blob" });
}

// ---------------- PDF birlashtirish ----------------

export async function mergePdfs(files: File[], onProgress?: Progress): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    let src;
    try {
      src = await PDFDocument.load(await files[i].arrayBuffer(), { ignoreEncryption: true });
    } catch {
      throw new Error(`«${files[i].name}» faylini o'qib bo'lmadi.`);
    }
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
    onProgress?.(i + 1, files.length);
  }
  const bytes = await merged.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
