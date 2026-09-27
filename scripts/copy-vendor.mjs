// Brauzerda ishlaydigan worker va wasm fayllarini public/vendor ga nusxalaydi.
// predev / prebuild orqali avtomatik ishga tushadi.
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "vendor");
mkdirSync(out, { recursive: true });

cpSync(
  join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  join(out, "pdf.worker.min.mjs"),
);
cpSync(
  join(root, "node_modules/@mediapipe/tasks-vision/wasm"),
  join(out, "mediapipe"),
  { recursive: true },
);

console.log("vendor fayllari nusxalandi → public/vendor");
