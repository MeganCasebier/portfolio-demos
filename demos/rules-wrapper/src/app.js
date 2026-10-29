// The Rules Wrapper: a designed shell around a table design couldn't change.
// State lives here; each region re-renders on its own, so typing never loses focus.
import { parseCell, evaluate, runTest, coverage } from "./evaluator.js";
import { TABLE, TESTS, GROUPS, FILTERS, VERSIONS, APPROVERS, STATUSES, REASONS } from "./data.js";

const clone = (x) => structuredClone(x);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const app = document.getElementById("app");
const SHORT = { riskScore: "Score", lossCount: "Losses", lossAmount: "Largest loss" };
const TIP_TEXT = "The engine’s table — design couldn’t change its shape.";

let nextId = 1;
const withId = (t) => ({ id: nextId++, ...t });

const state = {
  filters: { carrier: FILTERS.carrier[0], line: FILTERS.line[0], type: FILTERS.type[0] },
  groupId: "loss-history",
  mode: "browse", // browse | edit | review
  active: { version: "2.1", table: clone(TABLE) },
  pending: null, // { version, status, table, note, approver, date }
  versions: clone(VERSIONS),
  draft: null,
  record: { date: "", note: "", approver: "", errors: {} },
  tests: TESTS.map(withId),
  results: {}, // id -> { status, actual }
  live: false,
  flipped: new Set(),
  testFilter: "All",
  form: null, // the New Test form, when open
  proposals: null, // tests generated from rows, awaiting confirmation
  showVersions: false,
  showLegend: false,
  tried: false, // hides the first-visit hint once someone has edited
};

// ---------- derived ----------
const shownTable = () => (state.mode !== "browse" ? state.draft : state.pending ? state.pending.table : state.active.table);
const group = () => GROUPS.find((g) => g.id === state.groupId);
const nextVersion = () => { const [a, b] = state.active.version.split(".").map(Number); return `${a}.${b + 1}`; };
function changedCells(table = shownTable()) {
  const base = state.active.table, out = [];
  table.rows.forEach((row, i) => {
    base.inputs.forEach((c) => { const was = base.rows[i].when[c.key] ?? "", now = row.when[c.key] ?? ""; if (was.trim() !== now.trim()) out.push({ row: i + 1, col: c.label, was, now }); });
    if (row.then.decision !== base.rows[i].then.decision) out.push({ row: i + 1, col: "Decision", was: base.rows[i].then.decision, now: row.then.decision });
  });
  return out;
}
const changedRows = () => [...new Set(changedCells().map((c) => c.row))];
const tableErrors = (table) => { const e = []; table.rows.forEach((r, i) => table.inputs.forEach((c) => { const p = parseCell(r.when[c.key]); if (p.error) e.push({ row: i + 1, col: c.key }); })); return e; };

function runAll({ quiet } = {}) {
  const t = shownTable(), before = state.results;
  state.results = {};
  state.flipped = new Set();
  state.tests.forEach((test) => {
    const r = runTest(t, test);
    state.results[test.id] = r;
    if (before[test.id] && before[test.id].status !== r.status) state.flipped.add(test.id);
  });
  state.live = true;
  if (!quiet) toast(summaryLine());
}
function summaryLine() {
  const c = counts();
  return c.failed ? `${c.failed} failing, ${c.passed} passing` : `All ${c.passed} tests pass`;
}
function counts() {
  const c = { failed: 0, passed: 0, notrun: 0 };
  state.tests.forEach((t) => { const s = state.results[t.id]?.status; if (s === "FAILED") c.failed++; else if (s === "PASSED") c.passed++; else c.notrun++; });
  return c;
}

// ---------- small pieces ----------
const pill = (status) => `<span class="pill pill--${status.toLowerCase().replace(/ /g, "-")}">${esc(status)}</span>`;
const chip = (text) => `<span class="cchip">${esc(text)}</span>`;
const kv = (label, v) => `<span class="kv">${esc(label)} <b>${v === undefined || v === "" ? "not set" : esc(typeof v === "number" ? v.toLocaleString("en-US") : v)}</b></span>`;
const code = (text, cls = "") => `<span class="code ${cls}">${esc(text)}</span>`;
const decision = (d) => `<span class="dec dec--${d.toLowerCase()}">${esc(d)}</span>`;

// ---------- the bar: filters ----------
function renderBar() {
  const groupRow = (key, label) => `
    <div class="filter" role="group" aria-label="${label}">
      ${FILTERS[key].map((v) => `<button type="button" class="fchip" data-action="filter" data-key="${key}" data-value="${esc(v)}" aria-pressed="${state.filters[key] === v}" ${state.mode !== "browse" ? "disabled" : ""}>${esc(v.replace(/^All /, "All "))}</button>`).join("")}
    </div>`;
  return `
    <div class="bar">
      <p class="brand"><span class="brand-mark" aria-hidden="true"></span>Rules manager</p>
      <div class="filters">${groupRow("carrier", "Carrier")}${groupRow("line", "Line")}${groupRow("type", "Type")}</div>
    </div>`;
}

