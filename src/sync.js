// Web ↔ phone sync (1.7.0, Michael: "merge, not only backup"). Every device signed in to the same account keeps its
// data in the account's cloud backup (backups/{uid}); when another device changes it, this one merges it in, and the
// result goes back up. Merging never loses a workout:
//  - workouts are kept by id (old ones get one from their time, "t<ts>"); the same workout on both sides → the one
//    changed last (mts, else ts); deleted ones leave a tombstone (sync.del: {id: when}) so they don't come back;
//  - eaten calories (kcal.log) the same way by their time, tombstones in sync.kdel;
//  - profile, synced settings and the calorie details: the side changed last wins (sync.mod), lists (freeze days,
//    birthdays) are joined, skipped days are merged;
//  - things that belong to one device stay on it: Health Connect data, sounds, vibration, screen, language…
// Ties are broken by content, the same way on every device, so two devices always end with the same data and stop.
// Pure functions only (tested in tools/sync_test.mjs); App.jsx does the storage, the cloud and the state.

// Settings that follow the account (the rest is per device).
export const SYNC_SETTINGS = ["theme", "look", "accent", "exOff", "aiCopy"];
const PROFILE_LISTS = ["freezeDays", "bdays", "bdayGifts", "tourDone"]; // tourDone: chapters of the guide (1.7.6)
const PROFILE_MAPS = ["skips"];
// Calorie data that never leaves the phone (Health Connect) or is a per-device choice.
const KCAL_DEVICE = ["steps", "food", "foodItems", "healthOn", "healthFood", "foodMode", "hcBest"];

// JSON with sorted keys: the same data always gives the same text.
export function stable(v) {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  return "{" + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
}
const empty = v => v === undefined || v === null || v === "" || (Array.isArray(v) ? !v.length : typeof v === "object" && !Object.keys(v).length);

export const entryId = e => e.id || "t" + (e.ts || String(e.date) + (e.day || ""));
export const withIds = h => (h.some(e => !e.id) ? h.map(e => (e.id ? e : { ...e, id: entryId(e) })) : h);
// what a workout is, without what the app works out from the history (records, rank-ups)
const core = e => { const { prs, rankUps, ...rest } = e; return rest; };
const eTime = e => e.mts || e.ts || 0;
function laterEntry(a, b) {
  const ta = eTime(a), tb = eTime(b);
  if (ta !== tb) return ta > tb ? a : b;
  return stable(core(a)) >= stable(core(b)) ? a : b;
}
export function mergeHistory(a, b, del) {
  const m = new Map();
  for (const e of [...withIds(a || []), ...withIds(b || [])]) {
    if (del[e.id]) continue;
    const o = m.get(e.id);
    m.set(e.id, o ? laterEntry(o, e) : e);
  }
  return [...m.values()].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : (x.ts || 0) - (y.ts || 0)));
}

// [newer, older] of two versions of an object by their change times; a tie is decided by the content.
function order(lo, ro, ml, mr) {
  if ((ml || 0) !== (mr || 0)) return (ml || 0) > (mr || 0) ? [lo, ro] : [ro, lo];
  return stable(lo) >= stable(ro) ? [lo, ro] : [ro, lo];
}
// First merge of this device with an account: what the account has wins, this device only fills what is missing
// (a new phone's default name "User" or empty fields never replace the account's).
function fillFirst(local, remote, skipLocal = []) {
  const out = { ...(remote || {}) };
  Object.entries(local || {}).forEach(([k, v]) => { if (empty(out[k]) && !empty(v) && !skipLocal.includes(k)) out[k] = v; });
  return out;
}

export function mergeProfile(lp, rp, ml, mr, first) {
  if (!rp) return lp;
  if (!lp) return rp;
  let out;
  if (first) out = fillFirst(lp.name === "User" ? { ...lp, name: "" } : lp, rp);
  else { const [n, o] = order(lp, rp, ml, mr); out = { ...o, ...n }; }
  PROFILE_LISTS.forEach(k => { const u = [...new Set([...(lp[k] || []), ...(rp[k] || [])])].sort(); if (u.length || lp[k] || rp[k]) out[k] = u; });
  PROFILE_MAPS.forEach(k => { if (lp[k] || rp[k]) { const [n, o] = first ? [rp, lp] : order(lp, rp, ml, mr); out[k] = { ...(o[k] || {}), ...(n[k] || {}) }; } });
  // 1.7.4: opened reward cards (claim) only ever go up, so both sides' highest level counts
  if (lp.claim || rp.claim) out.claim = { a: maxMap((lp.claim || {}).a, (rp.claim || {}).a), r: maxMap((lp.claim || {}).r, (rp.claim || {}).r) };
  if (!out.name) out.name = lp.name || rp.name || "User";
  return out;
}

