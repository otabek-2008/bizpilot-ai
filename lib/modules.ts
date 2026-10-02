import {
  BotMessageSquare,
  Briefcase,
  Crown,
  CarFront,
  CaseSensitive,
  FileStack,
  FileUser,
  Globe,
  GraduationCap,
  Headset,
  Languages,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Presentation,
  ScanFace,
  ScrollText,
  Trophy,
  Sigma,
  SpellCheck,
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
  | "reyting"
  | "case"
  | "translit"
  | "spellcheck"
  | "photo"
  | "documents"
  | "business"
  | "assistant"
  | "essay"
  | "cv"
  | "presentation"
  | "prava"
  | "abituriyent"
  | "quiz"
  | "translator"
  | "solver"
  | "chat"
  | "profile"
  | "obuna"
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
  reyting: {
    id: "reyting",
    title: "Reyting",
    short: "Reyting",
    desc: "Eng faol foydalanuvchilar va oliygohlar: haftalik, oylik va umumiy reyting",
    href: "/dashboard/reyting",
    icon: Trophy,
    from: "#f59e0b",
    to: "#eab308",
    enter: "rise",
    badge: "Yangi",
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
  spellcheck: {
    id: "spellcheck",
    title: "Imlo tekshiruvchi",
    short: "Imlo",
    desc: "O'zbek, rus va ingliz matnlaridagi imlo, grammatika va tinish xatolarini tuzatish",
    href: "/dashboard/spellcheck",
    icon: SpellCheck,
    from: "#22c55e",
    to: "#84cc16",
    enter: "blur",
    badge: "AI",
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
  assistant: {
    id: "assistant",
    title: "AI yordamchi",
    short: "AI yordamchi",
    desc: "Fanlar bo'yicha savol bering: tushuntirish, masala yechish, tarjima",
    href: "/dashboard/assistant",
    icon: BotMessageSquare,
    from: "#3b82f6",
    to: "#8b5cf6",
    enter: "pop",
    badge: "AI",
  },
  essay: {
    id: "essay",
    title: "Referat va esse",
    short: "Referat",
    desc: "Mavzu bo'yicha referat, esse, mustaqil ish yoki kurs ishi — tayyor .docx",
    href: "/dashboard/essay",
    icon: ScrollText,
    from: "#f97316",
    to: "#ef4444",
    enter: "drop",
    badge: "AI",
  },
  cv: {
    id: "cv",
    title: "CV / Rezyume",
    short: "CV",
    desc: "Chiroyli shablonlar asosida rezyume tuzing va PDF qilib yuklab oling",
    href: "/dashboard/cv",
    icon: FileUser,
    from: "#0ea5e9",
    to: "#14b8a6",
    enter: "slide",
  },
  presentation: {
    id: "presentation",
    title: "Taqdimot yaratish",
    short: "Taqdimot",
    desc: "Mavzu bo'yicha tayyor slaydlar: AI matn tuzadi, siz PowerPoint (.pptx) qilib yuklab olasiz",
    href: "/dashboard/presentation",
    icon: Presentation,
    from: "#d946ef",
    to: "#8b5cf6",
    enter: "skew",
    badge: "AI",
  },
  abituriyent: {
    id: "abituriyent",
    title: "Abituriyent",
    short: "Abituriyent",
    desc: "DTM, Milliy sertifikat, IELTS, CEFR va SAT bo'yicha testlar va o'quv materiallari",
    href: "/dashboard/abituriyent",
    icon: GraduationCap,
    from: "#22c55e",
    to: "#0ea5e9",
    enter: "rise",
    badge: "Yangi",
  },
  quiz: {
    id: "quiz",
    title: "Test yaratuvchi",
    short: "Test yaratish",
    desc: "Mavzu yoki konspektingizdan AI test tuzadi — har javobdan keyin to'g'ri yoki noto'g'ri ekanini ko'rasiz",
    href: "/dashboard/quiz",
    icon: ListChecks,
    from: "#14b8a6",
    to: "#22c55e",
    enter: "pop",
    badge: "AI",
  },
  translator: {
    id: "translator",
    title: "Tarjimon",
    short: "Tarjimon",
    desc: "O'zbek, rus, ingliz va yana 9 til o'rtasida tabiiy, aniq tarjima",
    href: "/dashboard/translator",
    icon: Globe,
    from: "#0ea5e9",
    to: "#22d3ee",
    enter: "slide",
    badge: "AI",
  },
  solver: {
    id: "solver",
    title: "Masala yechuvchi",
    short: "Masala yechish",
    desc: "Masalani yozing yoki rasmini yuklang — AI bosqichma-bosqich yechib, tushuntirib beradi",
    href: "/dashboard/solver",
    icon: Sigma,
    from: "#f97316",
    to: "#eab308",
    enter: "zoom",
    badge: "AI",
  },
  prava: {
    id: "prava",
    title: "Prava testi",
    short: "Prava testi",
    desc: "Haydovchilik guvohnomasi nazariy imtihoniga tayyorgarlik: biletlar, imtihon rejimi va xatolar ustida ishlash",
    href: "/dashboard/prava",
    icon: CarFront,
    from: "#facc15",
    to: "#ef4444",
    enter: "zoom",
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
  obuna: {
    id: "obuna",
    title: "Obuna",
    short: "Obuna",
    desc: "Bepul sinov, tariflar va to'lov",
    href: "/dashboard/obuna",
    icon: Crown,
    from: "#f59e0b",
    to: "#f97316",
    enter: "pop",
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
  { items: ["dashboard", "reyting"] },
  { label: "Matn vositalari", items: ["case", "translit", "spellcheck"] },
  { label: "Rasm vositalari", items: ["photo"] },
  { label: "Hujjat vositalari", items: ["documents", "cv"] },
  { label: "Imtihonlar", items: ["abituriyent", "prava"] },
  { label: "AI vositalar", items: ["assistant", "solver", "quiz", "translator", "essay", "presentation", "business"] },
  { label: "Yordam", items: ["chat", "contact"] },
  { label: "Hisob", items: ["obuna", "profile"] },
];

// Bosh sahifadagi vosita kartalari tartibi.
export const toolIds: ModuleId[] = [
  "abituriyent",
  "assistant",
  "solver",
  "quiz",
  "translator",
  "essay",
  "prava",
  "spellcheck",
  "case",
  "translit",
  "photo",
  "documents",
  "cv",
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
