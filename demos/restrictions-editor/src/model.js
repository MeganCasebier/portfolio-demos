// Restrictions as data: partner id -> Set of state codes where that partner may not sell.
// Every function returns a new map, so the saved copy and the draft never share a Set.

export const fromSaved = (saved) => new Map(Object.entries(saved).map(([id, sts]) => [id, new Set(sts)]));
export const copy = (r) => new Map([...r].map(([id, s]) => [id, new Set(s)]));
export const has = (r, id, st) => !!r.get(id)?.has(st);

export function set(r, ids, st, on) {
  const out = copy(r);
  for (const id of ids) {
    const s = out.get(id) ?? new Set();
    on ? s.add(st) : s.delete(st);
    s.size ? out.set(id, s) : out.delete(id);
  }
  return out;
}
export const toggle = (r, id, st) => set(r, [id], st, !has(r, id, st));

// "all" | "some" | "none": drives the group checkbox, including its indeterminate state.
export function groupState(r, group, st) {
  const n = group.partners.filter((p) => has(r, p.id, st)).length;
  return n === 0 ? "none" : n === group.partners.length ? "all" : "some";
}
export const countIn = (r, partners, st) => partners.filter((p) => has(r, p.id, st)).length;
export const statesOf = (r, id) => [...(r.get(id) ?? [])].sort();

// What would change on save, one entry per partner-and-state, sorted for a stable read.
export function diff(saved, draft) {
  const out = [], ids = new Set([...saved.keys(), ...draft.keys()]);
  for (const id of ids) {
    const a = saved.get(id) ?? new Set(), b = draft.get(id) ?? new Set();
    for (const st of b) if (!a.has(st)) out.push({ id, st, on: true });
    for (const st of a) if (!b.has(st)) out.push({ id, st, on: false });
  }
  return out.sort((x, y) => x.id.localeCompare(y.id) || x.st.localeCompare(y.st));
}

// The summary read the other way round: state -> partner ids restricted there.
export function byState(r) {
  const out = new Map();
  for (const [id, s] of r) for (const st of s) out.set(st, [...(out.get(st) ?? []), id]);
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)).map(([st, ids]) => [st, ids.sort()]));
}
