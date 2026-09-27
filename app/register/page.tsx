"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthShell, { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import meeting from "@/public/images/meeting.webp";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Email va parolni kiriting.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <AuthShell
      title="Hisob yaratish"
      subtitle="Bir daqiqada ro'yxatdan o'ting va birinchi loyihangizni boshlang."
      image={meeting}
      imageAlt="Jamoa uchrashuvi"
      headline="G'oyadan rejagacha — bir necha daqiqada."
      points={[
        "Claude AI asosidagi tahlil",
        "O'zbek tilidagi hujjatlar",
        "Karta talab qilinmaydi",
      ]}
    >
      <FormError message={error} />

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-zinc-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="siz@example.com"
            autoComplete="email"
            disabled={loading}
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm text-zinc-400">
            Parol
          </label>
          <input
            id="password"
            type="password"
            placeholder="Kamida 6 ta belgi"
            autoComplete="new-password"
            disabled={loading}
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? (
            <>
              <Spinner className="size-4" /> Yaratilmoqda...
            </>
          ) : (
            <>
              Hisob yaratish <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300">
          Kirish
        </Link>
      </p>
    </AuthShell>
  );
}
