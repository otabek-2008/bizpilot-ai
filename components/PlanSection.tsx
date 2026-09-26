export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-purple-400 mb-4">{title}</h3>
      <div className="text-zinc-300">{children}</div>
    </section>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-purple-500">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="text-zinc-400 mt-2">{subtitle}</p>
    </div>
  );
}
