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
// Secret (Cloudflare): FIREBASE_SERVICE_ACCOUNT = the service account key JSON from the Firebase console.
import TEXTS from "./texts.js";

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
        android: { priority: "HIGH", notification: { channel_id: "social", tag: data.cid || kind + "_" + from, color: "#A78BFA", icon: "ic_stat_hw" } } } }),
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
      const r = b.kind === "rep" ? await checkReports({ to: b.to, sa }) : await notify({ kind: b.kind, to: b.to, from, sa });
      console.log(JSON.stringify({ kind: b.kind, ...r }));
      return json(r, 200, cors);
    } catch (e) {
      const detail = String(e.message || e).slice(0, 80);
      console.log(JSON.stringify({ kind: b && b.kind, error: detail }));
      return json({ error: "server", detail }, 500, cors);
    }
  },
};
