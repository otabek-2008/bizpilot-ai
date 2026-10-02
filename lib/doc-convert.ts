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

type Piece = { str: string; x: number; y: number; w: number; size: number; eol: boolean };
type Line = { text: string; size: number; y: number };
// Chiziq: gorizontal uchun pos=y, from/to=x; vertikal uchun pos=x, from/to=y
type Seg = { pos: number; from: number; to: number };
type Cell = { row: number; col: number; rowSpan: number; colSpan: number; pieces: Piece[] };
type GridTable = { xs: number[]; ys: number[]; cells: Cell[] };
type Matrix = [number, number, number, number, number, number];

const TOL = 2; // pt

const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

type PdfJs = Awaited<ReturnType<typeof loadPdfJs>>;
type PdfPage = Awaited<ReturnType<Awaited<ReturnType<typeof openPdf>>["getPage"]>>;

// Sahifadagi gorizontal va vertikal chiziqlar (jadval chegaralari) — chizilgan yoki ingichka to'rtburchak sifatida bo'yalgan.
async function pageRulings(page: PdfPage, OPS: PdfJs["OPS"]) {
  const { fnArray, argsArray } = await page.getOperatorList();
  const h: Seg[] = [];
  const v: Seg[] = [];
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    if (Math.abs(y1 - y2) <= TOL / 2 && Math.abs(x1 - x2) > TOL) {
      h.push({ pos: (y1 + y2) / 2, from: Math.min(x1, x2), to: Math.max(x1, x2) });
    } else if (Math.abs(x1 - x2) <= TOL / 2 && Math.abs(y1 - y2) > TOL) {
      v.push({ pos: (x1 + x2) / 2, from: Math.min(y1, y2), to: Math.max(y1, y2) });
    }
  };
  const strokeOps = new Set<number>([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const fillOps = new Set<number>([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);

  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = mul(ctm, args as Matrix);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      if (Array.isArray(args[0]) && args[0].length === 6) ctm = mul(ctm, args[0] as Matrix);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.constructPath) {
      const op = args[0] as number;
      const data = (args[1] as ArrayLike<number>[] | undefined)?.[0];
      if (!data || (!strokeOps.has(op) && !fillOps.has(op))) continue;

      // Yo'lni qism-yo'llarga ajratamiz; egri chiziqli qism-yo'llar e'tiborga olinmaydi
      const subpaths: { pts: [number, number][]; closed: boolean; curved: boolean }[] = [];
      let cur: (typeof subpaths)[number] | null = null;
      for (let k = 0; k < data.length; ) {
        const code = data[k++];
        if (code === 0) {
          cur = { pts: [apply(ctm, data[k++], data[k++])], closed: false, curved: false };
          subpaths.push(cur);
        } else if (code === 1) {
          const p = apply(ctm, data[k++], data[k++]);
          if (cur) cur.pts.push(p);
        } else if (code === 2) {
          k += 6;
          if (cur) cur.curved = true;
        } else if (code === 3) {
          k += 4;
          if (cur) cur.curved = true;
        } else if (code === 4) {
          if (cur) cur.closed = true;
        } else break;
      }

      for (const sp of subpaths) {
        if (sp.curved || sp.pts.length < 2) continue;
        if (strokeOps.has(op)) {
          for (let k = 1; k < sp.pts.length; k++) add(...sp.pts[k - 1], ...sp.pts[k]);
          if (sp.closed) add(...sp.pts[sp.pts.length - 1], ...sp.pts[0]);
        }
        if (fillOps.has(op)) {
          // Ingichka bo'yalgan to'rtburchak — chiziq sifatida
          const xs = sp.pts.map((p) => p[0]);
          const ys = sp.pts.map((p) => p[1]);
          const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
          if (y1 - y0 <= 3 && x1 - x0 > TOL) add(x0, (y0 + y1) / 2, x1, (y0 + y1) / 2);
          else if (x1 - x0 <= 3 && y1 - y0 > TOL) add((x0 + x1) / 2, y0, (x0 + x1) / 2, y1);
        }
      }
    }
  }
  return { h: mergeSegs(h), v: mergeSegs(v) };
}

function mergeSegs(segs: Seg[]): Seg[] {
  const sorted = [...segs].sort((a, b) => a.pos - b.pos || a.from - b.from);
  const out: Seg[] = [];
  for (const s of sorted) {
    const last = out.find((o) => Math.abs(o.pos - s.pos) <= TOL && s.from <= o.to + TOL && s.to >= o.from - TOL);
    if (last) {
      last.from = Math.min(last.from, s.from);
      last.to = Math.max(last.to, s.to);
    } else out.push({ ...s });
  }
  return out;
}

function cluster(vals: number[]): number[] {
  const sorted = [...vals].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (g && v - g[g.length - 1] <= TOL) g.push(v);
    else groups.push([v]);
  }
  return groups.map((g) => g.reduce((a, b) => a + b, 0) / g.length);
}

