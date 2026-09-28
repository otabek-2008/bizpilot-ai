import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInline, parseMarkdown } from "./markdown";

test("sarlavha, paragraf va ro'yxatlar", () => {
  const blocks = parseMarkdown("# Kirish\n\nBirinchi qator\nikkinchi qator\n\n- bir\n- ikki\n\n1. uch\n2. to'rt");
  assert.deepEqual(
    blocks.map((b) => b.type),
    ["heading", "paragraph", "list", "list"],
  );
  assert.equal(blocks[1].type === "paragraph" && blocks[1].inline[0].text, "Birinchi qator ikkinchi qator");
  assert.equal(blocks[2].type === "list" && blocks[2].ordered, false);
  assert.equal(blocks[3].type === "list" && blocks[3].items.length, 2);
});

test("qalin, kursiv va kod", () => {
  assert.deepEqual(parseInline("a **b** *c* `d`"), [
    { text: "a " },
    { text: "b", bold: true },
    { text: " " },
    { text: "c", italic: true },
    { text: " " },
    { text: "d", code: true },
  ]);
});

test("o'zbekcha tutuq belgisi va so'z ichidagi pastki chiziq buzilmaydi", () => {
  assert.deepEqual(parseInline("O'zbekiston va file_name_x"), [
    { text: "O'zbekiston va file" },
    { text: "_name_" },
    { text: "x" },
  ]);
});

test("kod bloki ichidagi markdown o'zgarmaydi", () => {
  const [b] = parseMarkdown("```\n# emas\n- ro'yxat emas\n```");
  assert.deepEqual(b, { type: "code", text: "# emas\n- ro'yxat emas" });
});

test("tugallanmagan kod bloki (oqim paytida) ham ishlaydi", () => {
  const blocks = parseMarkdown("Matn\n```\nconsole.log(1)");
  assert.equal(blocks.at(-1)?.type, "code");
});
