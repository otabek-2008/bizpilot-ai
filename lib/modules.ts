import {
  Briefcase,
  CaseSensitive,
  FileStack,
  Headset,
  Languages,
  LayoutDashboard,
  MessagesSquare,
  Presentation,
  ScanFace,
  UserRound,
  type LucideIcon,
} from "lucide-react";

// Har bir bo'lim o'z rangi va kirish animatsiyasiga ega.
export type EnterAnimation =
  | "rise"
  | "slide"
  | "flip"
  | "zoom"
  | "blur"
  | "skew"
  | "pop"
  | "slide-left"
  | "drop";

export type ModuleId =
  | "dashboard"
  | "case"
  | "translit"
  | "photo"
  | "documents"
  | "business"
  | "presentation"
  | "chat"
  | "profile"
  | "contact";

export type AppModule = {
  id: ModuleId;
  title: string;
  short: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  from: string;
  to: string;
  enter: EnterAnimation;
  badge?: string;
};

export const modules: Record<ModuleId, AppModule> = {
  dashboard: {
    id: "dashboard",
    title: "Bosh sahifa",
    short: "Bosh sahifa",
    desc: "Statistika va so'nggi faoliyat",
    href: "/dashboard",
    icon: LayoutDashboard,
    from: "#8b5cf6",
    to: "#6366f1",
    enter: "rise",
  },
  case: {
    id: "case",
    title: "Harf registri",
    short: "Harf registri",
    desc: "KATTA, kichik, Sarlavha va Gap registri — o'zbek, rus, ingliz",
    href: "/dashboard/case-converter",
    icon: CaseSensitive,
    from: "#06b6d4",
    to: "#3b82f6",
    enter: "slide",
  },
  translit: {
    id: "translit",
    title: "Lotin ↔ Kirill",
    short: "Lotin ↔ Kirill",
    desc: "O'zbek lotin va kirill yozuvlari o'rtasida aniq o'girish, .txt va .docx",
    href: "/dashboard/transliterate",
    icon: Languages,
    from: "#10b981",
    to: "#14b8a6",
    enter: "flip",
  },
  photo: {
    id: "photo",
    title: "3×4 rasm",
    short: "3×4 rasm",
    desc: "Hujjat uchun 3×4 sm rasm: avtomatik kesish va fon rangi",
    href: "/dashboard/photo-3x4",
    icon: ScanFace,
    from: "#f59e0b",
    to: "#f97316",
    enter: "zoom",
  },
  documents: {
    id: "documents",
    title: "Hujjat konvertori",
    short: "Konvertor",
    desc: "PDF ↔ Word, rasm ↔ PDF, PDF birlashtirish — hammasi brauzerda",
    href: "/dashboard/documents",
    icon: FileStack,
    from: "#f43f5e",
    to: "#ec4899",
    enter: "blur",
  },
  business: {
    id: "business",
    title: "Biznes reja AI",
    short: "Biznes reja",
    desc: "G'oyangizdan biznes reja, marketing va moliyaviy reja — Claude AI",
    href: "/dashboard/business",
    icon: Briefcase,
    from: "#a78bfa",
    to: "#7c3aed",
    enter: "rise",
    badge: "AI",
  },
  presentation: {
    id: "presentation",
    title: "Taqdimot yaratish",
    short: "Taqdimot",
    desc: "Mavzu bo'yicha tayyor slaydlar — tez kunda",
    href: "/dashboard/presentation",
    icon: Presentation,
    from: "#d946ef",
    to: "#8b5cf6",
    enter: "skew",
    badge: "Tez kunda",
  },
  chat: {
    id: "chat",
    title: "Chat / Yordam",
    short: "Chat",
    desc: "Savol bering yoki to'g'ridan-to'g'ri adminga yozing",
    href: "/dashboard/chat",
    icon: MessagesSquare,
    from: "#0ea5e9",
    to: "#6366f1",
    enter: "pop",
  },
  profile: {
    id: "profile",
    title: "Profil sozlamalari",
    short: "Profil",
    desc: "Avatar, ism, bio va parol",
    href: "/dashboard/profile",
    icon: UserRound,
    from: "#14b8a6",
    to: "#06b6d4",
    enter: "slide-left",
  },
  contact: {
    id: "contact",
    title: "Aloqa",
    short: "Aloqa",
    desc: "Admin bilan bog'lanish va ko'p so'raladigan savollar",
    href: "/dashboard/contact",
    icon: Headset,
    from: "#a855f7",
    to: "#ec4899",
    enter: "drop",
  },
};

export const navGroups: { label?: string; items: ModuleId[] }[] = [
  { items: ["dashboard"] },
  { label: "Matn vositalari", items: ["case", "translit"] },
  { label: "Rasm vositalari", items: ["photo"] },
  { label: "Hujjat vositalari", items: ["documents"] },
  { label: "AI vositalar", items: ["business", "presentation"] },
  { label: "Yordam", items: ["chat", "contact"] },
  { label: "Hisob", items: ["profile"] },
];

// Bosh sahifadagi vosita kartalari tartibi.
export const toolIds: ModuleId[] = [
  "case",
  "translit",
  "photo",
  "documents",
  "business",
  "presentation",
];

export function moduleForPath(pathname: string): AppModule {
  if (pathname.startsWith("/dashboard/project")) return modules.business;
  const match = Object.values(modules)
    .filter((m) => m.id !== "dashboard")
    .find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));
  return match ?? modules.dashboard;
}
