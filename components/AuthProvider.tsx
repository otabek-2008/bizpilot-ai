"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toProfile, type Profile } from "@/lib/profile";
import { setActivityUser } from "@/lib/activity";

type AuthState = {
  user: User;
  profile: Profile;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth faqat AuthProvider ichida ishlatiladi");
  return ctx;
}

// Kirmagan foydalanuvchini /login ga yo'naltiradi, kirganlarga kontekst beradi.
export default function AuthProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setActivityUser(data.user.id);
      setUser(data.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setActivityUser(null);
        router.replace("/login");
      } else if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        setUser(session.user);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => (user ? { user, profile: toProfile(user), refresh, signOut } : null),
    [user, refresh, signOut],
  );

  if (!value) return <>{fallback}</>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
