import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, PageBreak, Paragraph, TextRun } from "docx";
import { parseMarkdown, type Inline } from "@/lib/markdown";

// Markdown matnni akademik talablarga mos .docx ga aylantiradi: Times New Roman 14, 1.5 interval, kenglik bo'yicha tekislash.

const FONT = "Times New Roman";
const SIZE = 28; // yarim punktlarda: 14pt
const LINE = 360; // 1.5 interval

const runs = (inline: Inline[], extra: { bold?: boolean } = {}) =>
  inline.map(
    (s) =>
      new TextRun({
        text: s.text,
        bold: s.bold || extra.bold,
        italics: s.italic,
        font: s.code ? "Consolas" : FONT,
        size: SIZE,
      }),
  );

export type Cover = {
  institution: string;
  kind: string;
  topic: string;
  subject: string;
  author: string;
  group: string;
  teacher: string;
  city: string;
  lang: "uz" | "ru" | "en";
};

const LABELS = {
  uz: { subject: "Fan", topic: "Mavzu", author: "Bajardi", group: "Guruh", teacher: "Tekshirdi" },
  ru: { subject: "Предмет", topic: "Тема", author: "Выполнил(а)", group: "Группа", teacher: "Проверил(а)" },
  en: { subject: "Subject", topic: "Topic", author: "Prepared by", group: "Group", teacher: "Supervisor" },
};

const center = (text: string, opts: { bold?: boolean; size?: number; before?: number; after?: number } = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 0, line: LINE },
    children: [new TextRun({ text, bold: opts.bold, font: FONT, size: opts.size ?? SIZE })],
  });

const right = (label: string, value: string) =>
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { line: LINE },
    children: [new TextRun({ text: `${label}: `, bold: true, font: FONT, size: SIZE }), new TextRun({ text: value, font: FONT, size: SIZE })],
  });

function coverPage(c: Cover): Paragraph[] {
  const out: Paragraph[] = [];
  const L = LABELS[c.lang];
  if (c.institution) out.push(center(c.institution.toUpperCase(), { bold: true }));
  out.push(center(c.kind.toUpperCase(), { bold: true, size: 40, before: 2400 }));
  if (c.subject) out.push(center(`${L.subject}: ${c.subject}`, { before: 240 }));
  out.push(center(`${L.topic}: ${c.topic}`, { bold: true, size: 32, before: 240, after: 1800 }));
  if (c.author) out.push(right(L.author, c.author));
  if (c.group) out.push(right(L.group, c.group));
  if (c.teacher) out.push(right(L.teacher, c.teacher));
  out.push(center(`${c.city ? c.city + " — " : ""}${new Date().getFullYear()}`, { before: 2400 }));
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

export async function markdownToDocx(markdown: string, opts: { title?: string; cover?: Cover } = {}): Promise<Blob> {
  const { title, cover } = opts;
  const blocks = parseMarkdown(markdown);
  const children: Paragraph[] = cover ? coverPage(cover) : [];
  let listId = 0;

  if (title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: title.toUpperCase(), bold: true, font: FONT, size: 32 })],
      }),
    );
  }

  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        children.push(
          new Paragraph({
            heading: b.level === 1 ? HeadingLevel.HEADING_1 : b.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            alignment: b.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 240, after: 120, line: LINE },
            children: runs(b.inline, { bold: true }),
          }),
        );
        break;
      case "list": {
        const instance = listId++;
        for (const item of b.items) {
          children.push(
            new Paragraph({
              numbering: { reference: b.ordered ? "ordered" : "bullets", level: 0, instance },
              alignment: AlignmentType.JUSTIFIED,
              spacing: { line: LINE },
              children: runs(item),
            }),
          );
        }
        break;
      }
      case "code":
        for (const line of b.text.split("\n")) {
          children.push(new Paragraph({ children: [new TextRun({ text: line, font: "Consolas", size: 22 })] }));
        }
        break;
      default:
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 709 }, // 1.25 sm xat boshi
            spacing: { line: LINE, after: 0 },
            children: runs(b.inline),
          }),
        );
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
        },
        {
          reference: "ordered",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
        },
      ],
    },
    // Chap 3 sm, o'ng 1.5 sm, yuqori/pastki 2 sm — O'zbekiston OTMlaridagi odatiy talab
    sections: [{ properties: { page: { margin: { left: 1701, right: 850, top: 1134, bottom: 1134 } } }, children }],
  });
  return Packer.toBlob(doc);
}
