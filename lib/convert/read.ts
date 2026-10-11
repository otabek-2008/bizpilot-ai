// Fayllarni oraliq modelga o'qish — brauzerda (DOMParser, canvas, pdf.js kerak).

import type { FormatId } from "./formats";
import { bytesToBase64, runsText, squareRows, tidyRuns, type Block, type Doc, type HLevel, type Run } from "./model";
import { readCsv, readJson, readMarkdown, readRtf, readTxt } from "./text";
import type { Progress } from "@/lib/doc-convert";

type Zip = Awaited<ReturnType<typeof loadZip>>;

async function loadZip(file: Blob) {
  const JSZip = (await import("jszip")).default;
  try {
    return await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("Fayl buzilgan yoki noto'g'ri formatda — arxivni ochib bo'lmadi.");
  }
}

const xml = (text: string) => new DOMParser().parseFromString(text, "application/xml");

async function zipXml(zip: Zip, path: string) {
  const f = zip.file(path);
  return f ? xml(await f.async("string")) : null;
}

// Nomlar maydonidan qat'i nazar teg nomi bo'yicha qidirish
const byTag = (root: Document | Element, local: string) => Array.from(root.getElementsByTagNameNS("*", local));
const children = (el: Element, local?: string) => Array.from(el.children).filter((c) => !local || c.localName === local);

// UTF-8 bo'lmasa — eski kirill/lotin kodlash (Windows-1251)
export async function decodeText(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1251").decode(buf);
  }
}

// ---------------- HTML → model ----------------

const BLOCK_TAGS = new Set(["p", "div", "section", "article", "main", "header", "footer", "aside", "nav", "figure", "figcaption", "body", "center", "address", "details", "summary", "form", "fieldset", "dl", "dd", "dt"]);
const SKIP_TAGS = new Set(["script", "style", "noscript", "template", "head", "svg", "canvas", "iframe", "object", "button", "select", "input", "textarea", "math"]);

