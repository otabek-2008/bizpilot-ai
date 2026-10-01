// Taqdimot tuzilmasi (AI javobi) va slayd dizayn mavzulari — server va brauzer uchun umumiy.

export type SlideLayout = "bullets" | "two-column" | "quote" | "stats";
export type Slide = { title: string; layout: SlideLayout; bullets: string[]; notes: string };
export type SlideDeck = { title: string; subtitle: string; slides: Slide[] };

export type Theme = {
  id: string;
  name: string;
  /** Ekrandagi ko'rinish uchun CSS fon. */
  css: string;
  /** PowerPoint uchun (hex, # siz). */
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  panel: string;
};

export const THEMES: Theme[] = [
  { id: "aurora", name: "Aurora", css: "linear-gradient(135deg,#1e1b4b,#581c87 60%,#0e7490)", bg: "1E1B4B", fg: "FFFFFF", muted: "C4B5FD", accent: "A78BFA", panel: "2E2A6B" },
  { id: "paper", name: "Qog'oz", css: "linear-gradient(135deg,#fafaf9,#e7e5e4)", bg: "FAFAF9", fg: "1C1917", muted: "57534E", accent: "EA580C", panel: "F0EEEC" },
  { id: "ocean", name: "Okean", css: "linear-gradient(135deg,#0c4a6e,#0369a1 55%,#22d3ee)", bg: "0C4A6E", fg: "FFFFFF", muted: "BAE6FD", accent: "67E8F9", panel: "0F5A85" },
  { id: "forest", name: "O'rmon", css: "linear-gradient(135deg,#052e16,#166534 60%,#65a30d)", bg: "052E16", fg: "FFFFFF", muted: "BBF7D0", accent: "BEF264", panel: "0B3F20" },
  { id: "sunset", name: "Shafaq", css: "linear-gradient(135deg,#7c2d12,#db2777 60%,#f59e0b)", bg: "7C2D12", fg: "FFFFFF", muted: "FED7AA", accent: "FDE68A", panel: "8F3A1C" },
];

/** "45% — talabalar ulushi" → ["45%", "talabalar ulushi"] */
export function splitStat(s: string): [string, string] {
  const m = s.match(/^\s*(.+?)\s*[—–:-]\s+(.+)$/);
  return m ? [m[1], m[2]] : [s, ""];
}
