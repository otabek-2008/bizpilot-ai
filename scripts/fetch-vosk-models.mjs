// Audio fayldan matn olish uchun Vosk nutq modellari (Apache 2.0, alphacephei.com) → public/vosk/*.tar.gz
// vosk-browser modelni .tar.gz ko'rinishida yuklaydi, rasmiy modellar esa .zip — shu yerda qayta o'raladi.
// predev / prebuild orqali ishga tushadi; fayl allaqachon bo'lsa o'tkazib yuboriladi. Xatolik buildni to'xtatmaydi.
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";

// lib/transcribe.ts dagi VOSK_MODELS bilan bir xil bo'lishi kerak
const MODELS = ["vosk-model-small-uz-0.22", "vosk-model-small-ru-0.22", "vosk-model-small-en-us-0.15"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "vosk");
mkdirSync(out, { recursive: true });

function tarHeader(name, size, dir) {
  const h = Buffer.alloc(512);
  const put = (s, off, len) => h.write(s, off, len, "utf8");
  const oct = (n, off, len) => put(n.toString(8).padStart(len - 1, "0") + "\0", off, len);
  if (Buffer.byteLength(name) > 100) throw new Error(`tar: nom juda uzun: ${name}`);
  put(name, 0, 100);
  oct(dir ? 0o755 : 0o644, 100, 8);
  oct(0, 108, 8);
  oct(0, 116, 8);
  oct(size, 124, 12);
  oct(0, 136, 12);
  put("        ", 148, 8);
  put(dir ? "5" : "0", 156, 1);
  put("ustar\0" + "00", 257, 8);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return h;
}

async function zipToTarGz(zipBuf) {
  const zip = await JSZip.loadAsync(zipBuf);
  const parts = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) {
      parts.push(tarHeader(entry.name, 0, true));
      continue;
    }
    const data = await entry.async("nodebuffer");
    parts.push(tarHeader(entry.name, data.length, false), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

for (const name of MODELS) {
  const target = join(out, `${name}.tar.gz`);
  if (existsSync(target)) continue;
  try {
    console.log(`Vosk modeli yuklanmoqda: ${name}`);
    const res = await fetch(`https://alphacephei.com/vosk/models/${name}.zip`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tgz = await zipToTarGz(Buffer.from(await res.arrayBuffer()));
    writeFileSync(target + ".part", tgz);
    renameSync(target + ".part", target);
    console.log(`  → public/vosk/${name}.tar.gz (${(tgz.length / 1e6).toFixed(1)} MB)`);
  } catch (e) {
    console.warn(`Vosk modeli ${name} yuklanmadi (${e.message}) — audio fayldan matn olish bu tilda ishlamaydi.`);
  }
}
