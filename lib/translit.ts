// O'zbek lotin ↔ kirill transliteratsiyasi (1995-yilgi rasmiy imlo qoidalari asosida).
// Sof funksiyalar — DOM yoki React'ga bog'liq emas.

export type ApostropheStyle = "official" | "simple";

// Lotin yozuvida uchraydigan barcha tutuq/o'/g' belgisi variantlari.
const APOS = "'`ʻʼ‘’′";
const isApos = (c: string | undefined) => !!c && APOS.includes(c);

const isLetter = (c: string | undefined) => !!c && /\p{L}/u.test(c);
const isUpper = (c: string | undefined) =>
  !!c && c !== c.toLowerCase() && c === c.toUpperCase();

const LAT_VOWELS = "aeiouAEIOU";
const CYR_VOWELS = "аеёиоуэюяўАЕЁИОУЭЮЯЎ";

// Ruscha o'zlashma so'zlar: lotinda ь/ц yo'qoladi, shuning uchun lug'at kerak.
// Kalit — lotin o'zak (kichik harf), qiymat — [kirill o'zak, so'z yakka bo'lganda qo'shimcha].
const LAT_STEMS: [string, string, string][] = [
  ["yanvar", "январ", "ь"],
  ["fevral", "феврал", "ь"],
  ["aprel", "апрел", "ь"],
  ["iyun", "июн", "ь"],
  ["iyul", "июл", "ь"],
  ["sentabr", "сентябр", "ь"],
  ["oktabr", "октябр", "ь"],
  ["noyabr", "ноябр", "ь"],
  ["dekabr", "декабр", "ь"],
  ["sirk", "цирк", ""],
  ["sement", "цемент", ""],
  ["sex", "цех", ""],
  ["konsert", "концерт", ""],
  ["litsey", "лицей", ""],
  ["sentr", "центр", ""],
  ["sifr", "цифр", ""],
  ["sivilizatsiya", "цивилизация", ""],
  ["kompyuter", "компьютер", ""],
  ["pyesa", "пьеса", ""],
  ["podyezd", "подъезд", ""],
  ["obyekt", "объект", ""],
  ["subyekt", "субъект", ""],
  ["obyektiv", "объектив", ""],
  ["subyektiv", "субъектив", ""],
];

const CYR_STEMS: [string, string][] = [
  ["январь", "yanvar"],
  ["феврал", "fevral"],
  ["октябр", "oktabr"],
  ["сентябр", "sentabr"],
  ["ноябр", "noyabr"],
  ["декабр", "dekabr"],
  ["объект", "obyekt"],
  ["субъект", "subyekt"],
  ["подъезд", "podyezd"],
];

const LAT_SINGLE: Record<string, string> = {
  a: "а", b: "б", c: "ц", d: "д", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж",
  k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "қ", r: "р", s: "с",
  t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з",
};

const CYR_SINGLE: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ж: "j", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "x", ҳ: "h", қ: "q", ш: "sh", ч: "ch", ё: "yo",
  ю: "yu", я: "ya", э: "e", ы: "i", щ: "sh", ь: "",
};

