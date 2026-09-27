import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function Logo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 font-semibold tracking-tight ${className}`}
    >
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-600 to-indigo-600 shadow-[0_8px_24px_-8px_rgb(139_92_246/0.8)] transition group-hover:-rotate-6 group-hover:scale-105">
        <GraduationCap size={19} className="text-white" />
      </span>
      <span className="text-lg text-white">
        Campus<span className="text-brand-400">AI</span>
      </span>
    </Link>
  );
}
