import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import AuthMethods from "@/components/auth/AuthMethods";
import meeting from "@/public/images/meeting.webp";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Hisob yaratish"
      subtitle="Bir daqiqada ro'yxatdan o'ting — bepul."
      image={meeting}
      imageAlt="Talabalar jamoasi"
      headline="O'qish uchun aqlli vositalar."
      points={[
        "Google, Telegram yoki email orqali",
        "Fayllaringiz brauzeringizdan chiqmaydi",
        "O'zbek tilida, talabalar uchun",
      ]}
    >
      <AuthMethods mode="register" />
      <p className="mt-8 text-center text-sm text-zinc-500">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300">
          Kirish
        </Link>
      </p>
    </AuthShell>
  );
}
