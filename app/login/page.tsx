"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Email va passwordni kiriting.");
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
    <main className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        <Link
          href="/"
          className="block text-center text-3xl font-bold text-purple-500 mb-10"
        >
          BizPilot AI
        </Link>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">

          <h1 className="text-3xl font-bold">
            Welcome back
          </h1>

          <p className="text-zinc-400 mt-2">
            Login to your BizPilot AI account.
          </p>

          {error && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                disabled={loading}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>

          <p className="text-center text-zinc-500 text-sm mt-6">
            Don&apos;t have an account?{" "}

            <Link
              href="/register"
              className="text-purple-400 hover:text-purple-300"
            >
              Create account
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}
