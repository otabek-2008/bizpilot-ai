// Matnli formatlar: TXT, Markdown, CSV, JSON, RTF o'qish/yozish va HTML yozish.
// DOM'ga bog'liq emas — Node testlarida ham ishlaydi.

import { parseInline, parseMarkdown, type Inline } from "@/lib/markdown";
import { blockText, dataUrlParts, escapeXml, fitSize, isDataOnly, runsText, squareRows, tables, tidyRuns, type Block, type Doc, type Run } from "./model";

const fromInline = (inline: Inline[]): Run[] => tidyRuns(inline.map((s) => ({ text: s.text, bold: s.bold, italic: s.italic, code: s.code })));

// ---------------- TXT ----------------

export function readTxt(text: string, title: string): Doc {
  const blocks: Block[] = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim())
    .map((l) => ({ t: "p", runs: [{ text: l }] }));
  return { title, blocks };
}

export function writeTxt(doc: Doc): string {
  const out: string[] = [];
  for (const b of doc.blocks) {
    if (b.t === "list") out.push(b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : "•"} ${runsText(it)}`).join("\n"));
    else if (b.t === "table") out.push(squareRows(b.rows).map((r) => r.join("\t")).join("\n"));
    else if (b.t === "hr") out.push("—".repeat(20));
    else if (b.t !== "break" && b.t !== "img") out.push(blockText(b));
  }
  return out.filter(Boolean).join("\n\n") + "\n";
}

// ---------------- Markdown ----------------

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l: string) =>
  l
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

export function readMarkdown(src: string, title: string): Doc {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let chunk: string[] = [];

  const flush = () => {
    for (const b of parseMarkdown(chunk.join("\n"))) {
      if (b.type === "heading") blocks.push({ t: "h", level: b.level, runs: fromInline(b.inline) });
      else if (b.type === "paragraph") blocks.push({ t: "p", runs: fromInline(b.inline) });
      else if (b.type === "quote") blocks.push({ t: "quote", runs: fromInline(b.inline) });
      else if (b.type === "code") blocks.push({ t: "code", text: b.text });
      else blocks.push({ t: "list", ordered: b.ordered, items: b.items.map(fromInline) });
    }
    chunk = [];
  };

  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) inFence = !inFence;
    if (!inFence && isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flush();
      const rows = [splitRow(line)];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(splitRow(lines[i++]));
      i--;
      blocks.push({ t: "table", rows: squareRows(rows.map((r) => r.map((c) => runsText(fromInline(parseInline(c)))))), header: true });
      continue;
    }
    const img = !inFence && /^\s*!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)\s*$/.exec(line);
    if (img) {
      flush();
      blocks.push({ t: "img", alt: img[1], src: img[2] });
      continue;
    }
    chunk.push(line);
  }
  flush();
  return { title, blocks };
}

const mdEscape = (s: string) => s.replace(/([\\`*_[\]])/g, "\\$1");

export function mdRuns(runs: Run[]): string {
  return runs
    .map((r) => {
      if (r.code) return `\`${r.text}\``;
      const m = r.text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
      if (!m[2]) return r.text;
      let s = mdEscape(m[2]);
      if (r.bold && r.italic) s = `***${s}***`;
      else if (r.bold) s = `**${s}**`;
      else if (r.italic) s = `*${s}*`;
      if (r.href) s = `[${s}](${r.href})`;
      return m[1] + s + m[3];
    })
    .join("");
}

export function writeMarkdown(doc: Doc): string {
  const out: string[] = [];
  for (const b of doc.blocks) {
    switch (b.t) {
      case "h":
        out.push(`${"#".repeat(b.level)} ${mdRuns(b.runs)}`);
        break;
      case "p":
        out.push(mdRuns(b.runs));
        break;
      case "quote":
        out.push(`> ${mdRuns(b.runs)}`);
        break;
      case "code":
        out.push("```\n" + b.text + "\n```");
        break;
      case "list":
        out.push(b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : "-"} ${mdRuns(it)}`).join("\n"));
        break;
      case "table": {
        const rows = squareRows(b.rows).map((r) => r.map((c) => c.replace(/\|/g, "\\|").replace(/\n/g, " ")));
        if (!rows.length || !rows[0].length) break;
        const [head, ...rest] = b.header ? rows : [rows[0].map((_, i) => `${i + 1}`), ...rows];
        out.push([`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rest.map((r) => `| ${r.join(" | ")} |`)].join("\n"));
        break;
      }
      case "img":
        out.push(`![${b.alt ?? ""}](${b.src})`);
        break;
      case "hr":
        out.push("---");
        break;
    }
  }
  return out.join("\n\n") + "\n";
}

