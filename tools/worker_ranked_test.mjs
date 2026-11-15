// 1.10.0 Ranked on the server (worker/index.js rankedStart / rankedEnd), against an in-memory Firestore:
// tickets (2 on a day with a checked workout), matching a recent deal near your rating (people still waiting first),
// a new deal when nobody fits (the result waits), the waiting player settled by the next one, equal decks, one try
// per deal, the time limit, leaving = a loss, and the replay check.
// node tools/worker_ranked_test.mjs
import { rankedStart, rankedEnd, rankedOpts, RK } from "../worker/index.js";
import { botGame, resultOf } from "../src/game/engine.js";

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
const pushes = []; let autoId = 0;
const fetchFn = async (url, o = {}) => {
  const res = (st, body) => ({ ok: st < 300, status: st, json: async () => body, headers: new Map() });
  if (url.startsWith("https://oauth2.googleapis.com/token")) return res(200, { access_token: "AT", expires_in: 3600 });
  if (url.includes("fcm.googleapis.com")) { const m = JSON.parse(o.body).message; pushes.push(m); return m.token === "dead" ? res(404, { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }) : res(200, {}); }
  if (url.endsWith(":runQuery")) {
    const q = JSON.parse(o.body).structuredQuery, col = q.from[0].collectionId;
    const rows = [...db.entries()].filter(([p]) => p.startsWith(col + "/") && p.split("/").length === 2).sort((a, b) => String(b[1].f.ts).localeCompare(String(a[1].f.ts))).slice(0, q.limit || 100);
    return res(200, rows.map(([p, d]) => ({ document: { name: "projects/x/databases/(default)/documents/" + p, fields: Object.fromEntries(Object.entries(d.f).map(([k, v]) => [k, enc(v)])) } })));
  }
  if (o.method === "POST" && /documents\/[a-z]+$/.test(url)) { const col = url.split("/").pop(); const id = "a" + (++autoId); put(col + "/" + id, Object.fromEntries(Object.entries(JSON.parse(o.body).fields).map(([k, v]) => [k, dec(v)]))); return res(200, {}); }
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
const today = () => new Date(clock).toISOString().slice(0, 10);
const wk = (date, sets = [10, 10]) => ({ date, ts: Date.parse(date + "T10:00:00Z"), day: "A", items: [{ id: "k1", name: "Push-up", unit: "", res: sets }] });
const backup = h => ({ json: JSON.stringify({ app: "hw-app", history: h, profile: {} }) });
const user = (u, nick, trained = true) => { put(`profiles/${u}`, { nick }); put(`backups/${u}`, backup(trained ? [wk(today())] : [])); put(`fair/${u}`, { since: 1, seen: {} }); };
const play = (seed, level) => botGame(rankedOpts(seed), level);

// ── tickets ──
user("A", "Anna"); user("B", "Ben"); user("C", "Cid"); user("L", "Lazy", false);
eq((await call(rankedStart, { uid: "L", today: today() })).why, "train", "no workout today: no ranked game");
eq((await call(rankedStart, { uid: "A", today: "2020-01-01" })).why, "bad", "a day far from the server's date is refused");

// ── A is first: a new deal, the result waits ──
const s1 = await call(rankedStart, { uid: "A", today: today() });
eq([s1.why, s1.opp, s1.left], ["ok", null, 1], "A: a new deal, no opponent yet, 1 ticket left");
const ga = play(s1.seed, 7);
const e1 = await call(rankedEnd, { uid: "A", moves: ga.moves, sk: "c_gold" });
eq([e1.why, e1.pend, e1.dr, e1.r], ["ok", 1, 0, 1000], "A's result waits, rating unchanged");
const runs1 = [...db.entries()].filter(([p]) => p.startsWith("runs/"));
eq(runs1.length, 1, "A's game is kept for the next player");
eq(runs1[0][1].f.done, false, "and not settled yet");

// ── B (rated 1100) plays A's deal and settles both ──
clock += 60e3; put("ranked/B", { r: 1100, w: 0, l: 0, d: 0 });
const s2 = await call(rankedStart, { uid: "B", today: today() });
eq([s2.seed, s2.opp && s2.opp.nick], [s1.seed, "Anna"], "B gets A's deal (A is waiting)");
eq(s2.opp && s2.opp.sk, "c_gold", "with A's card style (1.10.0)");
const gb = play(s2.seed, 2);
const e2 = await call(rankedEnd, { uid: "B", moves: gb.moves });
const ra = resultOf(ga.st), rb = resultOf(gb.st);
const exp = rb.cleared !== ra.cleared ? (rb.cleared > ra.cleared ? 1 : 0) : rb.total !== ra.total ? (rb.total > ra.total ? 1 : 0) : 0.5;
eq(e2.sc, exp, "B is compared with A's result");
const A = doc("ranked/A"), B = doc("ranked/B");
ok(A.r + B.r === 2100 && A.r !== 1000, `both ratings moved by the same amount (A ${A.r}, B ${B.r})`);
eq(A.res && A.res[0].nick, "Ben", "A sees who played the deal");
ok(!("sk" in (A.res[0] || {})), "B sent no style: none stored");
eq(e2.opp && e2.opp.sk, "c_gold", "B's result names A's style");
{ const bad = await call(rankedEnd, { uid: "NOBODY", moves: [], sk: "<script>" }); ok(bad.why === "no-game", "no game: nothing"); }
eq(doc(`runs/${runs1[0][0].split("/")[1]}`).done, true, "A's game is settled once");

// ── C plays the same deal later: only C moves ──
clock += 60e3;
const s3 = await call(rankedStart, { uid: "C", today: today() });
eq(s3.seed, s1.seed, "C can get the same deal (Ben's or Anna's game)");
const aBefore = doc("ranked/A").r;
await call(rankedEnd, { uid: "C", moves: play(s3.seed, 4).moves });
ok(doc("ranked/A").r === aBefore, "A's rating is not moved twice");

// ── one try per deal ──
clock += 60e3;
const s4 = await call(rankedStart, { uid: "B", today: today() });
ok(s4.seed !== s1.seed, "B never gets the same deal again");
eq(s4.left, 0, "B's second ticket");
// ── leaving = a loss; an open game counts as lost; tickets run out ──
const e4 = await call(rankedEnd, { uid: "B", give: true });
eq([e4.bad, e4.sc], [1, s4.opp ? 0 : 0], "leaving is a loss");
eq((await call(rankedStart, { uid: "B", today: today() })).why, "tickets", "2 ranked games a day");
// ── a broken replay and the time limit ──
user("D", "Dan"); user("E", "Eve");
const s5 = await call(rankedStart, { uid: "D", today: today() });
const e5 = await call(rankedEnd, { uid: "D", moves: [{ t: "play", c: [99, 98] }] });
eq(e5.bad, 1, "a move that isn't possible = a loss");
const s6 = await call(rankedStart, { uid: "E", today: today() });
clock += RK.limitMs + 1000;
const e6 = await call(rankedEnd, { uid: "E", moves: play(s6.seed, 5).moves });
eq(e6.bad, 1, "too late = a loss");
// ── an open game counts when starting the next ──
clock += 864e5; user("D", "Dan");
const s7 = await call(rankedStart, { uid: "D", today: today() });
const lBefore = doc("ranked/D").l;
const s8 = await call(rankedStart, { uid: "D", today: today() });
ok(s8.abandoned && doc("ranked/D").l === lBefore + 1, "starting again with a game open: the open one is lost");
// ── equal decks: Ranked options never carry training strength ──
eq([rankedOpts("x").suit, rankedOpts("x").perk, rankedOpts("x").streak, rankedOpts("x").antes], [null, null, 0, 2], "equal decks, 6 blinds");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
