import { test } from "node:test";
import assert from "node:assert/strict";
import { telegramHash, verifyTelegram } from "./telegram";

const token = "123456:TEST-token";
const fields = { id: 42, first_name: "Vali", username: "vali", auth_date: 1790000000 };
const hash = telegramHash(fields, token).toString("hex");

test("to'g'ri imzo qabul qilinadi", () => {
  assert.equal(verifyTelegram({ ...fields, hash }, token), true);
});

test("maydonlar tartibi ahamiyatsiz", () => {
  assert.equal(verifyTelegram({ hash, auth_date: 1790000000, username: "vali", first_name: "Vali", id: 42 }, token), true);
});

test("o'zgartirilgan id rad etiladi", () => {
  assert.equal(verifyTelegram({ ...fields, id: 43, hash }, token), false);
});

test("boshqa bot tokeni bilan rad etiladi", () => {
  assert.equal(verifyTelegram({ ...fields, hash }, "999:other"), false);
});

test("noto'g'ri formatdagi hash rad etiladi", () => {
  assert.equal(verifyTelegram({ ...fields, hash: "abc" }, token), false);
});