export function htmlToDoc(html: string, title: string): Doc {
  const dom = new DOMParser().parseFromString(html, "text/html");
  const docTitle = dom.querySelector("title")?.textContent?.trim() || title;
  const blocks: Block[] = [];
  let runs: Run[] = [];

  const flush = () => {
    const r = tidyRuns(runs.map((x) => ({ ...x, text: x.text.replace(/\s+/g, " ") })));
    if (r.length) blocks.push({ t: "p", runs: r });
    runs = [];
  };

  type Marks = Omit<Run, "text">;
  const inline = (node: Node, marks: Marks, out: Run[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push({ ...marks, text: node.textContent ?? "" });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.localName;
    if (SKIP_TAGS.has(tag)) return;
    if (tag === "br") {
      out.push({ ...marks, text: "\n" });
      return;
    }
    const style = (el.getAttribute("style") ?? "").toLowerCase();
    const m: Marks = { ...marks };
    if (tag === "b" || tag === "strong" || /font-weight:\s*(bold|[6-9]00)/.test(style)) m.bold = true;
    if (tag === "i" || tag === "em" || tag === "cite" || /font-style:\s*italic/.test(style)) m.italic = true;
    if (tag === "u" || tag === "ins" || /text-decoration[^;]*underline/.test(style)) m.underline = true;
    if (tag === "code" || tag === "kbd" || tag === "samp" || tag === "tt") m.code = true;
    if (tag === "a" && el.getAttribute("href") && !el.getAttribute("href")!.startsWith("#")) m.href = el.getAttribute("href")!;
    el.childNodes.forEach((c) => inline(c, m, out));
  };

  // <br> bilan ajratilgan qatorlar alohida xatboshiga aylanadi
  const pushRuns = (rs: Run[], make: (r: Run[]) => Block) => {
    let cur: Run[] = [];
    const done = () => {
      const t = tidyRuns(cur.map((x) => ({ ...x, text: x.text.replace(/\s+/g, " ") })));
      if (t.length) blocks.push(make(t));
      cur = [];
    };
    for (const r of rs) {
      const parts = r.text.split("\n");
      parts.forEach((p, i) => {
        if (i) done();
        cur.push({ ...r, text: p });
      });
    }
    done();
  };

  const cellText = (el: Element) => (el as HTMLElement).innerText?.trim() || el.textContent?.replace(/\s+/g, " ").trim() || "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      runs.push({ text: node.textContent ?? "" });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.localName;
    if (SKIP_TAGS.has(tag) || el.getAttribute("hidden") !== null || el.getAttribute("aria-hidden") === "true") return;

    const h = /^h([1-6])$/.exec(tag);
    if (h) {
      flush();
      const r: Run[] = [];
      inline(el, {}, r);
      const t = tidyRuns(r.map((x) => ({ ...x, text: x.text.replace(/\s+/g, " ") })));
      if (t.length) blocks.push({ t: "h", level: Number(h[1]) as HLevel, runs: t });
      return;
    }
    if (tag === "ul" || tag === "ol") {
      flush();
      const items: Run[][] = [];
      const collect = (list: Element) => {
        for (const li of children(list, "li")) {
          const r: Run[] = [];
          li.childNodes.forEach((c) => {
            if (c.nodeType === Node.ELEMENT_NODE && ["ul", "ol"].includes((c as Element).localName)) return;
            inline(c, {}, r);
          });
          const t = tidyRuns(r.map((x) => ({ ...x, text: x.text.replace(/\s+/g, " ") })));
          if (t.length) items.push(t);
          li.querySelectorAll(":scope > ul, :scope > ol").forEach(collect);
        }
      };
      collect(el);
      if (items.length) blocks.push({ t: "list", ordered: tag === "ol", items });
      return;
    }
    if (tag === "table") {
      flush();
      const rows = Array.from(el.querySelectorAll("tr"))
        .filter((tr) => tr.closest("table") === el)
        .map((tr) => children(tr).filter((c) => c.localName === "td" || c.localName === "th"));
      const data = rows.map((cells) => cells.flatMap((c) => [cellText(c), ...Array<string>(Math.max(0, Number(c.getAttribute("colspan") || 1) - 1)).fill("")]));
      if (data.some((r) => r.some(Boolean))) {
        const header = !!el.querySelector("thead") || (rows[0]?.length > 0 && rows[0].every((c) => c.localName === "th"));
        blocks.push({ t: "table", rows: squareRows(data), header, name: el.querySelector("caption")?.textContent?.trim() || undefined });
      }
      return;
    }
    if (tag === "img") {
      flush();
      const src = el.getAttribute("src");
      if (src) blocks.push({ t: "img", src, alt: el.getAttribute("alt") ?? undefined, w: Number(el.getAttribute("width")) || undefined, h: Number(el.getAttribute("height")) || undefined });
      return;
    }
    if (tag === "pre") {
      flush();
      blocks.push({ t: "code", text: (el.textContent ?? "").replace(/\n$/, "") });
      return;
    }
    if (tag === "blockquote") {
      flush();
      const r: Run[] = [];
      inline(el, {}, r);
      pushRuns(r, (t) => ({ t: "quote", runs: t }));
      return;
    }
    if (tag === "hr") {
      flush();
      blocks.push({ t: "hr" });
      return;
    }
    if (tag === "p" || tag === "li" || tag === "dt" || tag === "dd" || tag === "figcaption" || tag === "summary") {
      flush();
      // Ichida blok elementlar (rasm, jadval) bo'lsa — rekursiv
      if (el.querySelector("img,table,ul,ol,pre,h1,h2,h3,h4,h5,h6,p,div")) {
        el.childNodes.forEach(walk);
        flush();
        return;
      }
      const r: Run[] = [];
      inline(el, {}, r);
      pushRuns(r, (t) => ({ t: "p", runs: t }));
      return;
    }
    if (BLOCK_TAGS.has(tag) || tag === "html") {
      flush();
      if (/page-break-(before|after):\s*always|break-(before|after):\s*page/.test(el.getAttribute("style") ?? "") || el.classList.contains("page-break")) {
        blocks.push({ t: "break" });
      }
      el.childNodes.forEach(walk);
      flush();
      return;
    }
    if (tag === "br") {
      flush();
      return;
    }
    // Inline element; ichida rasm yoki blok bo'lsa — blok sifatida
    if (el.querySelector("img,table,ul,ol,pre,p,div,h1,h2,h3,h4,h5,h6,blockquote,hr")) {
      el.childNodes.forEach(walk);
      return;
    }
    const r: Run[] = [];
    inline(el, {}, r);
    for (const x of r) {
      if (x.text.includes("\n")) {
        const parts = x.text.split("\n");
        parts.forEach((p, i) => {
          if (i) flush();
          runs.push({ ...x, text: p });
        });
      } else runs.push(x);
    }
  };

  walk(dom.body);
  flush();
  return { title: docTitle, blocks };
}

// ---------------- DOCX ----------------

