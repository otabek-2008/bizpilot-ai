// Brauzerlarning ko'pchiligida "uz-UZ" lokal ma'lumotlari to'liq emas, shuning uchun o'zimiz formatlaymiz.

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const WEEKDAYS_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

const d = (v: Date | number | string) => (v instanceof Date ? v : new Date(v));

/** 27-sentabr, 2026 */
export const formatDate = (v: Date | number | string, withYear = true) => {
  const x = d(v);
  return `${x.getDate()}-${MONTHS[x.getMonth()]}${withYear ? `, ${x.getFullYear()}` : ""}`;
};

/** 27 sen */
export const formatShortDate = (v: Date | number | string) => {
  const x = d(v);
  return `${x.getDate()} ${MONTHS_SHORT[x.getMonth()]}`;
};

/** Yakshanba, 27-sentabr */
export const formatToday = (v: Date | number | string) => {
  const x = d(v);
  const wd = WEEKDAYS[x.getDay()];
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${formatDate(x, false)}`;
};

export const weekdayShort = (v: Date | number | string) => WEEKDAYS_SHORT[d(v).getDay()];

/** 14:05 */
export const formatTime = (v: Date | number | string) => {
  const x = d(v);
  return `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
};