const covers = (segs: Seg[], pos: number, at: number) =>
  segs.some((s) => Math.abs(s.pos - pos) <= TOL && s.from - TOL <= at && s.to + TOL >= at);

// Kesishgan chiziqlar guruhidan jadval to'rini quradi (birlashtirilgan kataklar bilan)
function findTables(h: Seg[], v: Seg[]): GridTable[] {
  const parent = [...Array(h.length + v.length).keys()];
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  h.forEach((hs, i) =>
    v.forEach((vs, j) => {
      if (vs.pos >= hs.from - TOL && vs.pos <= hs.to + TOL && hs.pos >= vs.from - TOL && hs.pos <= vs.to + TOL) {
        parent[find(i)] = find(h.length + j);
      }
    }),
  );
  const groups = new Map<number, { h: Seg[]; v: Seg[] }>();
  h.forEach((s, i) => {
    const g = groups.get(find(i)) ?? { h: [], v: [] };
    g.h.push(s);
    groups.set(find(i), g);
  });
  v.forEach((s, j) => {
    const g = groups.get(find(h.length + j)) ?? { h: [], v: [] };
    g.v.push(s);
    groups.set(find(h.length + j), g);
  });

  const tables: GridTable[] = [];
  for (const g of groups.values()) {
    if (!g.h.length || !g.v.length) continue;
    // Tashqi chegarasi chizilmagan jadvallar uchun chetlarni ham qo'shamiz
    const xs = cluster([...g.v.map((s) => s.pos), Math.min(...g.h.map((s) => s.from)), Math.max(...g.h.map((s) => s.to))]);
    const ys = cluster([...g.h.map((s) => s.pos), Math.min(...g.v.map((s) => s.from)), Math.max(...g.v.map((s) => s.to))]).reverse();
    const R = ys.length - 1;
    const C = xs.length - 1;
    if (R < 1 || C < 1 || R * C < 2) continue;

    const taken = Array.from({ length: R }, () => Array<boolean>(C).fill(false));
    const cells: Cell[] = [];
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (taken[r][c]) continue;
        const midY = (ys[r] + ys[r + 1]) / 2;
        let cs = 1;
        while (c + cs < C && !taken[r][c + cs] && !covers(g.v, xs[c + cs], midY)) cs++;
        let rs = 1;
        const cols = Array.from({ length: cs }, (_, k) => c + k);
        while (r + rs < R && cols.every((k) => !taken[r + rs][k] && !covers(g.h, ys[r + rs], (xs[k] + xs[k + 1]) / 2))) rs++;
        for (let rr = r; rr < r + rs; rr++) for (const k of cols) taken[rr][k] = true;
        cells.push({ row: r, col: c, rowSpan: rs, colSpan: cs, pieces: [] });
      }
    }
    tables.push({ xs, ys, cells });
  }
  return tables;
}

// Matn bo'laklarini qatorlarga yig'adi; bo'laklar orasidagi bo'shliq probel bilan saqlanadi
function toLines(pieces: Piece[]): Line[] {
  const lines: Line[] = [];
  let current: Line | null = null;
  let lastEnd = 0;
  for (const p of pieces) {
    if (!current || Math.abs(current.y - p.y) > p.size * 0.5) {
      if (current?.text.trim()) lines.push(current);
      current = { text: "", size: p.size, y: p.y };
    } else if (p.x - lastEnd > p.size * 0.2 && !/\s$/.test(current.text) && !/^\s/.test(p.str)) {
      current.text += " ";
    }
    current.text += p.str;
    current.size = Math.max(current.size, p.size);
    lastEnd = p.x + p.w;
    if (p.eol) {
      if (current.text.trim()) lines.push(current);
      current = null;
    }
  }
  if (current?.text.trim()) lines.push(current);
  return lines;
}

// Yaqin qatorlarni bitta xatboshiga birlashtiradi
function toBlocks(lines: Line[], breaksAt: number[] = []): Line[] {
  const blocks: Line[] = [];
  let buf: Line | null = null;
  lines.forEach((line, i) => {
    const prev = lines[i - 1];
    const sameBlock =
      buf &&
      prev &&
      Math.abs(prev.size - line.size) <= 1 &&
      prev.y - line.y > 0 &&
      prev.y - line.y < line.size * 1.8 &&
      !breaksAt.some((y) => y < prev.y && y > line.y);
    if (sameBlock && buf) {
      buf.text = buf.text.endsWith("-") ? buf.text.slice(0, -1) + line.text : `${buf.text} ${line.text}`;
    } else {
      if (buf) blocks.push(buf);
      buf = { ...line };
    }
  });
  if (buf) blocks.push(buf);
  return blocks;
}

