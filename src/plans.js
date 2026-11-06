// Workout plans (1.9.0). Pure functions only (no React, no storage), so they run in node tests (tools/plans_test.mjs).
//
// profile.plans = {
//   list:   [{ id, n, name, grp, ts, mts, days: { "1": [{ id, sets, dur? }], … "7": [] } }]
//            n = the plan's number for its default name "Workout Plan n"; name "" = use the default.
//            days: weekday 1 = Monday … 7 = Sunday; a missing or empty day is a rest day.
//            item: id = exercise, sets = how many sets, dur = the user's own hold time (seconds; none = the app's).
//   groups: [{ id, name, ts, mts }],
//   seq:    the highest number given so far. Numbers are never reused while any plan exists (plan 2 deleted with
//           12 plans → the next is 13); when ALL plans are gone the next one is 1 again (Michael, Nov 1).
//   del:    { planOrGroupId: deletedAt } (so a deletion reaches the other devices)
//   active: id of the plan Home offers, "" or missing = the recommended A/B/C plan
//   sort:   "date" | "name", dir: "asc" | "desc"
// }
// The whole object follows the account inside the profile (src/sync.js mergeProfile → mergePlans).

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
export const DEFAULT_SETS = 3;
export const MAX_ITEMS = 12; // exercises a day can hold
export const MAX_SETS = 10;
export const emptyPlans = () => ({ list: [], groups: [], seq: 0, del: {}, active: "", sort: "date", dir: "desc" });
export const plansOf = profile => ({ ...emptyPlans(), ...((profile && profile.plans) || {}) });

const rid = (p, now) => p + now.toString(36) + Math.random().toString(36).slice(2, 6);

export function addPlan(P, now = Date.now()) {
  const n = P.list.length ? (P.seq || 0) + 1 : 1;
  const plan = { id: rid("p", now), n, name: "", grp: null, ts: now, mts: now, days: {} };
  return { P: { ...P, list: [...P.list, plan], seq: n }, plan };
}
export function updatePlan(P, id, patch, now = Date.now()) {
  return { ...P, list: P.list.map(p => (p.id === id ? { ...p, ...patch, mts: now } : p)) };
}
export function delPlan(P, id, now = Date.now()) {
  const list = P.list.filter(p => p.id !== id);
  return { ...P, list, seq: list.length ? P.seq : 0, del: { ...P.del, [id]: now }, active: P.active === id ? "" : P.active };
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
  return { ...P, groups: P.groups.filter(g => g.id !== id), list: P.list.map(p => (p.grp === id ? { ...p, grp: null, mts: now } : p)), del: { ...P.del, [id]: now } };
}

// Days: add / remove / move exercises, sets and own hold times.
const dayList = (plan, wd) => (plan.days && plan.days[wd]) || [];
export function setDay(plan, wd, items) { return { ...plan, days: { ...plan.days, [wd]: items.slice(0, MAX_ITEMS) } }; }
export function addItem(plan, wd, exId) {
  const l = dayList(plan, wd);
  if (l.some(x => x.id === exId) || l.length >= MAX_ITEMS) return plan;
  return setDay(plan, wd, [...l, { id: exId, sets: DEFAULT_SETS }]);
}
export const removeItem = (plan, wd, exId) => setDay(plan, wd, dayList(plan, wd).filter(x => x.id !== exId));
export function moveItem(plan, wd, from, to) {
  const l = [...dayList(plan, wd)]; if (from < 0 || from >= l.length || to < 0 || to >= l.length) return plan;
  const [x] = l.splice(from, 1); l.splice(to, 0, x); return setDay(plan, wd, l);
}
export const patchItem = (plan, wd, exId, patch) => setDay(plan, wd, dayList(plan, wd).map(x => {
  if (x.id !== exId) return x;
  const y = { ...x, ...patch };
  if (y.dur === null || y.dur === undefined) delete y.dur; // removing the own time brings the app's back
  y.sets = Math.max(1, Math.min(MAX_SETS, Math.round(y.sets || DEFAULT_SETS)));
  return y;
}));
export const copyDay = (plan, from, to) => setDay(plan, to, dayList(plan, from).map(x => ({ ...x })));
export const isRest = (plan, wd) => !dayList(plan, wd).length;
export const trainDays = plan => WEEKDAYS.filter(wd => !isRest(plan, wd));

