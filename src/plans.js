// Workout plans. Pure functions only (no React, no storage), so they run in node tests (tools/plans_test.mjs).
//
// 1.9.2 (Michael, Nov 8, 2026: "each day I pick one of the workout plans I made"): a plan is ONE workout (a list of
// exercises); the week is a separate schedule that gives each weekday one of your plans or nothing (= a rest day).
// 1.9.0/1.9.1 stored a plan as a whole week (`days`); those are upgraded on reading (`upgrade`), and every write keeps
// `days` filled as a mirror (a plan's exercises on the weekdays it is scheduled), so phones still on 1.9.x show it too.
//
// profile.plans = {
//   v:      2 once upgraded (missing = written by 1.9.0/1.9.1 only)
//   list:   [{ id, n, name, grp, ts, mts, items: [{ id, sets, dur? }], days: {"1".."7": items} (mirror), ds }]
//            n = the plan's number for its default name "Workout Plan n"; name "" = use the default.
//            item: id = exercise, sets = how many sets, dur = the user's own hold time (seconds; none = the app's).
//            ds = the signature of `days` as this version last wrote them; a different `days` = a 1.9.x phone edited
//            the plan, so it is read again from `days`.
//   week:   { "1".."7": planId } (Monday = 1; missing / "" = rest day), wmts: when the week last changed (sync)
//   groups: [{ id, name, ts, mts }],
//   seq:    the highest number given so far. Numbers are never reused while any plan exists (plan 2 deleted with
//           12 plans → the next is 13); when ALL plans are gone the next one is 1 again (Michael, Nov 1).
//   del:    { planOrGroupId: deletedAt } (so a deletion reaches the other devices)
//   active: 1.9.0/1.9.1 only (the plan Home offered); read once by the upgrade, otherwise left alone
//   sort:   "date" | "name", dir: "asc" | "desc"
// }
// The whole object follows the account inside the profile (src/sync.js mergeProfile → mergePlans).

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
export const DEFAULT_SETS = 3;
export const MAX_ITEMS = 12; // exercises a plan can hold
export const MAX_SETS = 10;
export const emptyPlans = () => ({ v: 2, list: [], groups: [], seq: 0, del: {}, week: {}, wmts: 0, active: "", sort: "date", dir: "desc" });

const clean = l => (l || []).map(x => ({ id: x.id, sets: x.sets || DEFAULT_SETS, ...(x.dur ? { dur: x.dur } : {}) }));
// A stable text for a `days` object (empty days left out, keys in order), to notice changes made by a 1.9.x phone.
export function daysSig(days) {
  const o = {};
  WEEKDAYS.forEach(wd => { const l = days && days[wd]; if (l && l.length) o[wd] = clean(l); });
  return JSON.stringify(o);
}
// 1.10.0: when a plan's CONTENT (exercises, name, group) last changed, apart from `mts`, which also moves when only
// its weekdays change (the `days` mirror). Without it a phone that had not yet received an edit and only moved the
// plan to another weekday sent its old exercises back as the "newest" plan (found Nov 13 by the two-device test in
// tools/plans_test.mjs). `cs` = a short signature of the content `its` belongs to: an app older than 1.10 edits the
// content without touching `its`, and then the signature no longer fits, so the content's time is `mts`.
const fnv = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
export const contentSig = p => fnv(JSON.stringify([p.name || "", p.grp || null, clean(p.items)]));
export const contentTime = p => (p.cs && p.cs === contentSig(p) ? p.its || 0 : p.mts || 0);
const stamp = (p, now) => ({ ...p, mts: now, its: now, cs: contentSig(p) });
const defLabel = (p, wds) => `${p.name || "Workout Plan " + p.n} · ${wds.join(", ")}`;

