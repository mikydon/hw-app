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

// days, items, sets, own time
let p = r.plan;
p = P.addItem(p, 1, "k1"); p = P.addItem(p, 1, "k1"); eq(p.days[1].length, 1, "no duplicate in a day");
p = P.addItem(p, 1, "b5"); p = P.patchItem(p, 1, "b5", { dur: 75 }); eq(p.days[1][1].dur, 75, "own time");
p = P.patchItem(p, 1, "b5", { dur: null }); ok(!("dur" in p.days[1][1]), "removing own time brings the app's back");
p = P.patchItem(p, 1, "k1", { sets: 99 }); eq(p.days[1][0].sets, P.MAX_SETS, "sets capped");
p = P.moveItem(p, 1, 1, 0); eq(p.days[1].map(x => x.id), ["b5", "k1"], "move");
p = P.copyDay(p, 1, 3); eq(p.days[3].map(x => x.id), ["b5", "k1"], "copy day");

// rest days in a row (week wraps)
eq(P.maxRestRun(p), 4, "Mon+Wed only: Thu..Sun = 4 in a row");
let q = { days: { 1: [{ id: "k1" }], 3: [{ id: "k1" }], 5: [{ id: "k1" }], 7: [{ id: "k1" }] } };
eq(P.maxRestRun(q), 1, "every other day incl. Sun→Mon wrap");
eq(P.maxRestRun({ days: {} }), 7, "empty plan");

// weekdays and the offered day
eq(P.weekdayOf("2026-11-02"), 1, "Nov 2 2026 is Monday"); eq(P.weekdayOf("2026-11-08"), 7, "Nov 8 is Sunday");
eq(P.mondayOf("2026-11-08"), "2026-11-02", "monday of week");
const plan = { id: "pX", days: { 1: [{ id: "k1" }], 3: [{ id: "n1" }], 5: [{ id: "b5" }] } };
eq(P.offerDay(plan, [], "2026-11-04"), 3, "Wed is a training day");
eq(P.offerDay(plan, [{ date: "2026-11-04", plan: { id: "pX", wd: 3 } }], "2026-11-04"), 5, "Wed done → Fri");
eq(P.offerDay(plan, [], "2026-11-05"), 5, "Thu rest → Fri");
eq(P.offerDay(plan, [{ date: "2026-11-02", plan: { id: "pX", wd: 1 } }, { date: "2026-11-04", plan: { id: "pX", wd: 3 } }, { date: "2026-11-06", plan: { id: "pX", wd: 5 } }], "2026-11-07"), 6, "all done → today");
eq([...P.doneThisWeek(plan, [{ date: "2026-10-30", plan: { id: "pX", wd: 5 } }], "2026-11-04")], [], "last week doesn't count");

// sync merge
const A = { ...P.emptyPlans(), list: [{ id: "a", n: 1, ts: 1, mts: 5, name: "new", days: {} }, { id: "b", n: 2, ts: 2, mts: 2, days: {} }], seq: 2 };
const B = { ...P.emptyPlans(), list: [{ id: "a", n: 1, ts: 1, mts: 3, name: "old", days: {} }, { id: "c", n: 3, ts: 3, mts: 3, days: {} }], seq: 3, del: { b: 4 } };
const M = P.mergePlans(A, B);
eq(M.list.map(x => x.id), ["a", "c"], "deleted b gone, c added");
eq(M.list[0].name, "new", "newer change wins"); eq(M.seq, 3, "seq max");
const M2 = P.mergePlans({ ...P.emptyPlans(), del: { a: 1 } }, { ...P.emptyPlans(), list: [{ id: "a", n: 1, ts: 1, mts: 9, days: {} }], seq: 1 });
eq(M2.list.length, 1, "a change made after the deletion survives");
const G = P.mergePlans({ ...P.emptyPlans(), list: [{ id: "x", ts: 1, mts: 1, grp: "g1", days: {} }], groups: [{ id: "g1", ts: 1, mts: 1 }] }, { ...P.emptyPlans(), del: { g1: 5 } });
eq(G.list[0].grp, null, "plan of a deleted group becomes ungrouped");

// sorting
const L = [{ ts: 1, name: "Workout Plan 10" }, { ts: 2, name: "Workout Plan 2" }, { ts: 3, name: "abc" }];
eq(P.sortPlans(L, "name", "asc").map(x => x.name), ["abc", "Workout Plan 2", "Workout Plan 10"], "name asc, numbers natural");
eq(P.sortPlans(L, "date", "desc").map(x => x.ts), [3, 2, 1], "date desc");

// recommendations
const rec = { days: { 1: [{ id: "k1", sets: 3 }, { id: "row1", sets: 3 }, { id: "n1", sets: 3 }, { id: "b5", sets: 3 }], 3: [{ id: "r1", sets: 3 }, { id: "row2", sets: 3 }, { id: "n2", sets: 3 }, { id: "b2", sets: 3 }], 5: [{ id: "k3", sets: 3 }, { id: "row3", sets: 3 }, { id: "n7", sets: 3 }, { id: "b4", sets: 3 }] } };
const h = P.planHints(rec, LIB);
ok(!h.some(x => x.kind === "missDay"), "recommended days miss no type");
ok(h.some(x => x.kind === "rest" && x.run === 2), "Fri→Mon has 2 rest days in a row");
const arms = { days: { 1: [{ id: "fw_dumbbell_biceps_curl", sets: 3 }, { id: "mc_cable_triceps_pushdown", sets: 3 }] } };
const ha = P.planHints(arms, LIB);
eq(ha.find(x => x.kind === "missDay").types, ["legs", "core"], "curl + pushdown day misses legs and core");
ok(ha.some(x => x.kind === "none" && x.fam === "chest"), "no chest at all");
const cov = P.weekCoverage(rec, LIB);
eq(cov.chest.days, 2, "chest is a main muscle on Mon (push-up) and Fri (diamond push-up)");
eq(cov.chest.sets, 6, "chest sets: push-up 3 + diamond push-up 3");
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
