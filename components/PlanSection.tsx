import type { LucideIcon } from "lucide-react";

export function Section({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-3xl p-6 sm:p-7 ${className}`}>
      <h3 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-white">
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
            <Icon size={16} />
          </span>
        )}
        {title}
      </h3>
      <div className="leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400 shadow-[0_0_8px_rgb(167_139_250)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="animate-fade-up mb-8 flex items-start gap-4">
      {Icon && (
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-[0_10px_30px_-10px_rgb(139_92_246/0.9)]">
          <Icon size={22} />
        </span>
      )}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-1.5 text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 lg:py-12">{children}</div>;
}
