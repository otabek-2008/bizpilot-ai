import { test } from "node:test";
import assert from "node:assert/strict";
import { createToken, safeEqual, verifyToken } from "./admin/token";

const key = Buffer.from("a".repeat(32));
const now = 1_790_000_000_000;

test("yangi token qabul qilinadi", () => {
  assert.equal(verifyToken(key, createToken(key, 3600, now), now), true);
});

test("muddati o'tgan token rad etiladi", () => {
  const token = createToken(key, 3600, now);
  assert.equal(verifyToken(key, token, now + 3601 * 1000), false);
});

test("boshqa kalit bilan imzolangan token rad etiladi", () => {
  const token = createToken(Buffer.from("b".repeat(32)), 3600, now);
  assert.equal(verifyToken(key, token, now), false);
});

test("muddati o'zgartirilgan (soxtalashtirilgan) token rad etiladi", () => {
  const [, signature] = createToken(key, 3600, now).split(".");
  const forged = Buffer.from(JSON.stringify({ exp: now / 1000 + 10 ** 9 })).toString("base64url");
  assert.equal(verifyToken(key, `${forged}.${signature}`, now), false);
});

test("bo'sh va buzilgan tokenlar rad etiladi", () => {
  for (const t of [undefined, "", ".", "abc", "abc.", ".abc", "a.b.c", createToken(key, 3600, now) + ".x"]) {
    assert.equal(verifyToken(key, t, now), false, String(t));
  }
});

test("safeEqual", () => {
  assert.equal(safeEqual("parol", "parol"), true);
  assert.equal(safeEqual("parol", "Parol"), false);
  assert.equal(safeEqual("", "x"), false);
});
