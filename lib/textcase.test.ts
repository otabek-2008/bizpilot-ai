import { test } from "node:test";
import assert from "node:assert/strict";
import { convertCase, textStats } from "./textcase";

test("KATTA va kichik harflar (uch til)", () => {
  assert.equal(convertCase("o'zbek тили english", "upper"), "O'ZBEK ТИЛИ ENGLISH");
  assert.equal(convertCase("ЎЗБЕК ҚЎШИҒИ HELLO", "lower"), "ўзбек қўшиғи hello");
});

test("Sarlavha registri apostrofni buzmaydi", () => {
  assert.equal(convertCase("o'zbekiston g'alabasi", "title"), "O'zbekiston G'alabasi");
  assert.equal(convertCase("TA'LIM VAZIRLIGI", "title"), "Ta'lim Vazirligi");
  assert.equal(convertCase("привет мир", "title"), "Привет Мир");
});

test("Gap registri", () => {
  assert.equal(
    convertCase("SALOM. QANDAYSIZ? yaxshi!\nyangi qator", "sentence"),
    "Salom. Qandaysiz? Yaxshi!\nYangi qator",
  );
  assert.equal(convertCase("«salom» dedi", "sentence"), "«Salom» dedi");
});

test("Teskari registr", () => {
  assert.equal(convertCase("Salom", "toggle"), "sALOM");
});

test("Statistika", () => {
  assert.deepEqual(textStats("o'zbek tili\nikki"), { chars: 16, words: 3, lines: 2 });
});
