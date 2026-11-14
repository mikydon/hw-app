// 1.10.0 Friends together, server side (worker/index.js): checked days (vdays), nudges, invite rewards.
// Runs the real Worker functions against an in-memory Firestore + FCM (real RSA signing for the access token).
// node tools/worker_together_test.mjs
import { checkVdays, nudge, checkInvite, notify, VDAY_EVERY_MS, INV_NEED, INV_MAX } from "../worker/index.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

// ── service account with a real key ──
const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
const pem = "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(der).toString("base64") + "\n-----END PRIVATE KEY-----\n";
const sa = { client_email: "t@x.iam.gserviceaccount.com", private_key: pem };

// ── fake Firestore ──
const db = new Map(); // path → {f, c, u}
let clock = Date.parse("2026-11-14T15:00:00Z");
const enc = v => (v === null || v === undefined ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === "string" ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } });
const dec = v => ("stringValue" in v ? v.stringValue : "booleanValue" in v ? v.booleanValue : "integerValue" in v ? +v.integerValue : "doubleValue" in v ? v.doubleValue
  : "timestampValue" in v ? v.timestampValue : "arrayValue" in v ? (v.arrayValue.values || []).map(dec) : "mapValue" in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : null);
const put = (path, f, at = clock) => { const o = db.get(path); db.set(path, { f, c: o ? o.c : at, u: at }); };
const doc = path => (db.get(path) || {}).f;
const segs = p => (p.match(/`[^`]+`|[^.]+/g) || []).map(x => x.replace(/`/g, ""));
const pushes = [];
const fetchFn = async (url, o = {}) => {
  const res = (st, body) => ({ ok: st < 300, status: st, json: async () => body, headers: new Map() });
  if (url.startsWith("https://oauth2.googleapis.com/token")) return res(200, { access_token: "AT", expires_in: 3600 });
  if (url.includes("fcm.googleapis.com")) { const m = JSON.parse(o.body).message; pushes.push(m); return m.token === "dead" ? res(404, { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }) : res(200, {}); }
  const m = /documents\/(.+?)(\?.*)?$/.exec(url);
  const path = decodeURIComponent(m[1]);
  if (!o.method || o.method === "GET") {
    const d = db.get(path);
    if (!d) return res(404, {});
    return res(200, { fields: Object.fromEntries(Object.entries(d.f).map(([k, v]) => [k, enc(v)])), createTime: new Date(d.c).toISOString(), updateTime: new Date(d.u).toISOString() });
  }
  if (o.method === "PATCH") {
    const body = Object.fromEntries(Object.entries(JSON.parse(o.body).fields).map(([k, v]) => [k, dec(v)]));
    const mask = [...new URLSearchParams(m[2] || "").getAll("updateMask.fieldPaths")];
    if (!mask.length) put(path, body);
    else {
      const cur = JSON.parse(JSON.stringify(doc(path) || {}));
      for (const fpath of mask) {
        const s = segs(fpath); let a = cur, b = body;
        for (let i = 0; i < s.length - 1; i++) { a[s[i]] = a[s[i]] && typeof a[s[i]] === "object" ? a[s[i]] : {}; a = a[s[i]]; b = b && b[s[i]]; }
        const k = s[s.length - 1];
        if (b && k in b) a[k] = b[k]; else delete a[k];
      }
      put(path, cur);
    }
    return res(200, {});
  }
  if (o.method === "DELETE") { db.delete(path); return res(200, {}); }
  throw new Error("unexpected " + url);
};
const call = (fn, a) => fn({ sa, fetchFn, now: clock, ...a });

