import type { ModuleId } from "@/lib/modules";

// Obuna: ro'yxatdan o'tgandan keyin 30 kun bepul, keyin oylik yoki yillik tarif.
// Narx dollarda, Payme esa so'mda qabul qiladi — to'lov paytida Markaziy bank kursi bo'yicha hisoblanadi.

export const TRIAL_DAYS = 30;

export type PlanId = "month" | "year";

export const PLANS: Record<PlanId, { id: PlanId; title: string; usd: number; days: number; note: string }> = {
  month: { id: "month", title: "Oylik", usd: 6.99, days: 30, note: "30 kun" },
  year: { id: "year", title: "Yillik", usd: 60, days: 365, note: "365 kun · oyiga $5" },
};

export const isPlan = (v: unknown): v is PlanId => v === "month" || v === "year";

/** Obuna talab qiladigan bo'limlar. Qolganlari (Abituriyent, Reyting, Yordam, Profil) bepul. */
export const PAID_MODULES: ReadonlySet<ModuleId> = new Set<ModuleId>([
  // AI vositalar
  "assistant",
  "solver",
  "quiz",
  "translator",
  "essay",
  "presentation",
  "business",
  "spellcheck",
  // Prava
  "prava",
  // Hujjat va matn vositalari
  "documents",
  "cv",
  "photo",
  "translit",
  "case",
]);

/** Dollar → so'm, 1000 so'mga yaxlitlab (yuqoriga). */
export const usdToUzs = (usd: number, rate: number) => Math.ceil((usd * rate) / 1000) * 1000;

export const formatUzs = (sum: number) => `${sum.toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
