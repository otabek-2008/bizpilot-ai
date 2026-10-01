import { test } from "node:test";
import assert from "node:assert/strict";
import { CSV_TEMPLATE, examFormat, examPassed, normalizeQuestion, parseCorrect, parseCsv, parseImport, score, shuffle, type PravaQuestion } from "./prava";

test("parseCsv: qo'shtirnoq, ichki ajratgich va yangi qator", () => {
  const rows = parseCsv('a;b;c\n1;"x; y";"ko\'p\nqatorli"\r\n2;"""q""";\n\n');
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["1", "x; y", "ko'p\nqatorli"],
    ["2", '"q"', ""],
  ]);
});

test("parseCsv: vergul va tab ajratgichlarini aniqlaydi", () => {
  assert.deepEqual(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parseCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
});

test("parseCorrect: raqam (1 dan) va harf", () => {
  assert.equal(parseCorrect("1", 3), 0);
  assert.equal(parseCorrect("c", 3), 2);
  assert.throws(() => parseCorrect("4", 3));
  assert.throws(() => parseCorrect("", 3));
});

test("normalizeQuestion: bo'sh variantlar tashlanadi, maydonlar tozalanadi", () => {
  const q = normalizeQuestion({ ticket: "3", question: "  Savol ", options: ["A", "", "B", " "], correct: "3", image: "/img/1.jpg", active: "" });
  assert.deepEqual(q, {
    ticket: 3, position: null, topic: null, question: "Savol", options: ["A", "B"], correct: 1,
    explanation: null, image: "img/1.jpg", active: true,
  });
  assert.equal(normalizeQuestion({ question: "S", options: ["A", "B"], correct: 0, correctIsIndex: true, active: "0" }).active, false);
  assert.throws(() => normalizeQuestion({ question: "S", options: ["A"], correct: "1" }), /Kamida/);
  // Bo'sh variant olib tashlansa ham to'g'ri javob o'sha variantda qoladi
  assert.equal(normalizeQuestion({ question: "S", options: ["A", "", "C"], correct: 2, correctIsIndex: true }).correct, 1);
  assert.throws(() => normalizeQuestion({ question: "S", options: ["A", "", "C"], correct: "2" }), /bo'sh/);
  assert.throws(() => normalizeQuestion({ question: "S", options: ["A", "B"], correct: "1", image: "../x" }), /Rasm/);
  assert.throws(() => normalizeQuestion({ question: "S", options: ["A", "B"], correct: "1", ticket: "1.5" }), /Bilet/);
});

test("parseImport: namuna CSV o'qiladi", () => {
  const { questions, errors } = parseImport(CSV_TEMPLATE);
  assert.deepEqual(errors, []);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].ticket, 1);
  assert.deepEqual(questions[0].options, ["1-javob", "2-javob", "3-javob"]);
  assert.equal(questions[0].correct, 1);
  assert.equal(questions[0].image, "rasm-fayli.jpg");
});

test("parseImport: CSV xato qatorlarini raqami bilan qaytaradi", () => {
  const { questions, errors } = parseImport("savol,A,B,togri\nS1,x,y,B\nS2,x,y,C\n");
  assert.equal(questions.length, 1);
  assert.deepEqual(errors.length, 1);
  assert.match(errors[0], /^3-qator/);
});

test("parseImport: JSON (o'zbekcha va inglizcha kalitlar)", () => {
  const { questions, errors } = parseImport(
    JSON.stringify([
      { bilet: 2, savol: "S", javoblar: ["a", "b"], togri: 2 },
      { ticket: 2, question: "Q", options: ["a", "b", "c"], correct: "A", image: "x.png" },
      { savol: "yo'q" },
    ]),
  );
  assert.equal(questions.length, 2);
  assert.equal(questions[0].correct, 1);
  assert.equal(questions[1].image, "x.png");
  assert.match(errors[0], /^3-savol/);
  assert.match(parseImport("[").errors[0], /JSON/);
});

const q = (id: number, correct: number): PravaQuestion => ({
  id, ticket: 1, position: id, topic: null, question: `S${id}`, options: ["a", "b", "c"], correct, explanation: null, image: null, active: true,
});

test("score va examPassed", () => {
  const qs = [q(1, 0), q(2, 1), q(3, 2)];
  assert.deepEqual(score(qs, { 1: 0, 2: 0 }), { correct: 1, wrong: 1, answered: 2, total: 3 });

  const withWrong = (n: number, wrong: number, unanswered = 0) => {
    const list = Array.from({ length: n }, (_, i) => q(i + 1, 0));
    const answers = Object.fromEntries(list.slice(unanswered).map((x, i) => [x.id, i < wrong ? 1 : 0]));
    return [list, answers] as const;
  };
  const f20 = examFormat(20);
  const f50 = examFormat(50);
  assert.equal(examPassed(...withWrong(20, 2), f20), true); // 18/20 — o'tdi
  assert.equal(examPassed(...withWrong(20, 3), f20), false); // 17/20 — o'tmadi
  assert.equal(examPassed(...withWrong(20, 0, 3), f20), false); // 3 ta javobsiz — 17 ta to'g'ri
  assert.equal(examPassed(...withWrong(50, 4), f50), true); // 46/50 — o'tdi
  assert.equal(examPassed(...withWrong(50, 5), f50), false); // 45/50 — o'tmadi
  assert.equal(examPassed(...withWrong(20, 0), f50), false); // savollar soni formatga mos emas
});

test("shuffle elementlarni yo'qotmaydi", () => {
  const src = [1, 2, 3, 4, 5];
  const out = shuffle(src, () => 0);
  assert.deepEqual([...out].sort(), src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
});
