// The Restrictions Editor: partners under aggregators, restricted state by state.
// One state is "in hand" at a time; the checkboxes, the group select-all and the count all speak about it.
// Each partner can also open to its own full map of states. Nothing is saved until Save.
import { fromSaved, copy, has, set, toggle, groupState, countIn, statesOf, diff, byState } from "./model.js";
import { CARRIER, STATES, STATE_NAME, GROUPS, SAVED, START_STATE } from "./data.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const app = document.getElementById("app");
const dialog = document.getElementById("summary");
const ALL = GROUPS.flatMap((g) => g.partners.map((p) => ({ ...p, group: g })));
const PARTNER = Object.fromEntries(ALL.map((p) => [p.id, p]));

const state = {
  saved: fromSaved(SAVED),
  draft: fromSaved(SAVED),
  st: START_STATE,
  open: new Set(GROUPS.map((g) => g.id)), // aggregators expanded
  partnerOpen: new Set(), // partners showing their full state map
  view: "partner", // the summary's reading: partner | state
};

// ---------- rendering ----------
function partnerRow(p) {
  const on = has(state.draft, p.id, state.st), wasOn = has(state.saved, p.id, state.st);
  const sts = statesOf(state.draft, p.id), open = state.partnerOpen.has(p.id);
  const others = sts.filter((s) => s !== state.st);
  return `<li class="partner${on ? " is-on" : ""}${on !== wasOn ? " is-changed" : ""}">
    <div class="partner-row">
      <label class="check">
        <input type="checkbox" data-action="toggle" data-id="${p.id}" data-key="t-${p.id}" ${on ? "checked" : ""}>
        <span class="partner-name">${esc(p.name)}</span>
        <span class="code">${p.code}</span>
      </label>
      <span class="partner-states">${others.length ? `<span class="muted">also</span> ${others.slice(0, 4).map((s) => `<abbr class="st" title="${STATE_NAME[s]}">${s}</abbr>`).join("")}${others.length > 4 ? `<span class="muted">+${others.length - 4}</span>` : ""}` : ""}</span>
      ${on !== wasOn ? `<span class="changed">${on ? "Adding" : "Removing"}</span>` : ""}
      <button class="disclose" data-action="partner-open" data-id="${p.id}" data-key="o-${p.id}" aria-expanded="${open}" aria-controls="map-${p.id}">
        ${sts.length ? plural(sts.length, "state") : "No states"}<span class="chev" aria-hidden="true"></span>
      </button>
    </div>
    ${open ? stateMap(p) : ""}
  </li>`;
}

function stateMap(p) {
  return `<div class="map" id="map-${p.id}" role="group" aria-label="${esc(p.name)}, restricted states">
    ${STATES.map(([code, name]) => {
      const on = has(state.draft, p.id, code), changed = on !== has(state.saved, p.id, code);
      return `<button class="mapst${on ? " is-on" : ""}${changed ? " is-changed" : ""}${code === state.st ? " is-current" : ""}" data-action="map" data-id="${p.id}" data-st="${code}" data-key="m-${p.id}-${code}" aria-pressed="${on}" title="${name}">${code}</button>`;
    }).join("")}
  </div>`;
}

function groupBlock(g) {
  const gs = groupState(state.draft, g, state.st), n = countIn(state.draft, g.partners, state.st), open = state.open.has(g.id);
  return `<section class="group" aria-labelledby="g-${g.id}">
    <header class="group-head">
      <input type="checkbox" class="group-check" data-action="group-all" data-id="${g.id}" data-key="ga-${g.id}" data-state="${gs}" ${gs === "all" ? "checked" : ""} aria-label="Select all ${esc(g.name)} partners in ${STATE_NAME[state.st]}">
      <button class="group-toggle" id="g-${g.id}" data-action="group-open" data-id="${g.id}" data-key="go-${g.id}" aria-expanded="${open}">
        <span class="chev" aria-hidden="true"></span>
        <span class="group-name">${esc(g.name)}</span>
        <span class="group-count"><b>${n}</b> of ${g.partners.length} selected</span>
      </button>
      <button class="link" data-action="group-clear" data-id="${g.id}" data-key="gc-${g.id}" ${n ? "" : "disabled"}>Clear</button>
    </header>
    ${open ? `<ul class="partners">${g.partners.map(partnerRow).join("")}</ul>` : ""}
  </section>`;
}

function render() {
  const n = countIn(state.draft, ALL, state.st), changes = diff(state.saved, state.draft);
  const allOpen = state.open.size === GROUPS.length;
  app.innerHTML = `<div class="shell">
    <div class="bar">
      <span class="brand"><span class="brand-mark" aria-hidden="true"></span>Partner restrictions</span>
      <span class="carrier">Carrier <b>${CARRIER}</b></span>
      <span class="spacer"></span>
      <button class="btn btn--quiet" data-action="summary" data-key="summary">View current restrictions</button>
    </div>
    <div class="toolbar">
      <label class="pick">
        <span class="label">Restrict in</span>
        <select data-action="state" data-key="state">${STATES.map(([c, name]) => `<option value="${c}" ${c === state.st ? "selected" : ""}>${name}</option>`).join("")}</select>
      </label>
      <p class="count" aria-live="polite"><b>${n}</b> of ${ALL.length} partners restricted in ${STATE_NAME[state.st]}</p>
      <span class="spacer"></span>
      <button class="link link--quiet" data-action="open-all" data-key="open-all">${allOpen ? "Collapse all" : "Expand all"}</button>
      <button class="link" data-action="clear-all" data-key="clear-all" ${n ? "" : "disabled"}>Clear all in ${state.st}</button>
    </div>
    <div class="groups">${GROUPS.map(groupBlock).join("")}</div>
    <div class="savebar${changes.length ? " is-dirty" : ""}">
      <p class="small">${changes.length ? `<b>${plural(changes.length, "unsaved change")}</b> <span class="muted">· ${changeLine(changes)}</span>` : `<span class="muted">No unsaved changes</span>`}</p>
      <span class="spacer"></span>
      <button class="btn btn--quiet" data-action="discard" data-key="discard" ${changes.length ? "" : "disabled"}>Discard</button>
      <button class="btn btn--primary" data-action="save" data-key="save" ${changes.length ? "" : "disabled"}>Save changes</button>
    </div>
  </div>`;
  app.querySelectorAll(".group-check").forEach((el) => { el.indeterminate = el.dataset.state === "some"; });
  document.documentElement.classList.add("is-ready");
}