// ---------- the group list ----------
function visibleGroups() {
  const f = state.filters;
  return GROUPS.filter((g) => (f.carrier === FILTERS.carrier[0] || g.carriers.includes(f.carrier)) && (f.line === FILTERS.line[0] || g.line === f.line) && (f.type === FILTERS.type[0] || g.type === f.type));
}
function renderGroups() {
  const list = visibleGroups();
  if (!list.length) return `<nav class="groups" aria-label="Rule groups"><div class="empty-small"><p><b>No groups match.</b></p><p>No rule group covers that combination. Try fewer filters.</p><button type="button" class="link" data-action="clear-filters">Clear filters</button></div></nav>`;
  return `<nav class="groups" aria-label="Rule groups"><p class="label">${list.length} group${list.length > 1 ? "s" : ""}</p><ul>${list.map((g) => {
    const live = g.id === "loss-history" && state.pending ? state.pending.status : g.status;
    return `<li><button type="button" class="group" data-action="group" data-id="${g.id}" aria-current="${g.id === state.groupId}" ${state.mode !== "browse" ? "disabled" : ""}>
      <span class="group-name">${esc(g.name)}</span>
      <span class="group-meta">${esc(g.type)} &middot; ${esc(g.line)}</span>
      <span class="group-foot">${pill(live)}<span class="muted">${g.rules} rules</span></span>
    </button></li>`;
  }).join("")}</ul></nav>`;
}

// ---------- the context bar ----------
function renderContext() {
  const g = group();
  const ver = state.mode !== "browse"
    ? `<span class="ver">v${state.active.version} ${pill("Active")}</span><span class="arrow" aria-hidden="true">&rarr;</span><span class="ver">v${nextVersion()} ${pill("Draft")}</span>`
    : state.pending && g.full
      ? `<span class="ver">v${state.active.version} ${pill("Active")}</span><span class="arrow" aria-hidden="true">&rarr;</span><span class="ver">v${state.pending.version} ${pill(state.pending.status)}</span>`
      : `<span class="ver">v${g.full ? state.active.version : g.version} ${pill(g.status)}</span>`;
  const actions = !g.full ? "" : state.mode === "browse"
    ? `${state.pending ? "" : `<button type="button" class="btn btn--primary" data-action="edit">Edit rules</button>`}
       <button type="button" class="btn btn--quiet" data-action="versions" aria-expanded="${state.showVersions}">History</button>`
    : `<button type="button" class="btn btn--quiet" data-action="cancel">Cancel edit</button>`;
  return `
    <div class="context">
      <div class="context-main">
        <h2>${esc(g.name)}</h2>
        <p class="context-meta"><span>${esc(g.type)}</span><span>${esc(g.line)}</span><span>${g.carriers.map(chip).join("")}</span><span>${g.rules} rules</span></p>
      </div>
      <div class="context-ver">${ver}<button type="button" class="legend-btn" data-action="legend" aria-expanded="${state.showLegend}" aria-label="What the statuses mean">?</button></div>
      <div class="context-actions">${actions}</div>
    </div>
    ${state.showLegend ? renderLegend() : ""}
    ${state.showVersions && state.mode === "browse" ? renderVersions() : ""}`;
}
function renderLegend() {
  return `<div class="legend" role="note">
    <p class="legend-row">${STATUSES.map(pill).join('<span class="arrow" aria-hidden="true">&rarr;</span>')}</p>
    <p class="legend-note">There&rsquo;s no &ldquo;Approved&rdquo;: every waiting state names whose queue it&rsquo;s in, and a rule that&rsquo;s approved but not running is a state where nothing is true.</p>
  </div>`;
}
function renderVersions() {
  const rows = [...(state.pending ? [{ version: state.pending.version, status: state.pending.status, by: "You", date: state.pending.date || "No date yet", note: state.pending.note || "No description yet" }] : []), ...state.versions];
  return `<div class="versions"><p class="label">Version history</p><ul>${rows.map((v) => `<li><span class="mono">v${v.version}</span>${pill(v.status)}<span class="v-note">${esc(v.note)}</span><span class="muted">${esc(v.by)} &middot; ${esc(niceDate(v.date))}</span></li>`).join("")}</ul></div>`;
}

// ---------- the stepper ----------
function renderStepper() {
  if (state.mode === "browse") return "";
  const n = changedCells().length, errs = tableErrors(state.draft).length;
  const step = (i, title, sub, on, done) => `<li class="step ${on ? "is-on" : ""} ${done ? "is-done" : ""}"><span class="step-n">${done ? "&check;" : i}</span><span><b>${title}</b><span class="muted">${sub}</span></span></li>`;
  return `<ol class="stepper">${step(1, "Edit values", "Inside the engine’s table", state.mode === "edit", state.mode === "review")}${step(2, "Review &amp; submit", "Describe it, name an approver", state.mode === "review", false)}</ol>
    ${state.mode === "edit" ? `<div class="stepper-foot"><span class="muted" id="change-count">${errs ? `<span class="err-text">${errs} cell${errs > 1 ? "s" : ""} can&rsquo;t be read</span>` : n ? `${n} change${n > 1 ? "s" : ""}` : "No changes yet"}</span><button type="button" class="btn btn--primary" data-action="to-review" id="to-review" ${n && !errs ? "" : "disabled"}>Next: review</button></div>` : ""}`;
}

