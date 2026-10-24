// World leaderboard check (1.8.0, Michael, Oct 24: "people can log endless exercises in one day and be first").
// The push server (worker/index.js) runs this on the person's cloud backup and writes their world entry itself; the
// app can't write a world entry any more (firestore.rules). The app uses the same code to say what counts.
//
// What counts for the world list (the friends list and your own profile still show everything):
//   - workouts done in the app (not added by hand), at most one a day;
//   - no set above the limit for that exercise (1.5 × its Obsidian number): such a workout doesn't count at all;
//   - saved within 3 days of its date (a workout dated long before it reached the cloud doesn't count), checked from
//     the first time the server saw the account (older history only has to look like it was saved on its day);
//   - a workout that is impossibly short (under 90 s with 4+ sets) doesn't count.
// Flags (shown to the person, and the reason a place in the world top 50 waits for the developer's check):
//   cap = a set above the limit, day = more than 3 workouts on one day, jump = a best set grew too fast (more than
//   1.5 × + 3 over the previous best, or above Emerald the first time), fast = impossibly short workouts,
//   late = workouts saved long after their date.
// World list order: pts = checked workouts × 1000 + checked streak (both hard to fake), never reps.
import { RANK_AT } from "./ranks.js";

export const FAIR = { growth: 1.5, growthAdd: 3, capMul: 1.5, lateDays: 3, fastSecs: 90, dayFlag: 3, freezePer30: 3 };
const num = v => (typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN);
const dayNo = k => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || "")); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; };
export const fairEntryId = e => e.id || "t" + (e.ts || String(e.date) + (e.day || ""));
export const capOf = id => (RANK_AT[id] ? Math.round(RANK_AT[id][7] * FAIR.capMul) : 300);
export const firstOf = id => (RANK_AT[id] ? RANK_AT[id][4] : 60);
export function fairLevel(xp) { let lvl = 1, need = 100, rest = xp; while (rest >= need) { rest -= need; lvl++; need += 50; } return lvl; }

// history: the backup's workouts. seen: {entryId: ms when the server first saw it}; since: ms of the first check
// (0 = this is the first); freezeDays: the profile's; today: "YYYY-MM-DD" (the person's day).
export function fairStats(history, { seen = {}, since = 0, freezeDays = [], today } = {}) {
  const flags = new Set(), drop = { manual: 0, late: 0, cap: 0, day: 0, fast: 0 };
  const list = (Array.isArray(history) ? history : []).filter(e => e && Array.isArray(e.items) && Number.isFinite(dayNo(e.date)))
    .slice().sort((a, b) => dayNo(a.date) - dayNo(b.date) || (a.ts || 0) - (b.ts || 0));
  const perDay = {};
  list.forEach(e => { perDay[e.date] = (perDay[e.date] || 0) + 1; });
  if (Object.values(perDay).some(n => n > FAIR.dayFlag)) flags.add("day");
  const sets = e => e.items.reduce((a, it) => a + (Array.isArray(it.res) ? it.res.filter(v => Number.isFinite(num(v))).length : 0), 0);
  const ok = [];
  for (const e of list) {
    if (e.manual) { drop.manual++; continue; }
    if (e.items.some(it => Array.isArray(it.res) && it.res.some(v => num(v) > capOf(it.id)))) { drop.cap++; flags.add("cap"); continue; }
    const s = sets(e);
    if (!s) continue;
    if (typeof e.dur === "number" && e.dur > 0 && e.dur < FAIR.fastSecs && s >= 4) { drop.fast++; flags.add("fast"); continue; }
    // saved on its day: after the first check by when the server first saw it, before that by the workout's own time
    const id = fairEntryId(e), first = seen[id];
    const savedDay = first && since && first > since + 60000 ? Math.floor(first / 864e5) : typeof e.ts === "number" ? Math.floor(e.ts / 864e5) : dayNo(e.date);
    if (savedDay - dayNo(e.date) > FAIR.lateDays) { drop.late++; flags.add("late"); continue; }
    ok.push({ e, s });
  }
  // one a day: the one with the most sets
  const byDay = new Map();
  ok.forEach(x => { const b = byDay.get(x.e.date); if (!b || x.s > b.s) { if (b) drop.day++; byDay.set(x.e.date, x); } else drop.day++; });
  const counted = [...byDay.values()].sort((a, b) => dayNo(a.e.date) - dayNo(b.e.date));
  // growth of best sets, XP like the app (10 a set, 25 a record, 10 warm-up, 10 stretch; no weekly challenges)
  const best = {};
  let xp = 0;
  for (const { e, s } of counted) {
    let prs = 0;
    for (const it of e.items) {
      const vals = (it.res || []).map(num).filter(Number.isFinite);
      if (!vals.length) continue;
      const top = Math.max(...vals), prev = best[it.id];
      const lim = prev === undefined ? firstOf(it.id) : prev * FAIR.growth + FAIR.growthAdd;
      if (top > lim) flags.add("jump");
      const v = Math.min(top, lim);
      if (prev !== undefined && v > prev) prs++;
      if (prev === undefined || v > prev) best[it.id] = v;
    }
    xp += 10 * Math.min(s, 20) + 25 * prs + (e.warm ? 10 : 0) + (e.cool ? 10 : 0);
  }
  // streak like the app (no gap longer than 2 days), freezes at most 3 in any 30 days
  const days = counted.map(x => dayNo(x.e.date));
  const fz = [];
  (Array.isArray(freezeDays) ? freezeDays : []).map(dayNo).filter(Number.isFinite).sort((a, b) => a - b)
    .forEach(d => { if (fz.filter(x => d - x < 30).length < FAIR.freezePer30) fz.push(d); });
  const train = new Set(days), all = [...new Set([...days, ...fz])].sort((a, b) => a - b);
  let streak = 0, bestStreak = 0, run = 0;
  for (let i = 0; i < all.length; i++) {
    if (i && all[i] - all[i - 1] > 2) run = 0;
    if (train.has(all[i])) run++;
    bestStreak = Math.max(bestStreak, run);
  }
  const t = dayNo(today);
  if (all.length && Number.isFinite(t) && t - all[all.length - 1] <= 2) streak = run;
  const n = counted.length;
  return { n, streak, best: bestStreak, xp, lvl: fairLevel(xp), pts: n * 1000 + Math.min(999, streak), flags: [...flags].sort(), drop, bests: best };
}