// Rest days in a row, the week repeating (Sun is followed by Mon). The streak allows 1 rest day in a row (every
// other day, the same rule as before 1.9.0), so a plan with more needs freezes; the editor warns about it.
export const REST_IN_A_ROW = 1;
export function maxRestRun(plan) {
  const r = WEEKDAYS.map(wd => isRest(plan, wd));
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
// Weekdays of this plan already trained this week (history entries with plan.id and plan.wd).
export function doneThisWeek(plan, history, today) {
  const mon = mondayOf(today), out = new Set();
  (history || []).forEach(e => { if (e.plan && e.plan.id === plan.id && e.date >= mon && e.date <= today && e.plan.wd) out.add(e.plan.wd); });
  return out;
}
// The day Home offers: today if it is a training day not done yet, else the next training day of this week not done
// yet, else the first training day not done (catching up), else today.
export function offerDay(plan, history, today) {
  const wd = weekdayOf(today), done = doneThisWeek(plan, history, today), td = trainDays(plan);
  if (!td.length) return wd;
  if (!isRest(plan, wd) && !done.has(wd)) return wd;
  return td.find(d => d > wd && !done.has(d)) || td.find(d => !done.has(d)) || wd;
}

export function sortPlans(list, sort = "date", dir = "desc", nameOf = p => p.name) {
  const k = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => (sort === "name" ? nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true, sensitivity: "base" }) : a.ts - b.ts) * k || (a.ts - b.ts) * k);
}

// Sync: both sides' plans and groups by id; the newer change wins; a deletion wins over older changes.
export function mergePlans(a, b) {
  if (!a) return b; if (!b) return a;
  const del = { ...(a.del || {}) }; Object.entries(b.del || {}).forEach(([k, v]) => { del[k] = Math.max(del[k] || 0, v); });
  const byId = (x, y) => {
    const m = new Map();
    [...(x || []), ...(y || [])].forEach(p => { const c = m.get(p.id); if (!c || (p.mts || 0) > (c.mts || 0)) m.set(p.id, p); });
    return [...m.values()].filter(p => !(del[p.id] >= (p.mts || 0))).sort((p, q) => p.ts - q.ts);
  };
  const list = byId(a.list, b.list), groups = byId(a.groups, b.groups);
  const gids = new Set(groups.map(g => g.id));
  const out = { ...b, ...a, list: list.map(p => (p.grp && !gids.has(p.grp) ? { ...p, grp: null } : p)), groups, del };
  out.seq = list.length ? Math.max(a.seq || 0, b.seq || 0, ...list.map(p => p.n || 0)) : 0;
  if (out.active && !list.some(p => p.id === out.active)) out.active = "";
  return out;
}

// ─── Soft recommendations (never forced) ───────────────────────────────────────
// Per day: which of push / pull / legs / core it trains. Per week: sets per muscle, counted like the research does:
// a main muscle = 1 set, a helping one = ½ (fractional sets). ACSM 2026 position stand: each muscle ≥ 2 days a week;
// about 10+ sets a week for the most growth. Muscles are shown in 9 families.
export const MUSCLE_FAMILY = {
  chest: "chest", delt_f: "shoulders", delt_s: "shoulders", delt_r: "shoulders", lats: "back", upback: "back", lowback: "back",
  biceps: "arms", triceps: "arms", forearm: "arms", quads: "quads", hams: "hams", glutes: "glutes", abduct: "glutes",
  adduct: "quads", calves: "calves", tib: "calves", abs: "core", obl: "core",
};
export const FAMILIES = ["chest", "back", "shoulders", "arms", "quads", "hams", "glutes", "calves", "core"];
export const TYPES = ["push", "pull", "legs", "core"];
export const WEEK_SETS = 10, WEEK_DAYS = 2;
export function dayTypes(items, lib) { const s = new Set(); items.forEach(x => { if (lib[x.id]) s.add(lib[x.id].t); }); return TYPES.filter(t => s.has(t)); }
// {family: {sets, days}} for a plan's week (a family counts on a day when a main muscle of it is trained).
export function weekCoverage(plan, lib) {
  const out = Object.fromEntries(FAMILIES.map(f => [f, { sets: 0, days: 0 }]));
  WEEKDAYS.forEach(wd => {
    const seen = new Set();
    dayList(plan, wd).forEach(x => {
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
// The hints for a plan: [{kind: "missDay", wd, types}, {kind: "fewSets"|"fewDays", fam, sets, days}, {kind: "rest", run}].
export function planHints(plan, lib) {
  const h = [];
  WEEKDAYS.forEach(wd => {
    const items = dayList(plan, wd); if (!items.length) return;
    const has = dayTypes(items, lib), miss = TYPES.filter(t => !has.includes(t));
    if (miss.length) h.push({ kind: "missDay", wd, types: miss, has });
  });
  const td = trainDays(plan).length;
  if (td) {
    const cov = weekCoverage(plan, lib);
    FAMILIES.forEach(f => {
      const c = cov[f];
      if (c.days === 0) h.push({ kind: "none", fam: f });
      else if (c.days < WEEK_DAYS && td >= WEEK_DAYS) h.push({ kind: "fewDays", fam: f, days: c.days, sets: c.sets });
      else if (c.sets < WEEK_SETS) h.push({ kind: "fewSets", fam: f, days: c.days, sets: c.sets });
    });
  }
  const run = maxRestRun(plan);
  if (td && run > REST_IN_A_ROW) h.push({ kind: "rest", run });
  return h;
}