export async function pdfToWord(file: File, onProgress?: Progress): Promise<Blob> {
  const pdf = await openPdf(file);
  const { OPS } = await loadPdfJs();
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = await import("docx");

  const pages: { lines: Line[]; tables: GridTable[] }[] = [];
  const sizes = new Map<number, number>();
  let hasText = false;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pieces: Piece[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      pieces.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        w: item.width,
        size: Math.round(Math.hypot(item.transform[2], item.transform[3]) || item.height || 11),
        eol: item.hasEOL,
      });
    }

    let tables: GridTable[] = [];
    try {
      const { h, v } = await pageRulings(page, OPS);
      tables = findTables(h, v);
    } catch {
      // Chiziqlarni o'qib bo'lmasa, sahifa oddiy matn sifatida chiqadi
    }

    // Jadval ichidagi matn kataklarga, qolgani oddiy matnga
    const placed = new Map<Piece, GridTable>();
    for (const piece of pieces) {
      if (!piece.str) continue;
      const cx = piece.x + piece.w / 2;
      const cy = piece.y + piece.size * 0.3;
      for (const t of tables) {
        const C = t.xs.length - 1;
        const R = t.ys.length - 1;
        if (cx < t.xs[0] - TOL || cx > t.xs[C] + TOL || cy > t.ys[0] + TOL || cy < t.ys[R] - TOL) continue;
        let col = 0;
        while (col < C - 1 && cx > t.xs[col + 1]) col++;
        let row = 0;
        while (row < R - 1 && cy < t.ys[row + 1]) row++;
        const cell = t.cells.find((c) => row >= c.row && row < c.row + c.rowSpan && col >= c.col && col < c.col + c.colSpan);
        if (cell) {
          cell.pieces.push(piece);
          placed.set(piece, t);
          break;
        }
      }
    }
    // Deyarli bo'sh to'rlar (diagramma, bezak ramkalari) jadval emas — matni oddiy matnga qaytadi
    tables = tables.filter((t) => {
      const filled = t.cells.filter((c) => c.pieces.some((p) => p.str.trim())).length;
      return filled >= 2 && filled / t.cells.length >= 0.25;
    });
    const free = pieces.filter((piece) => !tables.includes(placed.get(piece)!));

    const lines = toLines(free);
    for (const l of lines) sizes.set(l.size, (sizes.get(l.size) ?? 0) + l.text.length);
    if (lines.length || tables.some((t) => t.cells.some((c) => c.pieces.length))) hasText = true;
    pages.push({ lines, tables });
    onProgress?.(p, pdf.numPages);
  }

  if (!hasText) {
    throw new Error("PDF ichida matn topilmadi (skanerlangan rasm bo'lishi mumkin). Bunday fayllar uchun matnni tanib olish (OCR) kerak.");
  }

  // Asosiy matn o'lchami — eng ko'p uchraydigan shrift o'lchami
  const body = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
  const MAX_TABLE_W = 9026; // A4 dan 1" chekkalar ayirilgan kenglik, twip

  const textParagraph = (b: Line, inCell = false) => {
    const heading = !inCell && b.size >= body * 1.25;
    return new Paragraph({
      heading: heading ? (b.size >= body * 1.6 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2) : undefined,
      spacing: { after: inCell ? 0 : 120 },
      children: [new TextRun({ text: b.text.trim(), size: Math.round(b.size * 2), bold: heading })],
    });
  };

  const sections = pages.map(({ lines, tables }) => {
    const tops = tables.map((t) => t.ys[0]);
    const items: { y: number; el: InstanceType<typeof Paragraph> | InstanceType<typeof Table> }[] = toBlocks(lines, tops).map((b) => ({
      y: b.y,
      el: textParagraph(b),
    }));

    for (const t of tables) {
      const widths = t.xs.slice(1).map((x, i) => (x - t.xs[i]) * 20);
      const scale = Math.min(1, MAX_TABLE_W / widths.reduce((a, b) => a + b, 0));
      const colW = widths.map((w) => Math.round(w * scale));
      const rows = t.ys.slice(1).map((_, r) =>
        new TableRow({
          children: t.cells
            .filter((c) => c.row === r)
            .sort((a, b) => a.col - b.col)
            .map((c) => {
              const blocks = toBlocks(toLines(c.pieces));
              return new TableCell({
                columnSpan: c.colSpan > 1 ? c.colSpan : undefined,
                rowSpan: c.rowSpan > 1 ? c.rowSpan : undefined,
                width: { size: colW.slice(c.col, c.col + c.colSpan).reduce((a, b) => a + b, 0), type: WidthType.DXA },
                children: blocks.length ? blocks.map((b) => textParagraph(b, true)) : [new Paragraph("")],
              });
            }),
        }),
      );
      items.push({
        y: t.ys[0],
        el: new Table({ width: { size: colW.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: colW, rows }),
      });
    }

    items.sort((a, b) => b.y - a.y);
    // Jadvaldan keyin bo'sh xatboshi — ketma-ket jadvallar bir-biriga yopishib qolmasligi uchun
    const children = items.flatMap((it) => (it.el instanceof Table ? [it.el, new Paragraph("")] : [it.el]));
    return { children: children.length ? children : [new Paragraph("")] };
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