// ---------------- CSV ----------------

export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t", "|"].map((d) => [d, first.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][1] > 1 ? counts[0][0] : ",";
}

export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return squareRows(rows.filter((r) => r.some((c) => c !== "")));
}

export function readCsv(text: string, title: string): Doc {
  const rows = parseCsv(text);
  return { title, blocks: rows.length ? [{ t: "table", rows, header: true, name: title }] : [] };
}

const csvCell = (s: string) => (/[",\n\r]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
export const toCsv = (rows: string[][]) => "\uFEFF" + squareRows(rows).map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

// Jadvallar bo'lmasa — har bir matn bloki alohida qator
export function docRows(doc: Doc): string[][] {
  const rows: string[][] = [];
  for (const b of doc.blocks) {
    if (b.t === "table") rows.push(...b.rows);
    else if (b.t === "list") b.items.forEach((it) => rows.push([runsText(it)]));
    else if (b.t !== "break" && b.t !== "hr" && b.t !== "img") {
      const text = blockText(b).trim();
      if (text) rows.push([text]);
    }
  }
  return rows;
}

// Bitta jadval — bitta CSV; bir nechta jadval — har biri alohida fayl; jadval yo'q — har bir matn bloki bitta qator
export function writeCsvFiles(doc: Doc): { name: string; text: string }[] {
  const ts = tables(doc);
  if (!ts.length) return [{ name: "", text: toCsv(docRows(doc)) }];
  if (ts.length === 1) return [{ name: "", text: toCsv(ts[0].rows) }];
  return ts.map((t, i) => ({ name: t.name || `jadval-${i + 1}`, text: toCsv(t.rows) }));
}

// ---------------- JSON ----------------

const cellString = (v: unknown): string => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
const isPlainObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function jsonTable(arr: unknown[], name?: string): Block {
  if (arr.every(Array.isArray)) return { t: "table", rows: squareRows((arr as unknown[][]).map((r) => r.map(cellString))), header: false, name };
  if (arr.every(isPlainObject)) {
    const keys = [...new Set(arr.flatMap((o) => Object.keys(o as object)))];
    return { t: "table", rows: [keys, ...arr.map((o) => keys.map((k) => cellString((o as Record<string, unknown>)[k])))], header: true, name };
  }
  return { t: "table", rows: [["qiymat"], ...arr.map((v) => [cellString(v)])], header: true, name };
}

export function readJson(text: string, title: string): Doc {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("JSON fayl noto'g'ri tuzilgan — o'qib bo'lmadi.");
  }
  // O'zimiz yozgan "hujjat" JSON'ini qayta tiklaymiz
  if (isPlainObject(data) && Array.isArray(data.blocks) && data.blocks.every((b) => isPlainObject(b) && typeof b.t === "string")) {
    return { title: typeof data.title === "string" ? data.title : title, blocks: data.blocks as Block[] };
  }
  if (Array.isArray(data)) return { title, blocks: [jsonTable(data, title)] };
  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    if (entries.length && entries.every(([, v]) => Array.isArray(v))) {
      return { title, blocks: entries.map(([k, v]) => jsonTable(v as unknown[], k)) };
    }
    return { title, blocks: [{ t: "table", rows: [["kalit", "qiymat"], ...entries.map(([k, v]) => [k, cellString(v)])], header: true, name: title }] };
  }
  return { title, blocks: [{ t: "p", runs: [{ text: cellString(data) }] }] };
}

const tableObjects = (t: Extract<Block, { t: "table" }>) => {
  const rows = squareRows(t.rows);
  if (!t.header || rows.length < 2) return rows;
  const keys = rows[0].map((k, i) => k || `ustun${i + 1}`);
  return rows.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]])));
};

export function writeJson(doc: Doc): string {
  const ts = tables(doc);
  let data: unknown;
  if (isDataOnly(doc)) {
    data = ts.length === 1 ? tableObjects(ts[0]) : Object.fromEntries(ts.map((t, i) => [t.name || `jadval${i + 1}`, tableObjects(t)]));
  } else {
    data = { title: doc.title, blocks: doc.blocks };
  }
  return JSON.stringify(data, null, 2) + "\n";
}

// ---------------- HTML (yozish) ----------------

