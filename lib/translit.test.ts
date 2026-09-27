import { test } from "node:test";
import assert from "node:assert/strict";
import { cyrillicToLatin, detectScript, latinToCyrillic } from "./translit";

const pairs: [string, string][] = [
  ["O'zbekiston Respublikasi", "Ўзбекистон Республикаси"],
  ["G'alaba", "Ғалаба"],
  ["shahar", "шаҳар"],
  ["choy", "чой"],
  ["yo'l", "йўл"],
  ["yoz", "ёз"],
  ["yulduz", "юлдуз"],
  ["yangi", "янги"],
  ["yer", "ер"],
  ["ekin", "экин"],
  ["poeziya", "поэзия"],
  ["kelajak", "келажак"],
  ["ta'lim", "таълим"],
  ["mas'uliyat", "масъулият"],
  ["Is'hoq", "Исҳоқ"],
  ["operatsiya", "операция"],
  ["SHAHAR", "ШАҲАР"],
  ["O'QITUVCHI", "ЎҚИТУВЧИ"],
  ["Toshkent", "Тошкент"],
  ["sentabr", "сентябрь"],
  ["sentabrda", "сентябрда"],
  ["sirk", "цирк"],
  ["xalq", "халқ"],
  ["hayot", "ҳаёт"],
  ["qo'shiq", "қўшиқ"],
  ["ming", "минг"],
];

test("lotin → kirill", () => {
  for (const [lat, cyr] of pairs) {
    assert.equal(latinToCyrillic(lat), cyr, lat);
  }
});

test("kirill → lotin (oddiy apostrof)", () => {
  for (const [lat, cyr] of pairs) {
    assert.equal(cyrillicToLatin(cyr, "simple"), lat, cyr);
  }
});

test("kirill → lotin (rasmiy belgi)", () => {
  assert.equal(cyrillicToLatin("Ўзбекистон", "official"), "Oʻzbekiston");
  assert.equal(cyrillicToLatin("таълим", "official"), "taʼlim");
  assert.equal(cyrillicToLatin("цирк"), "sirk");
  assert.equal(cyrillicToLatin("милиция", "simple"), "militsiya");
  assert.equal(cyrillicToLatin("Шаҳар"), "Shahar");
});

test("turli apostrof belgilari", () => {
  for (const a of ["'", "ʻ", "‘", "’", "`"]) {
    assert.equal(latinToCyrillic(`o${a}qish`), "ўқиш");
  }
});

test("jumla va tinish belgilari saqlanadi", () => {
  const lat = "Salom, dunyo! Bugun 25-sentabr. «Yangi» kitob.";
  assert.equal(latinToCyrillic(lat), "Салом, дунё! Бугун 25-сентябрь. «Янги» китоб.");
});

test("kontekst (prev) bilan bo'laklab o'girish", () => {
  assert.equal(latinToCyrillic("e", "k"), "е");
  assert.equal(latinToCyrillic("e", " "), "э");
});

test("yozuvni aniqlash", () => {
  assert.equal(detectScript("Salom dunyo"), "latin");
  assert.equal(detectScript("Салом дунё"), "cyrillic");
  assert.equal(detectScript("123"), "unknown");
});
