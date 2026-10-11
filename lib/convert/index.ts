// Universal konvertor: istalgan qo'llab-quvvatlanadigan formatdan istalganiga — to'liq brauzerda.

import { format, type FormatId } from "./formats";
import type { Doc } from "./model";
import { prepareImages, readFile } from "./read";
import { DOC_CSS, docBodyHtml, writeCsvFiles, writeHtml, writeJson, writeMarkdown, writeRtf, writeTxt } from "./text";
import { writeDocx, writeEpub, writeOdt, writePptx, writeXlsx } from "./office";
import type { ImageFormat, PageFit, Progress } from "@/lib/doc-convert";

export type ConvertOptions = { fit: PageFit; scale: number };
export type ConvertResult = { blob: Blob; name: string; note?: string };
type Out = { blob: Blob; name: string };

const isImage = (id: FormatId) => format(id).kind === "image";
const ext = (id: FormatId) => format(id).exts[0];
const baseName = (name: string) => name.replace(/\.[^.]+$/, "");

async function zipOut(files: Out[]): Promise<Blob> {
  const { zipFiles } = await import("@/lib/doc-convert");
  // Bir xil nomlar ustma-ust tushmasin
  const seen = new Map<string, number>();
  return zipFiles(
    files.map((f) => {
      const n = seen.get(f.name) ?? 0;
      seen.set(f.name, n + 1);
      return n ? { ...f, name: f.name.replace(/(\.[^.]+)?$/, `-${n + 1}$1`) } : f;
    }),
  );
}

const textBlob = (text: string, to: FormatId) => new Blob([text], { type: `${format(to).mime};charset=utf-8` });

// Modelni bitta yoki bir nechta faylga yozadi
async function writeDoc(doc: Doc, to: FormatId, opts: ConvertOptions, onProgress?: Progress): Promise<Out[]> {
  const name = `${doc.title}.${ext(to)}`;
  switch (to) {
    case "txt":
      return [{ blob: textBlob(writeTxt(doc), to), name }];
    case "md":
      return [{ blob: textBlob(writeMarkdown(doc), to), name }];
    case "html":
      return [{ blob: textBlob(writeHtml(doc), to), name }];
    case "rtf":
      return [{ blob: new Blob([writeRtf(doc)], { type: "application/rtf" }), name }];
    case "json":
      return [{ blob: textBlob(writeJson(doc), to), name }];
    case "csv":
      return writeCsvFiles(doc).map((f) => ({ blob: textBlob(f.text, to), name: f.name ? `${doc.title}-${f.name}.csv` : name }));
    case "docx":
      return [{ blob: await writeDocx(doc), name }];
    case "odt":
      return [{ blob: await writeOdt(doc), name }];
    case "xlsx":
      return [{ blob: await writeXlsx(doc), name }];
    case "epub":
      return [{ blob: await writeEpub(doc, (d) => docBodyHtml(d, 560), DOC_CSS), name }];
    case "pptx":
      return [{ blob: await writePptx(doc), name }];
    case "pdf": {
      const { htmlToPdf } = await import("@/lib/doc-convert");
      return [{ blob: await htmlToPdf(docBodyHtml(doc), DOC_CSS, onProgress), name }];
    }
    case "png":
    case "jpg":
    case "webp": {
      const { htmlToImages } = await import("@/lib/doc-convert");
      const pages = await htmlToImages(docBodyHtml(doc), DOC_CSS, to, opts.scale, onProgress);
      return pages.length === 1 ? [{ blob: pages[0].blob, name }] : pages.map((p) => ({ blob: p.blob, name: `${doc.title}/${p.name}` }));
    }
    default:
      throw new Error(`${format(to).label} formatiga yozish qo'llab-quvvatlanmaydi.`);
  }
}

