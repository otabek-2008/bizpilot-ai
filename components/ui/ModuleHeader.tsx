import type { AppModule } from "@/lib/modules";

export default function ModuleHeader({
  module: m,
  children,
}: {
  module: AppModule;
  children?: React.ReactNode;
}) {
  const Icon = m.icon;
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="accent-gradient relative grid size-14 shrink-0 place-items-center rounded-2xl shadow-[0_18px_40px_-16px_var(--accent)]">
          <Icon size={26} />
          <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/25" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="accent-text">{m.title}</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-zinc-400">{m.desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function PageWrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>;
}
