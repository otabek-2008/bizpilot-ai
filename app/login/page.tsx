import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import AuthMethods from "@/components/auth/AuthMethods";
import type { Metadata } from "next";
import city from "@/public/images/city.webp";

export const metadata: Metadata = {
  title: "Kirish",
  description: "CampusAI hisobingizga Google, Telegram yoki email orqali kiring.",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="CampusAI hisobingizga kiring."
      image={city}
      imageAlt="Zamonaviy shahar binolari"
      headline="Barcha o'quv vositalaringiz bir joyda."
      points={[
        "Lotin ↔ Kirill, harf registri, 3×4 rasm",
        "PDF, Word va rasm konvertori",
        "AI bilan biznes reja va taqdimotlar",
      ]}
    >
      <AuthMethods mode="login" />
      <p className="mt-8 text-center text-sm text-zinc-500">
        Hisobingiz yo&apos;qmi?{" "}
        <Link href="/register" className="font-medium text-brand-400 hover:text-brand-300">
          Ro&apos;yxatdan o&apos;ting
        </Link>
      </p>
    </AuthShell>
  );
}
