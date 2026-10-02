"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// Pullik bo'limlarga kirish holati: bepul sinov tugash sanasi, obuna muddati.

export type Access = {
  loading: boolean;
  active: boolean;
  trialEndsAt: Date | null;
  paidUntil: Date | null;
  plan: string | null;
  refresh: () => Promise<void>;
};

const AccessContext = createContext<Access | null>(null);

export function useAccess(): Access {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess faqat AccessProvider ichida ishlatiladi");
  return ctx;
}

type Row = { trial_ends_at: string | null; paid_until: string | null; plan: string | null; active: boolean };

export default function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<Access, "refresh">>({
    loading: true,
    active: false,
    trialEndsAt: null,
    paidUntil: null,
    plan: null,
  });

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_access");
    const row = (data as Row[] | null)?.[0];
    if (error || !row) {
      // Baza hali sozlanmagan bo'lsa, foydalanuvchini to'smaymiz — server baribir tekshiradi
      if (error) console.warn("Obuna holatini olib bo'lmadi:", error.message);
      setState({ loading: false, active: true, trialEndsAt: null, paidUntil: null, plan: null });
      return;
    }
    setState({
      loading: false,
      active: row.active,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
      paidUntil: row.paid_until ? new Date(row.paid_until) : null,
      plan: row.plan,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tashqi manbadan (Supabase) holatni olish
    void refresh();
  }, [refresh, user.id]);

  return <AccessContext.Provider value={{ ...state, refresh }}>{children}</AccessContext.Provider>;
}

/** Sana gacha qolgan to'liq kunlar (0 dan kam emas). */
export const daysLeft = (d: Date | null) => (d ? Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000)) : 0);
