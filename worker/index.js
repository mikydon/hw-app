// HW App push server (1.6.0): a Cloudflare Worker (free plan) that sends phone notifications through Firebase Cloud
// Messaging when someone writes to you, sends you a friend request or accepts yours, also while the app is closed.
//
// The app calls POST /notify with {kind: "msg" | "req" | "acc" | "test", to} and its Firebase sign-in token ("test" =
// the Settings button: a notification to your own phones, with the reason when it fails). Nothing in
// the request is trusted: the sender comes from the verified token, and the notification is only sent when Firestore
// shows that the thing really just happened (the newest message in your chat is theirs and is new, the request is in
// your inbox, you are now friends). The text of a message is read from Firestore, never taken from the request.
// The receiver's phones (FCM tokens), language, notifications on/off and blocked people are in push/{uid}.
//
// 1.7.0: kind "rep" (sent by the app after a report): when different people (REPORTS_TO_HIDE) reported the same
// person within REPORT_DAYS, that person leaves the world top 50 (board/{uid} deleted) and mod/{uid} = {hidden: true}
// keeps them out (the rules refuse a new board entry and strangers can't open their profile). Only the developer
// undoes it, by deleting mod/{uid} in the Firebase console. No notification is sent for a report.
//
// 1.8.0: kind "board" (sent by the app after it saves its stats): the world leaderboard entry is written only here,
// from the person's cloud backup checked by src/fair.js (only real workouts count, one a day, within limits; the list
// is ordered by checked workouts and streak). fair/{uid} keeps when each workout was first seen (so backdated ones
// don't count), the flags and the last result (the person can read it). Someone with flags who would land in the
// world top 50 waits for the developer: fair/{uid}.ok = true (set by hand in the Firebase console) lets them in.
//
// 1.8.0: ranked card games (src/game/engine.js). "rk-start" picks the opponent (a recent ranked game of another player
// with a rating close to yours, on the same cards; or the bot when there is none), fixes your training strength from
// your checked cloud backup (src/fair.js) and remembers the game in ranked/{uid}.cur. "rk-end" replays your moves
// (a move that isn't possible = a loss), compares with the opponent, changes your rating (Elo, K = 32) and keeps your
// game in runs/ for others to play against. Starting a new game while one is open counts the open one as a loss.
//
// Secret (Cloudflare): FIREBASE_SERVICE_ACCOUNT = the service account key JSON from the Firebase console.
import TEXTS from "./texts.js";
import { fairStats, fairEntryId } from "../src/fair.js";
import { loadout, replay, botGame, botLoadout, resultOf, JOKER_IDS } from "../src/game/engine.js";

const PROJECT = "hw-app-mikydon";
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const FRESH_MS = 2 * 60 * 1000; // what happened must be at most this old
export const REPORTS_TO_HIDE = 3, REPORT_DAYS = 90;
const ORIGINS = ["https://mikydon.github.io", "https://localhost", "http://localhost", "capacitor://localhost"];

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uDecode = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const json = (o, status, cors) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...cors } });

// ── Firebase ID token (the sender) ──
let jwks = null, jwksExp = 0;
async function googleKeys(fetchFn) {
  if (jwks && Date.now() < jwksExp) return jwks;
  const r = await fetchFn("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!r.ok) throw new Error("keys " + r.status);
  const m = /max-age=(\d+)/.exec(r.headers.get("cache-control") || "");
  jwks = (await r.json()).keys; jwksExp = Date.now() + (m ? +m[1] : 3600) * 1000;
  return jwks;
}
export async function verifyIdToken(tok, fetchFn = fetch, now = Date.now()) {
  const parts = String(tok || "").split(".");
  if (parts.length !== 3) throw new Error("token");
  const head = JSON.parse(new TextDecoder().decode(b64uDecode(parts[0])));
  const p = JSON.parse(new TextDecoder().decode(b64uDecode(parts[1])));
  if (head.alg !== "RS256" || !head.kid) throw new Error("alg");
  const jwk = (await googleKeys(fetchFn)).find(k => k.kid === head.kid);
  if (!jwk) throw new Error("kid");
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64uDecode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  const s = now / 1000;
  if (!ok) throw new Error("sig");
  if (!(p.exp > s && p.iat <= s + 300 && p.auth_time <= s + 300)) throw new Error("time");
  if (p.aud !== PROJECT || p.iss !== `https://securetoken.google.com/${PROJECT}`) throw new Error("aud");
  if (typeof p.sub !== "string" || !p.sub || p.sub.length > 128) throw new Error("sub");
  return p.sub;
}

// ── Google access token from the service account ──
let access = null, accessExp = 0;
async function pemKey(pem) {
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), c => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}
export async function accessToken(sa, fetchFn = fetch, now = Date.now()) {
  if (access && now < accessExp) return access;
  const iat = Math.floor(now / 1000), enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: "RS256", typ: "JWT" }) + "." + enc({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 });
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", await pemKey(sa.private_key), new TextEncoder().encode(unsigned));
  const r = await fetchFn("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + unsigned + "." + b64u(sig) });
  if (!r.ok) throw new Error("oauth " + r.status);
  const t = await r.json();
  access = t.access_token; accessExp = now + Math.max(60, (t.expires_in || 3600) - 300) * 1000;
  return access;
}

