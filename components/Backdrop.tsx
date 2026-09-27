// Ilova sahifalari uchun umumiy fon: aurora dog'lari, to'r va shovqin.
export default function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink"
    >
      <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[140px] animate-aurora" />
      <div className="absolute top-1/3 -right-40 h-[420px] w-[520px] rounded-full bg-cyan-500/10 blur-[140px] animate-aurora [animation-delay:-6s]" />
      <div className="absolute -bottom-40 -left-32 h-[420px] w-[520px] rounded-full bg-fuchsia-600/10 blur-[140px] animate-aurora [animation-delay:-12s]" />
      <div className="bg-grid absolute inset-0" />
      <div className="noise absolute inset-0" />
    </div>
  );
}
