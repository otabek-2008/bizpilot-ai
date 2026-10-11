// Sayt bo'yicha umumiy sozlamalar — aloqa ma'lumotlarini shu yerdan o'zgartiring.
export const site = {
  name: "Studyra",
  tagline: "Talabalar uchun aqlli vositalar to'plami",
  // Saytning asosiy manzili (sitemap, canonical, ijtimoiy tarmoq rasmlari uchun). O'z domeningiz ulansa, env'da almashtiring.
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://bizpilot-ai-upl1.onrender.com").replace(/\/$/, ""),
  adminEmail: "campusaistudy@gmail.com",
  // Telegram username (@ belgisisiz). Env orqali boshqasiga almashtirish mumkin.
  adminTelegram: process.env.NEXT_PUBLIC_ADMIN_TELEGRAM || "campus_admin",
};

export const telegramUrl = site.adminTelegram
  ? `https://t.me/${site.adminTelegram.replace(/^@/, "")}`
  : "";

export const mailtoUrl = (subject = "Studyra — savol") =>
  `mailto:${site.adminEmail}?subject=${encodeURIComponent(subject)}`;