// ── data ──
const day = n => new Date(clock - n * 864e5).toISOString().slice(0, 10);
const wk = (n, ts, extra = {}) => ({ date: day(n), ts: ts ?? clock - n * 864e5, day: "A", dur: 900, items: [{ id: "k1", name: "Push-up", unit: "", res: [12, 12, 10] }], ...extra });
const backup = (history, kcal) => ({ json: JSON.stringify({ app: "hw-app", history, profile: {}, kcal: kcal || {} }) });
const A = "aliceAAAAAAAA", B = "9bobBBBBBBBBB", C = "carolCCCCCCCC";
const friends = (x, y) => { put(`friends/${x}/list/${y}`, { ts: 1 }); put(`friends/${y}/list/${x}`, { ts: 1 }); };
friends(A, B);
put(`backups/${A}`, { json: JSON.stringify({ app: "hw-app", history: [wk(3), wk(2), wk(1), wk(1, clock - 864e5 + 600000), wk(0, undefined, { manual: true })], profile: { freezeDays: [day(5), "bad", day(400)] }, kcal: { log: { [day(0)]: [{ ts: clock, kcal: 800 }], [day(1)]: [{ ts: 1, kcal: 0 }] } } }) });
put(`backups/${B}`, backup([wk(0)]));

// ── vdays ──
{
  const r = await call(checkVdays, { uid: A, today: day(0) });
  eq(r, { why: "ok", n: 3 }, "own days: 3 checked days (the manual one and the 2nd of a day don't count)");
  const v = doc(`vdays/${A}`);
  eq(v.d, [day(3), day(2), day(1)], "the checked dates");
  ok(v.s[day(1)] === 3 && v.s[day(3)] === 3, "sets per day");
  eq(v.k, [day(0)], "calorie days: only days with food logged in the app");
  eq(v.f, [day(5)], "freeze days of the last 60 days (bad and old ones dropped)");
  ok(doc(`fair/${A}`) && doc(`fair/${A}`).seen, "fair seen map kept up to date");
  eq((await call(checkVdays, { uid: A, today: day(0) })).why, "recent", "again within 5 minutes: not recounted");
  clock += VDAY_EVERY_MS + 1000;
  eq((await call(checkVdays, { uid: A, today: day(0) })).why, "ok", "after 5 minutes: recounted");
  eq((await call(checkVdays, { uid: A, to: B, today: day(0) })).why, "ok", "a friend's days");
  eq(doc(`vdays/${B}`).d, [day(0)], "friend: today counts");
  eq((await call(checkVdays, { uid: C, to: A, today: day(0) })).why, "not-friends", "a stranger can't make the server count someone");
  eq((await call(checkVdays, { uid: A, to: "bad/../x", today: day(0) })).why, "bad", "a bad uid is refused");
  eq((await call(checkVdays, { uid: C, today: day(0) })).why, "no-backup", "no backup: nothing written");
  ok(!doc(`vdays/${C}`), "no vdays without a backup");
}

// ── nudge ──
{
  put(`profiles/${A}`, { nick: "Alice" });
  put(`push/${B}`, { t: ["tokB", "dead"], lang: "sk" });
  eq((await call(nudge, { from: A, to: B, today: day(0) })).why, "trained", "a friend who trained today is not nudged");
  put(`vdays/${B}`, { d: [day(1)], s: {}, k: [] });
  const r = await call(nudge, { from: A, to: B, today: day(0) });
  ok(r.why === "ok" && r.sent === 1, "nudge sent: " + JSON.stringify(r));
  const p = pushes.find(x => x.token === "tokB");
  ok(p && p.data.kind === "nudge" && p.data.uid === A && p.notification.title.includes("Alice"), "push text names the sender: " + JSON.stringify(p && p.notification));
  eq(doc(`push/${B}`).t, ["tokB"], "a dead phone's token is dropped");
  eq(doc(`nudge/${A}_${B}`) || doc(`nudge/${B}_${A}`), { [A]: day(0) }, "the day of the nudge is stored per pair");
  eq((await call(nudge, { from: A, to: B, today: day(0) })).why, "dup", "only once a day");
  eq((await call(nudge, { from: B, to: A, today: day(0) })).why, "no-phone", "the other one may nudge back (Alice has no phone)");
  ok(Object.keys(doc(`nudge/${A}_${B}`) || doc(`nudge/${B}_${A}`)).length === 2, "both directions kept in one doc (uid starting with a digit is quoted)");
  eq((await call(nudge, { from: C, to: B, today: day(0) })).why, "not-friends", "strangers can't nudge");
  eq((await call(nudge, { from: A, to: A, today: day(0) })).why, "bad", "no nudging yourself");
  put(`push/${B}`, { t: ["tokB"], lang: "sk", blk: [A] });
  eq((await call(nudge, { from: A, to: B, today: day(-1) })).why, "off", "blocked sender: no push");
}