// ---------- the core: the engine's table ----------
function renderCore() {
  const t = shownTable(), editing = state.mode === "edit", base = state.active.table;
  const ins = t.inputs;
  const head = `<tr><th class="n" scope="col"><span class="sr">Row</span></th>${ins.map((c) => `<th scope="col"><button type="button" class="cell cell--head" data-action="tip">${esc(c.key)}</button></th>`).join("")}<th scope="col" class="split"><button type="button" class="cell cell--head" data-action="tip">decision</button></th><th scope="col"><button type="button" class="cell cell--head" data-action="tip">reason</button></th></tr>`;
  const body = t.rows.map((row, i) => {
    const cells = ins.map((c) => {
      const v = row.when[c.key] ?? "", changed = (base.rows[i].when[c.key] ?? "").trim() !== v.trim();
      if (editing) {
        const bad = parseCell(v).error;
        return `<td class="${changed ? "is-changed" : ""} ${bad ? "is-bad" : ""}"><input class="cell-in" data-row="${i}" data-col="${c.key}" value="${esc(v)}" aria-label="Row ${i + 1}, ${esc(c.label)}" spellcheck="false" autocomplete="off" placeholder="any"></td>`;
      }
      return `<td class="${changed ? "is-changed" : ""}"><button type="button" class="cell" data-action="tip">${v ? esc(v) : '<span class="any">any</span>'}</button></td>`;
    }).join("");
    const d = row.then.decision, dChanged = d !== base.rows[i].then.decision;
    const dec = editing
      ? `<td class="split ${dChanged ? "is-changed" : ""}"><select class="cell-sel" data-row="${i}" aria-label="Row ${i + 1}, decision">${["Accept", "Refer", "Decline"].map((o) => `<option ${o === d ? "selected" : ""}>${o}</option>`).join("")}</select></td>`
      : `<td class="split ${dChanged ? "is-changed" : ""}"><button type="button" class="cell" data-action="tip">&quot;${esc(d)}&quot;</button></td>`;
    return `<tr><th class="n" scope="row">${i + 1}</th>${cells}${dec}<td><button type="button" class="cell cell--reason" data-action="tip">&quot;${esc(row.then.reason)}&quot;</button></td></tr>`;
  }).join("");
  return `
    <section class="core ${editing ? "is-editing" : ""}" id="core" aria-label="The engine's rules table">
      <div class="core-head">
        <span class="core-tag">${editing ? "Inside the engine &middot; values only" : "The engine&rsquo;s table &middot; read-only"}</span>
        <span class="core-note">${editing ? "The shape is the engine&rsquo;s. The values are yours." : "Click any cell."}</span>
      </div>
      <div class="core-scroll"><table class="grid">${head}${body}</table></div>
      <div class="core-foot"><span>${t.rows.length} rows</span><span>syntax: == &quot;C&quot; &middot; &gt;= 3 &middot; &gt; 50000 &middot; empty means any</span></div>
    </section>`;
}

// ---------- step 2: the record ----------
function renderReview() {
  const r = state.record, ch = changedCells();
  const err = (k) => (r.errors[k] ? `<span class="field-err" id="err-${k}">${r.errors[k]}</span>` : "");
  return `
    <section class="review" aria-label="Review and submit">
      <div class="review-main">
        <div class="vercard"><div><span class="muted">Current</span><b>v${state.active.version}</b>${pill("Active")}</div><span class="arrow" aria-hidden="true">&rarr;</span><div><span class="muted">New version</span><b>v${nextVersion()}</b>${pill("In QA")}</div><p class="muted">On approval, v${state.active.version} becomes ${pill("Inactive")}</p></div>
        <label class="field"><span>Effective date</span><input type="date" id="f-date" value="${esc(r.date)}" ${r.errors.date ? 'aria-invalid="true" aria-describedby="err-date"' : ""}>${err("date")}</label>
        <label class="field"><span>What changed, and why <i class="req">required</i></span><textarea id="f-note" rows="3" placeholder="Written for the next reviewer, not the computer." ${r.errors.note ? 'aria-invalid="true" aria-describedby="err-note"' : ""}>${esc(r.note)}</textarea>${err("note")}</label>
        <label class="field"><span>Approver</span><select id="f-approver" ${r.errors.approver ? 'aria-invalid="true" aria-describedby="err-approver"' : ""}><option value="">Name the person who signs off</option>${APPROVERS.map((a) => `<option ${a === r.approver ? "selected" : ""}>${a}</option>`).join("")}</select>${err("approver")}</label>
        ${counts().failed ? `<p class="warnline">${counts().failed} test${counts().failed > 1 ? "s fail" : " fails"} against this version. QA will see ${counts().failed > 1 ? "them" : "it"}; if the change is intended, update the expectation first.</p>` : ""}
        <p class="muted small">QA reviews first, then the approver. Both are named on the version.</p>
        <div class="review-actions"><button type="button" class="btn btn--quiet" data-action="back-edit">Back to values</button><span class="spacer"></span><button type="button" class="btn btn--quiet" data-action="save-draft">Save draft</button><button type="button" class="btn btn--primary" data-action="submit">Submit to QA</button></div>
      </div>
      <aside class="diff" aria-label="Changes in this version">
        <p class="label">The diff, not the archive</p>
        <ul>${ch.map((c) => `<li><span class="mono muted">Row ${c.row} &middot; ${esc(c.col)}</span><span class="mono"><s>${esc(c.was || "any")}</s> &rarr; <b>${esc(c.now || "any")}</b></span></li>`).join("")}</ul>
      </aside>
    </section>`;
}