const pickKeys = (o, keys) => Object.fromEntries(keys.filter(k => o && o[k] !== undefined).map(k => [k, o[k]]));
export function mergeSettings(ls, rs, ml, mr, first) {
  if (!rs) return ls;
  const l = pickKeys(ls, SYNC_SETTINGS), r = pickKeys(rs, SYNC_SETTINGS);
  const n = first ? { ...l, ...r } : (() => { const [a, b] = order(l, r, ml, mr); return { ...b, ...a }; })();
  return { ...ls, ...n };
}

// The part of the calorie data that follows the account (no Health Connect data, no log: that is merged by entry).
export function kcalShared(k) {
  if (!k) return null;
  const o = {};
  Object.keys(k).forEach(x => { if (x !== "log" && !KCAL_DEVICE.includes(x)) o[x] = k[x]; });
  if (o.wSrc === "hc") { delete o.weight; delete o.wTs; delete o.wSrc; }
  if (o.hSrc === "hc") { delete o.height; delete o.hTs; delete o.hSrc; }
  return o;
}
export function mergeLog(a, b, kdel) {
  const out = {};
  [a || {}, b || {}].forEach(log => Object.entries(log).forEach(([day, list]) => (list || []).forEach(e => {
    if (!e || kdel[e.ts]) return;
    const cur = out[day] || (out[day] = []);
    const i = cur.findIndex(x => x.ts === e.ts);
    if (i < 0) cur.push(e); else if (stable(e) > stable(cur[i])) cur[i] = e;
  })));
  Object.keys(out).forEach(d => out[d].sort((x, y) => x.ts - y.ts));
  return out;
}
export function mergeKcal(lk, rk, ml, mr, kdel, first) {
  if (!rk) return lk;
  if (!lk) return { ...rk, log: mergeLog({}, rk.log, kdel) };
  const ls = kcalShared(lk), rs = kcalShared(rk);
  let shared;
  if (first) shared = fillFirst(ls, rs);
  else { const [n, o] = order(ls, rs, ml, mr); shared = { ...o, ...n }; }
  // weight and height: the newer measurement, whichever side it is on (this phone's Health Connect value stays when newer)
  [["weight", "wTs", "wSrc"], ["height", "hTs", "hSrc"]].forEach(([v, ts, src]) => {
    const lt = lk[ts] || 0, rt = rk[ts] || 0;
    if (lk[v] && (lt >= rt || !rk[v])) { shared[v] = lk[v]; if (lk[ts] !== undefined) shared[ts] = lk[ts]; if (lk[src] !== undefined) shared[src] = lk[src]; }
    else if (rk[v]) { shared[v] = rk[v]; if (rk[ts] !== undefined) shared[ts] = rk[ts]; if (rk[src] !== undefined) shared[src] = rk[src]; }
  });
  const device = pickKeys(lk, KCAL_DEVICE);
  return { ...shared, ...device, log: mergeLog(lk.log, rk.log, kdel) };
}

const maxMap = (a, b) => { const o = { ...(a || {}) }; Object.entries(b || {}).forEach(([k, v]) => { if (!(o[k] >= v)) o[k] = v; }); return o; };
// local / remote: {history, profile, settings, kcal, sync: {del, kdel, mod}}. first: this device has never merged
// with this account. Returns the same shape.
export function mergeAll(local, remote, first) {
  const ls = local.sync || {}, rs = remote.sync || {};
  const del = maxMap(ls.del, rs.del), kdel = maxMap(ls.kdel, rs.kdel);
  const lm = ls.mod || {}, rm = rs.mod || {};
  return {
    history: mergeHistory(local.history, remote.history, del),
    profile: mergeProfile(local.profile, remote.profile, lm.profile, rm.profile, first),
    settings: mergeSettings(local.settings, remote.settings, lm.settings, rm.settings, first),
    kcal: mergeKcal(local.kcal, remote.kcal, lm.kcal, rm.kcal, kdel, first),
    sync: { del, kdel, mod: maxMap(lm, rm) },
  };
}
// What two devices must agree on (compared before uploading, so equal data is never sent again and two devices on
// different app versions can't keep answering each other).
export function syncKey(d) {
  const s = d.sync || {};
  return stable({
    h: (d.history || []).map(e => core({ ...e, id: entryId(e) })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    p: d.profile || null, s: pickKeys(d.settings || {}, SYNC_SETTINGS), k: kcalShared(d.kcal), l: d.kcal ? d.kcal.log || {} : {},
    del: s.del || {}, kdel: s.kdel || {},
  });
}
