// ZIP asosidagi ofis formatlariga yozish: DOCX, ODT, XLSX, EPUB, PPTX.
// Rasmlar oldindan PNG/JPG ga keltirilgan va o'lchami ma'lum deb hisoblanadi (prepareImages).

import { base64ToBytes, blockText, dataUrlParts, escapeXml, fitSize, runsText, squareRows, tables, type Block, type Doc, type Run } from "./model";
import { docRows } from "./text";

import type PptxGenJS from "pptxgenjs";

const zipNew = async () => new (await import("jszip")).default();

// ---------------- DOCX ----------------

export async function writeDocx(doc: Doc): Promise<Blob> {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ImageRun, ExternalHyperlink, PageBreak, LevelFormat, AlignmentType, BorderStyle, ShadingType } = d;

  const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
  const runs = (rs: Run[]) =>
    rs.map((r) => {
      const t = new TextRun({ text: r.text, bold: r.bold, italics: r.italic, underline: r.underline ? {} : undefined, font: r.code ? "Consolas" : undefined, style: r.href ? "Hyperlink" : undefined });
      return r.href ? new ExternalHyperlink({ link: r.href, children: [t] }) : t;
    });

  let listInstance = 0;
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  for (const b of doc.blocks) {
    switch (b.t) {
      case "h":
        children.push(new Paragraph({ heading: HEADINGS[b.level - 1], children: runs(b.runs) }));
        break;
      case "p":
        children.push(new Paragraph({ spacing: { after: 120 }, children: runs(b.runs) }));
        break;
      case "quote":
        children.push(new Paragraph({ indent: { left: 720 }, spacing: { after: 120 }, children: runs(b.runs.map((r) => ({ ...r, italic: true }))) }));
        break;
      case "code":
        children.push(
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: "F4F4F5", color: "auto" },
            spacing: { after: 120 },
            children: b.text.split("\n").map((line, i) => new TextRun({ text: line, font: "Consolas", size: 20, break: i ? 1 : undefined })),
          }),
        );
        break;
      case "list": {
        const instance = ++listInstance;
        for (const it of b.items) {
          children.push(new Paragraph({ numbering: { reference: b.ordered ? "ordered" : "bullets", level: 0, instance }, children: runs(it) }));
        }
        break;
      }
      case "table": {
        const rows = squareRows(b.rows);
        if (!rows.length || !rows[0].length) break;
        const colW = Math.floor(9026 / rows[0].length);
        children.push(
          new Table({
            width: { size: colW * rows[0].length, type: WidthType.DXA },
            columnWidths: rows[0].map(() => colW),
            rows: rows.map(
              (r, ri) =>
                new TableRow({
                  tableHeader: b.header && ri === 0,
                  children: r.map(
                    (c) =>
                      new TableCell({
                        width: { size: colW, type: WidthType.DXA },
                        shading: b.header && ri === 0 ? { type: ShadingType.CLEAR, fill: "F1F1F1", color: "auto" } : undefined,
                        children: [new Paragraph({ children: [new TextRun({ text: c, bold: b.header && ri === 0 })] })],
                      }),
                  ),
                }),
            ),
          }),
          new Paragraph(""),
        );
        break;
      }
      case "img": {
        const p = dataUrlParts(b.src);
        if (!p) break;
        const type = p.mime.includes("png") ? "png" : p.mime.includes("gif") ? "gif" : p.mime.includes("bmp") ? "bmp" : "jpg";
        const { w, h } = fitSize(b.w, b.h, 600, 860);
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type, data: base64ToBytes(p.base64), transformation: { width: w, height: h }, altText: b.alt ? { name: b.alt, description: b.alt, title: b.alt } : undefined })] }));
        break;
      }
      case "hr":
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 1 } }, children: [] }));
        break;
      case "break":
        children.push(new Paragraph({ children: [new PageBreak()] }));
        break;
    }
  }

  const document = new Document({
    title: doc.title,
    creator: "Studyra",
    styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "ordered", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    sections: [{ children: children.length ? children : [new Paragraph("")] }],
  });
  return Packer.toBlob(document);
}

