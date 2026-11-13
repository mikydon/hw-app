// Unit tests for src/plans.js: node tools/plans_test.mjs
import * as P from "../src/plans.js";
import { LIB } from "../src/exlib.js";
let pass = 0, fail = 0;
const ok = (c, w) => { if (c) pass++; else { fail++; console.log("✗", w); } };
const eq = (a, b, w) => ok(JSON.stringify(a) === JSON.stringify(b), `${w}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);

// numbering: never reused while plans exist, back to 1 when all are gone
let S = P.emptyPlans(), ids = [];
for (let i = 0; i < 12; i++) { const r = P.addPlan(S, 1000 + i); S = r.P; ids.push(r.plan.id); }
eq(S.list.map(p => p.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "1..12");
S = P.delPlan(S, ids[1], 2000);
let r = P.addPlan(S, 2001); eq(r.plan.n, 13, "after deleting plan 2 the next is 13"); S = r.P;
S.list.map(p => p.id).forEach(id => { S = P.delPlan(S, id, 3000); });
eq(S.seq, 0, "all gone: seq 0"); r = P.addPlan(S, 3001); eq(r.plan.n, 1, "then 1 again");

// a plan = one workout: items, sets, own time
let p = r.plan;
p = P.addItem(p, "k1"); p = P.addItem(p, "k1"); eq(p.items.length, 1, "no duplicate exercise");
p = P.addItem(p, "b5"); p = P.patchItem(p, "b5", { dur: 75 }); eq(p.items[1].dur, 75, "own time");
p = P.patchItem(p, "b5", { dur: null }); ok(!("dur" in p.items[1]), "removing own time brings the app's back");
p = P.patchItem(p, "k1", { sets: 99 }); eq(p.items[0].sets, P.MAX_SETS, "sets capped");
p = P.moveItem(p, 1, 0); eq(p.items.map(x => x.id), ["b5", "k1"], "move");

// the week: one plan per weekday, rest days, mirror for 1.9.x phones
let W = { ...P.emptyPlans(), list: [{ ...p, id: "A", n: 1, ts: 1, mts: 1 }, { id: "B", n: 2, ts: 2, mts: 2, items: [{ id: "n1", sets: 3 }], days: {}, ds: "{}" }, { id: "E", n: 3, ts: 3, mts: 3, items: [], days: {}, ds: "{}" }], seq: 3 };
eq(P.hasWeek(W), false, "no week yet");
W = P.setWeekDay(W, 1, "A", 10); W = P.setWeekDay(W, 3, "A", 11); W = P.setWeekDay(W, 2, "B", 12); W = P.setWeekDay(W, 5, "E", 13);
eq(P.trainDays(W), [1, 2, 3], "Mon A, Tue B, Wed A (an empty plan doesn't count)");
eq(P.planOn(W, 2).id, "B", "Tuesday = B"); eq(P.planOn(W, 4), null, "Thursday = rest");
eq(P.daysOf(W, "A"), [1, 3], "A's days");
eq(P.maxRestRun(W), 4, "Thu..Sun = 4 rest days in a row");
eq(W.wmts, 13, "week change time");
W = P.setWeekDay(W, 3, "", 14); eq(P.daysOf(W, "A"), [1], "Wednesday cleared");
let M = P.mirror(W, 20);
eq(M.list.find(x => x.id === "A").days, { 1: p.items }, "A's mirror = its exercises on Monday");
eq(M.list.find(x => x.id === "B").days, { 2: [{ id: "n1", sets: 3 }] }, "B's mirror = Tuesday");
eq(M.list.find(x => x.id === "E").mts, 3, "a plan whose mirror didn't change keeps its time");
eq(P.mirror(M, 30), M, "mirror twice = no change");
M = P.delPlan(M, "B", 40); eq(P.planOn(M, 2), null, "deleting a plan frees its days"); eq(M.wmts, 40, "and changes the week");
eq(P.clearWeek(M, 50).week, {}, "clear week");

// weekdays
eq(P.weekdayOf("2026-11-02"), 1, "Nov 2 2026 is Monday"); eq(P.weekdayOf("2026-11-08"), 7, "Nov 8 is Sunday");
eq(P.mondayOf("2026-11-08"), "2026-11-02", "monday of week");
eq(P.lastDone([{ date: "2026-11-01", day: "A" }, { date: "2026-11-03", plan: { id: "X" } }, { date: "2026-11-05", day: "A" }, { date: "2026-11-06", free: true, day: "A" }]), { "rec:A": "2026-11-05", X: "2026-11-03" }, "last done per workout");

// ─── upgrade of 1.9.0/1.9.1 week plans ───
const k = (id, sets = 3) => ({ id, sets });
const old = { list: [
  { id: "same", n: 1, name: "", grp: null, ts: 100, mts: 500, days: { 1: [k("k1")], 3: [k("k1")], 5: [k("k1")] } },
  { id: "mix", n: 2, name: "Gym", grp: "g", ts: 200, mts: 600, days: { 2: [k("row1")], 4: [k("n1")], 6: [k("row1")] } },
  { id: "none", n: 3, name: "", grp: null, ts: 300, mts: 700, days: {} },
], groups: [{ id: "g", name: "G", ts: 1, mts: 1 }], seq: 3, del: {}, active: "mix" };
const U = P.upgrade(old);
eq(U.v, 2, "upgraded");
eq(U.list.map(x => x.id), ["same", "mix", "mix~1", "none"], "a plan with different days splits into one workout per list");
eq(U.list[0].items, [k("k1")], "same days → one workout"); eq(U.list[0].name, "", "its name stays");
eq(U.list[1].items, [k("row1")], "first list stays under the old id"); eq(U.list[1].name, "Gym · 2, 6", "split parts are named after their days");
eq(U.list[2].items, [k("n1")], "second list = new workout"); eq([U.list[2].grp, U.list[2].mts, U.list[2].ts], ["g", 600, 201], "same group, same time, deterministic ts");
eq(U.week, { 2: "mix", 4: "mix~1", 6: "mix" }, "the plan in use gives the week");
eq(U.list[3].items, [], "empty week plan → empty workout");
eq(P.upgrade(old), U, "the same input upgrades the same way (two phones agree)");
eq(P.upgrade(U), U, "upgrading again changes nothing");
const U0 = P.upgrade({ ...old, active: "" });
eq(U0.week, {}, "recommended in use → no week");
// a 1.9.x phone edits a plan's days after the upgrade: it is read again from its days
const after = P.mirror(U, 1000);
const edited = { ...after, list: after.list.map(x => (x.id === "same" ? { ...x, days: { 1: [k("k1", 5)] }, mts: 2000 } : x)) };
const U2 = P.upgrade(edited);
eq(U2.list.find(x => x.id === "same").items, [k("k1", 5)], "a 1.9.x edit is picked up");
eq(U2.week, after.week, "and the week stays");
// plansOf: nothing stored = empty v2
eq(P.plansOf({}).v, 2, "plansOf upgrades"); eq(P.plansOf({}).list, [], "empty");

// sync merge
const A = { ...P.emptyPlans(), list: [{ id: "a", n: 1, ts: 1, mts: 5, name: "new", items: [] }, { id: "b", n: 2, ts: 2, mts: 2, items: [] }], seq: 2 };
const B = { ...P.emptyPlans(), list: [{ id: "a", n: 1, ts: 1, mts: 3, name: "old", items: [] }, { id: "c", n: 3, ts: 3, mts: 3, items: [] }], seq: 3, del: { b: 4 } };
let Mg = P.mergePlans(A, B);
eq(Mg.list.map(x => x.id), ["a", "c"], "deleted b gone, c added");
eq(Mg.list[0].name, "new", "newer change wins"); eq(Mg.seq, 3, "seq max");
const M2 = P.mergePlans({ ...P.emptyPlans(), del: { a: 1 } }, { ...P.emptyPlans(), list: [{ id: "a", n: 1, ts: 1, mts: 9, items: [] }], seq: 1 });
eq(M2.list.length, 1, "a change made after the deletion survives");
const G = P.mergePlans({ ...P.emptyPlans(), list: [{ id: "x", ts: 1, mts: 1, grp: "g1", items: [] }], groups: [{ id: "g1", ts: 1, mts: 1 }] }, { ...P.emptyPlans(), del: { g1: 5 } });
eq(G.list[0].grp, null, "plan of a deleted group becomes ungrouped");
eq(P.mergePlans({ ...A, week: { 1: "a" }, wmts: 9 }, { ...B, week: { 2: "c" }, wmts: 5 }).week, { 1: "a" }, "newer week wins (left)");
eq(P.mergePlans({ ...A, week: { 1: "a" }, wmts: 3 }, { ...B, week: { 2: "c" }, wmts: 5 }).week, { 2: "c" }, "newer week wins (right)");
const oldSide = { list: [], groups: [], seq: 0, del: {}, active: "" };
eq(P.mergePlans(oldSide, { ...B, week: { 2: "c" }, wmts: 5 }).week, { 2: "c" }, "a never-upgraded side keeps the other's week");
eq(P.mergePlans(oldSide, { list: [], seq: 0 }).v, undefined, "two old sides stay old");

// sorting
const L = [{ ts: 1, name: "Workout Plan 10" }, { ts: 2, name: "Workout Plan 2" }, { ts: 3, name: "abc" }];
eq(P.sortPlans(L, "name", "asc").map(x => x.name), ["abc", "Workout Plan 2", "Workout Plan 10"], "name asc, numbers natural");
eq(P.sortPlans(L, "date", "desc").map(x => x.ts), [3, 2, 1], "date desc");

// recommendations
const recDays = [[k("k1"), k("row1"), k("n1"), k("b5")], [k("r1"), k("row2"), k("n2"), k("b2")], [k("k3"), k("row3"), k("n7"), k("b4")]];
const rec = { ...P.emptyPlans(), list: recDays.map((items, i) => ({ id: "r" + i, n: i + 1, ts: i, mts: 0, items })), week: { 1: "r0", 3: "r1", 5: "r2" } };
ok(rec.list.every(x => !P.planHints(x, LIB).length), "recommended workouts miss no type");
const h = P.weekHints(rec, LIB);
ok(h.some(x => x.kind === "rest" && x.run === 2), "Fri→Mon has 2 rest days in a row");
const arms = { id: "arms", items: [k("fw_dumbbell_biceps_curl"), k("mc_cable_triceps_pushdown")] };
eq(P.planHints(arms, LIB)[0].types, ["legs", "core"], "curl + pushdown misses legs and core");
const armsWeek = { ...P.emptyPlans(), list: [arms], week: { 1: "arms" } };
ok(P.weekHints(armsWeek, LIB).some(x => x.kind === "none" && x.fam === "chest"), "no chest at all in the week");
const cov = P.weekCoverage(rec, LIB);
eq(cov.chest.days, 2, "chest is a main muscle on Mon (push-up) and Fri (diamond push-up)");
eq(cov.chest.sets, 6, "chest sets: push-up 3 + diamond push-up 3");
eq(P.weekHints(P.emptyPlans(), LIB), [], "no week, no week hints");

// ─── 1.10.0: two devices through the real sync (found Nov 13: a phone that had not yet received an edit and only
// moved the plan to another weekday sent its old exercises back as the newest plan). Random edits on two devices
// with syncs in between, a fixed seed: after everything is synced both devices hold the same plans, no plan is
// lost, and every plan has the exercises of its LAST content edit, whichever device made it.
{
  const { mergeAll, stable } = await import("../src/sync.js");
  let now = 1000, s = 12345;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const mk = () => ({ history: [], profile: { name: "M", pfp: null, freezeDays: [] }, settings: {}, kcal: null, sync: { acct: "me", del: {}, kdel: {}, mod: {} } });
  const EXS = ["k1", "k2", "n1", "b5", "r1", "p1"];
  let diverged = 0, lost = 0, stale = 0, zombie = 0, runs = 0;
  for (let run = 0; run < 300; run++, runs++) {
    const dev = [mk(), mk()]; let cloud = null; const truth = new Map();
    const setP = (d, fn) => { now += 1 + Math.floor(rnd() * 3); const next = P.mirror(fn(P.plansOf(d.profile)), now); d.profile = { ...d.profile, plans: next }; d.sync.mod = { ...d.sync.mod, profile: now }; };
    const up = d => { cloud = JSON.parse(JSON.stringify({ history: d.history, profile: d.profile, settings: d.settings, kcal: d.kcal, sync: d.sync })); };
    const down = d => { if (!cloud) return; const M = mergeAll(d, JSON.parse(JSON.stringify(cloud)), false); d.profile = M.profile; d.sync = { ...d.sync, ...M.sync }; };
    for (let step = 0; step < 40; step++) {
      const d = dev[rnd() < 0.5 ? 0 : 1], r = rnd(), L = P.plansOf(d.profile).list, pick = () => L[Math.floor(rnd() * L.length)];
      if (r < 0.2) { let id; setP(d, c => { const x = P.addPlan(c, now); id = x.plan.id; return x.P; }); truth.set(id, { items: "[]" }); }
      else if (r < 0.45 && L.length) { const p = pick(), ex = EXS[Math.floor(rnd() * EXS.length)]; setP(d, c => P.updatePlan(c, p.id, P.addItem(c.list.find(x => x.id === p.id), ex), now)); truth.set(p.id, { items: JSON.stringify(P.plansOf(d.profile).list.find(x => x.id === p.id).items) }); }
      else if (r < 0.5 && L.length) { const p = pick(); setP(d, c => P.updatePlan(c, p.id, { name: "N" + now }, now)); truth.set(p.id, { items: JSON.stringify(p.items), name: "N" + now }); }
      else if (r < 0.64 && L.length) { const p = pick(); setP(d, c => P.setWeekDay(c, 1 + Math.floor(rnd() * 7), rnd() < 0.8 ? p.id : "", now)); }
      else if (r < 0.68 && L.length) { const p = pick(); setP(d, c => P.delPlan(c, p.id, now)); truth.set(p.id, { deleted: now }); }
      else if (r < 0.85) { down(d); up(d); }
      else down(d);
    }
    for (let k = 0; k < 3; k++) dev.forEach(d => { down(d); up(d); });
    const A = P.plansOf(dev[0].profile), B = P.plansOf(dev[1].profile);
    if (stable(A) !== stable(B)) { diverged++; continue; }
    for (const [id, t] of truth) {
      const p = A.list.find(x => x.id === id);
      if (t.deleted) { if (p && (p.its || 0) < t.deleted) zombie++; continue; } // only a content edit made after the deletion may bring it back
      if (!p) { lost++; continue; }
      if (JSON.stringify(p.items) !== t.items || (t.name && p.name !== t.name)) stale++;
    }
  }
  eq([diverged, lost, stale, zombie], [0, 0, 0, 0], `two devices, ${runs} random runs: [diverged, lost plans, stale content, deleted plans back]`);
  // an app older than 1.10 changes the exercises (no `its` there): its newer edit still wins
  const base = P.addPlan(P.emptyPlans(), 10), id = base.plan.id;
  const withK1 = P.updatePlan(base.P, id, P.addItem(base.plan, "k1"), 20);
  const old194 = { ...withK1, list: withK1.list.map(p => ({ ...p, items: [...p.items, { id: "n1", sets: 3 }], mts: 30 })) }; // 1.9.4 edit: mts only
  eq(P.mergePlans(withK1, old194).list[0].items.map(x => x.id), ["k1", "n1"], "an edit made by 1.9.4 (newer mts, old its) wins");
  // … and its weekday change (mts only, content untouched) no longer brings old exercises back
  const moved194 = { ...base.P, list: base.P.list.map(p => ({ ...p, mts: 40 })), week: { 1: id }, wmts: 40 };
  const M3 = P.mergePlans(withK1, moved194);
  eq([M3.list[0].items.map(x => x.id), M3.week], [["k1"], { 1: id }], "an old copy moved to Monday keeps the newer exercises and the new weekday");
  eq(P.mergePlans(moved194, withK1).list[0], M3.list[0], "the same result from both sides");
}
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
