import type { LucideIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { toProfile } from "@/lib/profile";

const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const tashkent = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tashkent",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Server UTC'da ishlaydi — vaqtni Toshkent bo'yicha ko'rsatamiz: "27 sen 2026, 14:05" */
export function fmt(v: string | number | Date | null | undefined, withTime = true): string {
  if (!v) return "—";
  const p = Object.fromEntries(tashkent.formatToParts(new Date(v)).map((x) => [x.type, x.value]));
  const date = `${Number(p.day)} ${MONTHS[Number(p.month) - 1]} ${p.year}`;
  return withTime ? `${date}, ${p.hour}:${p.minute}` : date;
}

export function userLabel(user: User | undefined): { name: string; sub: string } {
  if (!user) return { name: "O'chirilgan foydalanuvchi", sub: "" };
  const p = toProfile(user);
  const tg = (user.user_metadata?.telegram_username as string) || "";
  return { name: p.name, sub: p.email || (tg ? `Telegram @${tg}` : "Telegram") };
}

export function PageTitle({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-zinc-400">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, icon: Icon, hint }: { label: string; value: number | string; icon: LucideIcon; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        {label} <Icon size={17} className="text-brand-400" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="glass rounded-2xl p-8 text-center text-sm text-zinc-400">{children}</p>;
}