// ---------------- ODT ----------------

const ODT_MIME = "application/vnd.oasis.opendocument.text";

const odtRuns = (rs: Run[]) =>
  rs
    .map((r) => {
      const style = r.code ? "Tcode" : r.bold && r.italic ? "Tbi" : r.bold ? "Tb" : r.italic ? "Ti" : r.underline ? "Tu" : "";
      let s = escapeXml(r.text).replace(/\t/g, "<text:tab/>").replace(/ {2,}/g, (m) => ` <text:s text:c="${m.length - 1}"/>`);
      if (style) s = `<text:span text:style-name="${style}">${s}</text:span>`;
      if (r.href) s = `<text:a xlink:type="simple" xlink:href="${escapeXml(r.href)}">${s}</text:a>`;
      return s;
    })
    .join("");

export async function writeOdt(doc: Doc): Promise<Blob> {
  const zip = await zipNew();
  const pictures: { path: string; mime: string }[] = [];
  let tableN = 0;
  const body: string[] = [];

  for (const b of doc.blocks) {
    switch (b.t) {
      case "h":
        body.push(`<text:h text:style-name="Heading_20_${b.level}" text:outline-level="${b.level}">${odtRuns(b.runs)}</text:h>`);
        break;
      case "p":
        body.push(`<text:p text:style-name="Text_20_body">${odtRuns(b.runs)}</text:p>`);
        break;
      case "quote":
        body.push(`<text:p text:style-name="Quotations">${odtRuns(b.runs)}</text:p>`);
        break;
      case "code":
        b.text.split("\n").forEach((l) => body.push(`<text:p text:style-name="Preformatted_20_Text">${odtRuns([{ text: l }])}</text:p>`));
        break;
      case "list":
        body.push(
          `<text:list text:style-name="${b.ordered ? "LNum" : "LBul"}">${b.items.map((it) => `<text:list-item><text:p text:style-name="Text_20_body">${odtRuns(it)}</text:p></text:list-item>`).join("")}</text:list>`,
        );
        break;
      case "table": {
        const rows = squareRows(b.rows);
        if (!rows.length || !rows[0].length) break;
        tableN++;
        const cell = (c: string, head: boolean) =>
          `<table:table-cell table:style-name="Cell" office:value-type="string"><text:p text:style-name="${head ? "TableHead" : "Text_20_body"}">${odtRuns([{ text: c }])}</text:p></table:table-cell>`;
        body.push(
          `<table:table table:name="Jadval${tableN}" table:style-name="Tbl"><table:table-column table:number-columns-repeated="${rows[0].length}"/>${rows
            .map((r, ri) => `<table:table-row>${r.map((c) => cell(c, b.header && ri === 0)).join("")}</table:table-row>`)
            .join("")}</table:table>`,
        );
        break;
      }
      case "img": {
        const p = dataUrlParts(b.src);
        if (!p) break;
        const ext = p.mime.includes("png") ? "png" : "jpg";
        const path = `Pictures/rasm${pictures.length + 1}.${ext}`;
        zip.file(path, base64ToBytes(p.base64));
        pictures.push({ path, mime: p.mime });
        const { w, h } = fitSize(b.w, b.h, 600, 860);
        const cm = (px: number) => `${((px / 96) * 2.54).toFixed(2)}cm`;
        body.push(
          `<text:p text:style-name="Center"><draw:frame draw:name="Rasm${pictures.length}" text:anchor-type="as-char" svg:width="${cm(w)}" svg:height="${cm(h)}"><draw:image xlink:href="${path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`,
        );
        break;
      }
      case "hr":
        body.push(`<text:p text:style-name="Hr"/>`);
        break;
      case "break":
        body.push(`<text:p text:style-name="PageBreak"/>`);
        break;
    }
  }

  const NS =
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.3"';

  const heading = (n: number, size: string) =>
    `<style:style style:name="Heading_20_${n}" style:display-name="Heading ${n}" style:family="paragraph" style:default-outline-level="${n}" style:next-style-name="Text_20_body"><style:paragraph-properties fo:margin-top="0.35cm" fo:margin-bottom="0.2cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="${size}" fo:font-weight="bold"/></style:style>`;

  const styles = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${NS}><office:styles>
<style:default-style style:family="paragraph"><style:text-properties style:font-name="Times New Roman" fo:font-family="'Times New Roman'" fo:font-size="12pt"/></style:default-style>
<style:style style:name="Standard" style:family="paragraph"/>
<style:style style:name="Text_20_body" style:display-name="Text body" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="0.25cm" fo:line-height="130%"/></style:style>
${[["1", "20pt"], ["2", "16pt"], ["3", "14pt"], ["4", "12pt"], ["5", "12pt"], ["6", "12pt"]].map(([n, s]) => heading(Number(n), s)).join("\n")}
<style:style style:name="Quotations" style:family="paragraph" style:parent-style-name="Text_20_body"><style:paragraph-properties fo:margin-left="1cm"/><style:text-properties fo:font-style="italic" fo:color="#444444"/></style:style>
<style:style style:name="Preformatted_20_Text" style:display-name="Preformatted Text" style:family="paragraph"><style:paragraph-properties fo:background-color="#f4f4f5"/><style:text-properties style:font-name="Consolas" fo:font-family="Consolas" fo:font-size="10pt"/></style:style>
<style:style style:name="TableHead" style:family="paragraph" style:parent-style-name="Text_20_body"><style:text-properties fo:font-weight="bold"/></style:style>
</office:styles></office:document-styles>`;

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS}><office:automatic-styles>
<style:style style:name="Tb" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
<style:style style:name="Ti" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
<style:style style:name="Tbi" style:family="text"><style:text-properties fo:font-weight="bold" fo:font-style="italic"/></style:style>
<style:style style:name="Tu" style:family="text"><style:text-properties style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"/></style:style>
<style:style style:name="Tcode" style:family="text"><style:text-properties style:font-name="Consolas" fo:font-family="Consolas"/></style:style>
<style:style style:name="Center" style:family="paragraph" style:parent-style-name="Text_20_body"><style:paragraph-properties fo:text-align="center"/></style:style>
<style:style style:name="Hr" style:family="paragraph"><style:paragraph-properties fo:border-bottom="0.5pt solid #bbbbbb" fo:margin-bottom="0.3cm"/></style:style>
<style:style style:name="PageBreak" style:family="paragraph"><style:paragraph-properties fo:break-after="page"/></style:style>
<style:style style:name="Tbl" style:family="table"><style:table-properties style:width="16.5cm" table:align="margins" fo:margin-bottom="0.3cm"/></style:style>
<style:style style:name="Cell" style:family="table-cell"><style:table-cell-properties fo:padding="0.1cm" fo:border="0.5pt solid #999999"/></style:style>
<text:list-style style:name="LBul"><text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:text-indent="-0.6cm" fo:margin-left="1.2cm"/></style:list-level-properties></text:list-level-style-bullet></text:list-style>
<text:list-style style:name="LNum"><text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:text-indent="-0.6cm" fo:margin-left="1.2cm"/></style:list-level-properties></text:list-level-style-number></text:list-style>
</office:automatic-styles><office:body><office:text>
${body.join("\n") || "<text:p/>"}
</office:text></office:body></office:document-content>`;

  const meta = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta ${NS}><office:meta><dc:title>${escapeXml(doc.title)}</dc:title><meta:generator>Studyra</meta:generator></office:meta></office:document-meta>`;

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${ODT_MIME}"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
${pictures.map((p) => `<manifest:file-entry manifest:full-path="${p.path}" manifest:media-type="${p.mime}"/>`).join("\n")}
</manifest:manifest>`;

  // mimetype birinchi va siqilmagan bo'lishi shart
  zip.file("mimetype", ODT_MIME, { compression: "STORE" });
  zip.file("content.xml", content);
  zip.file("styles.xml", styles);
  zip.file("meta.xml", meta);
  zip.file("META-INF/manifest.xml", manifest);
  return reorderMimetypeFirst(zip, ODT_MIME);
}