export async function readDocx(file: File, title: string): Promise<Doc> {
  if (/\.doc$/i.test(file.name)) throw new Error("Eski .doc formati qo'llab-quvvatlanmaydi. Faylni Word'da .docx sifatida saqlang.");
  const mammoth = (await import("mammoth")).default;
  try {
    const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return htmlToDoc(value, title);
  } catch {
    throw new Error("Word faylni o'qib bo'lmadi — fayl buzilgan yoki parol bilan himoyalangan.");
  }
}

// ---------------- PDF ----------------

export async function readPdf(file: File, title: string, onProgress?: Progress): Promise<Doc> {
  const { extractPdf, toBlocks, toLines } = await import("@/lib/doc-convert");
  const { pages, body } = await extractPdf(file, onProgress);
  const blocks: Block[] = [];
  pages.forEach(({ lines, tables }, pi) => {
    if (pi > 0) blocks.push({ t: "break" });
    const items: { y: number; b: Block }[] = toBlocks(lines, tables.map((t) => t.ys[0])).map((l) => {
      const text = l.text.trim();
      const level = l.size >= body * 1.6 ? 1 : l.size >= body * 1.25 ? 2 : 0;
      return { y: l.y, b: level ? { t: "h", level: level as 1 | 2, runs: [{ text }] } : { t: "p", runs: [{ text }] } };
    });
    for (const t of tables) {
      const R = t.ys.length - 1;
      const C = t.xs.length - 1;
      const rows = Array.from({ length: R }, () => Array<string>(C).fill(""));
      for (const c of t.cells) {
        rows[c.row][c.col] = toBlocks(toLines(c.pieces))
          .map((l) => l.text.trim())
          .join(" ");
      }
      items.push({ y: t.ys[0], b: { t: "table", rows, header: false } });
    }
    items.sort((a, b) => b.y - a.y).forEach((it) => blocks.push(it.b));
  });
  return { title, blocks };
}

// ---------------- ODT ----------------

export async function readOdt(file: File, title: string): Promise<Doc> {
  const zip = await loadZip(file);
  const content = await zipXml(zip, "content.xml");
  if (!content) throw new Error("ODT fayl ichida content.xml topilmadi.");

  // Avtomatik uslublardan qalin/kursiv belgilarini aniqlaymiz
  const marks = new Map<string, Omit<Run, "text">>();
  const headingStyles = new Map<string, number>();
  for (const st of byTag(content, "style")) {
    const name = st.getAttribute("style:name") ?? "";
    const tp = children(st, "text-properties")[0];
    const parent = st.getAttribute("style:parent-style-name") ?? "";
    const hm = /Heading_20_(\d)/.exec(parent);
    if (hm) headingStyles.set(name, Number(hm[1]));
    if (!tp) continue;
    marks.set(name, {
      bold: tp.getAttribute("fo:font-weight") === "bold" || undefined,
      italic: tp.getAttribute("fo:font-style") === "italic" || undefined,
      underline: (tp.getAttribute("style:text-underline-style") ?? "none") !== "none" || undefined,
    });
  }

  const pictures = new Map<string, string>();
  for (const path of Object.keys(zip.files).filter((p) => /^Pictures\/./.test(p) && !zip.files[p].dir)) {
    const ext = path.split(".").pop()!.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
    pictures.set(path, `data:${mime};base64,${bytesToBase64(await zip.file(path)!.async("uint8array"))}`);
  }

  const runsOf = (el: Element, base: Omit<Run, "text"> = {}): Run[] => {
    const out: Run[] = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) out.push({ ...base, text: n.textContent ?? "" });
      else if (n.nodeType === Node.ELEMENT_NODE) {
        const c = n as Element;
        if (c.localName === "s") out.push({ ...base, text: " ".repeat(Number(c.getAttribute("text:c") || 1)) });
        else if (c.localName === "tab") out.push({ ...base, text: "\t" });
        else if (c.localName === "line-break") out.push({ ...base, text: " " });
        else if (c.localName === "span") out.push(...runsOf(c, { ...base, ...marks.get(c.getAttribute("text:style-name") ?? "") }));
        else if (c.localName === "a") out.push(...runsOf(c, { ...base, href: c.getAttribute("xlink:href") ?? undefined }));
        else if (c.localName === "note" || c.localName === "annotation" || c.localName === "frame") return;
        else out.push(...runsOf(c, base));
      }
    });
    return out;
  };

  const blocks: Block[] = [];
  const images = (el: Element) => {
    for (const img of byTag(el, "image")) {
      const src = pictures.get(img.getAttribute("xlink:href") ?? "");
      if (src) blocks.push({ t: "img", src });
    }
  };

  const walk = (el: Element) => {
    for (const c of children(el)) {
      if (c.localName === "h") {
        const t = tidyRuns(runsOf(c));
        if (t.length) blocks.push({ t: "h", level: Math.min(6, Math.max(1, Number(c.getAttribute("text:outline-level") || 1))) as HLevel, runs: t });
      } else if (c.localName === "p") {
        const level = headingStyles.get(c.getAttribute("text:style-name") ?? "");
        const t = tidyRuns(runsOf(c));
        if (t.length) blocks.push(level ? { t: "h", level: level as HLevel, runs: t } : { t: "p", runs: t });
        images(c);
      } else if (c.localName === "list") {
        const items: Run[][] = [];
        const collect = (list: Element) => {
          for (const li of children(list, "list-item")) {
            for (const x of children(li)) {
              if (x.localName === "list") collect(x);
              else {
                const t = tidyRuns(runsOf(x));
                if (t.length) items.push(t);
              }
            }
          }
        };
        collect(c);
        const styleName = c.getAttribute("text:style-name") ?? "";
        const style = byTag(content, "list-style").find((s) => s.getAttribute("style:name") === styleName);
        const ordered = !!style && children(style)[0]?.localName === "list-level-style-number";
        if (items.length) blocks.push({ t: "list", ordered, items });
      } else if (c.localName === "table") {
        const rows = byTag(c, "table-row").map((tr) =>
          children(tr)
            .filter((x) => x.localName === "table-cell" || x.localName === "covered-table-cell")
            .flatMap((cell) => Array<string>(Math.min(50, Number(cell.getAttribute("table:number-columns-repeated") || 1))).fill(byTag(cell, "p").map((p) => p.textContent ?? "").join(" ").trim())),
        );
        blocks.push({ t: "table", rows: squareRows(rows), header: !!byTag(c, "table-header-rows").length, name: c.getAttribute("table:name") ?? undefined });
      } else if (c.localName === "section" || c.localName === "text" || c.localName === "body") walk(c);
    }
  };
  const text = byTag(content, "text").find((e) => e.parentElement?.localName === "body");
  if (text) walk(text);
  return { title, blocks };
}