// ---------- after submit: the lifecycle ----------
function renderLifecycle() {
  const p = state.pending;
  if (!p || state.mode !== "browse" || !group().full) return "";
  const next = {
    Draft: `<button type="button" class="btn btn--primary" data-action="resume">Resume editing</button><button type="button" class="btn btn--quiet" data-action="discard">Discard draft</button>`,
    "In QA": `<button type="button" class="btn btn--primary" data-action="pass-qa">Pass QA</button>`,
    "Ready for approval": `<button type="button" class="btn btn--primary" data-action="approve">Approve as ${esc(p.approver)}</button>`,
  }[p.status];
  const whose = { Draft: "Your queue: it’s saved, not submitted.", "In QA": "QA’s queue.", "Ready for approval": `${p.approver}’s queue.` }[p.status];
  return `<div class="lifecycle"><p><b>v${p.version} is ${pill(p.status)}</b> <span class="muted">${esc(whose)} The table below shows this version.</span></p><div class="lifecycle-actions"><span class="muted small">Play the other roles:</span>${next}</div></div>`;
}

// ---------- the center ----------
function renderCenter() {
  const g = group();
  if (!g) return `<section class="center"><div class="empty"><p><b>Pick a rule group.</b></p></div></section>`;
  if (!g.full) {
    return `<section class="center">${renderContext()}<div class="empty"><p class="empty-icon" aria-hidden="true">&#9638;</p><p><b>${esc(g.name)} isn&rsquo;t built in this demo.</b></p><p>The demo builds one group in full, so the tests have something real to check. The filters and this list work across all six.</p><button type="button" class="btn btn--primary" data-action="group" data-id="loss-history">Open Loss history</button></div></section>`;
  }
  return `<section class="center mode-${state.mode}">${renderContext()}${renderStepper()}${renderLifecycle()}${state.mode === "review" ? renderReview() : renderCore()}${state.mode === "browse" && !state.tried && !state.pending ? `<p class="hint"><span class="label">Try it</span> Run the tests, then choose <b>Edit rules</b> and change row 1&rsquo;s lossCount from <code>&gt;= 2</code> to <code>&gt;= 3</code>.</p>` : ""}</section>`;
}

