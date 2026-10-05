import Image from "next/image";
import bg from "@/public/images/app-bg.webp";

// Kabinet (login'dan keyingi sahifalar) foni: ipak lentali abstrakt rasm, ustida o'qilishi uchun yengil qoraytirish va shovqin.
export default function AppBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <Image src={bg} alt="" fill priority placeholder="blur" sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-ink/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/50" />
      <div className="noise absolute inset-0" />
    </div>
  );
}