// ── Firestore REST ──
const val = v => (!v ? undefined : "stringValue" in v ? v.stringValue : "booleanValue" in v ? v.booleanValue : "integerValue" in v ? +v.integerValue
  : "doubleValue" in v ? +v.doubleValue : "timestampValue" in v ? Date.parse(v.timestampValue) : "arrayValue" in v ? (v.arrayValue.values || []).map(val) : "mapValue" in v ? fields(v.mapValue.fields || {}) : "nullValue" in v ? null : undefined);
const fields = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, val(v)]));
async function getDoc(path, tok, fetchFn) {
  const r = await fetchFn(`${FS}/${path}`, { headers: { authorization: "Bearer " + tok } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("firestore " + r.status);
  const d = await r.json();
  return { ...fields(d.fields), _update: Date.parse(d.updateTime), _create: Date.parse(d.createTime) };
}
async function setTokens(to, list, tok, fetchFn) {
  await fetchFn(`${FS}/push/${to}?updateMask.fieldPaths=t`, { method: "PATCH", headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
    body: JSON.stringify({ fields: { t: { arrayValue: { values: list.map(s => ({ stringValue: s })) } } } }) });
}
// All reports about one person (single-field index on "about", created automatically by Firestore).
async function reportsAbout(uid, tok, fetchFn) {
  const r = await fetchFn(`${FS}:runQuery`, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "reports" }], where: { fieldFilter: { field: { fieldPath: "about" }, op: "EQUAL", value: { stringValue: uid } } }, limit: 500 } }) });
  if (!r.ok) throw new Error("query " + r.status);
  return (await r.json()).filter(x => x.document).map(x => ({ ...fields(x.document.fields), _create: Date.parse(x.document.createTime) }));
}
// Several different people reported `to` lately → hide them from the world top 50 (see the top of the file).
export async function checkReports({ to, sa, fetchFn = fetch, now = Date.now() }) {
  if (typeof to !== "string" || !/^[A-Za-z0-9]{6,128}$/.test(to)) return { hidden: false, why: "bad" };
  const tok = await accessToken(sa, fetchFn, now);
  const mod = await getDoc(`mod/${to}`, tok, fetchFn);
  if (mod && mod.hidden === true) return { hidden: true, why: "already" };
  const by = new Set((await reportsAbout(to, tok, fetchFn)).filter(x => typeof x.by === "string" && x.by !== to && now - (x.ts || x._create) < REPORT_DAYS * 864e5).map(x => x.by));
  if (by.size < REPORTS_TO_HIDE) return { hidden: false, why: "few", n: by.size };
  const h = { authorization: "Bearer " + tok, "content-type": "application/json" };
  const w = await fetchFn(`${FS}/mod/${to}`, { method: "PATCH", headers: h, body: JSON.stringify({ fields: { hidden: { booleanValue: true }, n: { integerValue: String(by.size) }, ts: { timestampValue: new Date(now).toISOString() } } }) });
  if (!w.ok) throw new Error("mod " + w.status);
  await fetchFn(`${FS}/board/${to}`, { method: "DELETE", headers: h });
  return { hidden: true, why: "hidden", n: by.size };
}
// ── World leaderboard check (1.8.0) ──
const enc = v => (v === null || v === undefined ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === "string" ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } });
const encFields = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)]));
async function patchDoc(path, obj, tok, fetchFn, mask) {
  const q = mask ? "?" + mask.map(f => "updateMask.fieldPaths=" + encodeURIComponent(f)).join("&") : "";
  const r = await fetchFn(`${FS}/${path}${q}`, { method: "PATCH", headers: { authorization: "Bearer " + tok, "content-type": "application/json" }, body: JSON.stringify({ fields: encFields(obj) }) });
  if (!r.ok) throw new Error(path.split("/")[0] + " " + r.status);
}
const delDoc = (path, tok, fetchFn) => fetchFn(`${FS}/${path}`, { method: "DELETE", headers: { authorization: "Bearer " + tok } }).catch(() => {});
// the lowest score in the world top 50 (null while fewer than 50 people are in it)
async function top50Floor(tok, fetchFn) {
  const r = await fetchFn(`${FS}:runQuery`, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "board" }], orderBy: [{ field: { fieldPath: "pts" }, direction: "DESCENDING" }], limit: 50 } }) });
  if (!r.ok) throw new Error("query " + r.status);
  const rows = (await r.json()).filter(x => x.document).map(x => fields(x.document.fields));
  return rows.length < 50 ? null : Math.min(...rows.map(x => x.pts || 0));
}
const dayKeyOk = (k, now) => /^\d{4}-\d{2}-\d{2}$/.test(String(k)) && Math.abs(Date.parse(k + "T12:00:00Z") - now) < 2 * 864e5;
export const BOARD_EVERY_MS = 60 * 1000;
export async function checkBoard({ uid, today, sa, fetchFn = fetch, now = Date.now() }) {
  const tok = await accessToken(sa, fetchFn, now);
  const prof = await getDoc(`profiles/${uid}`, tok, fetchFn);
  if (!prof || prof.global !== true) { await delDoc(`board/${uid}`, tok, fetchFn); return { why: "off" }; }
  const mod = await getDoc(`mod/${uid}`, tok, fetchFn);
  if (mod && mod.hidden === true) { await delDoc(`board/${uid}`, tok, fetchFn); return { why: "hidden" }; }
  const fair = await getDoc(`fair/${uid}`, tok, fetchFn);
  if (fair && fair.last && now - (fair.ts || 0) < BOARD_EVERY_MS) return { ...fair.last, why: "recent" };
  const bk = await getDoc(`backups/${uid}`, tok, fetchFn);
  let data = null;
  try { data = bk && JSON.parse(bk.json); } catch (_) { data = null; }
  if (!data || !Array.isArray(data.history)) return { why: "no-backup" };
  const since = (fair && fair.since) || now, old = (fair && fair.seen) || {}, seenMap = {};
  data.history.slice(-3000).forEach(e => { if (e && typeof e === "object") { const id = fairEntryId(e); seenMap[id] = typeof old[id] === "number" ? old[id] : now; } });
  const st = fairStats(data.history, { seen: seenMap, since, freezeDays: data.profile && data.profile.freezeDays, today: dayKeyOk(today, now) ? today : new Date(now).toISOString().slice(0, 10) });
  const approved = !!(fair && fair.ok === true);
  let wait = false;
  if (st.flags.length && !approved) { const floor = await top50Floor(tok, fetchFn); wait = floor === null || st.pts >= floor; }
  if (wait) await delDoc(`board/${uid}`, tok, fetchFn);
  else await patchDoc(`board/${uid}`, { nick: String(prof.nick || "?").slice(0, 20), pfp: null, n: st.n, streak: st.streak, lvl: st.lvl, xp: st.xp, pts: st.pts, ts: new Date(now).toISOString() }, tok, fetchFn);
  const last = { n: st.n, streak: st.streak, lvl: st.lvl, pts: st.pts, flags: st.flags, wait, drop: st.drop };
  // (ok is set only by the developer, so it is left out of the mask)
  await patchDoc(`fair/${uid}`, { since, seen: seenMap, ts: now, last }, tok, fetchFn, ["since", "seen", "ts", "last"]);
  return { ...last, why: wait ? "wait" : "ok" };
}

