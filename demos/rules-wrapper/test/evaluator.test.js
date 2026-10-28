import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCell, evaluate, runTest, coverage } from "../src/evaluator.js";
import { TABLE, TESTS } from "../src/data.js";

test("parses the cell vocabulary", () => {
  assert.deepEqual(parseCell(""), { any: true });
  assert.deepEqual(parseCell('== "C"'), { op: "==", value: "C" });
  assert.deepEqual(parseCell(">= 3"), { op: ">=", value: 3 });
  assert.ok(parseCell("about three").error);
});

test("every fixture test passes against the shipped table", () => {
  for (const t of TESTS) assert.equal(runTest(TABLE, t).status, "PASSED", t.name);
});

test("editing an expression flips a test red", () => {
  const edited = structuredClone(TABLE);
  edited.rows[0].when.lossCount = ">= 3";
  assert.equal(runTest(edited, TESTS[0]).status, "FAILED");
});

test("unset fields count as missing information, never as a guess", () => {
  const r = evaluate(TABLE, { riskScore: "C" });
  assert.deepEqual(r.missing.sort(), ["lossAmount", "lossCount"]);
  assert.deepEqual(r.reasons, []);
});

test("the most severe decision wins when several rows fire", () => {
  const r = evaluate(TABLE, { riskScore: "F", lossCount: 5, lossAmount: 90000 });
  assert.equal(r.decision, "Decline");
  assert.deepEqual(r.rows, [3, 4, 5]);
});

test("coverage flags a row no test reaches", () => {
  const cov = coverage(TABLE, TESTS.slice(0, 2));
  assert.equal(cov.find((c) => c.row === 4).covered, false);
});

test("an unreadable cell is reported, not silently matched", () => {
  const bad = structuredClone(TABLE);
  bad.rows[1].when.riskScore = "D-ish";
  assert.equal(runTest(bad, TESTS[4]).status, "FAILED");
  assert.equal(evaluate(bad, TESTS[4].inputs).errors[0].row, 2);
});