// ---------- the test panel ----------
function testCard(t, { proposed } = {}) {
  const r = state.results[t.id], status = proposed ? "PROPOSED" : r?.status || "NOT RUN";
  const cls = { PASSED: "pass", FAILED: "fail", "NOT RUN": "notrun", PROPOSED: "proposed" }[status];
  let detail = "";
  if (status === "FAILED") {
    const a = r.actual;
    if (a.errors.length) detail = `<p class="err-text small">Row ${a.errors[0].row} can&rsquo;t be read, so this test can&rsquo;t be decided.</p>`;
    else {
      const missed = t.expect.reasons.filter((x) => !a.reasons.includes(x)), extra = a.reasons.filter((x) => !t.expect.reasons.includes(x));
      detail = `<div class="xa">
        <p class="label">Expected</p><p>${decision(t.expect.decision)}${t.expect.reasons.map((x) => code(x)).join("") || '<span class="muted small">no reasons</span>'}</p>
        <p class="label">Actual</p><p>${decision(a.decision)}${missed.map((x) => code(x, "miss") + '<span class="err-text small">did not fire</span>').join("")}${a.reasons.filter((x) => !extra.includes(x)).map((x) => code(x)).join("")}${extra.map((x) => code(x, "extra") + '<span class="err-text small">fired</span>').join("")}${a.rows.length ? `<span class="muted small">rows ${a.rows.join(", ")}</span>` : ""}</p>
        ${a.missing.length ? `<p class="muted small">Missing information: ${a.missing.join(", ")}</p>` : ""}
      </div>`;
    }
  } else if (status === "PROPOSED") {
    detail = `<p class="small">Expects ${decision(t.expect.decision)}${t.expect.reasons.map((x) => code(x)).join("")}</p>`;
  } else if (status === "PASSED") {
    detail = `<p class="small">${decision(r.actual.decision)}${r.actual.reasons.map((x) => code(x)).join("")}</p>`;
  }
  const actions = proposed ? "" : `<p class="card-actions">${status === "FAILED" && !r.actual.errors.length ? `<button type="button" class="link" data-action="accept" data-id="${t.id}">Update expected</button>` : ""}<button type="button" class="link link--quiet" data-action="delete" data-id="${t.id}">Delete</button></p>`;
  return `<li class="card card--${cls} ${state.flipped.has(t.id) ? "is-flipped" : ""}">
    <p class="card-head"><span class="badge badge--${cls}">${status === "NOT RUN" ? "Not run" : status.charAt(0) + status.slice(1).toLowerCase()}</span><b>${esc(t.name)}</b></p>
    <p class="card-in">${TABLE.inputs.map((c) => kv(SHORT[c.key], t.inputs[c.key])).join("")}</p>
    ${detail}${actions}
  </li>`;
}
function renderCoverage() {
  const rows = changedRows();
  if (!rows.length) return "";
  const t = shownTable(), cov = coverage(t, state.tests);
  return `<div class="coverage"><p class="label">Changed rows</p><ul>${rows.map((n) => {
    const hitting = state.tests.filter((x) => evaluate(t, x.inputs).rows.includes(n));
    const failing = hitting.filter((x) => state.results[x.id]?.status === "FAILED").length;
    return cov[n - 1].covered
      ? `<li><span class="dot ${failing ? "dot--fail" : "dot--pass"}"></span><b>Row ${n}</b><span class="muted">${hitting.length} test${hitting.length > 1 ? "s" : ""}${failing ? ` &middot; ${failing} failing` : ""}</span></li>`
      : `<li class="is-uncovered"><span class="dot dot--open"></span><b>Row ${n}</b><span>No test triggers this row</span><button type="button" class="link" data-action="add-for-row" data-row="${n}">Add test</button></li>`;
  }).join("")}</ul></div>`;
}
function renderForm() {
  const f = state.form, t = shownTable(), a = evaluate(t, f.inputs);
  const grade = (v) => `<div class="seg" role="radiogroup" aria-label="Risk score">${["A", "B", "C", "D", "F", ""].map((g) => `<button type="button" role="radio" aria-checked="${f.inputs.riskScore === g || (!g && f.inputs.riskScore === undefined)}" data-action="form-grade" data-v="${g}">${g || "Not set"}</button>`).join("")}</div>`;
  const num = (key, label) => `<label class="field field--sm"><span>${label}</span><input type="number" inputmode="numeric" min="0" data-form="${key}" value="${f.inputs[key] ?? ""}" placeholder="Not set"></label>`;
  return `<div class="form" role="form" aria-label="New test">
    <p class="card-head"><b>New test</b></p>
    <label class="field field--sm"><span>Name</span><input type="text" data-form="name" value="${esc(f.name)}" placeholder="${esc(suggestName(f.inputs))}"></label>
    <p class="label">Inputs <span class="muted small">&middot; unset fields count as missing information</span></p>
    <div class="field field--sm"><span>Risk score</span>${grade()}</div>
    <div class="two">${num("lossCount", "Losses, 3 yrs")}${num("lossAmount", "Largest loss")}</div>
    <div class="expect">
      <div class="expect-head"><div><p><b>Expected result</b></p><p class="muted small">Pick what should happen, or run it and accept what does.</p></div><button type="button" class="btn btn--quiet btn--sm" data-action="run-fill">Run and fill in</button></div>
      <div class="seg" role="radiogroup" aria-label="Expected decision">${["Accept", "Refer", "Decline"].map((d) => `<button type="button" role="radio" aria-checked="${f.expect.decision === d}" data-action="form-dec" data-v="${d}">${d}</button>`).join("")}</div>
      <p class="reasons">${REASONS.map((x) => `<button type="button" class="code code--toggle" aria-pressed="${f.expect.reasons.includes(x)}" data-action="form-reason" data-v="${x}">${x}</button>`).join("")}</p>
    </div>
    <p class="muted small" id="form-preview">${previewLine(a)}</p>
    <div class="form-actions"><button type="button" class="btn btn--primary" data-action="save-test">Save test</button><button type="button" class="btn btn--quiet" data-action="cancel-test">Cancel</button></div>
  </div>`;
}
const previewLine = (a) => (a.missing.length ? `Missing information: ${a.missing.join(", ")}. ` : "") + (a.rows.length ? `Will trigger row${a.rows.length > 1 ? "s" : ""} ${a.rows.join(", ")}.` : "Triggers no rows: the decision is Accept.");
const suggestName = (inp) => [inp.riskScore ? `Score ${inp.riskScore}` : null, inp.lossCount !== undefined && inp.lossCount !== "" ? `${inp.lossCount} loss${inp.lossCount == 1 ? "" : "es"}` : null, inp.lossAmount ? `largest ${Number(inp.lossAmount).toLocaleString("en-US")}` : null].filter(Boolean).join(", ") || "Name it after its inputs";