async function imageToImage(file: File, to: ImageFormat): Promise<Out> {
  const { canvasToBlob } = await import("@/lib/doc-convert");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  // JPG shaffoflikni saqlamaydi — oq fon
  if (to === "jpg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await canvasToBlob(canvas, to);
  canvas.width = canvas.height = 0;
  return { blob, name: `${baseName(file.name)}.${to}` };
}

export async function convert(files: File[], from: FormatId, to: FormatId, opts: ConvertOptions, onProgress?: Progress): Promise<ConvertResult> {
  if (!files.length) throw new Error("Fayl tanlanmagan.");
  const lib = await import("@/lib/doc-convert");
  const first = files[0];
  const many = files.length > 1;
  let outs: Out[];
  let note: string | undefined;

  if (isImage(from)) {
    // Buzilgan yoki brauzer ocha olmaydigan rasmlarni oldindan aniqlaymiz
    for (const f of files) {
      try {
        (await createImageBitmap(f)).close();
      } catch {
        throw new Error(`«${f.name}» rasmini ochib bo'lmadi — fayl buzilgan yoki bu format brauzeringizda qo'llab-quvvatlanmaydi.`);
      }
    }
    if (to === "pdf") {
      return { blob: await lib.imagesToPdf(files, opts.fit, onProgress), name: `${baseName(first.name)}${many ? `-va-${files.length - 1}-ta` : ""}.pdf`, note: many ? `${files.length} ta rasm bitta PDF'da` : undefined };
    }
    if (to === "png" || to === "jpg" || to === "webp") {
      outs = [];
      for (let i = 0; i < files.length; i++) {
        outs.push(await imageToImage(files[i], to));
        onProgress?.(i + 1, files.length);
      }
    } else {
      // Bir nechta rasm — bitta hujjatda, har biri alohida sahifa/slaydda
      const blocks: Doc["blocks"] = [];
      for (let i = 0; i < files.length; i++) {
        if (i) blocks.push({ t: "break" });
        blocks.push(...(await readFile(files[i], from)).blocks);
      }
      const doc = await prepareImages({ title: baseName(first.name), blocks });
      outs = await writeDoc(doc, to, opts, onProgress);
      if (many) note = `${files.length} ta rasm bitta faylda`;
    }
  } else {
    outs = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const part: Progress = (d, t) => onProgress?.(i + d / t, files.length);
      if (from === "pdf" && to === "docx") {
        outs.push({ blob: await lib.pdfToWord(file, part), name: `${baseName(file.name)}.docx` });
        note = "Matn, sarlavhalar va chegarali jadvallar saqlanadi; murakkab joylashuv soddalashtiriladi.";
      } else if (from === "pdf" && (to === "png" || to === "jpg" || to === "webp")) {
        const pages = await lib.pdfToImages(file, to, opts.scale, part);
        outs.push(...(pages.length === 1 ? [{ blob: pages[0].blob, name: `${baseName(file.name)}.${to}` }] : pages.map((p) => ({ blob: p.blob, name: `${baseName(file.name)}/${p.name}` }))));
      } else if (from === "docx" && to === "pdf") {
        outs.push({ blob: await lib.wordToPdf(file, part), name: `${baseName(file.name)}.pdf` });
      } else {
        // O'qish — 50%, yozish — 50%
        const doc = await readFile(file, from, (d, t) => part(d / t / 2, 1));
        if (!doc.blocks.some((b) => b.t !== "break")) throw new Error(`«${file.name}» ichida o'girish uchun mazmun topilmadi.`);
        const ready = await prepareImages(doc);
        outs.push(...(await writeDoc(ready, to, opts, (d, t) => part(0.5 + d / t / 2, 1))));
      }
      onProgress?.(i + 1, files.length);
    }
  }

  if (outs.length === 1) return { blob: outs[0].blob, name: outs[0].name, note };
  return {
    blob: await zipOut(outs),
    name: `${baseName(first.name)}-${ext(to)}.zip`,
    note: [note, `${outs.length} ta fayl ZIP arxivda`].filter(Boolean).join(" · "),
  };
}
