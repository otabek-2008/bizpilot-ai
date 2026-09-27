export function Spinner({ className = "size-10" }: { className?: string }) {
  return (
    <div
      className={`${className} animate-spin rounded-full border-2 border-white/10 border-t-brand-400`}
    />
  );
}

export default function LoadingScreen({ label = "Yuklanmoqda..." }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner />
        <p className="text-sm text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