function renderPanel() {
  const c = counts();
  if (state.form) return `<aside class="panel" aria-label="Tests">${panelHead(c)}${renderForm()}</aside>`;
  if (state.proposals) return `<aside class="panel" aria-label="Tests">${panelHead(c)}<div class="proposals"><p><b>${state.proposals.length} tests, one per row.</b> <span class="muted small">Each was run and its result taken as the expectation. Keep them?</span></p><div class="form-actions"><button type="button" class="btn btn--primary" data-action="keep-proposals">Keep all</button><button type="button" class="btn btn--quiet" data-action="drop-proposals">Discard</button></div><ul class="cards">${state.proposals.map((t) => testCard(t, { proposed: true })).join("")}</ul></div></aside>`;
  if (!state.tests.length) return `<aside class="panel" aria-label="Tests">${panelHead(c)}<div class="empty empty--panel"><p class="empty-icon" aria-hidden="true">&#9878;</p><p><b>No tests yet</b></p><p class="muted">A test is a set of inputs and the result you expect back. Run them after an edit to see what your change moved.</p><button type="button" class="btn btn--primary" data-action="new-test">New test</button><button type="button" class="btn btn--quiet" data-action="generate">Generate from rows</button><p class="muted small">Builds one test per row, runs it, and shows you the results to confirm before saving.</p></div></aside>`;
  const shown = state.tests.filter((t) => { const s = state.results[t.id]?.status || "NOT RUN"; return state.testFilter === "All" || (state.testFilter === "Failed" && s === "FAILED") || (state.testFilter === "Passed" && s === "PASSED") || (state.testFilter === "Not run" && s === "NOT RUN"); });
  return `<aside class="panel" aria-label="Tests">${panelHead(c)}
    <p class="tally"><span class="t-fail ${c.failed ? "" : "is-zero"}">${c.failed} failed</span><span class="t-pass">${c.passed} passed</span><span class="t-not">${c.notrun} not run</span></p>
    ${!state.live ? `<div class="nudge"><span>Nothing has run yet.</span><button type="button" class="link" data-action="run">Run all</button></div>` : `<p class="muted small live">Tests re-run as you edit.</p>`}
    <div class="tfilter" role="group" aria-label="Show tests">${["All", "Failed", "Passed", "Not run"].map((f) => `<button type="button" class="fchip fchip--sm" data-action="tfilter" data-value="${f}" aria-pressed="${state.testFilter === f}">${f}</button>`).join("")}</div>
    ${renderCoverage()}
    ${shown.length ? `<ul class="cards">${shown.map((t) => testCard(t)).join("")}</ul>` : `<p class="muted small empty-filter">No ${state.testFilter.toLowerCase()} tests.</p>`}
    <p class="panel-foot"><button type="button" class="link" data-action="generate">Generate from rows</button></p>
  </aside>`;
}
function panelHead() {
  return `<div class="panel-head"><h3>Tests</h3><div><button type="button" class="btn btn--primary btn--sm" data-action="run" ${state.form || state.proposals || !state.tests.length ? "disabled" : ""}>Run all</button><button type="button" class="btn btn--quiet btn--sm" data-action="new-test" ${state.form ? "disabled" : ""}>New test</button></div></div>`;
}

// ---------- render ----------
function render() {
  app.innerHTML = `<div class="shell">${renderBar()}<div class="body">${renderGroups()}<div class="center-wrap" id="center-wrap">${renderCenter()}</div><div id="panel-wrap">${renderPanel()}</div></div></div>`;
}
const renderPanelOnly = () => { document.getElementById("panel-wrap").innerHTML = renderPanel(); };
function refreshAfterEdit() {
  if (state.live) { runAll({ quiet: true }); if (state.flipped.size) toast(summaryLine()); }
  renderPanelOnly();
  const counter = document.getElementById("change-count"), next = document.getElementById("to-review");
  const n = changedCells().length, errs = tableErrors(state.draft).length;
  if (counter) counter.innerHTML = errs ? `<span class="err-text">${errs} cell${errs > 1 ? "s" : ""} can&rsquo;t be read</span>` : n ? `${n} change${n > 1 ? "s" : ""}` : "No changes yet";
  if (next) next.disabled = !n || !!errs;
}

// ---------- toast and tooltip ----------
const toastEl = document.getElementById("toast"), tip = document.getElementById("tip");
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("is-on"); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("is-on"), 2600); }
function showTip(el) {
  const editing = state.mode === "edit";
  tip.innerHTML = `<b>${TIP_TEXT}</b>${editing ? "<span>Columns and syntax are fixed. The values are yours to change.</span>" : "<span>Its values change inside an edit. Its shape never does.</span>"}`;
  tip.hidden = false;
  const r = el.getBoundingClientRect(), w = tip.offsetWidth;
  tip.style.left = Math.max(12, Math.min(window.scrollX + r.left + r.width / 2 - w / 2, window.scrollX + document.documentElement.clientWidth - w - 12)) + "px";
  tip.style.top = window.scrollY + r.bottom + 10 + "px";
  requestAnimationFrame(() => tip.classList.add("is-on"));
  showTip.from = el;
}
function hideTip() { tip.classList.remove("is-on"); tip.hidden = true; showTip.from = null; }

