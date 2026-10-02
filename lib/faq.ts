import type { ModuleId } from "@/lib/modules";

export type Faq = {
  q: string;
  a: string;
  keywords: string[];
  module?: ModuleId;
};

export const faqs: Faq[] = [
  {
    q: "CampusAI bepulmi?",
    a: "Ro'yxatdan o'tgandan keyin barcha vositalar 30 kun bepul. Keyin AI, prava, hujjat va matn vositalari uchun Premium obuna kerak: oyiga $6.99 yoki yiliga $60 (Visa, Mastercard, Humo, Uzcard karta yoki Payme orqali). Abituriyent testlari, reyting va yordam doim bepul.",
    keywords: ["bepul", "pul", "narx", "tolov", "to'lov", "obuna", "free", "бесплат", "цена"],
  },
  {
    q: "Fayllarim serverga yuklanadimi?",
    a: "Yo'q. Harf registri, Lotin ↔ Kirill, 3×4 rasm va hujjat konvertori to'liq brauzeringizda ishlaydi — fayllaringiz hech qayerga yuborilmaydi.",
    keywords: ["xavfsiz", "maxfiy", "server", "yuklan", "fayl", "privacy", "безопас", "shaxsiy"],
  },
  {
    q: "Lotin ↔ Kirill o'girish qanchalik aniq?",
    a: "Rasmiy imlo qoidalari asosida ishlaydi: o', g', sh, ch, ye/e, ts/s, tutuq belgisi (ъ), s'h kabi holatlar to'g'ri o'giriladi. .docx fayllarda formatlash saqlanadi.",
    keywords: ["lotin", "kirill", "krill", "translit", "o'gir", "ogir", "кирилл", "латин", "docx"],
    module: "translit",
  },
  {
    q: "3×4 rasm qanday tayyorlanadi?",
    a: "Rasmingizni yuklang — yuz avtomatik topilib, hujjat talablariga mos kesiladi. Keyin fon rangini (oq, ko'k) tanlab, 300 yoki 600 DPI da JPG/PNG yuklab olasiz. 10×15 chop etish varag'i ham bor.",
    keywords: ["3x4", "3×4", "rasm", "foto", "surat", "passport", "pasport", "fon", "photo"],
    module: "photo",
  },
  {
    q: "PDF ni Word ga qanday aylantiraman?",
    a: "Hujjat konvertori bo'limida «PDF → Word» ni tanlang va faylni yuklang. Matn va sarlavhalar tahrirlanadigan .docx ga o'tkaziladi. Skanerlangan PDF (rasm) uchun matnni tanib olish hozircha yo'q.",
    keywords: ["pdf", "word", "docx", "konvert", "convert", "birlashtir", "merge", "hujjat"],
    module: "documents",
  },
  {
    q: "Harflarni katta/kichik qilish mumkinmi?",
    a: "Ha — «Harf registri» vositasida KATTA, kichik, Sarlavha, Gap va teskari registr bor. O'zbek, rus va ingliz tillari qo'llab-quvvatlanadi.",
    keywords: ["katta", "kichik", "harf", "registr", "upper", "lower", "case", "регистр"],
    module: "case",
  },
  {
    q: "Taqdimotni qanday yarataman?",
    a: "«Taqdimot yaratish» bo'limida mavzu, slaydlar soni va tilni tanlang — AI slaydlar matni va ma'ruzachi izohlarini tuzadi. Dizaynni tanlab, PowerPoint (.pptx) faylini yuklab olasiz.",
    keywords: ["taqdimot", "slayd", "prezent", "powerpoint", "pptx", "презентац"],
    module: "presentation",
  },
  {
    q: "DTM, IELTS yoki SAT ga qanday tayyorlanaman?",
    a: "«Abituriyent» bo'limida DTM, Milliy sertifikat, IELTS, CEFR va SAT bo'yicha fanlar kesimida testlar va o'quv materiallari bor. Har javobdan keyin to'g'ri yoki noto'g'ri ekani ko'rsatiladi.",
    keywords: ["dtm", "ielts", "sat", "cefr", "sertifikat", "abituriyent", "test", "mock", "imtihon", "oliygoh"],
    module: "abituriyent",
  },
  {
    q: "Masalani rasmga olib yechtirsa bo'ladimi?",
    a: "Ha. «Masala yechuvchi» bo'limida masala rasmini yuklang yoki skrinshotni Ctrl+V bilan qo'ying — AI bosqichma-bosqich yechadi. «Maslahat» tugmasi javobni aytmasdan yo'l ko'rsatadi.",
    keywords: ["masala", "yech", "misol", "matematika", "fizika", "rasm", "solve", "задач"],
    module: "solver",
  },
  {
    q: "Parolni yoki profilimni qanday o'zgartiraman?",
    a: "Profil sozlamalari bo'limida avatar, ism, bio, o'qish joyi va parolni o'zgartirishingiz mumkin.",
    keywords: ["parol", "profil", "avatar", "ism", "password", "пароль", "bio"],
    module: "profile",
  },
  {
    q: "Qanday usullar bilan kirish mumkin?",
    a: "Google, Telegram yoki email va parol orqali kirish mumkin.",
    keywords: ["kirish", "login", "google", "telegram", "ro'yxat", "royxat"],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`]/g, "'");

/** Savolga eng mos FAQ javobini topadi (topilmasa null). */
export function findAnswer(message: string): Faq | null {
  const text = norm(message);
  let best: Faq | null = null;
  let bestScore = 0;
  for (const f of faqs) {
    const score = f.keywords.reduce((n, k) => (text.includes(norm(k)) ? n + 1 : n), 0);
    if (score > bestScore) {
      best = f;
      bestScore = score;
    }
  }
  return best;
}
