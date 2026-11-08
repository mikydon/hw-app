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
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
