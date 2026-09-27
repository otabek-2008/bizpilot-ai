// 3×4 hujjat rasmi uchun yordamchi funksiyalar: yuzni topish, fonni ajratish, DPI.
// Barcha hisob-kitoblar brauzerda bajariladi — rasm hech qayerga yuborilmaydi.

import type { FaceDetector, ImageSegmenter } from "@mediapipe/tasks-vision";

export type Crop = { x: number; y: number; w: number; h: number };

export const PHOTO_RATIO = 4 / 3; // balandlik / kenglik
export const CM_PER_INCH = 2.54;

export const pxForCm = (cm: number, dpi: number) => Math.round((cm / CM_PER_INCH) * dpi);

const WASM = "/vendor/mediapipe";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const SEG_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

let facePromise: Promise<FaceDetector> | null = null;
let segPromise: Promise<ImageSegmenter> | null = null;

async function fileset() {
  const { FilesetResolver } = await import("@mediapipe/tasks-vision");
  return FilesetResolver.forVisionTasks(WASM);
}

function faceDetector() {
  facePromise ??= (async () => {
    const { FaceDetector } = await import("@mediapipe/tasks-vision");
    return FaceDetector.createFromOptions(await fileset(), {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.5,
    });
  })().catch((e) => {
    facePromise = null;
    throw e;
  });
  return facePromise;
}

function segmenter() {
  segPromise ??= (async () => {
    const { ImageSegmenter } = await import("@mediapipe/tasks-vision");
    return ImageSegmenter.createFromOptions(await fileset(), {
      baseOptions: { modelAssetPath: SEG_MODEL, delegate: "CPU" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  })().catch((e) => {
    segPromise = null;
    throw e;
  });
  return segPromise;
}

/** Rasmni yuklaydi va juda katta bo'lsa kichraytiradi (tezlik uchun). */
export async function loadImage(file: File, maxSide = 2400): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Yuz bo'lmasa — rasm markazining yuqori qismi. */
export function centerCrop(w: number, h: number): Crop {
  let cw = w;
  let ch = cw * PHOTO_RATIO;
  if (ch > h) {
    ch = h;
    cw = ch / PHOTO_RATIO;
  }
  return { x: (w - cw) / 2, y: Math.max(0, (h - ch) * 0.3), w: cw, h: ch };
}

/**
 * Yuzni topib, hujjat rasmi talablariga mos kesadi:
 * bosh (sochdan iyakkacha) rasm balandligining ~68% ini egallaydi, tepada ozgina bo'sh joy qoladi.
 */
export async function autoCrop(source: HTMLCanvasElement): Promise<{ crop: Crop; found: boolean }> {
  const detector = await faceDetector();
  const result = detector.detect(source);
  const face = result.detections
    .map((d) => d.boundingBox)
    .filter((b): b is NonNullable<typeof b> => !!b)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];

  if (!face) return { crop: centerCrop(source.width, source.height), found: false };

  const headTop = face.originY - face.height * 0.5;
  const headH = face.height * 1.5;
  const h = headH / 0.68;
  const w = h / PHOTO_RATIO;
  const cx = face.originX + face.width / 2;
  return {
    crop: { x: cx - w / 2, y: headTop - h * 0.1, w, h },
    found: true,
  };
}

export type PersonMask = { data: Float32Array; width: number; height: number };

/** Odam siluetini ajratadi (1 = odam, 0 = fon). */
export async function personMask(source: HTMLCanvasElement): Promise<PersonMask> {
  const seg = await segmenter();
  const res = seg.segment(source);
  try {
    const masks = res.confidenceMasks ?? [];
    const mask = masks.length > 1 ? masks[masks.length - 1] : masks[0];
    if (!mask) throw new Error("Segmentatsiya natijasi bo'sh");
    const data = new Float32Array(mask.getAsFloat32Array());
    const { width, height } = mask;

    // Model versiyasiga qarab maska teskari bo'lishi mumkin — markaz va burchaklarni solishtiramiz.
    const at = (fx: number, fy: number) => data[Math.floor(fy * (height - 1)) * width + Math.floor(fx * (width - 1))];
    const center = (at(0.5, 0.5) + at(0.5, 0.7) + at(0.45, 0.6) + at(0.55, 0.6)) / 4;
    const corners = (at(0.02, 0.02) + at(0.98, 0.02) + at(0.02, 0.3) + at(0.98, 0.3)) / 4;
    if (corners > center) for (let i = 0; i < data.length; i++) data[i] = 1 - data[i];

    return { data, width, height };
  } finally {
    res.close();
  }
}

/** Fonni tanlangan rang bilan almashtirilgan yangi canvas qaytaradi. */
export function replaceBackground(
  source: HTMLCanvasElement,
  mask: PersonMask,
  color: string,
): HTMLCanvasElement {
  // Maskani yumshoq qirrali alfa kanalga aylantiramiz
  const m = document.createElement("canvas");
  m.width = mask.width;
  m.height = mask.height;
  const mctx = m.getContext("2d")!;
  const img = mctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    const t = Math.min(1, Math.max(0, (mask.data[i] - 0.3) / 0.45));
    img.data[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  mctx.putImageData(img, 0, 0);

  const person = document.createElement("canvas");
  person.width = source.width;
  person.height = source.height;
  const pctx = person.getContext("2d")!;
  pctx.drawImage(source, 0, 0);
  pctx.globalCompositeOperation = "destination-in";
  pctx.filter = `blur(${Math.max(1, source.width / 900)}px)`;
  pctx.drawImage(m, 0, 0, source.width, source.height);

  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const octx = out.getContext("2d")!;
  octx.fillStyle = color;
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(person, 0, 0);
  return out;
}

/** Kesilgan hududni berilgan o'lchamda chizadi (rasmdan tashqari joy fon rangi bilan to'ladi). */
export function renderCrop(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  crop: Crop,
  outW: number,
  outH: number,
  bg: string,
  dx = 0,
  dy = 0,
) {
  ctx.fillStyle = bg;
  ctx.fillRect(dx, dy, outW, outH);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, dx, dy, outW, outH);
}

// ---------- DPI metama'lumotlari (chop etishda to'g'ri o'lcham uchun) ----------

function setJpegDpi(bytes: Uint8Array, dpi: number) {
  // FF D8 FF E0 .. "JFIF\0" .. units(1) Xdensity(2) Ydensity(2)
  if (bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.slice(6, 10)) === "JFIF") {
    bytes[13] = 1;
    bytes[14] = dpi >> 8;
    bytes[15] = dpi & 0xff;
    bytes[16] = dpi >> 8;
    bytes[17] = dpi & 0xff;
  }
  return bytes;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function setPngDpi(bytes: Uint8Array, dpi: number) {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // metr
  view.setUint32(17, crc32(chunk.slice(4, 17)));
  // IHDR (8 + 25 bayt) dan keyin qo'yamiz
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.slice(0, 33));
  out.set(chunk, 33);
  out.set(bytes.slice(33), 33 + chunk.length);
  return out;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: "jpg" | "png",
  dpi: number,
): Promise<Blob> {
  const type = format === "jpg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Rasm yaratilmadi"))), type, 0.95),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const fixed = format === "jpg" ? setJpegDpi(bytes, dpi) : setPngDpi(bytes, dpi);
  return new Blob([fixed as BlobPart], { type });
}