// ---------- generating tests from rows ----------
// Build inputs that satisfy one row: start from values that trigger nothing, then meet each cell.
function inputsForRow(table, n) {
  const inputs = { riskScore: "A", lossCount: 0, lossAmount: 0 };
  for (const c of table.inputs) {
    const p = parseCell(table.rows[n - 1].when[c.key]);
    if (p.any || p.error) continue;
    const v = p.value;
    inputs[c.key] = { "==": v, "!=": typeof v === "number" ? v + 1 : v === "A" ? "B" : "A", ">": v + 1, ">=": v, "<": Math.max(0, v - 1), "<=": v }[p.op];
  }
  return inputs;
}
function proposeFor(n) {
  const t = shownTable(), inputs = inputsForRow(t, n), a = evaluate(t, inputs);
  return { id: nextId++, name: `Row ${n}: ${suggestName(inputs)}`, inputs, expect: { decision: a.decision, reasons: a.reasons } };
}

// ---------- events ----------
app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const act = b.dataset.action;
  if (act !== "tip") hideTip();
  switch (act) {
    case "tip": e.stopPropagation(); return showTip.from === b ? hideTip() : showTip(b);
    case "filter": state.filters[b.dataset.key] = b.dataset.value; if (!visibleGroups().some((g) => g.id === state.groupId)) state.groupId = visibleGroups()[0]?.id || state.groupId; return render();
    case "clear-filters": state.filters = { carrier: FILTERS.carrier[0], line: FILTERS.line[0], type: FILTERS.type[0] }; return render();
    case "group": state.groupId = b.dataset.id; state.showVersions = false; return render();
    case "legend": state.showLegend = !state.showLegend; return render();
    case "versions": state.showVersions = !state.showVersions; return render();
    case "edit": state.tried = true; state.draft = clone(state.active.table); state.mode = "edit"; state.showVersions = false; render(); document.querySelector(".core")?.classList.add("is-crossing"); setTimeout(() => document.querySelector(".cell-in")?.focus(), 160); return;
    case "cancel": state.mode = "browse"; state.draft = null; state.record = { date: "", note: "", approver: "", errors: {} }; if (state.live) runAll({ quiet: true }); return render();
    case "to-review": state.mode = "review"; render(); document.getElementById("f-date")?.focus(); return;
    case "back-edit": state.mode = "edit"; return render();
    case "save-draft": readRecord(); state.pending = { version: nextVersion(), status: "Draft", table: clone(state.draft), ...pickRecord() }; state.mode = "browse"; state.draft = null; toast(`v${state.pending.version} saved as a draft`); return render();
    case "submit": {
      readRecord(); const r = state.record; r.errors = {};
      if (!r.date) r.errors.date = "Pick the date this version takes effect.";
      if (!r.note.trim()) r.errors.note = "Say what changed and why. The next reviewer reads this, not the table.";
      if (!r.approver) r.errors.approver = "Name an approver. Accountability lives at the moment of the edit.";
      if (Object.keys(r.errors).length) { render(); document.querySelector("[aria-invalid]")?.focus(); return; }
      state.pending = { version: nextVersion(), status: "In QA", table: clone(state.draft), ...pickRecord() };
      state.mode = "browse"; state.draft = null; state.record = { date: "", note: "", approver: "", errors: {} };
      toast(`v${state.pending.version} submitted. It’s in QA’s queue.`); return render();
    }
    case "resume": state.draft = clone(state.pending.table); state.record = { date: state.pending.date, note: state.pending.note, approver: state.pending.approver, errors: {} }; state.pending = null; state.mode = "edit"; return render();
    case "discard": state.pending = null; if (state.live) runAll({ quiet: true }); toast("Draft discarded"); return render();
    case "pass-qa": state.pending.status = "Ready for approval"; toast(`QA passed. It’s in ${state.pending.approver}’s queue.`); return render();
    case "approve": {
      const p = state.pending;
      state.versions.forEach((v) => { if (v.status === "Active") v.status = "Inactive"; });
      state.versions.unshift({ version: p.version, status: "Active", by: "You", date: p.date, note: p.note });
      state.active = { version: p.version, table: p.table }; state.pending = null;
      if (state.live) runAll({ quiet: true });
      toast(`v${p.version} is Active. v${state.versions[1].version} is now Inactive.`); return render();
    }
    case "run": runAll(); render(); return;
    case "tfilter": state.testFilter = b.dataset.value; return renderPanelOnly();
    case "accept": { const t = state.tests.find((x) => x.id === +b.dataset.id), a = state.results[t.id].actual; t.expect = { decision: a.decision, reasons: [...a.reasons] }; runAll({ quiet: true }); toast("Expectation updated to what the table does now"); return render(); }
    case "delete": state.tests = state.tests.filter((x) => x.id !== +b.dataset.id); delete state.results[b.dataset.id]; return render();
    case "new-test": state.form = { name: "", inputs: {}, expect: { decision: "Accept", reasons: [] } }; renderPanelOnly(); document.querySelector('[data-form="name"]')?.focus(); return;
    case "add-for-row": { const n = +b.dataset.row, inputs = inputsForRow(shownTable(), n); state.form = { name: "", inputs, expect: { decision: "Accept", reasons: [] } }; renderPanelOnly(); document.querySelector('[data-action="run-fill"]')?.focus(); return; }
    case "cancel-test": state.form = null; return renderPanelOnly();
    case "form-grade": state.form.inputs.riskScore = b.dataset.v || undefined; if (!b.dataset.v) delete state.form.inputs.riskScore; return rerenderForm('[data-action="form-grade"][data-v="' + b.dataset.v + '"]');
    case "form-dec": state.form.expect.decision = b.dataset.v; return rerenderForm('[data-action="form-dec"][data-v="' + b.dataset.v + '"]');
    case "form-reason": { const r = state.form.expect.reasons, v = b.dataset.v; state.form.expect.reasons = r.includes(v) ? r.filter((x) => x !== v) : [...r, v]; return rerenderForm('[data-action="form-reason"][data-v="' + v + '"]'); }
    case "run-fill": { const a = evaluate(shownTable(), state.form.inputs); state.form.expect = { decision: a.decision, reasons: [...a.reasons] }; rerenderForm('[data-action="run-fill"]'); toast(a.missing.length ? "Filled in from a run. Some inputs are missing, so some rows couldn’t decide." : "Filled in from a run. Reality is the expectation."); return; }
    case "save-test": {
      const f = state.form, t = { id: nextId++, name: f.name.trim() || suggestName(f.inputs), inputs: { ...f.inputs }, expect: clone(f.expect) };
      state.tests.unshift(t); state.form = null;
      if (state.live) { state.results[t.id] = runTest(shownTable(), t); }
      toast(state.live ? `Saved and run: ${state.results[t.id].status === "PASSED" ? "passing" : "failing"}` : "Saved. Run all to check it.");
      return state.mode === "edit" ? refreshAfterEdit() : renderPanelOnly();
    }
    case "generate": state.form = null; state.proposals = shownTable().rows.map((_, i) => proposeFor(i + 1)); return renderPanelOnly();
    case "keep-proposals": state.tests.push(...state.proposals); state.proposals = null; runAll({ quiet: true }); toast(`${state.tests.length} tests, all run`); return state.mode === "edit" ? refreshAfterEdit() : renderPanelOnly();
    case "drop-proposals": state.proposals = null; return renderPanelOnly();
  }
});
function rerenderForm(focusSel) { renderPanelOnly(); document.querySelector(focusSel)?.focus(); }
function readRecord() {
  const d = document.getElementById("f-date"), n = document.getElementById("f-note"), a = document.getElementById("f-approver");
  if (d) state.record.date = d.value; if (n) state.record.note = n.value; if (a) state.record.approver = a.value;
}
const niceDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : d);
const pickRecord = () => ({ date: state.record.date, note: state.record.note, approver: state.record.approver });