const changeLine = (changes) => {
  const add = changes.filter((c) => c.on).length, rm = changes.length - add;
  return [add && `${add} added`, rm && `${rm} removed`].filter(Boolean).join(", ");
};

// The summary reads what is saved: what is in effect, not what is half-typed.
function renderSummary() {
  const r = state.saved, pending = diff(state.saved, state.draft).length;
  const ids = [...r.keys()].sort(), total = [...r.values()].reduce((a, s) => a + s.size, 0);
  const bs = byState(r);
  const body = !ids.length ? `<p class="empty">No partner is restricted anywhere. Every partner can sell in every state.</p>`
    : state.view === "partner"
      ? GROUPS.map((g) => {
          const rows = g.partners.filter((p) => r.has(p.id));
          return `<div class="sum-group"><h3>${esc(g.name)} <span class="muted">${plural(rows.length, "partner")}</span></h3>
            ${rows.length ? `<dl>${rows.map((p) => `<div><dt>${esc(p.name)} <span class="code">${p.code}</span></dt><dd>${statesOf(r, p.id).map((s) => `<abbr class="st" title="${STATE_NAME[s]}">${s}</abbr>`).join("")}</dd></div>`).join("")}</dl>` : `<p class="muted small">None restricted.</p>`}</div>`;
        }).join("")
      : `<dl class="by-state">${[...bs].map(([st, list]) => `<div><dt>${STATE_NAME[st]} <span class="muted">${list.length}</span></dt><dd>${list.map((id) => `<span class="code">${id}</span>`).join("")}</dd></div>`).join("")}</dl>`;
  dialog.innerHTML = `<div class="sum-head">
      <div><h2 id="summary-title">Current restrictions</h2>
      <p class="muted small">${CARRIER} · ${plural(ids.length, "partner")} · ${plural(bs.size, "state")} · ${plural(total, "restriction")}</p></div>
      <button class="close" data-action="close" aria-label="Close">×</button>
    </div>
    <div class="seg" role="group" aria-label="Read by">
      <button data-action="view" data-view="partner" aria-pressed="${state.view === "partner"}">By partner</button>
      <button data-action="view" data-view="state" aria-pressed="${state.view === "state"}">By state</button>
    </div>
    ${pending ? `<p class="note">${plural(pending, "unsaved change")} not shown. This is what&rsquo;s in effect now.</p>` : ""}
    <div class="sum-body">${body}</div>`;
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("is-on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-on"), 2600);
}

// Re-render, then put focus back on the control that had it, so keyboard users never lose their place.
function update() {
  const key = document.activeElement?.dataset?.key;
  render();
  if (key) app.querySelector(`[data-key="${key}"]`)?.focus();
}

// ---------- events ----------
app.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || b.tagName === "SELECT") return;
  const g = GROUPS.find((x) => x.id === b.dataset.id);
  switch (b.dataset.action) {
    case "toggle": state.draft = toggle(state.draft, b.dataset.id, state.st); return update();
    case "map": state.draft = toggle(state.draft, b.dataset.id, b.dataset.st); return update();
    case "group-all": state.draft = set(state.draft, g.partners.map((p) => p.id), state.st, groupState(state.draft, g, state.st) !== "all"); return update();
    case "group-clear": state.draft = set(state.draft, g.partners.map((p) => p.id), state.st, false); return update();
    case "clear-all": state.draft = set(state.draft, ALL.map((p) => p.id), state.st, false); return update();
    case "group-open": state.open.has(g.id) ? state.open.delete(g.id) : state.open.add(g.id); return update();
    case "partner-open": state.partnerOpen.has(b.dataset.id) ? state.partnerOpen.delete(b.dataset.id) : state.partnerOpen.add(b.dataset.id); return update();
    case "open-all": state.open = state.open.size === GROUPS.length ? new Set() : new Set(GROUPS.map((x) => x.id)); return update();
    case "discard": state.draft = copy(state.saved); update(); return toast("Changes discarded.");
    case "save": {
      const n = diff(state.saved, state.draft).length;
      state.saved = copy(state.draft); update();
      return toast(`Saved ${plural(n, "change")}.`);
    }
    case "summary": renderSummary(); return dialog.showModal();
  }
});
app.addEventListener("change", (e) => {
  if (e.target.dataset.action === "state") { state.st = e.target.value; update(); }
});
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) return dialog.close(); // a click on the backdrop
  const b = e.target.closest("[data-action]");
  if (!b) return;
  if (b.dataset.action === "close") return dialog.close();
  if (b.dataset.action === "view") { state.view = b.dataset.view; renderSummary(); dialog.querySelector(`[data-view="${state.view}"]`).focus(); }
});
render();
