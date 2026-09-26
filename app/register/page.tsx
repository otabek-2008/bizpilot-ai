"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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
      setError("Email va passwordni kiriting.");
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
    <main className="min-h-screen bg-[#09090b] flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
        <h1 className="text-3xl font-bold text-white text-center">
          Create Account
        </h1>

        <p className="text-zinc-400 text-center mt-2">
          Join BizPilot AI
        </p>

        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            disabled={loading}
            className="w-full p-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 outline-none disabled:opacity-50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            disabled={loading}
            className="w-full p-3 rounded-lg bg-zinc-800 text-white border border-zinc-700 outline-none disabled:opacity-50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-zinc-400 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-500">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
