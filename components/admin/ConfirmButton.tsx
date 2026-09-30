"use client";

import { useFormStatus } from "react-dom";

/** Formani yuborishdan oldin tasdiq so'raydigan tugma (o'chirish amallari uchun). */
export default function ConfirmButton({
  message,
  children,
  className = "text-rose-300 hover:text-rose-200",
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className={`inline-flex items-center gap-1.5 text-sm transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
