// Bir martalik: prava savollar bazasini (JSON, admin import formatida) va rasmlarni Supabase'ga yuklaydi.
// Ishlatish: node --env-file=.env.local scripts/seed-prava.mjs <bank.json> <rasmlar-papkasi> [--replace]
// .env.local da NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY bo'lishi kerak.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const [bankPath, imgDir] = process.argv.slice(2);
const replace = process.argv.includes("--replace");
if (!bankPath || !imgDir) {
  console.error("Ishlatish: node --env-file=.env.local scripts/seed-prava.mjs <bank.json> <rasmlar-papkasi> [--replace]");
  process.exit(1);
}
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) {
  console.error(".env.local da NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const bank = JSON.parse(await readFile(bankPath, "utf8"));

const { count, error: countError } = await db.from("prava_questions").select("id", { count: "exact", head: true });
if (countError) throw countError;
if (count && !replace) {
  console.error(`Bazada allaqachon ${count} ta savol bor. Almashtirish uchun --replace qo'shing.`);
  process.exit(1);
}

// 1) Rasmlar
const images = [...new Set(bank.map((q) => q.rasm).filter(Boolean))];
let done = 0;
for (let i = 0; i < images.length; i += 8) {
  await Promise.all(
    images.slice(i, i + 8).map(async (p) => {
      const body = await readFile(path.join(imgDir, path.basename(p)));
      const { error } = await db.storage.from("prava-images").upload(p, body, { contentType: "image/webp", upsert: true });
      if (error) throw new Error(`${p}: ${error.message}`);
    }),
  );
  done = Math.min(i + 8, images.length);
  process.stdout.write(`\rRasmlar: ${done}/${images.length}`);
}
console.log();

// 2) Savollar
if (count) {
  const { error } = await db.from("prava_questions").delete().gte("id", 0);
  if (error) throw error;
}
const rows = bank.map((q) => ({
  ticket: q.bilet,
  position: q.tartib,
  topic: null,
  question: q.savol,
  options: q.javoblar,
  correct: q.togri - 1,
  explanation: q.izoh,
  image: q.rasm,
  active: true,
}));
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await db.from("prava_questions").insert(rows.slice(i, i + 500));
  if (error) throw error;
}
console.log(`Savollar: ${rows.length} ta yuklandi.`);
