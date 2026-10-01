"use client";

import { splitStat, type SlideDeck, type Theme } from "@/lib/presentation";

// Taqdimotni brauzerda PowerPoint (.pptx) fayliga aylantiradi. 16:9, 13.33 × 7.5 dyuym.

const W = 13.333;
const FONT = "Calibri";

export async function buildPptx(deck: SlideDeck, theme: Theme): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;
  pptx.company = "CampusAI";

  const total = deck.slides.length + 1;
  const base = (n: number) => {
    const s = pptx.addSlide();
    s.background = { color: theme.bg };
    s.addText(`${n} / ${total}`, { x: W - 1.6, y: 6.95, w: 1.2, h: 0.35, fontFace: FONT, fontSize: 10, color: theme.muted, align: "right" });
    return s;
  };

  // Sarlavha slaydi
  const first = base(1);
  first.addShape("rect", { x: 0.8, y: 4.05, w: 1.4, h: 0.09, fill: { color: theme.accent }, line: { color: theme.accent } });
  first.addText(deck.title, { x: 0.8, y: 1.6, w: W - 1.6, h: 2.3, fontFace: FONT, fontSize: 44, bold: true, color: theme.fg, valign: "bottom", fit: "shrink" });
  first.addText(deck.subtitle, { x: 0.8, y: 4.35, w: W - 1.6, h: 1.2, fontFace: FONT, fontSize: 20, color: theme.muted, valign: "top" });

  deck.slides.forEach((sl, i) => {
    const s = base(i + 2);
    if (sl.notes) s.addNotes(sl.notes);

    if (sl.layout === "quote") {
      s.addText("“", { x: 0.8, y: 0.6, w: 2, h: 1.6, fontFace: "Georgia", fontSize: 120, color: theme.accent });
      s.addText(sl.bullets[0] ?? sl.title, { x: 1.4, y: 1.9, w: W - 2.8, h: 3.2, fontFace: FONT, fontSize: 30, italic: true, color: theme.fg, valign: "middle", fit: "shrink" });
      s.addText(sl.title, { x: 1.4, y: 5.3, w: W - 2.8, h: 0.6, fontFace: FONT, fontSize: 16, color: theme.muted });
      return;
    }

    s.addText(sl.title, { x: 0.8, y: 0.5, w: W - 1.6, h: 1, fontFace: FONT, fontSize: 32, bold: true, color: theme.fg, valign: "bottom", fit: "shrink" });
    s.addShape("rect", { x: 0.8, y: 1.6, w: 1, h: 0.07, fill: { color: theme.accent }, line: { color: theme.accent } });

    const bulletText = (items: string[]) =>
      items.map((t) => ({ text: t, options: { bullet: { code: "25CF" }, breakLine: true, paraSpaceAfter: 10 } }));

    if (sl.layout === "two-column") {
      const half = Math.ceil(sl.bullets.length / 2);
      const colW = (W - 1.6 - 0.5) / 2;
      [sl.bullets.slice(0, half), sl.bullets.slice(half)].forEach((items, c) => {
        s.addShape("roundRect", { x: 0.8 + c * (colW + 0.5), y: 2.0, w: colW, h: 4.6, fill: { color: theme.panel }, line: { color: theme.panel }, rectRadius: 0.15 });
        s.addText(bulletText(items), { x: 1.0 + c * (colW + 0.5), y: 2.2, w: colW - 0.4, h: 4.2, fontFace: FONT, fontSize: 18, color: theme.fg, valign: "top", fit: "shrink" });
      });
    } else if (sl.layout === "stats") {
      const items = sl.bullets.slice(0, 4);
      const gap = 0.4;
      const boxW = (W - 1.6 - gap * (items.length - 1)) / Math.max(1, items.length);
      items.forEach((b, k) => {
        const [num, label] = splitStat(b);
        const x = 0.8 + k * (boxW + gap);
        s.addShape("roundRect", { x, y: 2.3, w: boxW, h: 3.4, fill: { color: theme.panel }, line: { color: theme.panel }, rectRadius: 0.15 });
        s.addText(num, { x: x + 0.2, y: 2.6, w: boxW - 0.4, h: 1.4, fontFace: FONT, fontSize: 40, bold: true, color: theme.accent, align: "center", fit: "shrink" });
        s.addText(label, { x: x + 0.2, y: 4.0, w: boxW - 0.4, h: 1.5, fontFace: FONT, fontSize: 16, color: theme.fg, align: "center", valign: "top", fit: "shrink" });
      });
    } else {
      s.addText(bulletText(sl.bullets), { x: 0.8, y: 2.0, w: W - 1.6, h: 4.7, fontFace: FONT, fontSize: 22, color: theme.fg, valign: "top", fit: "shrink" });
    }
  });

  return (await pptx.write({ outputType: "blob" })) as Blob;
}