// ── the old kinds still send (notify now shares sendPush) ──
{
  put(`push/${B}`, { t: ["tokB", "dead"], lang: "en" });
  const [a, b] = [A, B].sort();
  put(`chats/${a}_${b}`, { last: { from: A, ts: clock, text: "hi there" } });
  const n0 = pushes.length;
  const r = await call(notify, { kind: "msg", from: A, to: B });
  ok(r.why === "ok" && r.sent === 1, "a chat message still sends: " + JSON.stringify(r));
  const m = pushes[pushes.length - 1];
  ok(pushes.length - n0 === 2 && m.notification.body === "hi there" && m.android.notification.tag === `${a}_${b}`, "text and tag as before");
  eq(doc(`push/${B}`).t, ["tokB"], "dead token dropped there too");
}

// ── invite ──
{
  const N = "newbieNNNNNNN";
  put(`profiles/${C}`, { nick: "Carol" });
  put(`profiles/${N}`, { nick: "Neo" }, clock - 864e5); // made yesterday, invite written today
  eq((await call(checkInvite, { uid: N })).why, "none", "no invite doc: nothing");
  put(`inv/${N}`, { by: C });
  put(`backups/${N}`, backup([wk(1), wk(0)]));
  eq(await call(checkInvite, { uid: N }), { why: "wait", n: 2 }, "two workouts: still waiting");
  put(`backups/${N}`, backup([wk(2), wk(1), wk(0)]));
  // the account was made yesterday: the workout of 2 days ago is older than the account, so it does not count
  eq((await call(checkInvite, { uid: N })).n, 2, "workouts from before the account was made don't count");
  clock += 3 * 864e5;
  put(`backups/${N}`, backup([wk(2), wk(1), wk(0)]));
  const r = await call(checkInvite, { uid: N });
  ok(r.why === "ok" && r.n === INV_NEED && r.inviter, "three checked workouts: reward " + JSON.stringify(r));
  ok(doc(`rew/${N}`).by.u === C, "the new account's reward names its inviter");
  ok(doc(`rew/${C}`).i[N], "the inviter's reward lists the new account");
  eq((await call(checkInvite, { uid: N })).why, "done", "only once");
  // an old account can't claim it
  const O = "oldieOOOOOOOO";
  put(`profiles/${O}`, { nick: "Old" }, clock - 30 * 864e5);
  put(`inv/${O}`, { by: C });
  eq((await call(checkInvite, { uid: O })).why, "old", "an account older than its invite gets nothing");
  // the inviter is capped
  const many = {}; for (let i = 0; i < INV_MAX; i++) many["u" + i] = "x";
  put(`rew/${C}`, { i: many });
  const M = "moreMMMMMMMMM";
  put(`profiles/${M}`, { nick: "M" }); put(`inv/${M}`, { by: C });
  clock += 3 * 864e5; put(`backups/${M}`, backup([wk(2), wk(1), wk(0)]));
  const r2 = await call(checkInvite, { uid: M });
  ok(r2.why === "ok" && r2.inviter === false && Object.keys(doc(`rew/${C}`).i).length === INV_MAX, "after INV_MAX invites the inviter gets no more (the new one still does)");
  put(`inv/${A}`, { by: A });
  eq((await call(checkInvite, { uid: A })).why, "none", "inviting yourself counts for nothing");
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