const htmlRuns = (runs: Run[]) =>
  runs
    .map((r) => {
      let s = escapeXml(r.text);
      if (r.code) s = `<code>${s}</code>`;
      if (r.bold) s = `<strong>${s}</strong>`;
      if (r.italic) s = `<em>${s}</em>`;
      if (r.underline) s = `<u>${s}</u>`;
      if (r.href) s = `<a href="${escapeXml(r.href)}">${s}</a>`;
      return s;
    })
    .join("");

// Faqat <body> ichidagi qism. maxImg — rasm uchun maksimal kenglik (px).
export function docBodyHtml(doc: Doc, maxImg = 640): string {
  return doc.blocks
    .map((b) => {
      switch (b.t) {
        case "h":
          return `<h${b.level}>${htmlRuns(b.runs)}</h${b.level}>`;
        case "p":
          return `<p>${htmlRuns(b.runs)}</p>`;
        case "quote":
          return `<blockquote>${htmlRuns(b.runs)}</blockquote>`;
        case "code":
          return `<pre><code>${escapeXml(b.text)}</code></pre>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          return `<${tag}>${b.items.map((it) => `<li>${htmlRuns(it)}</li>`).join("")}</${tag}>`;
        }
        case "table": {
          const rows = squareRows(b.rows);
          const tr = (r: string[], cell: string) => `<tr>${r.map((c) => `<${cell}>${escapeXml(c)}</${cell}>`).join("")}</tr>`;
          const head = b.header && rows.length ? `<thead>${tr(rows[0], "th")}</thead>` : "";
          return `<table>${head}<tbody>${(b.header ? rows.slice(1) : rows).map((r) => tr(r, "td")).join("")}</tbody></table>`;
        }
        case "img": {
          const { w, h } = fitSize(b.w, b.h, maxImg);
          return `<p class="img"><img src="${escapeXml(b.src)}" alt="${escapeXml(b.alt ?? "")}" width="${w}" height="${h}"></p>`;
        }
        case "hr":
          return "<hr>";
        case "break":
          return '<div class="page-break"></div>';
      }
    })
    .join("\n");
}

export const DOC_CSS = `
body{font:12pt/1.5 "Times New Roman",Times,serif;color:#111;background:#fff}
h1{font-size:22pt;margin:14pt 0 8pt}h2{font-size:17pt;margin:12pt 0 6pt}h3{font-size:14pt;margin:10pt 0 6pt}
h4,h5,h6{font-size:12pt;margin:8pt 0 4pt}
p{margin:0 0 8pt}ul,ol{margin:0 0 8pt;padding-left:22pt}
blockquote{margin:0 0 8pt;padding-left:12pt;border-left:3px solid #bbb;color:#444;font-style:italic}
pre{background:#f4f4f5;padding:8pt;border-radius:4px;white-space:pre-wrap;font:10pt/1.4 Consolas,monospace}
code{font-family:Consolas,monospace}
table{border-collapse:collapse;width:100%;margin:6pt 0 10pt}
td,th{border:1px solid #999;padding:4px 6px;vertical-align:top;text-align:left}th{background:#f1f1f1}
img{max-width:100%;height:auto}p.img{text-align:center}
hr{border:0;border-top:1px solid #ccc;margin:12pt 0}
.page-break{page-break-after:always;break-after:page}
`;

export function writeHtml(doc: Doc): string {
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeXml(doc.title)}</title>
<style>${DOC_CSS}body{max-width:800px;margin:32px auto;padding:0 16px}</style>
</head>
<body>
${docBodyHtml(doc)}
</body>
</html>
`;
}

// ---------------- RTF ----------------

const rtfEscape = (s: string) => {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === "\\" || ch === "{" || ch === "}") out += `\\${ch}`;
    else if (ch === "\n") out += "\\line ";
    else if (ch === "\t") out += "\\tab ";
    else if (c < 0x80) out += ch;
    else if (c <= 0xffff) out += `\\u${c > 0x7fff ? c - 0x10000 : c}?`;
    else {
      // Surrogat juftligi (emoji va boshqalar)
      const hi = Math.floor((c - 0x10000) / 0x400) + 0xd800;
      const lo = ((c - 0x10000) % 0x400) + 0xdc00;
      out += `\\u${hi - 0x10000}?\\u${lo - 0x10000}?`;
    }
  }
  return out;
};

const rtfRuns = (runs: Run[]) =>
  runs
    .map((r) => {
      const on = `${r.bold ? "\\b" : ""}${r.italic ? "\\i" : ""}${r.underline || r.href ? "\\ul" : ""}${r.code ? "\\f1" : ""}`;
      return on ? `{${on} ${rtfEscape(r.text)}}` : rtfEscape(r.text);
    })
    .join("");

const HEAD_SIZE: Record<number, number> = { 1: 40, 2: 32, 3: 28, 4: 26, 5: 24, 6: 24 };

export function writeRtf(doc: Doc): string {
  const parts: string[] = ["{\\rtf1\\ansi\\ansicpg1252\\deff0", "{\\fonttbl{\\f0\\froman Times New Roman;}{\\f1\\fmodern Consolas;}}", "\\viewkind4\\uc1\\pard\\sa160\\sl276\\slmult1\\f0\\fs24"];
  for (const b of doc.blocks) {
    switch (b.t) {
      case "h":
        parts.push(`\\pard\\sb240\\sa120\\keepn{\\b\\fs${HEAD_SIZE[b.level]} ${rtfEscape(runsText(b.runs))}}\\par`);
        break;
      case "p":
        parts.push(`\\pard\\sa160 ${rtfRuns(b.runs)}\\par`);
        break;
      case "quote":
        parts.push(`\\pard\\li720\\sa160{\\i ${rtfRuns(b.runs)}}\\par`);
        break;
      case "code":
        parts.push(`\\pard\\sa160{\\f1\\fs20 ${rtfEscape(b.text)}}\\par`);
        break;
      case "list":
        b.items.forEach((it, i) => parts.push(`\\pard\\fi-360\\li720\\sa60 ${b.ordered ? `${i + 1}.` : "\\bullet"}\\tab ${rtfRuns(it)}\\par`));
        break;
      case "table": {
        const rows = squareRows(b.rows);
        const n = rows[0]?.length ?? 0;
        if (!n) break;
        const cw = Math.floor(9000 / n);
        const border = "\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10";
        const def = Array.from({ length: n }, (_, i) => `${border}\\cellx${cw * (i + 1)}`).join("");
        rows.forEach((r, ri) => {
          const bold = b.header && ri === 0;
          parts.push(`\\trowd\\trgaph108${def}${r.map((c) => `\\pard\\intbl ${bold ? `{\\b ${rtfEscape(c)}}` : rtfEscape(c)}\\cell`).join("")}\\row`);
        });
        parts.push("\\pard\\sa160\\par");
        break;
      }
      case "img": {
        const d = dataUrlParts(b.src);
        if (!d || !/png|jpe?g/.test(d.mime)) break;
        const { w, h } = fitSize(b.w, b.h, 600);
        const bin = atob(d.base64);
        let hex = "";
        for (let i = 0; i < bin.length; i++) {
          hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
          if (i % 64 === 63) hex += "\n";
        }
        const blip = d.mime.includes("png") ? "\\pngblip" : "\\jpegblip";
        parts.push(`\\pard\\qc{\\pict${blip}\\picw${b.w ?? w}\\pich${b.h ?? h}\\picwgoal${w * 15}\\pichgoal${h * 15}\n${hex}}\\par`);
        break;
      }
      case "hr":
        parts.push("\\pard\\brdrb\\brdrs\\brdrw10\\brsp20\\sa160\\par\\pard");
        break;
      case "break":
        parts.push("\\page");
        break;
    }
  }
  parts.push("}");
  return parts.join("\n");
}

// RTF o'qish: matn, qalin/kursiv, jadval va xatboshilar. Rasmlar va murakkab maketlar e'tiborsiz qoladi.
const SKIP_DEST = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer", "headerl", "headerr", "headerf", "footerl", "footerr", "footerf", "footnote", "listtable", "listoverridetable", "rsidtbl", "generator", "themedata", "colorschememapping", "latentstyles", "datastore", "xmlnstbl", "mmathPr", "fldinst", "object", "shp", "nonshppict", "bkmkstart", "bkmkend", "revtbl", "pgdsctbl", "filetbl", "wgrffmtfilter"]);

export function readRtf(src: string, title: string): Doc {
  if (!src.startsWith("{\\rtf")) throw new Error("Bu RTF fayl emas.");
  type State = { bold: boolean; italic: boolean; underline: boolean; skip: boolean; uc: number };
  const stack: State[] = [];
  let st: State = { bold: false, italic: false, underline: false, skip: false, uc: 1 };
  let decoder = new TextDecoder("windows-1252");
  const blocks: Block[] = [];
  let runs: Run[] = [];
  let bytes: number[] = [];
  let inTable = false;
  let cell: string[] = [];
  let row: string[] = [];
  let tableRows: string[][] = [];
  let pendingSkip = 0;

  const flushBytes = () => {
    if (!bytes.length) return;
    const text = decoder.decode(new Uint8Array(bytes));
    bytes = [];
    addText(text);
  };
  const addText = (text: string) => {
    if (st.skip || !text) return;
    if (inTable) cell.push(text);
    else runs.push({ text, bold: st.bold || undefined, italic: st.italic || undefined, underline: st.underline || undefined });
  };
  const endPara = () => {
    flushBytes();
    if (inTable) return;
    const r = tidyRuns(runs);
    if (r.length) blocks.push({ t: "p", runs: r });
    runs = [];
  };
  const endTable = () => {
    if (tableRows.length) blocks.push({ t: "table", rows: squareRows(tableRows), header: false });
    tableRows = [];
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "{") {
      flushBytes();
      stack.push({ ...st });
      i++;
      if (src.startsWith("\\*", i)) st.skip = true;
      continue;
    }
    if (ch === "}") {
      flushBytes();
      st = stack.pop() ?? st;
      i++;
      continue;
    }
    if (ch === "\\") {
      const next = src[i + 1];
      if (next === "\\" || next === "{" || next === "}") {
        flushBytes();
        if (pendingSkip > 0) pendingSkip--;
        else addText(next);
        i += 2;
        continue;
      }
      if (next === "'") {
        const byte = parseInt(src.substr(i + 2, 2), 16);
        if (pendingSkip > 0) pendingSkip--;
        else if (!st.skip && !Number.isNaN(byte)) bytes.push(byte);
        i += 4;
        continue;
      }
      if (next === "*") {
        st.skip = true;
        i += 2;
        continue;
      }
      if (next === "~") {
        flushBytes();
        addText("\u00a0");
        i += 2;
        continue;
      }
      if (next === "-" || next === "_") {
        i += 2;
        continue;
      }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(src.slice(i, i + 40));
      if (!m) {
        i += 2;
        continue;
      }
      i += m[0].length;
      const word = m[1];
      const param = m[2] !== undefined ? Number(m[2]) : undefined;
      if (SKIP_DEST.has(word)) {
        st.skip = true;
        continue;
      }
      if (word !== "u") flushBytes();
      switch (word) {
        case "ansicpg":
          try {
            decoder = new TextDecoder(`windows-${param ?? 1252}`);
          } catch {
            decoder = new TextDecoder("windows-1252");
          }
          break;
        case "uc":
          st.uc = param ?? 1;
          break;
        case "u": {
          flushBytes();
          const c = param! < 0 ? param! + 0x10000 : param!;
          addText(String.fromCharCode(c));
          pendingSkip = st.uc;
          // Keyingi zaxira belgilar tashlab yuboriladi (\'hh yoki oddiy belgi)
          while (pendingSkip > 0 && i < src.length && src[i] !== "\\" && src[i] !== "{" && src[i] !== "}") {
            i++;
            pendingSkip--;
          }
          break;
        }
        case "par":
        case "sect":
          endPara();
          break;
        case "page":
          endPara();
          blocks.push({ t: "break" });
          break;
        case "line":
          if (inTable) addText(" ");
          else endPara();
          break;
        case "tab":
          addText("\t");
          break;
        case "emdash":
          addText("—");
          break;
        case "endash":
          addText("–");
          break;
        case "bullet":
          addText("•");
          break;
        case "lquote":
          addText("‘");
          break;
        case "rquote":
          addText("’");
          break;
        case "ldblquote":
          addText("“");
          break;
        case "rdblquote":
          addText("”");
          break;
        case "b":
          st.bold = param !== 0;
          break;
        case "i":
          st.italic = param !== 0;
          break;
        case "ul":
          st.underline = param !== 0;
          break;
        case "ulnone":
          st.underline = false;
          break;
        case "plain":
          st.bold = st.italic = st.underline = false;
          break;
        case "intbl":
          if (!inTable) {
            endPara();
            inTable = true;
          }
          break;
        case "cell":
          row.push(cell.join("").trim());
          cell = [];
          break;
        case "row":
          tableRows.push(row);
          row = [];
          inTable = false;
          // Keyingi qator ham jadvalda bo'lsa (\trowd ... \intbl), u shu jadvalga qo'shiladi
          if (!/^\s*(\\[a-z]+-?\d* ?)*\\trowd/.test(src.slice(i, i + 400))) endTable();
          break;
      }
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      i++;
      continue;
    }
    if (pendingSkip > 0) {
      pendingSkip--;
      i++;
      continue;
    }
    flushBytes();
    let j = i;
    while (j < src.length && !"\\{}\r\n".includes(src[j])) j++;
    addText(src.slice(i, j));
    i = j;
  }
  endPara();
  endTable();
  return { title, blocks };
}
