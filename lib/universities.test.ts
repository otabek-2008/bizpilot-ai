import { test } from "node:test";
import assert from "node:assert/strict";
import { REGIONS, UNIVERSITIES, searchUniversities, universityById } from "./universities";

test("oliygohlar: id va nomlar takrorlanmaydi, viloyatlar ro'yxatda bor", () => {
  assert.ok(UNIVERSITIES.length > 150);
  assert.equal(new Set(UNIVERSITIES.map((u) => u.id)).size, UNIVERSITIES.length);
  assert.equal(new Set(UNIVERSITIES.map((u) => u.name.toLowerCase())).size, UNIVERSITIES.length);
  for (const u of UNIVERSITIES) assert.ok((REGIONS as readonly string[]).includes(u.region), u.name);
  assert.ok(UNIVERSITIES.some((u) => u.type === "davlat") && UNIVERSITIES.some((u) => u.type === "nodavlat"));
});

test("oliygoh qidiruvi: bir nechta so'z, apostrof va registrdan qat'i nazar", () => {
  const r = searchUniversities("axborot texnologiyalari samarqand");
  assert.ok(r.length >= 1 && r.every((u) => /samarqand/i.test(u.name + u.region)));
  assert.ok(searchUniversities("FARG'ONA").length > 0);
  assert.ok(searchUniversities("fargona").length > 0);
  assert.equal(searchUniversities("qwertyxyz").length, 0);
  assert.equal(universityById(r[0].id)?.name, r[0].name);
});
