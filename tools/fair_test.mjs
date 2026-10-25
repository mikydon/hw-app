// 1.8.0: unit tests for the world-list check (src/fair.js). Run: node tools/fair_test.mjs
import { fairStats, capOf, firstOf } from "../src/fair.js";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const day = (k, n) => { const d = new Date(k + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ts = k => Date.parse(k + "T10:00:00Z");
const W = (date, res = { k1: [20, 22], row1: [12, 12] }, x = {}) => ({ id: "t" + ts(date) + (x.k || ""), date, ts: ts(date), items: Object.entries(res).map(([id, r]) => ({ id, res: r })), warm: true, ...x });
const today = "2026-10-24";
const every2 = Array.from({ length: 10 }, (_, i) => W(day(today, -18 + i * 2)));

console.log("honest history");
let r = fairStats(every2, { today });
ok(r.n === 10 && r.streak === 10 && r.flags.length === 0, `10 workouts, streak 10, no flags (${JSON.stringify(r)})`);
ok(r.pts === 10010, "score = workouts × 1000 + streak");

console.log("one a day, manual entries, limits");
r = fairStats([...every2, W(today, { k1: [20, 22] }, { k: "b" }), W(today, { k1: [20, 22] }, { k: "c" })], { today });
ok(r.n === 10 && r.drop.day === 2, "three on the last day count once");
r = fairStats([...every2, W(day(today, 1), { k1: [20] }, { manual: true })], { today });
ok(r.n === 10 && r.drop.manual === 1, "added by hand: not counted");
r = fairStats([...every2.slice(0, 9), W(day(today, -2), { k1: [capOf("k1") + 1] })], { today });
ok(r.n === 9 && r.flags.includes("cap"), `above the limit (${capOf("k1")}): not counted, flag cap`);
r = fairStats(Array.from({ length: 5 }, (_, i) => W(today, { k1: [10] }, { k: "x" + i })), { today });
ok(r.n === 1 && r.flags.includes("day"), "5 on one day: 1 counted, flag day");
r = fairStats([W(day(today, -2), { k1: [79] })], { today });
ok(r.flags.includes("jump") && r.n === 1, `first time above Emerald (${firstOf("k1")}): counted, flag jump`);
r = fairStats([W(day(today, -4), { k1: [20] }), W(day(today, -2), { k1: [60] })], { today });
ok(r.flags.includes("jump"), "20 → 60 next time: flag jump");
r = fairStats([W(day(today, -4), { k1: [20] }), W(day(today, -2), { k1: [30] })], { today });
ok(!r.flags.length, "20 → 30: fine");
r = fairStats([W(today, { k1: [10, 10], row1: [10, 10] }, { dur: 40 })], { today });
ok(r.n === 0 && r.flags.includes("fast"), "4 sets in 40 s: not counted, flag fast");

console.log("backdated workouts");
const since = ts(day(today, -30));
const late = { ...W(day(today, -20)), id: "late1" };
r = fairStats([...every2, late], { today, since, seen: { late1: ts(today) } });
ok(r.drop.late === 1 && r.flags.includes("late"), "first seen 20 days after its date (after the first check): not counted");
r = fairStats([{ ...W(day(today, -40)), ts: ts(today) }], { today, since: 0 });
ok(r.drop.late === 1, "first check: a workout saved 40 days after its date doesn't count");
r = fairStats(every2, { today, since: ts(today), seen: Object.fromEntries(every2.map(e => [e.id, ts(today)])) });
ok(r.n === 10, "first check: old history saved on its days counts");

console.log("streak and freezes");
r = fairStats([W(day(today, -10)), W(day(today, -8))], { today });
ok(r.streak === 0 && r.best === 2, "last workout 8 days ago: streak 0, best 2");
r = fairStats([W(day(today, -6)), W(day(today, -2))], { today, freezeDays: [day(today, -4)] });
ok(r.streak === 2, "a freeze bridges the gap");
r = fairStats([W(day(today, -12)), W(day(today, -2))], { today, freezeDays: [day(today, -10), day(today, -8), day(today, -6), day(today, -4)] });
ok(r.streak === 1, "at most 3 freezes in 30 days");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