// ── Ranked card games (1.8.0) ──
export const RK = { start: 1000, k: 32, botMin: 2, botMax: 10, maxMoves: 600, pick: 40 };
const elo = (r, ro, score) => Math.round(RK.k * (score - 1 / (1 + Math.pow(10, (ro - r) / 400))));
const botLevelFor = r => Math.max(RK.botMin, Math.min(RK.botMax, Math.round((r - 800) / 40)));
const randomSeed = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return Array.from(a, b => b.toString(36).padStart(2, "0")).join("").slice(0, 10); };
async function recentRuns(tok, fetchFn) {
  const r = await fetchFn(`${FS}:runQuery`, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "runs" }], orderBy: [{ field: { fieldPath: "ts" }, direction: "DESCENDING" }], limit: RK.pick } }) });
  if (!r.ok) throw new Error("runs " + r.status);
  return (await r.json()).filter(x => x.document).map(x => fields(x.document.fields));
}
async function trainingOf(uid, tok, fetchFn) {
  const bk = await getDoc(`backups/${uid}`, tok, fetchFn);
  let data = null; try { data = bk && JSON.parse(bk.json); } catch (_) { data = null; }
  if (!data || !Array.isArray(data.history)) return loadout({});
  const fair = await getDoc(`fair/${uid}`, tok, fetchFn);
  const st = fairStats(data.history, { seen: (fair && fair.seen) || {}, since: (fair && fair.since) || 0, freezeDays: data.profile && data.profile.freezeDays, today: new Date().toISOString().slice(0, 10) });
  return loadout({ bests: st.bests, streak: st.streak, n: st.n });
}
const gameOpts = cur => ({ seed: cur.seed, mode: "duel", suit: cur.lo.suit, perk: cur.lo.perk, streak: cur.lo.streak, pool: JOKER_IDS });
const outcome = (a, b) => (a.cleared !== b.cleared ? (a.cleared > b.cleared ? 1 : 0) : a.total !== b.total ? (a.total > b.total ? 1 : 0) : 0.5);
export async function rankedStart({ uid, perk, sa, fetchFn = fetch, now = Date.now() }) {
  const tok = await accessToken(sa, fetchFn, now);
  const prof = await getDoc(`profiles/${uid}`, tok, fetchFn);
  if (!prof || !prof.nick) return { why: "no-profile" };
  const rk = (await getDoc(`ranked/${uid}`, tok, fetchFn)) || { r: RK.start, w: 0, l: 0, d: 0 };
  let r = typeof rk.r === "number" ? rk.r : RK.start, abandoned = null;
  if (rk.cur && rk.cur.seed) { const dr = elo(r, rk.cur.opp.r, 0); r += dr; rk.l = (rk.l || 0) + 1; abandoned = { dr }; } // an open game = lost
  const lo = await trainingOf(uid, tok, fetchFn);
  const pk = lo.perks.includes(perk) ? perk : null;
  const runs = (await recentRuns(tok, fetchFn)).filter(x => x.uid !== uid && typeof x.seed === "string" && typeof x.cleared === "number");
  runs.sort((a, b) => Math.abs((a.r || RK.start) - r) - Math.abs((b.r || RK.start) - r));
  const o = runs.find(x => Math.abs((x.r || RK.start) - r) <= 300);
  const opp = o ? { uid: o.uid, nick: String(o.nick || "?").slice(0, 20), r: o.r || RK.start, res: { cleared: o.cleared, total: o.total } } : { bot: botLevelFor(r), nick: "", r };
  const cur = { seed: o ? o.seed : randomSeed(), opp, lo: { suit: lo.suit, perk: pk, streak: lo.streak }, at: now };
  await patchDoc(`ranked/${uid}`, { r, w: rk.w || 0, l: rk.l || 0, d: rk.d || 0, nick: String(prof.nick).slice(0, 20), ts: new Date(now).toISOString(), cur }, tok, fetchFn);
  return { why: "ok", seed: cur.seed, lo: cur.lo, opp: { nick: opp.nick, r: opp.r, bot: opp.bot || 0 }, r, abandoned };
}
export async function rankedEnd({ uid, moves, give, sa, fetchFn = fetch, now = Date.now() }) {
  const tok = await accessToken(sa, fetchFn, now);
  const rk = await getDoc(`ranked/${uid}`, tok, fetchFn);
  if (!rk || !rk.cur || !rk.cur.seed) return { why: "no-game" };
  const cur = rk.cur;
  let me, bad = false;
  try {
    if (give === true) throw new Error("gave up"); // left the game: a loss
    if (!Array.isArray(moves) || moves.length > RK.maxMoves) throw new Error("moves");
    const st = replay(gameOpts(cur), moves.map(m => ({ t: String(m && m.t), c: Array.isArray(m && m.c) ? m.c.slice(0, 5).map(Number) : undefined, i: Number(m && m.i) })), RK.maxMoves);
    if (st.phase !== "over" && st.phase !== "won") return { why: "unfinished" };
    me = resultOf(st);
  } catch (_) { bad = true; me = { cleared: 0, total: 0 }; }
  const opp = cur.opp.res || resultOf(botGame({ ...gameOpts(cur), suit: botLoadout(cur.opp.bot).suit, perk: botLoadout(cur.opp.bot).perk, streak: 0 }, cur.opp.bot).st);
  const sc = bad ? 0 : outcome(me, opp), r0 = typeof rk.r === "number" ? rk.r : RK.start, dr = elo(r0, cur.opp.r, sc), r = Math.max(0, r0 + dr);
  const w = (rk.w || 0) + (sc === 1 ? 1 : 0), l = (rk.l || 0) + (sc === 0 ? 1 : 0), d = (rk.d || 0) + (sc === 0.5 ? 1 : 0);
  const last = { sc, dr, me: { cleared: me.cleared, total: me.total }, opp: { cleared: opp.cleared, total: opp.total, nick: cur.opp.nick, bot: cur.opp.bot || 0 }, bad: bad ? 1 : 0, at: now };
  await patchDoc(`ranked/${uid}`, { r, w, l, d, ts: new Date(now).toISOString(), last }, tok, fetchFn, ["r", "w", "l", "d", "ts", "last", "cur"]);
  if (!bad) {
    const prof = await getDoc(`profiles/${uid}`, tok, fetchFn);
    await fetchFn(`${FS}/runs`, { method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
      body: JSON.stringify({ fields: encFields({ uid, nick: String((prof && prof.nick) || "?").slice(0, 20), seed: cur.seed, r: r0, cleared: me.cleared, total: me.total, ts: new Date(now).toISOString() }) }) });
  }
  return { why: "ok", ...last, r };
}

