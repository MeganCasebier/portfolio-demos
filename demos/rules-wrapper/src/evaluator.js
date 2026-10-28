// A small rules evaluator over the fictional table. Every cell holds a condition like `== "C"`,
// `>= 3` or `> 50000`; an empty cell matches anything. A row fires when all its cells match.
// Inputs left unset count as missing information: a row that needs one can't be decided, and the
// field is reported back instead of being guessed.

const OPS = {
  "==": (a, b) => a === b, "!=": (a, b) => a !== b,
  ">": (a, b) => a > b, ">=": (a, b) => a >= b,
  "<": (a, b) => a < b, "<=": (a, b) => a <= b,
};
const SEVERITY = ["Accept", "Refer", "Decline"];

export function parseCell(text) {
  const t = String(text ?? "").trim();
  if (t === "") return { any: true };
  const m = t.match(/^(==|!=|>=|<=|>|<)\s*(?:"([^"]*)"|(-?\d+(?:\.\d+)?))$/);
  if (!m) return { error: `Can't read "${t}". Try a comparison like >= 3 or == "C".` };
  return { op: m[1], value: m[2] !== undefined ? m[2] : Number(m[3]) };
}

export function evaluate(table, inputs) {
  const fired = [], missing = new Set(), errors = [];
  table.rows.forEach((row, i) => {
    let match = true, blocked = false;
    for (const col of table.inputs) {
      const cell = parseCell(row.when[col.key]);
      if (cell.error) { errors.push({ row: i + 1, col: col.key, message: cell.error }); match = false; break; }
      if (cell.any) continue;
      const v = inputs[col.key];
      if (v === undefined || v === null || v === "") { missing.add(col.key); blocked = true; continue; }
      if (!OPS[cell.op](v, cell.value)) { match = false; break; }
    }
    if (match && !blocked) fired.push({ row: i + 1, ...row.then });
  });
  const decision = fired.reduce((d, r) => (SEVERITY.indexOf(r.decision) > SEVERITY.indexOf(d) ? r.decision : d), "Accept");
  return { decision, reasons: fired.map((r) => r.reason), rows: fired.map((r) => r.row), missing: [...missing], errors };
}

// A test passes when the decision and the set of reasons both match what was expected.
export function runTest(table, test) {
  const actual = evaluate(table, test.inputs);
  if (actual.errors.length) return { status: "FAILED", actual };
  const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const pass = actual.decision === test.expect.decision && same(actual.reasons, test.expect.reasons);
  return { status: pass ? "PASSED" : "FAILED", actual };
}

// Which rows does any test reach? A changed row nothing triggers gets flagged.
export function coverage(table, tests) {
  const hit = new Set();
  tests.forEach((t) => evaluate(table, t.inputs).rows.forEach((r) => hit.add(r)));
  return table.rows.map((_, i) => ({ row: i + 1, covered: hit.has(i + 1) }));
}