// JSZip fayllarni qo'shilish tartibida yozadi; mimetype eng oldin qo'shilgani uchun birinchi bo'ladi.
// Rasmlar undan oldin qo'shilgan bo'lishi mumkin — shuning uchun yangi arxivga qayta yig'amiz.
async function reorderMimetypeFirst(zip: Awaited<ReturnType<typeof zipNew>>, mime: string): Promise<Blob> {
  const out = await zipNew();
  out.file("mimetype", mime, { compression: "STORE" });
  for (const [path, entry] of Object.entries(zip.files)) {
    if (path === "mimetype" || entry.dir) continue;
    out.file(path, await entry.async("uint8array"));
  }
  return out.generateAsync({ type: "blob", mimeType: mime, compression: "DEFLATE" });
}

// ---------------- XLSX ----------------

const colName = (i: number) => {
  let s = "";
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

const NUMERIC = /^-?(0|[1-9]\d{0,14})(\.\d+)?$/;

export function sheetNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((raw, i) => {
    const base = (raw || `Varaq${i + 1}`).replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || `Varaq${i + 1}`;
    let name = base;
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base.slice(0, 28)} (${k})`;
    used.add(name.toLowerCase());
    return name;
  });
}

export async function writeXlsx(doc: Doc): Promise<Blob> {
  const ts = tables(doc);
  const sheets = ts.length ? ts.map((t) => ({ name: t.name ?? "", rows: squareRows(t.rows), header: t.header })) : [{ name: doc.title, rows: docRows(doc), header: false }];
  const names = sheetNames(sheets.map((s) => s.name));
  const zip = await zipNew();

  const sheetXml = (rows: string[][], header: boolean) => {
    const widths = (rows[0] ?? []).map((_, c) => Math.min(60, Math.max(8, ...rows.slice(0, 200).map((r) => (r[c] ?? "").length + 2))));
    const cols = widths.length ? `<cols>${widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
    const data = rows
      .map(
        (r, ri) =>
          `<row r="${ri + 1}">${r
            .map((v, ci) => {
              const ref = `${colName(ci)}${ri + 1}`;
              const style = header && ri === 0 ? ' s="1"' : "";
              if (v === "") return style ? `<c r="${ref}"${style}/>` : "";
              if (NUMERIC.test(v) && !(header && ri === 0)) return `<c r="${ref}"><v>${v}</v></c>`;
              return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`;
            })
            .join("")}</row>`,
      )
      .join("");
    const freeze = header && rows.length > 1 ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${data}</sheetData></worksheet>`;
  };

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names
      .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join("")}</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names
      .map((n, i) => `<sheet name="${escapeXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join("")}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F1F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  );
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows, s.header)));
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
}

// ---------------- EPUB ----------------

const EPUB_MIME = "application/epub+zip";

// Hujjatni boblarga bo'ladi: eng yuqori darajadagi sarlavhalar bo'yicha
export function chapters(doc: Doc): { title: string; blocks: Block[] }[] {
  const levels = doc.blocks.filter((b) => b.t === "h").map((b) => (b as Extract<Block, { t: "h" }>).level);
  const top = levels.length ? Math.min(...levels) : 0;
  const out: { title: string; blocks: Block[] }[] = [];
  for (const b of doc.blocks) {
    if (b.t === "h" && b.level === top) out.push({ title: runsText(b.runs), blocks: [b] });
    else if (b.t === "break") continue;
    else {
      if (!out.length) out.push({ title: doc.title, blocks: [] });
      out.at(-1)!.blocks.push(b);
    }
  }
  return out.length ? out : [{ title: doc.title, blocks: [] }];
}

export async function writeEpub(doc: Doc, bodyHtml: (d: Doc) => string, css: string): Promise<Blob> {
  const zip = await zipNew();
  const id = `urn:uuid:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const images: { id: string; href: string; mime: string }[] = [];

  // Rasmlarni alohida fayl qilib, XHTML ichida ularga havola qilamiz
  const withFiles = (blocks: Block[]): Block[] =>
    blocks.map((b) => {
      if (b.t !== "img") return b;
      const p = dataUrlParts(b.src);
      if (!p) return b;
      const href = `images/rasm${images.length + 1}.${p.mime.includes("png") ? "png" : "jpg"}`;
      zip.file(`OEBPS/${href}`, base64ToBytes(p.base64));
      images.push({ id: `img${images.length + 1}`, href, mime: p.mime });
      return { ...b, src: href };
    });

  const chs = chapters(doc);
  const xhtml = (title: string, inner: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="uz" xml:lang="uz">
<head><meta charset="utf-8"/><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${inner}
</body>
</html>`;

  // HTML'ni XHTML'ga moslashtiramiz: bo'sh teglar yopiladi
  const toXhtml = (html: string) => html.replace(/<(img|br|hr)([^>]*?)\s*\/?>/g, "<$1$2/>");

  chs.forEach((ch, i) => zip.file(`OEBPS/bob${i + 1}.xhtml`, xhtml(ch.title, toXhtml(bodyHtml({ title: ch.title, blocks: withFiles(ch.blocks) })))));

  zip.file(
    "OEBPS/nav.xhtml",
    xhtml(
      "Mundarija",
      `<nav epub:type="toc" id="toc"><h1>Mundarija</h1><ol>${chs.map((c, i) => `<li><a href="bob${i + 1}.xhtml">${escapeXml(c.title || `Bob ${i + 1}`)}</a></li>`).join("")}</ol></nav>`,
    ),
  );
  zip.file("OEBPS/style.css", css);
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="uz">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${id}</dc:identifier>
<dc:title>${escapeXml(doc.title)}</dc:title>
<dc:language>uz</dc:language>
<dc:creator>Studyra</dc:creator>
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${chs.map((_, i) => `<item id="bob${i + 1}" href="bob${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
${images.map((im) => `<item id="${im.id}" href="${im.href}" media-type="${im.mime}"/>`).join("\n")}
</manifest>
<spine>
${chs.map((_, i) => `<itemref idref="bob${i + 1}"/>`).join("\n")}
</spine>
</package>`,
  );
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  return reorderMimetypeFirst(zip, EPUB_MIME);
}

// ---------------- PPTX ----------------

type Slide = { title: string; items: Block[] };

// Slaydlarga bo'lish: H1/H2 sarlavhalar va sahifa chegaralari bo'yicha; juda uzun slaydlar davom etadi
export function toSlides(doc: Doc): Slide[] {
  const slides: Slide[] = [];
  const heavy = (x: Block) => x.t === "img" || x.t === "table";
  let cur: Slide | null = null;
  let chars = 0;
  for (const b of doc.blocks) {
    if (b.t === "break") {
      cur = null;
      continue;
    }
    if (b.t === "h" && b.level <= 2) {
      cur = { title: runsText(b.runs), items: [] };
      slides.push(cur);
      chars = 0;
      continue;
    }
    const size = b.t === "img" ? 400 : b.t === "table" ? 200 + b.rows.length * 60 : blockText(b).length;
    if (cur && cur.items.length && (chars + size > 700 || (heavy(b) && cur.items.some(heavy)) || b.t === "table")) cur = null;
    if (!cur) {
      const prev = slides.at(-1)?.title.replace(/ \(davomi\)$/, "");
      cur = { title: prev ? `${prev} (davomi)` : doc.title, items: [] };
      slides.push(cur);
      chars = 0;
    }
    cur.items.push(b);
    chars += size;
  }
  return slides;
}

export async function writePptx(doc: Doc): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = doc.title;
  pptx.company = "Studyra";
  const W = 13.333;
  const FONT = "Calibri";

  const slides = toSlides(doc);
  if (!slides.length) slides.push({ title: doc.title, items: [] });

  for (const sl of slides) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(sl.title || doc.title, { x: 0.6, y: 0.35, w: W - 1.2, h: 0.95, fontFace: FONT, fontSize: 30, bold: true, color: "1F2937", valign: "bottom", fit: "shrink" });
    s.addShape("rect", { x: 0.6, y: 1.35, w: 1, h: 0.06, fill: { color: "7C3AED" }, line: { color: "7C3AED" } });

    const img = sl.items.find((b): b is Extract<Block, { t: "img" }> => b.t === "img");
    const table = sl.items.find((b): b is Extract<Block, { t: "table" }> => b.t === "table");
    const textItems = sl.items.filter((b) => b.t !== "img" && b.t !== "table");
    const top = 1.65;
    const areaH = 7.5 - top - 0.4;
    const textW = img ? (W - 1.2) * 0.5 : W - 1.2;

    if (textItems.length) {
      const paras = textItems.flatMap((b): PptxGenJS.TextProps[] => {
        // Raqamlar matnga yoziladi — avtomatik raqamlash ba'zi dasturlarda har qatorda 1 dan boshlanadi
        if (b.t === "list") return b.items.map((it, i) => ({ text: b.ordered ? `${i + 1}. ${runsText(it)}` : runsText(it), options: { bullet: b.ordered ? false : { code: "25CF" }, breakLine: true, paraSpaceAfter: 6 } }));
        if (b.t === "h") return [{ text: runsText(b.runs), options: { bold: true, breakLine: true, paraSpaceAfter: 6 } }];
        if (b.t === "code") return [{ text: b.text, options: { fontFace: "Consolas", fontSize: 14, breakLine: true, paraSpaceAfter: 6 } }];
        const text = blockText(b);
        return text ? [{ text, options: { breakLine: true, paraSpaceAfter: 8, italic: b.t === "quote" } }] : [];
      });
      if (paras.length) s.addText(paras, { x: 0.6, y: top, w: textW, h: table ? areaH * 0.35 : areaH, fontFace: FONT, fontSize: 20, color: "374151", valign: "top", fit: "shrink" });
    }
    if (table) {
      const rows = squareRows(table.rows).slice(0, 14);
      const y = textItems.length ? top + areaH * 0.38 : top;
      s.addTable(
        rows.map((r, ri) => r.map((c) => ({ text: c, options: { bold: table.header && ri === 0, fill: { color: table.header && ri === 0 ? "EDE9FE" : "FFFFFF" } } }))),
        { x: 0.6, y, w: W - 1.2, fontFace: FONT, fontSize: 12, color: "1F2937", border: { type: "solid", pt: 0.75, color: "CBD5E1" }, autoPage: false },
      );
    }
    if (img) {
      const boxX = textItems.length ? 0.6 + textW + 0.3 : 0.6;
      const boxW = textItems.length ? W - 1.2 - textW - 0.3 : W - 1.2;
      // Kichik rasmlar 2 baravardan ortiq kattalashtirilmaydi (xiralashmasin)
      const natural = fitSize(((img.w ?? 600) / 96) * 2 * 100, ((img.h ?? 400) / 96) * 2 * 100, boxW * 100, areaH * 100);
      const w = natural.w / 100;
      const h = natural.h / 100;
      s.addImage({ data: img.src.replace(/^data:/, ""), x: boxX + (boxW - w) / 2, y: top + (areaH - h) / 2, w, h });
    }
  }
  return (await pptx.write({ outputType: "blob" })) as Blob;
}
