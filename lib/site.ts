// Sayt bo'yicha umumiy sozlamalar — aloqa ma'lumotlarini shu yerdan o'zgartiring.
export const site = {
  name: "CampusAI",
  tagline: "Talabalar uchun aqlli vositalar to'plami",
  adminEmail: "solijonovotabek886@gmail.com",
  // Telegram username (@ belgisisiz). Bo'sh bo'lsa, Telegram havolasi ko'rsatilmaydi.
  adminTelegram: process.env.NEXT_PUBLIC_ADMIN_TELEGRAM ?? "",
};

export const telegramUrl = site.adminTelegram
  ? `https://t.me/${site.adminTelegram.replace(/^@/, "")}`
  : "";

export const mailtoUrl = (subject = "CampusAI — savol") =>
  `mailto:${site.adminEmail}?subject=${encodeURIComponent(subject)}`;