app.addEventListener("input", (e) => {
  const el = e.target;
  if (el.classList.contains("cell-in")) {
    state.draft.rows[+el.dataset.row].when[el.dataset.col] = el.value;
    const td = el.parentElement, base = state.active.table.rows[+el.dataset.row].when[el.dataset.col] ?? "";
    td.classList.toggle("is-bad", !!parseCell(el.value).error);
    td.classList.toggle("is-changed", base.trim() !== el.value.trim());
    el.title = parseCell(el.value).error || "";
    return refreshAfterEdit();
  }
  if (el.dataset.form && state.form) {
    if (el.dataset.form === "name") state.form.name = el.value;
    else if (el.value === "") delete state.form.inputs[el.dataset.form];
    else state.form.inputs[el.dataset.form] = Number(el.value);
    const p = document.getElementById("form-preview");
    if (p) p.textContent = previewLine(evaluate(shownTable(), state.form.inputs));
    const name = document.querySelector('[data-form="name"]');
    if (name) name.placeholder = suggestName(state.form.inputs);
  }
  if (el.id === "f-note" || el.id === "f-date") { readRecord(); clearFieldError(el); }
});
// A fixed field drops its complaint as soon as it's fixed, not on the next submit.
function clearFieldError(el) {
  const k = { "f-date": "date", "f-note": "note", "f-approver": "approver" }[el.id];
  if (!k || !state.record.errors[k] || !el.value.trim()) return;
  delete state.record.errors[k];
  el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby");
  document.getElementById("err-" + k)?.remove();
}
app.addEventListener("change", (e) => {
  const el = e.target;
  if (el.classList.contains("cell-sel")) {
    state.draft.rows[+el.dataset.row].then.decision = el.value;
    el.parentElement.classList.toggle("is-changed", el.value !== state.active.table.rows[+el.dataset.row].then.decision);
    return refreshAfterEdit();
  }
  if (el.id === "f-approver") { readRecord(); clearFieldError(el); }
});
document.addEventListener("click", (e) => { if (!tip.hidden && !e.target.closest("#tip")) hideTip(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!tip.hidden) { const from = showTip.from; hideTip(); from?.focus(); return; }
  if (state.form) { state.form = null; renderPanelOnly(); return; }
  if (state.showLegend) { state.showLegend = false; render(); }
});
window.addEventListener("resize", () => { if (!tip.hidden) hideTip(); });

// When embedded, tell the parent page how tall the demo is, so the frame never scrolls inside.
if (window.parent !== window && "ResizeObserver" in window) {
  new ResizeObserver(() => window.parent.postMessage({ type: "demo-height", demo: "rules-wrapper", height: document.documentElement.scrollHeight }, "*")).observe(document.body);
}

render();
