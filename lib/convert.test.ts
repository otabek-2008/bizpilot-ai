import { test } from "node:test";
import assert from "node:assert/strict";
import { FORMATS, SOURCES, TARGETS, combinationCount, detectFormat, targetsFor } from "./convert/formats";
import { runsText, type Doc } from "./convert/model";
import { parseCsv, readCsv, readJson, readMarkdown, readRtf, readTxt, toCsv, writeCsvFiles, writeHtml, writeJson, writeMarkdown, writeRtf, writeTxt } from "./convert/text";
import { chapters, sheetNames, toSlides } from "./convert/office";

const sample: Doc = {
  title: "Namuna",
  blocks: [
    { t: "h", level: 1, runs: [{ text: "Kirish" }] },
    { t: "p", runs: [{ text: "Oddiy " }, { text: "qalin", bold: true }, { text: " va " }, { text: "kursiv", italic: true }, { text: " matn." }] },
    { t: "list", ordered: false, items: [[{ text: "birinchi" }], [{ text: "ikkinchi" }]] },
    { t: "table", rows: [["Ism", "Ball"], ["Ali", "95"], ["O'g'iloy", "88"]], header: true },
    { t: "h", level: 2, runs: [{ text: "Xulosa" }] },
    { t: "p", runs: [{ text: "Кирилл матн ҳам ишлайди — ўзбекча." }] },
  ],
};

test("Kamida 10 ta format va har biri uchun ko'p yo'nalish", () => {
  assert.ok(SOURCES.length >= 15, `manba formatlar: ${SOURCES.length}`);
  assert.ok(TARGETS.length >= 15, `natija formatlar: ${TARGETS.length}`);
  for (const s of SOURCES) {
    const ts = targetsFor(s.id);
    assert.ok(ts.length >= 10, `${s.id} uchun faqat ${ts.length} ta yo'nalish`);
    assert.ok(!ts.some((t) => t.id === s.id), `${s.id} o'ziga o'tmasligi kerak`);
  }
  assert.ok(combinationCount() >= 200);
});

test("Rasmdan matnli formatlarga o'tish yo'q (OCR kerak)", () => {
  const ids = targetsFor("jpg").map((t) => t.id);
  for (const no of ["txt", "csv", "xlsx", "json"]) assert.ok(!ids.includes(no as never), no);
  for (const yes of ["pdf", "docx", "png", "webp", "pptx"]) assert.ok(ids.includes(yes as never), yes);
});

test("Format fayl nomi va MIME bo'yicha aniqlanadi", () => {
  assert.equal(detectFormat({ name: "Hisobot.DOCX", type: "" }), "docx");
  assert.equal(detectFormat({ name: "rasm.jpeg", type: "" }), "jpg");
  assert.equal(detectFormat({ name: "data.tsv", type: "" }), "csv");
  assert.equal(detectFormat({ name: "nomsiz", type: "application/pdf" }), "pdf");
  assert.equal(detectFormat({ name: "arxiv.rar", type: "" }), null);
  assert.equal(new Set(FORMATS.flatMap((f) => f.exts)).size, FORMATS.flatMap((f) => f.exts).length, "kengaytmalar takrorlanmasin");
});