// 1.9.0/1.9.1 week plans → single workouts. Deterministic (same input = same ids, names and times on every device),
// so two phones upgrading the same data can't make duplicates. A week plan whose training days all hold the same
// exercises becomes one workout; different days become one workout per different list (ids `<id>~1`, `~2` …, named
// "<plan> · <days>" by `label`). The plan that was in use gives the week its schedule (only on the first upgrade).
export function upgrade(P, label = defLabel) {
  const legacy = P.v !== 2;
  const week = legacy ? {} : { ...(P.week || {}) };
  const byId = new Map();
  const put = p => { const c = byId.get(p.id); if (!c || (p.mts || 0) >= (c.mts || 0)) byId.set(p.id, p); };
  (P.list || []).forEach(p => {
    const days = p.days || {};
    if (Array.isArray(p.items) && p.ds === daysSig(days)) { put(p); return; }
    const groups = [];
    WEEKDAYS.forEach(wd => {
      const l = days[wd]; if (!l || !l.length) return;
      const items = clean(l), key = JSON.stringify(items);
      const g = groups.find(x => x.key === key);
      if (g) g.wds.push(wd); else groups.push({ key, items, wds: [wd] });
    });
    if (!groups.length) { put({ ...p, items: Array.isArray(p.items) ? p.items : [], ds: daysSig(days) }); return; }
    groups.forEach((g, i) => {
      const id = i ? `${p.id}~${i}` : p.id;
      const sub = Object.fromEntries(g.wds.map(wd => [wd, days[wd]]));
      const part = i ? { id, n: p.n, name: label(p, g.wds), grp: p.grp || null, ts: (p.ts || 0) + i, mts: p.mts || 0 } : { ...p };
      if (groups.length > 1 && !i) part.name = label(p, g.wds);
      part.items = g.items;
      part.days = i ? sub : days;
      part.ds = daysSig(part.days);
      put(part);
      if (legacy && P.active === p.id) g.wds.forEach(wd => { week[wd] = id; });
    });
  });
  const list = [...byId.values()].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return { ...emptyPlans(), ...P, v: 2, list, week, wmts: legacy ? 0 : P.wmts || 0 };
}
export const plansOf = (profile, label) => upgrade({ ...emptyPlans(), v: 0, ...((profile && profile.plans) || {}) }, label);

// Every write ends here: each plan's `days` = its exercises on the weekdays it is scheduled (what a 1.9.x phone shows).
export function mirror(P, now = Date.now()) {
  const list = P.list.map(p => {
    const days = {};
    WEEKDAYS.forEach(wd => { if (P.week[wd] === p.id && p.items.length) days[wd] = p.items.map(x => ({ ...x })); });
    const ds = daysSig(days);
    return ds === p.ds && daysSig(p.days) === ds ? p : { ...p, days, ds, mts: Math.max(now, p.mts || 0) };
  });
  return { ...P, list };
}

const rid = (p, now) => p + now.toString(36) + Math.random().toString(36).slice(2, 6);

export function addPlan(P, now = Date.now()) {
  const n = P.list.length ? (P.seq || 0) + 1 : 1;
  const plan = stamp({ id: rid("p", now), n, name: "", grp: null, ts: now, items: [], days: {}, ds: "{}" }, now);
  return { P: { ...P, list: [...P.list, plan], seq: n }, plan };
}
export function updatePlan(P, id, patch, now = Date.now()) {
  return { ...P, list: P.list.map(p => (p.id === id ? stamp({ ...p, ...patch }, now) : p)) };
}
export function delPlan(P, id, now = Date.now()) {
  const list = P.list.filter(p => p.id !== id);
  const hit = WEEKDAYS.some(wd => P.week[wd] === id);
  const week = hit ? Object.fromEntries(Object.entries(P.week).filter(([, v]) => v && v !== id)) : P.week;
  return { ...P, list, seq: list.length ? P.seq : 0, del: { ...P.del, [id]: now }, active: P.active === id ? "" : P.active, week, wmts: hit ? now : P.wmts };
}
export function addGroup(P, name, now = Date.now()) {
  const g = { id: rid("g", now), name: String(name || "").trim().slice(0, 40), ts: now, mts: now };
  return { P: { ...P, groups: [...P.groups, g] }, group: g };
}
export function renameGroup(P, id, name, now = Date.now()) {
  return { ...P, groups: P.groups.map(g => (g.id === id ? { ...g, name: String(name || "").trim().slice(0, 40), mts: now } : g)) };
}
// Deleting a group keeps its plans (they become ungrouped).
export function delGroup(P, id, now = Date.now()) {
  return { ...P, groups: P.groups.filter(g => g.id !== id), list: P.list.map(p => (p.grp === id ? stamp({ ...p, grp: null }, now) : p)), del: { ...P.del, [id]: now } };
}

// A plan's exercises: add / remove / move, sets and own hold times. They return the changed plan's patch-able fields.
const setItems = (plan, items) => ({ ...plan, items: items.slice(0, MAX_ITEMS) });
export function addItem(plan, exId) {
  const l = plan.items || [];
  if (l.some(x => x.id === exId) || l.length >= MAX_ITEMS) return plan;
  return setItems(plan, [...l, { id: exId, sets: DEFAULT_SETS }]);
}
export const removeItem = (plan, exId) => setItems(plan, (plan.items || []).filter(x => x.id !== exId));
export function moveItem(plan, from, to) {
  const l = [...(plan.items || [])]; if (from < 0 || from >= l.length || to < 0 || to >= l.length) return plan;
  const [x] = l.splice(from, 1); l.splice(to, 0, x); return setItems(plan, l);
}
export const patchItem = (plan, exId, patch) => setItems(plan, (plan.items || []).map(x => {
  if (x.id !== exId) return x;
  const y = { ...x, ...patch };
  if (y.dur === null || y.dur === undefined) delete y.dur; // removing the own time brings the app's back
  y.sets = Math.max(1, Math.min(MAX_SETS, Math.round(y.sets || DEFAULT_SETS)));
  return y;
}));

