// Supabase'ning Apple provayderi uchun "Secret Key (for OAuth)" JWT yaratadi.
// Apple bu kalitni ko'pi bilan 6 oy qabul qiladi — muddati tugashidan oldin qayta ishga tushiring.
//
// Ishlatish:
//   node scripts/apple-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <AuthKey_XXXX.p8 yo'li>
// Masalan:
//   node scripts/apple-secret.mjs ABCDE12345 XYZ9876543 uz.campusai.web ~/Downloads/AuthKey_XYZ9876543.p8

import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";

const [teamId, keyId, servicesId, keyPath] = process.argv.slice(2);
if (!teamId || !keyId || !servicesId || !keyPath) {
  console.error("Ishlatish: node scripts/apple-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <AuthKey.p8>");
  process.exit(1);
}

const SIX_MONTHS = 180 * 24 * 60 * 60;
const now = Math.floor(Date.now() / 1000);
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

const header = b64url({ alg: "ES256", kid: keyId, typ: "JWT" });
const payload = b64url({
  iss: teamId,
  iat: now,
  exp: now + SIX_MONTHS,
  aud: "https://appleid.apple.com",
  sub: servicesId,
});

const key = createPrivateKey(readFileSync(keyPath));
const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key, dsaEncoding: "ieee-p1363" });

console.log(`${header}.${payload}.${signature.toString("base64url")}`);
console.error(`\nAmal qilish muddati: ${new Date((now + SIX_MONTHS) * 1000).toLocaleDateString("uz-UZ")} gacha`);