function applyCase(out: string, src: string, allCaps: boolean): string {
  if (!isUpper(src[0])) return out;
  if (allCaps) return out.toUpperCase();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// So'z KATTA harflar bilan yozilganmi (joriy pozitsiyadan kelib chiqib).
function capsContext(text: string, i: number, len: number): boolean {
  const next = text[i + len];
  if (isLetter(next)) return isUpper(next);
  const prev = text[i - 1];
  return isLetter(prev) && isUpper(prev);
}

function matchStem(
  text: string,
  i: number,
  stem: string,
): boolean {
  if (i > 0 && isLetter(text[i - 1])) return false;
  return text.slice(i, i + stem.length).toLowerCase() === stem;
}

/**
 * Lotindan kirillga. `prev` — oldingi matn bo'lagining oxirgi belgisi
 * (masalan .docx'da matn bo'laklarga bo'lingan bo'lsa, kontekstni saqlash uchun).
 */
export function latinToCyrillic(text: string, prev = ""): string {
  const src = prev + text;
  let out = "";
  let i = prev.length;

  while (i < src.length) {
    const c = src[i];
    const lc = c.toLowerCase();
    const n1 = src[i + 1];
    const l1 = n1?.toLowerCase();

    // Lug'atdagi o'zlashma so'zlar
    const stem = isLetter(c)
      ? LAT_STEMS.find(([lat]) => matchStem(src, i, lat))
      : undefined;
    if (stem) {
      const [lat, cyr, soft] = stem;
      const after = src[i + lat.length];
      const caps = capsContext(src, i, lat.length);
      const word = cyr + (isLetter(after) ? "" : soft);
      out += applyCase(word, src.slice(i, i + lat.length), caps);
      i += lat.length;
      continue;
    }

    // o' / g'
    if ((lc === "o" || lc === "g") && isApos(n1)) {
      out += isUpper(c) ? (lc === "o" ? "Ў" : "Ғ") : lc === "o" ? "ў" : "ғ";
      i += 2;
      continue;
    }

    // s'h → сҳ (sh harf birikmasi emas)
    if (lc === "s" && isApos(n1) && src[i + 2]?.toLowerCase() === "h") {
      const caps = capsContext(src, i, 3);
      out += isUpper(c) ? "С" : "с";
      out += isUpper(src[i + 2]) || caps ? "Ҳ" : "ҳ";
      i += 3;
      continue;
    }

    // Ikki harfli birikmalar
    if (lc === "s" && l1 === "h") {
      out += isUpper(c) ? "Ш" : "ш";
      i += 2;
      continue;
    }
    if (lc === "c" && l1 === "h") {
      out += isUpper(c) ? "Ч" : "ч";
      i += 2;
      continue;
    }
    if (lc === "y" && l1 && "oueaOUEA".includes(n1!)) {
      // yo' → йў (masalan "yo'l")
      if (l1 === "o" && isApos(src[i + 2])) {
        out += isUpper(c) ? "Й" : "й";
        i += 1;
        continue;
      }
      const map: Record<string, string> = { o: "ё", u: "ю", e: "е", a: "я" };
      out += isUpper(c) ? map[l1].toUpperCase() : map[l1];
      i += 2;
      continue;
    }
    // -tsiya → -ция (operatsiya, revolyutsiya)
    if (lc === "t" && src.slice(i + 1, i + 5).toLowerCase() === "siya") {
      out += isUpper(c) ? "Ц" : "ц";
      i += 2;
      continue;
    }

    // e: so'z boshida va unlidan keyin → э
    if (lc === "e") {
      const p = src[i - 1];
      const afterVowel = !!p && LAT_VOWELS.includes(p);
      const afterOApos = isApos(p) && "oO".includes(src[i - 2] ?? "");
      const wordStart = !isLetter(p) && !isApos(p);
      const e = wordStart || afterVowel || afterOApos ? "э" : "е";
      out += isUpper(c) ? e.toUpperCase() : e;
      i += 1;
      continue;
    }

    // Tutuq belgisi (ikki harf orasida) → ъ
    if (isApos(c) && isLetter(src[i - 1]) && isLetter(n1)) {
      const caps = isUpper(src[i - 1]) && isUpper(n1);
      out += caps ? "Ъ" : "ъ";
      i += 1;
      continue;
    }

    const mapped = LAT_SINGLE[lc];
    if (mapped) {
      out += isUpper(c) ? mapped.toUpperCase() : mapped;
    } else {
      out += c;
    }
    i += 1;
  }

  return out;
}

/** Kirilldan lotinga. */
export function cyrillicToLatin(
  text: string,
  style: ApostropheStyle = "official",
  prev = "",
): string {
  const oq = style === "official" ? "ʻ" : "'"; // o‘, g‘
  const tq = style === "official" ? "ʼ" : "'"; // tutuq

  const src = prev + text;
  let out = "";
  let i = prev.length;

  while (i < src.length) {
    const c = src[i];
    const lc = c.toLowerCase();

    const stem = isLetter(c)
      ? CYR_STEMS.find(([cyr]) => matchStem(src, i, cyr))
      : undefined;
    if (stem) {
      const [cyr, lat] = stem;
      const caps = capsContext(src, i, cyr.length);
      out += applyCase(lat, src.slice(i, i + cyr.length), caps);
      i += cyr.length;
      // Qolgan ь (masalan "октябрь") tashlab yuboriladi
      if (src[i]?.toLowerCase() === "ь") i += 1;
      continue;
    }

    const caps = capsContext(src, i, 1);
    const p = src[i - 1];

    if (lc === "ў" || lc === "ғ") {
      const base = lc === "ў" ? "o" : "g";
      out += (isUpper(c) ? base.toUpperCase() : base) + oq;
      i += 1;
      continue;
    }

    if (lc === "е") {
      const afterVowel = !!p && (CYR_VOWELS.includes(p) || "ъьЪЬ".includes(p));
      const wordStart = !isLetter(p);
      const lat = wordStart || afterVowel ? "ye" : "e";
      out += applyCase(lat, c, caps);
      i += 1;
      continue;
    }

    if (lc === "ц") {
      const lat = p && CYR_VOWELS.includes(p) ? "ts" : "s";
      out += applyCase(lat, c, caps);
      i += 1;
      continue;
    }

    if (lc === "ъ") {
      // Tutuq belgisi faqat harflar orasida yoziladi
      if (isLetter(p) && isLetter(src[i + 1])) out += tq;
      i += 1;
      continue;
    }

    // сҳ → s'h
    if (lc === "с" && src[i + 1]?.toLowerCase() === "ҳ") {
      out += (isUpper(c) ? "S" : "s") + tq;
      i += 1;
      continue;
    }

    const mapped = CYR_SINGLE[lc];
    if (mapped !== undefined) {
      out += applyCase(mapped, c, caps);
    } else {
      out += c;
    }
    i += 1;
  }

  return out;
}

export type Script = "latin" | "cyrillic" | "unknown";

/** Matn qaysi yozuvda ekanini aniqlaydi. */
export function detectScript(text: string): Script {
  let lat = 0;
  let cyr = 0;
  for (const ch of text.slice(0, 5000)) {
    if (/[a-z]/i.test(ch)) lat++;
    else if (/[Ѐ-ӿ]/.test(ch)) cyr++;
  }
  if (!lat && !cyr) return "unknown";
  return cyr > lat ? "cyrillic" : "latin";
}