// ─── The week ───────────────────────────────────────────────────────────────
export function setWeekDay(P, wd, planId, now = Date.now()) {
  const week = { ...P.week };
  if (planId) week[wd] = planId; else delete week[wd];
  return { ...P, week, wmts: now };
}
export const clearWeek = (P, now = Date.now()) => ({ ...P, week: {}, wmts: now });
// The plan set for a weekday (only one that still exists and has exercises), else null.
export function planOn(P, wd) {
  const id = P.week && P.week[wd]; if (!id) return null;
  const p = P.list.find(x => x.id === id);
  return p && p.items && p.items.length ? p : null;
}
export const daysOf = (P, planId) => WEEKDAYS.filter(wd => P.week && P.week[wd] === planId);
export const hasWeek = P => WEEKDAYS.some(wd => planOn(P, wd));
export const isRest = (P, wd) => !planOn(P, wd);
export const trainDays = P => WEEKDAYS.filter(wd => planOn(P, wd));

// Rest days in a row in the week (it repeats: Sun is followed by Mon). The streak allows 1 rest day in a row (every
// other day, the same rule as before 1.9.0), so a week with more needs freezes; the week card warns about it.
export const REST_IN_A_ROW = 1;
export function maxRestRun(P) {
  const r = WEEKDAYS.map(wd => isRest(P, wd));
  if (r.every(Boolean)) return 7;
  let best = 0;
  for (let s = 0; s < 7; s++) { if (!r[s]) continue; let k = 0; while (k < 7 && r[(s + k) % 7]) k++; best = Math.max(best, k); }
  return best;
}

// Weekday of a "YYYY-MM-DD" date: 1 = Monday … 7 = Sunday.
export function weekdayOf(key) { const [y, m, d] = key.split("-").map(Number); const w = new Date(y, m - 1, d).getDay(); return w === 0 ? 7 : w; }
// The Monday of that date's week.
export function mondayOf(key) {
  const [y, m, d] = key.split("-").map(Number); const t = new Date(y, m - 1, d); t.setDate(t.getDate() - (weekdayOf(key) - 1));
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
// When each workout was done last: { planId: date, "rec:A": date … } (recommended days = entries without a plan).
export function lastDone(history) {
  const out = {};
  (history || []).forEach(e => {
    const k = e.plan && e.plan.id ? e.plan.id : !e.free && e.day ? "rec:" + e.day : null;
    if (k && (!out[k] || e.date >= out[k])) out[k] = e.date;
  });
  return out;
}

export function sortPlans(list, sort = "date", dir = "desc", nameOf = p => p.name) {
  const k = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => (sort === "name" ? nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true, sensitivity: "base" }) : a.ts - b.ts) * k || (a.ts - b.ts) * k);
}

// Sync: both sides' plans and groups by id; the newer change wins; a deletion wins over older changes; the newer week
// wins as a whole. Works on stored data (upgraded or not); the result is upgraded when read.
export function mergePlans(a, b) {
  if (!a) return b; if (!b) return a;
  const del = { ...(a.del || {}) }; Object.entries(b.del || {}).forEach(([k, v]) => { del[k] = Math.max(del[k] || 0, v); });
  // the same plan on both sides: the one changed last is the base (a tie is settled by its text, the same way on every
  // device), but the exercises, name and group come from the side whose CONTENT changed last (see contentTime)
  const text = v => (v === null || typeof v !== "object" ? JSON.stringify(v === undefined ? null : v) : Array.isArray(v) ? "[" + v.map(text).join(",") + "]"
    : "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + text(v[k])).join(",") + "}");
  const join = (c, p, plans) => {
    const pm = p.mts || 0, cm = c.mts || 0;
    const [n, o] = pm > cm || (pm === cm && text(p) > text(c)) ? [p, c] : [c, p];
    if (!plans) return n;
    const tn = contentTime(n), to = contentTime(o);
    if (!(to > tn) || contentSig(o) === contentSig(n)) return n;
    const r = { ...n, items: o.items, its: to, cs: contentSig(o) };
    ["name", "grp"].forEach(k => { if (o[k] === undefined) delete r[k]; else r[k] = o[k]; });
    return r;
  };
  const byId = (x, y, plans) => {
    const m = new Map();
    [...(x || []), ...(y || [])].forEach(p => { const c = m.get(p.id); m.set(p.id, c ? join(c, p, plans) : p); });
    // a deletion removes the plan unless its content was changed after it (moving a not-yet-deleted copy to another
    // weekday on a second device is not such a change)
    return [...m.values()].filter(p => !(del[p.id] >= contentTime(p))).sort((p, q) => p.ts - q.ts || (p.id < q.id ? -1 : 1));
  };
  const list = byId(a.list, b.list, true), groups = byId(a.groups, b.groups);
  const gids = new Set(groups.map(g => g.id));
  const out = { ...b, ...a, list: list.map(p => (p.grp && !gids.has(p.grp) ? { ...p, grp: null } : p)), groups, del };
  out.seq = list.length ? Math.max(a.seq || 0, b.seq || 0, ...list.map(p => p.n || 0)) : 0;
  if (out.active && !list.some(p => p.id === out.active)) out.active = "";
  if (a.v === 2 || b.v === 2) {
    // the side that changed the week last wins; a side never upgraded has no week yet
    const wa = a.v === 2 ? a.wmts || 0 : -1, wb = b.v === 2 ? b.wmts || 0 : -1;
    const w = wb > wa ? b : a.v === 2 ? a : b;
    out.v = 2; out.week = { ...(w.week || {}) }; out.wmts = Math.max(wa, wb, 0);
  }
  return out;
}

