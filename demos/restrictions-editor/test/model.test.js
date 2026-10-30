import { test } from "node:test";
import assert from "node:assert/strict";
import { fromSaved, has, set, toggle, groupState, countIn, diff, byState, statesOf } from "../src/model.js";
import { GROUPS, SAVED, STATES } from "../src/data.js";

const all = GROUPS.flatMap((g) => g.partners);

test("about forty fictional partners, every saved restriction on a known partner and state", () => {
  assert.equal(all.length, 40);
  const codes = new Set(STATES.map(([c]) => c));
  for (const [id, sts] of Object.entries(SAVED)) {
    assert.ok(all.some((p) => p.id === id), id);
    for (const st of sts) assert.ok(codes.has(st), st);
  }
});

test("toggle and set never mutate their input", () => {
  const r = fromSaved(SAVED);
  const t = toggle(r, "AN-01", "FL");
  assert.ok(has(t, "AN-01", "FL"));
  assert.ok(!has(r, "AN-01", "FL"));
  const cleared = set(r, ["AN-05"], "FL", false);
  assert.ok(!cleared.has("AN-05"), "an empty partner drops out of the map");
  assert.ok(has(r, "AN-05", "FL"));
});

test("select-all and clear drive the group checkbox through all three states", () => {
  const g = GROUPS[0], ids = g.partners.map((p) => p.id);
  let r = fromSaved(SAVED);
  assert.equal(groupState(r, g, "FL"), "some");
  r = set(r, ids, "FL", true);
  assert.equal(groupState(r, g, "FL"), "all");
  assert.equal(countIn(r, g.partners, "FL"), g.partners.length);
  r = set(r, ids, "FL", false);
  assert.equal(groupState(r, g, "FL"), "none");
  assert.deepEqual(statesOf(r, "AN-02"), ["LA"], "clearing one state leaves the partner's others alone");
});

test("diff lists exactly what save would change, and nothing when a change is undone", () => {
  const saved = fromSaved(SAVED);
  let d = toggle(toggle(saved, "AC-02", "TX"), "AN-05", "FL");
  assert.deepEqual(diff(saved, d), [{ id: "AC-02", st: "TX", on: true }, { id: "AN-05", st: "FL", on: false }]);
  d = toggle(d, "AC-02", "TX");
  assert.equal(diff(saved, d).length, 1);
});

test("the by-state summary inverts the map", () => {
  const s = byState(fromSaved(SAVED));
  assert.deepEqual(s.get("TX"), ["AC-01", "AC-12", "AN-07"]);
  assert.equal([...s.keys()][0], "CA");
});
