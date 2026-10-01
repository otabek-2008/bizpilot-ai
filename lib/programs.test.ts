import { test } from "node:test";
import assert from "node:assert/strict";
import data from "./programs-data.json";
import { loadPrograms, searchPrograms } from "./programs";
import { universityById } from "./universities";

test("yo'nalishlar: har bir oliygoh ro'yxatda bor, kodlar bakalavriat va nomli", () => {
  for (const [id, entries] of Object.entries(data.universities)) {
    assert.ok(universityById(id), id);
    assert.ok(entries.length > 0, id);
    for (const e of entries) {
      const [code, own] = e.split("|");
      assert.match(code, /^6\d{7}$/, `${id}: ${e}`);
      assert.ok(own || (data.names as Record<string, string>)[code], `${id}: ${code}`);
    }
  }
});

test("yo'nalishlar: oliygohniki alohida, noma'lumida — umumiy ro'yxat", async () => {
  const nuu = await loadPrograms("mirzo-ulugbek-nomidagi-ozbekiston-milliy-universiteti");
  const tdtu = await loadPrograms("islom-karimov-nomidagi-toshkent-davlat-texnika-universiteti");
  assert.ok(nuu.own && tdtu.own);
  assert.notDeepEqual(nuu.list, tdtu.list);
  assert.ok(nuu.list.some((p) => p.name === "Amaliy matematika"));

  const all = await loadPrograms(null);
  assert.equal(all.own, false);
  assert.ok(all.list.length > nuu.list.length);
  assert.equal(new Set(all.list.map((p) => p.name.toLowerCase())).size, all.list.length);

  assert.ok(searchPrograms(tdtu.list, "60410100").length >= 1);
});
