import Image from "next/image";
import bg from "@/public/images/app-bg.webp";

// Kabinet (login'dan keyingi sahifalar) foni: yumshoq aurora rasmi (keskin chiziqlarsiz — kartalardagi matn o'qilishi uchun) va shovqin.
export default function AppBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <Image src={bg} alt="" fill priority placeholder="blur" sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/20 to-ink/40" />
      <div className="noise absolute inset-0" />
    </div>
  );
}