// ---------------- PPTX ----------------

export async function readPptx(file: File, title: string): Promise<Doc> {
  const zip = await loadZip(file);
  const pres = await zipXml(zip, "ppt/presentation.xml");
  const rels = await zipXml(zip, "ppt/_rels/presentation.xml.rels");
  if (!pres || !rels) throw new Error("PowerPoint fayl tuzilishi noto'g'ri.");

  const relTarget = new Map(byTag(rels, "Relationship").map((r) => [r.getAttribute("Id")!, r.getAttribute("Target")!]));
  const order = byTag(pres, "sldId")
    .map((s) => relTarget.get(s.getAttribute("r:id") ?? s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? ""))
    .filter((t): t is string => !!t)
    .map((t) => `ppt/${t.replace(/^\/?ppt\//, "")}`);

  const blocks: Block[] = [];
  for (const [si, path] of order.entries()) {
    const slide = await zipXml(zip, path);
    if (!slide) continue;
    if (si > 0) blocks.push({ t: "break" });
    const slideRels = await zipXml(zip, path.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels"));
    const imgTarget = new Map(slideRels ? byTag(slideRels, "Relationship").map((r) => [r.getAttribute("Id")!, r.getAttribute("Target")!]) : []);

    // Sarlavha joy egasi bo'lmasa, slayddagi birinchi qisqa bir qatorli matn sarlavha hisoblanadi
    let titled = false;
    let first = true;
    // Shakllar hujjatdagi tartibda: matn qutilari, jadvallar, rasmlar
    const tree = byTag(slide, "spTree")[0];
    const shapes = tree ? byTag(tree, "*").filter((e) => ["sp", "graphicFrame", "pic"].includes(e.localName) && e.namespaceURI?.includes("presentationml")) : [];
    for (const sh of shapes) {
      if (sh.localName === "sp") {
        const ph = byTag(sh, "ph")[0]?.getAttribute("type") ?? "";
        const paras = byTag(sh, "p")
          .filter((p) => p.namespaceURI?.includes("drawingml"))
          .map((p) =>
            tidyRuns(
              byTag(p, "r").map((r) => {
                const pr = children(r, "rPr")[0];
                return { text: children(r, "t")[0]?.textContent ?? "", bold: pr?.getAttribute("b") === "1" || undefined, italic: pr?.getAttribute("i") === "1" || undefined };
              }),
            ),
          )
          .filter((r) => r.length);
        if (!paras.length) continue;
        const looksTitle = first && !ph && paras.length === 1 && runsText(paras[0]).length <= 80;
        first = false;
        if ((ph === "title" || ph === "ctrTitle" || looksTitle) && !titled) {
          blocks.push({ t: "h", level: 2, runs: paras.flat() });
          titled = true;
        } else if (paras.length > 1 && ph !== "subTitle") blocks.push({ t: "list", ordered: false, items: paras });
        else paras.forEach((r) => blocks.push({ t: "p", runs: r }));
      } else if (sh.localName === "graphicFrame") {
        const tbl = byTag(sh, "tbl")[0];
        if (!tbl) continue;
        const rows = byTag(tbl, "tr").map((tr) => byTag(tr, "tc").map((tc) => byTag(tc, "t").map((t) => t.textContent).join("").trim()));
        if (rows.length) blocks.push({ t: "table", rows: squareRows(rows), header: true });
      } else if (sh.localName === "pic") {
        const id = byTag(sh, "blip")[0]?.getAttribute("r:embed");
        const target = id && imgTarget.get(id);
        if (!target) continue;
        const imgPath = new URL(target, `https://x/${path}`).pathname.slice(1);
        const f = zip.file(imgPath);
        if (!f) continue;
        const ext = imgPath.split(".").pop()!.toLowerCase();
        if (!["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) continue;
        const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        blocks.push({ t: "img", src: `data:${mime};base64,${bytesToBase64(await f.async("uint8array"))}` });
      }
    }
  }
  return { title, blocks };
}

// ---------------- XLSX ----------------

const colIndex = (ref: string) => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
};

export async function readXlsx(file: File, title: string): Promise<Doc> {
  if (/\.xls$/i.test(file.name)) throw new Error("Eski .xls formati qo'llab-quvvatlanmaydi. Faylni Excel'da .xlsx sifatida saqlang.");
  const zip = await loadZip(file);
  const wb = await zipXml(zip, "xl/workbook.xml");
  const rels = await zipXml(zip, "xl/_rels/workbook.xml.rels");
  if (!wb || !rels) throw new Error("Excel fayl tuzilishi noto'g'ri.");

  const sst = await zipXml(zip, "xl/sharedStrings.xml");
  const strings = sst ? byTag(sst, "si").map((si) => byTag(si, "t").map((t) => t.textContent).join("")) : [];
  const relTarget = new Map(byTag(rels, "Relationship").map((r) => [r.getAttribute("Id")!, r.getAttribute("Target")!]));

  const blocks: Block[] = [];
  for (const sh of byTag(wb, "sheet")) {
    const rid = sh.getAttribute("r:id") ?? sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "";
    const target = relTarget.get(rid);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    const sheet = await zipXml(zip, path);
    if (!sheet) continue;
    const rows: string[][] = [];
    for (const row of byTag(sheet, "row")) {
      const r = Math.max(0, Number(row.getAttribute("r") || rows.length + 1) - 1);
      const vals: string[] = [];
      for (const c of children(row, "c")) {
        const type = c.getAttribute("t");
        const v = children(c, "v")[0]?.textContent ?? "";
        let text = "";
        if (type === "s") text = strings[Number(v)] ?? "";
        else if (type === "inlineStr") text = byTag(c, "t").map((t) => t.textContent).join("");
        else if (type === "b") text = v === "1" ? "TRUE" : "FALSE";
        else text = v;
        vals[colIndex(c.getAttribute("r") ?? "A")] = text;
      }
      while (rows.length < r) rows.push([]);
      rows[r] = Array.from(vals, (x) => x ?? "");
    }
    // Bo'sh qator va ustunlarni chetlardan kesamiz
    const filled = rows.filter((r) => r.some((c) => c));
    if (filled.length) blocks.push({ t: "table", rows: squareRows(filled), header: true, name: sh.getAttribute("name") ?? undefined });
  }
  return { title, blocks };
}

// ---------------- EPUB ----------------

export async function readEpub(file: File, title: string): Promise<Doc> {
  const zip = await loadZip(file);
  const container = await zipXml(zip, "META-INF/container.xml");
  const opfPath = container && byTag(container, "rootfile")[0]?.getAttribute("full-path");
  const opf = opfPath ? await zipXml(zip, opfPath) : null;
  if (!opf || !opfPath) throw new Error("EPUB tuzilishi noto'g'ri — content.opf topilmadi.");
  const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const resolve = (from: string, href: string) => decodeURIComponent(new URL(href, `https://x/${from}`).pathname.slice(1));

  const manifest = new Map(byTag(opf, "item").map((i) => [i.getAttribute("id")!, { href: i.getAttribute("href")!, type: i.getAttribute("media-type") ?? "" }]));
  const bookTitle = byTag(opf, "title")[0]?.textContent?.trim() || title;
  const blocks: Block[] = [];

  for (const ref of byTag(opf, "itemref")) {
    const item = manifest.get(ref.getAttribute("idref") ?? "");
    if (!item || !/html/.test(item.type)) continue;
    const path = resolve(base, item.href);
    const f = zip.file(path);
    if (!f) continue;
    const dom = new DOMParser().parseFromString(await f.async("string"), "text/html");
    // Rasmlarni arxivdan data: URL'ga aylantiramiz
    for (const img of Array.from(dom.querySelectorAll("img, image"))) {
      const href = img.getAttribute("src") ?? img.getAttribute("xlink:href") ?? img.getAttribute("href");
      if (!href) continue;
      const imgPath = resolve(path, href);
      const data = zip.file(imgPath);
      if (!data) continue;
      const ext = imgPath.split(".").pop()!.toLowerCase();
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : `image/${ext}`;
      const out = dom.createElement("img");
      out.setAttribute("src", `data:${mime};base64,${bytesToBase64(await data.async("uint8array"))}`);
      out.setAttribute("alt", img.getAttribute("alt") ?? "");
      (img.localName === "image" ? (img.closest("svg") ?? img) : img).replaceWith(out);
    }
    blocks.push(...htmlToDoc(dom.documentElement.outerHTML, bookTitle).blocks);
  }
  return { title: bookTitle, blocks };
}

// ---------------- Rasm ----------------

export async function readImage(file: File): Promise<Block> {
  const src = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error(`«${file.name}» rasmini o'qib bo'lmadi.`));
    r.readAsDataURL(file);
  });
  return { t: "img", src, alt: file.name.replace(/\.[^.]+$/, "") };
}