// ─── Soft recommendations (never forced) ───────────────────────────────────────
// Per workout: which of push / pull / legs / core it trains. Per week: sets per muscle, counted like the research
// does: a main muscle = 1 set, a helping one = ½ (fractional sets). ACSM 2026 position stand: each muscle ≥ 2 days a
// week; about 10+ sets a week for the most growth. Muscles are shown in 9 families.
export const MUSCLE_FAMILY = {
  chest: "chest", delt_f: "shoulders", delt_s: "shoulders", delt_r: "shoulders", lats: "back", upback: "back", lowback: "back",
  biceps: "arms", triceps: "arms", forearm: "arms", quads: "quads", hams: "hams", glutes: "glutes", abduct: "glutes",
  adduct: "quads", calves: "calves", tib: "calves", abs: "core", obl: "core",
};
export const FAMILIES = ["chest", "back", "shoulders", "arms", "quads", "hams", "glutes", "calves", "core"];
export const TYPES = ["push", "pull", "legs", "core"];
export const WEEK_SETS = 10, WEEK_DAYS = 2;
export function dayTypes(items, lib) { const s = new Set(); items.forEach(x => { if (lib[x.id]) s.add(lib[x.id].t); }); return TYPES.filter(t => s.has(t)); }
// {family: {sets, days}} for a list of training days (each a list of items).
export function coverage(dayLists, lib) {
  const out = Object.fromEntries(FAMILIES.map(f => [f, { sets: 0, days: 0 }]));
  dayLists.forEach(items => {
    const seen = new Set();
    items.forEach(x => {
      const e = lib[x.id]; if (!e) return;
      const sets = x.sets || DEFAULT_SETS;
      const add = {};
      e.m.forEach(m => { const f = MUSCLE_FAMILY[m]; add[f] = Math.max(add[f] || 0, 1); seen.add(f); });
      e.s.forEach(m => { const f = MUSCLE_FAMILY[m]; add[f] = Math.max(add[f] || 0, 0.5); });
      Object.entries(add).forEach(([f, k]) => { out[f].sets += k * sets; });
    });
    seen.forEach(f => { out[f].days++; });
  });
  FAMILIES.forEach(f => { out[f].sets = Math.round(out[f].sets * 2) / 2; });
  return out;
}
export const weekCoverage = (P, lib) => coverage(trainDays(P).map(wd => planOn(P, wd).items), lib);
// One workout: which of push / pull / legs / core it leaves out.
export function planHints(plan, lib) {
  const items = plan.items || []; if (!items.length) return [];
  const has = dayTypes(items, lib), miss = TYPES.filter(t => !has.includes(t));
  return miss.length ? [{ kind: "missPlan", types: miss, has }] : [];
}
// The week: muscle families missing or trained on too few days / sets, and too many rest days in a row.
export function weekHints(P, lib) {
  const h = [], td = trainDays(P).length;
  if (!td) return h;
  const cov = weekCoverage(P, lib);
  FAMILIES.forEach(f => {
    const c = cov[f];
    if (c.days === 0) h.push({ kind: "none", fam: f });
    else if (c.days < WEEK_DAYS && td >= WEEK_DAYS) h.push({ kind: "fewDays", fam: f, days: c.days, sets: c.sets });
    else if (c.sets < WEEK_SETS) h.push({ kind: "fewSets", fam: f, days: c.days, sets: c.sets });
  });
  const run = maxRestRun(P);
  if (run > REST_IN_A_ROW) h.push({ kind: "rest", run });
  return h;
}
