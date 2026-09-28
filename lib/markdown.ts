// AI javoblaridagi oddiy Markdown'ni bloklarga ajratadi: ekranda ko'rsatish va .docx eksport uchun bitta manba.

export type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; inline: Inline[] }
  | { type: "paragraph"; inline: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "quote"; inline: Inline[] }
  | { type: "code"; text: string };

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    const i = m.index!;
    if (i > last) out.push({ text: src.slice(last, i) });
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__")) out.push({ text: tok.slice(2, -2), bold: true });
    else if (tok.startsWith("`")) out.push({ text: tok.slice(1, -1), code: true });
    // "_" so'z ichida (masalan o'zbekcha "a_b") emas, faqat alohida turganda kursiv
    else if (tok.startsWith("_") && /\w/.test(src[i - 1] ?? "")) out.push({ text: tok });
    else out.push({ text: tok.slice(1, -1), italic: true });
    last = i + tok.length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ type: "paragraph", inline: parseInline(para.join(" ")) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flush();
      const code: string[] = [];
      while (++i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (!trimmed) {
      flush();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      flush();
      const level = Math.min(h[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, inline: parseInline(h[2].replace(/\s+#+$/, "")) });
      continue;
    }
    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flush();
      continue;
    }
    if (trimmed.startsWith(">")) {
      flush();
      blocks.push({ type: "quote", inline: parseInline(trimmed.replace(/^>\s?/, "")) });
      continue;
    }
    const li = /^([-*+]|\d+[.)])\s+(.*)$/.exec(trimmed);
    if (li) {
      flush();
      const ordered = /\d/.test(li[1]);
      const prev = blocks.at(-1);
      if (prev?.type === "list" && prev.ordered === ordered) prev.items.push(parseInline(li[2]));
      else blocks.push({ type: "list", ordered, items: [parseInline(li[2])] });
      continue;
    }
    para.push(trimmed);
  }
  flush();
  return blocks;
}

export const plainInline = (inline: Inline[]) => inline.map((s) => s.text).join("");
