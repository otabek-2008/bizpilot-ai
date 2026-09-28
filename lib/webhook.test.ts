import { test } from "node:test";
import assert from "node:assert/strict";
import { signWebhook, verifyWebhook } from "./webhook";

const secret = "v1,whsec_" + Buffer.from("super-secret-key-for-tests").toString("base64");
const body = JSON.stringify({ user: { phone: "998901234567" }, sms: { otp: "123456" } });
const now = 1_790_000_000;
const sig = signWebhook(secret, "msg_1", now, body);

test("to'g'ri imzo qabul qilinadi", () => {
  assert.equal(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: `v1,${sig}` }, body, now), true);
});

test("bir nechta imzodan biri to'g'ri bo'lsa ham qabul qilinadi", () => {
  const header = `v1,AAAA v1,${sig}`;
  assert.equal(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: header }, body, now), true);
});

test("o'zgartirilgan body rad etiladi", () => {
  assert.equal(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: `v1,${sig}` }, body + " ", now), false);
});

test("eskirgan timestamp rad etiladi", () => {
  assert.equal(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: `v1,${sig}` }, body, now + 600), false);
});

test("sarlavhalar yo'q bo'lsa rad etiladi", () => {
  assert.equal(verifyWebhook(secret, { id: null, timestamp: String(now), signature: `v1,${sig}` }, body, now), false);
});