const seen = new Map(); // recently sent events (per server instance)
const chatId = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
const lineOf = (lang, k, nick) => {
  const t = TEXTS[lang] || TEXTS.en;
  return (t[k] || TEXTS.en[k] || "").replace("{nick}", nick);
};

// The whole check-and-send for one request. Returns {sent, why}.
export async function notify({ kind, to, from, sa, fetchFn = fetch, now = Date.now() }) {
  if (!["msg", "req", "acc", "test"].includes(kind) || typeof to !== "string" || !/^[A-Za-z0-9]{6,128}$/.test(to) || (kind === "test") !== (to === from)) return { sent: 0, why: "bad" };
  const tok = await accessToken(sa, fetchFn, now);
  const push = await getDoc(`push/${to}`, tok, fetchFn);
  if (!push || !Array.isArray(push.t) || !push.t.length) return { sent: 0, why: "no-phone" };
  if (push.off === true) return { sent: 0, why: "off" };
  if (kind !== "test" && Array.isArray(push.blk) && push.blk.includes(from)) return { sent: 0, why: "blocked" };
  // data keys: "from" (and gcm…, google…) are reserved by FCM (400 INVALID_ARGUMENT), so the sender is "uid"
  let title = "HW App", body = "", data = { kind, uid: from };
  const prof = await getDoc(`profiles/${from}`, tok, fetchFn);
  const nick = (prof && prof.nick) || "HW App";
  const lang = typeof push.lang === "string" ? push.lang : "en";
  if (kind === "test") {
    title = lineOf(lang, "ntTest", nick); body = lineOf(lang, "ntTestD", nick);
  } else if (kind === "msg") {
    if (!(await getDoc(`friends/${to}/list/${from}`, tok, fetchFn))) return { sent: 0, why: "not-friends" };
    const cid = chatId(from, to), chat = await getDoc(`chats/${cid}`, tok, fetchFn);
    const last = chat && chat.last;
    if (!last || last.from !== from || !(now - last.ts < FRESH_MS) || !last.text) return { sent: 0, why: "no-message" };
    title = nick; body = String(last.text).slice(0, 120); data.cid = cid;
  } else if (kind === "req") {
    const r = await getDoc(`inbox/${to}/from/${from}`, tok, fetchFn);
    if (!r || !(now - (r.ts || r._create) < FRESH_MS)) return { sent: 0, why: "no-request" };
    title = lineOf(lang, "ntReq", nick); body = lineOf(lang, "ntReqD", nick);
  } else {
    const f = await getDoc(`friends/${to}/list/${from}`, tok, fetchFn);
    if (!f || !(now - (f.ts || f._create) < FRESH_MS)) return { sent: 0, why: "not-friends" };
    title = lineOf(lang, "ntAcc", nick); body = lineOf(lang, "ntAccD", nick);
  }
  // the same event only once (an app that calls twice, or someone calling again for the same message)
  // (a test at most every 10 s)
  const key = `${kind}:${from}:${to}:${kind === "msg" ? data.cid + ":" + body : ""}`;
  for (const [k, t] of seen) if (now - t > FRESH_MS) seen.delete(k);
  if (seen.has(key) && (kind !== "test" || now - seen.get(key) < 10000)) return { sent: 0, why: "dup" };
  seen.set(key, now);
  let sent = 0, err = "";
  const keep = [];
  for (const t of push.t.slice(0, 5)) {
    const r = await fetchFn(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
      method: "POST", headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
      body: JSON.stringify({ message: { token: t, notification: { title, body }, data,
        android: { priority: "HIGH", notification: { channel_id: "social", tag: data.cid || kind + "_" + from, color: "#FFD23F", icon: "ic_stat_hw" } } } }),
    });
    if (r.ok) { sent++; keep.push(t); continue; }
    const e = await r.json().catch(() => ({}));
    const code = JSON.stringify(e);
    const det = ((e.error && e.error.details) || []).map(x => x.errorCode).filter(Boolean)[0];
    err = err || `${r.status} ${det || (e.error && e.error.status) || ""}`.trim();
    if (r.status === 404 || code.includes("UNREGISTERED")) continue; // that phone no longer has the app: drop it
    keep.push(t);
  }
  if (keep.length !== push.t.length) await setTokens(to, keep, tok, fetchFn).catch(() => {});
  return sent ? { sent, why: "ok", phones: push.t.length } : { sent: 0, why: "fcm", err, phones: push.t.length };
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("origin") || "";
    const cors = { "access-control-allow-origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "POST, OPTIONS", vary: "origin" };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/") return json({ ok: true, app: "hw-app-push" }, 200, cors);
    if (req.method !== "POST" || url.pathname !== "/notify") return json({ error: "not found" }, 404, cors);
    let from;
    try { from = await verifyIdToken((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")); }
    catch (e) { console.log(JSON.stringify({ error: "auth", detail: String(e.message || e).slice(0, 40) })); return json({ error: "auth", detail: String(e.message || e).slice(0, 40) }, 401, cors); }
    let b;
    try { b = await req.json(); } catch (_) { return json({ error: "body" }, 400, cors); }
    try {
      const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      const r = b.kind === "rep" ? await checkReports({ to: b.to, sa }) : b.kind === "board" ? await checkBoard({ uid: from, today: b.today, sa })
        : b.kind === "rk-start" ? await rankedStart({ uid: from, perk: b.perk, sa }) : b.kind === "rk-end" ? await rankedEnd({ uid: from, moves: b.moves, give: b.give === true, sa })
        : await notify({ kind: b.kind, to: b.to, from, sa });
      console.log(JSON.stringify(String(b.kind).startsWith("rk") ? { kind: b.kind, why: r.why, sc: r.sc } : { kind: b.kind, ...r }));
      return json(r, 200, cors);
    } catch (e) {
      const detail = String(e.message || e).slice(0, 80);
      console.log(JSON.stringify({ kind: b && b.kind, error: detail }));
      return json({ error: "server", detail }, 500, cors);
    }
  },
};