test("CSV: qo'shtirnoq, vergul, yangi qator va nuqtali vergul", () => {
  const rows = [["Ism", "Izoh"], ["Ali", 'U "a\'lochi", 1-kurs'], ["Vali", "ikki\nqator"]];
  const csv = toCsv(rows);
  assert.ok(csv.startsWith("﻿"), "Excel uchun BOM");
  assert.deepEqual(parseCsv(csv), rows);
  assert.deepEqual(parseCsv("a;b;c\n1;2;3\n"), [["a", "b", "c"], ["1", "2", "3"]]);
  assert.deepEqual(parseCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(readCsv("x,y\n1,2\n", "t").blocks[0], { t: "table", rows: [["x", "y"], ["1", "2"]], header: true, name: "t" });
});

test("CSV yozish: jadvalsiz hujjat — har bir blok qator; bir nechta jadval — alohida fayllar", () => {
  const files = writeCsvFiles(sample);
  assert.equal(files.length, 1);
  assert.deepEqual(parseCsv(files[0].text), sample.blocks[3].t === "table" ? sample.blocks[3].rows : []);
  const two: Doc = { title: "t", blocks: [{ t: "table", rows: [["a"]], header: false, name: "Bir" }, { t: "table", rows: [["b"]], header: false }] };
  assert.deepEqual(writeCsvFiles(two).map((f) => f.name), ["Bir", "jadval-2"]);
  const plain = writeCsvFiles(readTxt("birinchi qator\nikkinchi, vergulli\n", "t"));
  assert.deepEqual(parseCsv(plain[0].text), [["birinchi qator"], ["ikkinchi, vergulli"]]);
});

test("Markdown: yozish va qayta o'qish (jadval, ro'yxat, formatlash)", () => {
  const md = writeMarkdown(sample);
  assert.match(md, /^# Kirish/m);
  assert.match(md, /\*\*qalin\*\*/);
  assert.match(md, /\| Ism \| Ball \|/);
  const back = readMarkdown(md, "t");
  assert.deepEqual(
    back.blocks.map((b) => b.t),
    sample.blocks.map((b) => b.t),
  );
  const table = back.blocks.find((b) => b.t === "table");
  assert.deepEqual(table && table.t === "table" && table.rows, [["Ism", "Ball"], ["Ali", "95"], ["O'g'iloy", "88"]]);
  const p = back.blocks[1];
  assert.ok(p.t === "p" && p.runs.some((r) => r.bold && r.text === "qalin"));
});

test("Markdown rasm qatori rasm blokiga aylanadi", () => {
  const doc = readMarkdown("Matn\n\n![logo](data:image/png;base64,AAAA)\n", "t");
  assert.deepEqual(doc.blocks[1], { t: "img", alt: "logo", src: "data:image/png;base64,AAAA" });
});

test("JSON: obyektlar massivi jadvalga va qaytib", () => {
  const doc = readJson('[{"ism":"Ali","ball":95},{"ism":"Vali","kurs":2}]', "t");
  const t = doc.blocks[0];
  assert.ok(t.t === "table");
  assert.deepEqual(t.rows, [["ism", "ball", "kurs"], ["Ali", "95", ""], ["Vali", "", "2"]]);
  assert.deepEqual(JSON.parse(writeJson(doc)), [{ ism: "Ali", ball: "95", kurs: "" }, { ism: "Vali", ball: "", kurs: "2" }]);
  // Matnli hujjat — tuzilma saqlanadi va qayta tiklanadi
  assert.deepEqual(readJson(writeJson(sample), "x"), sample);
  assert.throws(() => readJson("{buzuq", "t"), /noto'g'ri/);
});

test("RTF: yozish va o'qish (kirill, o'zbek apostrofi, qalin, jadval)", () => {
  const rtf = writeRtf(sample);
  assert.ok(rtf.startsWith("{\\rtf1"));
  const back = readRtf(rtf, "t");
  const texts = back.blocks.filter((b) => b.t === "p").map((b) => (b.t === "p" ? runsText(b.runs) : ""));
  assert.ok(texts.includes("Kirish"));
  assert.ok(texts.includes("Кирилл матн ҳам ишлайди — ўзбекча."), texts.join(" | "));
  const para = back.blocks.find((b) => b.t === "p" && runsText(b.runs).startsWith("Oddiy"));
  assert.ok(para && para.t === "p" && para.runs.some((r) => r.bold && r.text === "qalin"));
  const table = back.blocks.find((b) => b.t === "table");
  assert.deepEqual(table && table.t === "table" && table.rows, [["Ism", "Ball"], ["Ali", "95"], ["O'g'iloy", "88"]]);
});

test("RTF: Windows-1251 kodlashdagi \\'hh belgilar", () => {
  const doc = readRtf("{\\rtf1\\ansi\\ansicpg1251 {\\fonttbl{\\f0 Arial;}}\\'cf\\'f0\\'e8\\'e2\\'e5\\'f2\\par}", "t");
  assert.equal(doc.blocks[0].t === "p" && runsText(doc.blocks[0].runs), "Привет");
});

test("TXT va HTML yozish", () => {
  const txt = writeTxt(sample);
  assert.match(txt, /^Kirish$/m);
  assert.match(txt, /^• birinchi$/m);
  assert.match(txt, /^Ism\tBall$/m);
  const html = writeHtml({ title: "<x>", blocks: [{ t: "p", runs: [{ text: "a < b & c", bold: true }] }] });
  assert.match(html, /<title>&lt;x&gt;<\/title>/);
  assert.match(html, /<strong>a &lt; b &amp; c<\/strong>/);
});

test("Excel varaq nomlari: taqiqlangan belgilar, uzunlik, takrorlanish", () => {
  assert.deepEqual(sheetNames(["Hisobot [2026]", "", "a".repeat(40), "Hisobot  2026 ", "HISOBOT  2026"]), [
    "Hisobot  2026",
    "Varaq2",
    "a".repeat(31),
    "Hisobot  2026 (2)",
    "HISOBOT  2026 (3)",
  ]);
});

test("Slaydlar va EPUB boblari sarlavhalar bo'yicha bo'linadi", () => {
  const slides = toSlides(sample);
  assert.deepEqual(
    slides.map((s) => s.title),
    ["Kirish", "Kirish (davomi)", "Xulosa"],
  );
  assert.equal(slides[1].items[0].t, "table");
  // Boblar eng yuqori darajadagi sarlavhada boshlanadi (bu yerda H1), H2 bob ichida qoladi
  assert.deepEqual(
    chapters(sample).map((c) => c.title),
    ["Kirish"],
  );
  const book: Doc = { title: "Kitob", blocks: [{ t: "p", runs: [{ text: "So'zboshi" }] }, ...sample.blocks, { t: "h", level: 1, runs: [{ text: "Ikkinchi bob" }] }] };
  assert.deepEqual(
    chapters(book).map((c) => c.title),
    ["Kitob", "Kirish", "Ikkinchi bob"],
  );
});
