"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthShell, { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import city from "@/public/images/city.webp";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Email va parolni kiriting.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.session) {
        setError("Login amalga oshmadi. Session yaratilmadi.");
        return;
      }

      // Login muvaffaqiyatli
      // To'liq sahifa yuklash localStorage'dagi sessionni ishonchli o'qiydi
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Server bilan bog'lanishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="BizPilot AI hisobingizga kiring."
      image={city}
      imageAlt="Zamonaviy biznes markazi binolari"
      headline="Loyihalaringiz sizni kutmoqda."
      points={[
        "Biznes reja, marketing va moliya bir joyda",
        "Hujjatlar avtomatik saqlanadi",
        "Istalgan vaqtda qayta yaratish mumkin",
      ]}
    >
      <FormError message={error} />

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-zinc-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="siz@example.com"
            autoComplete="email"
            disabled={loading}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm text-zinc-400">
            Parol
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            className="field"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? (
            <>
              <Spinner className="size-4" /> Kirilmoqda...
            </>
          ) : (
            <>
              Kirish <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500">
        Hisobingiz yo&apos;qmi?{" "}
        <Link href="/register" className="font-medium text-brand-400 hover:text-brand-300">
          Ro&apos;yxatdan o&apos;ting
        </Link>
      </p>
    </AuthShell>
  );
}
