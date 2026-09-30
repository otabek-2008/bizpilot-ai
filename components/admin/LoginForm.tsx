"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { Spinner } from "@/components/LoadingScreen";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="mt-6 space-y-3">
      {state?.error && (
        <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">
          {state.error}
        </p>
      )}
      <input name="username" aria-label="Login" placeholder="Login" autoComplete="username" required className="field" />
      <input
        name="password"
        type="password"
        aria-label="Parol"
        placeholder="Parol"
        autoComplete="current-password"
        required
        className="field"
      />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending && <Spinner className="size-4" />} Kirish
      </button>
    </form>
  );
}
