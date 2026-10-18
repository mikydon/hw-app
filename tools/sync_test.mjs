// Unit tests for src/sync.js (web ↔ phone merge). Run: node tools/sync_test.mjs
import { mergeAll, syncKey, mergeHistory, withIds, stable, mergeProfile } from "../src/sync.js";
let pass = 0, fail = 0;
const ok = (c, name) => { if (c) { pass++; console.log("  ✓", name); } else { fail++; console.log("  ✗ FAIL:", name); } };
const W = (date, ts, extra = {}) => ({ date, ts, day: "A", rounds: 2, items: [{ id: "k1", res: [10, 10] }], ...extra });
const base = (over = {}) => ({ history: [], profile: { name: "Miky", pfp: null, freezeDays: [], streakResetTs: 0 }, settings: { theme: "navy", vibrate: true }, kcal: null, sync: {}, ...over });

console.log("workouts");
{
  const a = base({ history: [W("2026-10-01", 1), W("2026-10-03", 3)] });
  const b = base({ history: [W("2026-10-01", 1), W("2026-10-05", 5)] });
  const m = mergeAll(a, b, false);
  ok(m.history.length === 3 && m.history.map(e => e.date).join() === "2026-10-01,2026-10-03,2026-10-05", "phone + website workouts are joined, sorted, no duplicate");
  ok(m.history.every(e => e.id), "every workout gets an id");
  const del = mergeAll(base({ history: [W("2026-10-01", 1)], sync: { del: { t3: 99 } } }), b.history ? base({ history: [W("2026-10-01", 1), W("2026-10-03", 3)] }) : b, false);
  ok(del.history.length === 1 && del.sync.del.t3 === 99, "a workout deleted on one device stays deleted (tombstone wins over the other device's copy)");
  const e1 = { ...W("2026-10-01", 1), id: "x", mts: 10, rounds: 2 }, e2 = { ...W("2026-10-02", 1 + 86400000), id: "x", mts: 20, rounds: 3 };
  ok(mergeHistory([e1], [e2], {})[0].rounds === 3 && mergeHistory([e2], [e1], {})[0].rounds === 3, "the same workout edited on both: the later edit wins, from either side");
  const t1 = { ...W("2026-10-01", 1), id: "y", rounds: 2 }, t2 = { ...W("2026-10-01", 1), id: "y", rounds: 3 };
  ok(stable(mergeHistory([t1], [t2], {})) === stable(mergeHistory([t2], [t1], {})), "a tie is decided the same way on both devices");
  ok(withIds([{ date: "2026-10-01", ts: 7 }])[0].id === "t7", "old workouts get an id from their time (the same on every device)");
}
console.log("profile, settings");
{
  const a = base({ profile: { name: "Miky", freezeDays: ["2026-10-02"], bdays: [2026], skips: { "2026-10-04": { r: "sick" } } }, sync: { mod: { profile: 100 } } });
  const b = base({ profile: { name: "Michael", freezeDays: ["2026-10-09"], skips: { "2026-10-08": { r: "work" } } }, sync: { mod: { profile: 200 } } });
  const m = mergeAll(a, b, false);
  ok(m.profile.name === "Michael", "the newer name wins");
  ok(m.profile.freezeDays.join() === "2026-10-02,2026-10-09" && m.profile.bdays.join() === "2026", "freeze days and birthdays are joined");
  ok(Object.keys(m.profile.skips).length === 2, "skipped days from both are kept");
  const s = mergeAll(base({ settings: { theme: "wine", vibrate: false, hz: "60" }, sync: { mod: { settings: 1 } } }), base({ settings: { theme: "ocean", vibrate: true, hz: "max", accent: "pink" }, sync: { mod: { settings: 2 } } }), false);
  ok(s.settings.theme === "ocean" && s.settings.accent === "pink", "theme and main colour follow the account");
  ok(s.settings.vibrate === false && s.settings.hz === "60", "vibration and screen Hz stay per device");
  const f = mergeAll(base({ profile: { name: "User", freezeDays: [] }, sync: { mod: { profile: 999 } } }), base({ profile: { name: "Miky", birth: { y: 2006 } } }), true);
  ok(f.profile.name === "Miky" && f.profile.birth.y === 2006, "first merge on a new phone: the account's name and birth year, not 'User'");
}
console.log("calories");
{
  const a = base({ kcal: { sex: "m", height: 188, hTs: 5, weight: 71, wTs: 50, wSrc: "hc", steps: { "2026-10-01": 9000 }, healthOn: true, log: { "2026-10-01": [{ ts: 1, kcal: 500 }] } } });
  const b = base({ kcal: { sex: "m", height: 188, hTs: 5, weight: 70, wTs: 10, wSrc: "me", goal: { type: "gain", rate: 0.25 }, log: { "2026-10-01": [{ ts: 2, kcal: 700 }] } }, sync: { mod: { kcal: 9 } } });
  const m = mergeAll(a, b, false);
  ok(m.kcal.log["2026-10-01"].length === 2, "eaten calories from both devices are joined");
  ok(m.kcal.weight === 71 && m.kcal.wSrc === "hc", "this phone's newer Health Connect weight stays");
  ok(m.kcal.steps && m.kcal.healthOn === true, "Health Connect data stays on the phone");
  ok(m.kcal.goal && m.kcal.goal.type === "gain", "the goal set on the other device arrives");
  const d = mergeAll(base({ kcal: { log: { "2026-10-01": [{ ts: 1, kcal: 500 }] } }, sync: { kdel: { 2: 77 } } }), b, false);
  ok(d.kcal.log["2026-10-01"].length === 1, "a deleted calorie entry stays deleted");
}
console.log("convergence");
{
  const A = base({ history: [W("2026-10-01", 1), W("2026-10-03", 3)], profile: { name: "A" }, settings: { theme: "wine" }, sync: { mod: { profile: 5, settings: 7 }, del: { t9: 1 } } });
  const B = base({ history: [W("2026-10-02", 2), W("2026-10-09", 9)], profile: { name: "B" }, settings: { theme: "ocean" }, sync: { mod: { profile: 6, settings: 3 } } });
  const ab = mergeAll(A, B, false), ba = mergeAll(B, A, false);
  ok(syncKey(ab) === syncKey(ba), "both devices end with the same data, whichever merges first");
  ok(syncKey(mergeAll(ab, ab, false)) === syncKey(ab), "merging again changes nothing (no endless uploads)");
  ok(ab.history.length === 3 && ab.profile.name === "B" && ab.settings.theme === "wine", "result: 3 workouts (t9 deleted), newer name, newer theme");
}
console.log("1.7.4: opened reward cards (claim) keep the highest level from both sides");
{
  const a = { name: "A", claim: { a: { workouts: 3, streak: 1 }, r: { k1: 2 } } }, b = { name: "B", claim: { a: { workouts: 2, reps: 4 }, r: { k1: 4, n1: 1 } } };
  const m1 = mergeProfile(a, b, 1, 2, false), m2 = mergeProfile(b, a, 2, 1, false);
  const want = stable({ a: { workouts: 3, streak: 1, reps: 4 }, r: { k1: 4, n1: 1 } });
  ok(stable(m1.claim) === want && stable(m2.claim) === want, "max per badge / rank, either direction");
  ok(stable(mergeProfile({ name: "A" }, b, 1, 2, true).claim) === stable(b.claim), "one side without claims takes the other's");
  ok(mergeProfile({ name: "A" }, { name: "B" }, 1, 2, false).claim === undefined, "no claims on either side: nothing added");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