// ---------------- Umumiy ----------------

export async function readFile(file: File, from: FormatId, onProgress?: Progress): Promise<Doc> {
  const title = file.name.replace(/\.[^.]+$/, "");
  switch (from) {
    case "pdf":
      return readPdf(file, title, onProgress);
    case "docx":
      return readDocx(file, title);
    case "odt":
      return readOdt(file, title);
    case "pptx":
      return readPptx(file, title);
    case "xlsx":
      return readXlsx(file, title);
    case "epub":
      return readEpub(file, title);
    case "html":
      return htmlToDoc(await decodeText(file), title);
    case "md":
      return readMarkdown(await decodeText(file), title);
    case "txt":
      return readTxt(await decodeText(file), title);
    case "rtf":
      return readRtf(await decodeText(file), title);
    case "csv":
      return readCsv(await decodeText(file), title);
    case "json":
      return readJson(await decodeText(file), title);
    default:
      return { title, blocks: [await readImage(file)] };
  }
}

// Rasmlarni yozuvchilar uchun tayyorlaydi: PNG/JPG ga keltiradi va o'lchamini aniqlaydi.
// Yuklab bo'lmaydigan (masalan, tashqi havola) rasmlar olib tashlanadi.
export async function prepareImages(doc: Doc, maxSide = 2400): Promise<Doc> {
  const blocks: Block[] = [];
  for (const b of doc.blocks) {
    if (b.t !== "img") {
      blocks.push(b);
      continue;
    }
    try {
      const blob = await (await fetch(b.src)).blob();
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      const s = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * s));
      const h = Math.max(1, Math.round(bitmap.height * s));
      const keep = s === 1 && (blob.type === "image/png" || blob.type === "image/jpeg") && b.src.startsWith("data:");
      if (keep) {
        bitmap.close();
        blocks.push({ ...b, w, h });
        continue;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      const src = canvas.toDataURL("image/png");
      canvas.width = canvas.height = 0;
      blocks.push({ ...b, src, w, h });
    } catch {
      // Rasmni olib bo'lmadi — tashlab ketamiz
    }
  }
  return { ...doc, blocks };
}
