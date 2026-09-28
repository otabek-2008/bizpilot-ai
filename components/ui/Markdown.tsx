import { useMemo } from "react";
import { parseMarkdown, type Inline } from "@/lib/markdown";

function Spans({ inline }: { inline: Inline[] }) {
  return inline.map((s, i) => {
    if (s.code) return <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em]">{s.text}</code>;
    if (s.bold) return <strong key={i} className="font-semibold text-white">{s.text}</strong>;
    if (s.italic) return <em key={i}>{s.text}</em>;
    return <span key={i}>{s.text}</span>;
  });
}

export default function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className={`space-y-3 break-words leading-relaxed ${className}`}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading": {
            const size = b.level === 1 ? "text-xl" : b.level === 2 ? "text-lg" : "text-base";
            return <p key={i} className={`${size} pt-1 font-semibold text-white`}><Spans inline={b.inline} /></p>;
          }
          case "list": {
            const List = b.ordered ? "ol" : "ul";
            return (
              <List key={i} className={`space-y-1 pl-5 ${b.ordered ? "list-decimal" : "list-disc"} marker:text-zinc-500`}>
                {b.items.map((item, j) => <li key={j}><Spans inline={item} /></li>)}
              </List>
            );
          }
          case "quote":
            return <blockquote key={i} className="border-l-2 border-white/20 pl-3 text-zinc-300"><Spans inline={b.inline} /></blockquote>;
          case "code":
            return <pre key={i} className="overflow-x-auto rounded-xl bg-black/40 p-3 font-mono text-xs leading-relaxed">{b.text}</pre>;
          default:
            return <p key={i}><Spans inline={b.inline} /></p>;
        }
      })}
    </div>
  );
}
