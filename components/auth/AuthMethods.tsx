"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { ArrowRight, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FormError } from "@/components/AuthShell";
import { Spinner } from "@/components/LoadingScreen";
import { GoogleIcon, TelegramIcon } from "@/components/auth/BrandIcons";

type Mode = "login" | "register";
type Providers = { google: boolean; email: boolean };

type TelegramUser = Record<string, string | number>;
declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (opts: { bot_id: string; request_access?: string; lang?: string }, cb: (user: TelegramUser | false) => void) => void;
      };
    };
  }
}

const TELEGRAM_BOT_ID = process.env.NEXT_PUBLIC_TELEGRAM_BOT_ID ?? "";

// To'liq sahifa yuklash localStorage'dagi yangi sessiyani ishonchli o'qiydi.
// eslint-disable-next-line @next/next/no-location-assign-relative-destination
const goDashboard = () => window.location.assign("/dashboard");

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email yoki parol noto'g'ri.";
  if (m.includes("email not confirmed")) return "Email tasdiqlanmagan. Pochtangizdagi havolani bosing.";
  if (m.includes("user already registered")) return "Bu email bilan hisob allaqachon mavjud. Kirish sahifasiga o'ting.";
  if (m.includes("password should be")) return "Parol kamida 6 ta belgidan iborat bo'lsin.";
  if (m.includes("token has expired") || m.includes("invalid otp") || m.includes("otp")) return "Kod noto'g'ri yoki muddati o'tgan.";
  if (m.includes("unable to validate email") || m.includes("invalid format")) return "Email manzili noto'g'ri.";
  if (m.includes("rate limit")) return "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.";
  if (m.includes("provider is not enabled") || m.includes("unsupported")) return "Bu kirish usuli hali sozlanmagan.";
  // Google (OAuth) qaytishidagi xatolar
  if (m.includes("access_denied") || m.includes("access denied")) return "Google orqali kirish bekor qilindi.";
  if (m.includes("exchange external code") || m.includes("invalid_client") || m.includes("unauthorized_client"))
    return "Google kirish sozlamalarida xatolik. Birozdan so'ng qayta urinib ko'ring yoki email bilan kiring.";
  if (m.includes("email") && m.includes("external provider")) return "Google hisobingizdan email olinmadi. Boshqa hisob bilan urinib ko'ring.";
  if (m.includes("flow state") || m.includes("oauth_state") || m.includes("oauth state")) return "Kirish sessiyasi eskirgan. Qaytadan \"Google\" tugmasini bosing.";
  if (m.includes("server_error") || m.includes("database error")) return "Hisob yaratishda server xatosi. Qayta urinib ko'ring.";
  return message;
}

export default function AuthMethods({ mode }: { mode: Mode }) {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Google'dan xato bilan qaytilgan bo'lsa (AuthProvider uni ?auth_error= ga o'tkazadi)
  useEffect(() => {
    const url = new URL(window.location.href);
    const authError = url.searchParams.get("auth_error");
    if (!authError) return;
    // Hydratsiyadan keyin ko'rsatamiz; manzildan esa olib tashlaymiz (yangilaganda qayta chiqmasin)
    const t = setTimeout(() => {
      setError(friendly(authError));
      url.searchParams.delete("auth_error");
      window.history.replaceState(null, "", url.pathname + url.search);
    });
    return () => clearTimeout(t);
  }, []);

  // Supabase'da qaysi provayderlar yoqilganini bilib olamiz
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key ?? "" } })
      .then((r) => r.json())
      .then((s) =>
        setProviders({
          google: !!s.external?.google,
          email: s.external?.email !== false,
        }),
      )
      .catch(() => setProviders({ google: true, email: true }));
  }, []);

  async function oauth(provider: "google") {
    setError("");
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      // select_account — bir nechta Google hisobi bo'lsa, keraklisini tanlash imkoni
      options: { redirectTo: `${window.location.origin}/dashboard`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setError(friendly(error.message));
      setBusy("");
    }
  }

  function telegram() {
    setError("");
    if (!window.Telegram?.Login) {
      setError("Telegram yuklanmadi. Sahifani yangilab ko'ring.");
      return;
    }
    setBusy("telegram");
    window.Telegram.Login.auth({ bot_id: TELEGRAM_BOT_ID, request_access: "write", lang: "uz" }, async (user) => {
      if (!user) {
        setBusy("");
        return;
      }
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Telegram orqali kirib bo'lmadi.");
        const { error } = await supabase.auth.verifyOtp({ token_hash: body.token_hash, type: "magiclink" });
        if (error) throw error;
        goDashboard();
      } catch (e) {
        setError(e instanceof Error ? friendly(e.message) : "Telegram orqali kirib bo'lmadi.");
        setBusy("");
      }
    });
  }

  const loading = (id: string) => busy === id;

  // Sozlanmagan usullar ko'rsatilmaydi
  const buttons = providers
    ? [
        providers.google && <ProviderButton key="google" label="Google" icon={<GoogleIcon />} onClick={() => oauth("google")} loading={loading("google")} disabled={!!busy} />,
        TELEGRAM_BOT_ID && <ProviderButton key="telegram" label="Telegram" icon={<TelegramIcon />} onClick={telegram} loading={loading("telegram")} disabled={!!busy} />,
      ].filter(Boolean)
    : [];

  return (
    <div>
      {TELEGRAM_BOT_ID && <Script src="https://telegram.org/js/telegram-widget.js?22" strategy="lazyOnload" />}

      <FormError message={error} />
      {info && (
        <div role="status" className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {info}
        </div>
      )}

      {buttons.length > 0 && (
        <>
          <div className={`grid gap-3 ${buttons.length > 1 ? "grid-cols-2" : ""}`}>{buttons}</div>

          <div className="my-7 flex items-center gap-4 text-xs uppercase tracking-wider text-zinc-600">
            <span className="h-px flex-1 bg-white/10" /> yoki email bilan <span className="h-px flex-1 bg-white/10" />
          </div>
        </>
      )}

      <EmailForm mode={mode} disabled={!!busy} onError={setError} onInfo={setInfo} />
    </div>
  );
}

function ProviderButton({
  label,
  icon,
  onClick,
  loading,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {loading ? <Spinner className="size-5" /> : <span className="transition group-hover:scale-110">{icon}</span>}
      {label}
    </button>
  );
}

function EmailForm({
  mode,
  disabled,
  onError,
  onInfo,
}: {
  mode: Mode;
  disabled: boolean;
  onError: (m: string) => void;
  onInfo: (m: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    onInfo("");
    if (!email.trim() || !password) {
      onError("Email va parolni kiriting.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return onError(friendly(error.message));
        if (data.session) goDashboard();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) return onError(friendly(error.message));
        if (data.session) goDashboard();
        else onInfo("Tasdiqlash havolasi emailingizga yuborildi. Uni bosib, hisobingizni faollashtiring.");
      }
    } catch {
      onError("Server bilan bog'lanishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="relative">
        <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="siz@example.com"
          autoComplete="email"
          disabled={loading || disabled}
          className="field !pl-10"
        />
      </div>
      <input
        type="password"
        aria-label="Parol"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === "login" ? "Parol" : "Parol (kamida 6 ta belgi)"}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        disabled={loading || disabled}
        className="field"
      />
      <button type="submit" disabled={loading || disabled} className="btn-primary w-full py-3.5">
        {loading ? <Spinner className="size-4" /> : null}
        {mode === "login" ? "Kirish" : "Hisob yaratish"}
        {!loading && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
