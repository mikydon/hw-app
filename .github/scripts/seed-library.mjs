// 1.10.0: writes HW App's own plans (src/defplans.js) into the Library as Firestore docs pub/hwapp_<k>, through the
// Firestore REST API with the service account (FIREBASE_SERVICE_ACCOUNT; the Admin path skips the security rules).
// A new plan is created with zero saves/stars; an existing one gets only its content updated (o, nick, k, name, nl,
// items, fam, eq, n), never its counters or its date; an hwapp_ doc no longer in the list is deleted.
//   node .github/scripts/seed-library.mjs           write (CI, on a push that changes the list)
//   node .github/scripts/seed-library.mjs --dry     only check the list and print what would be written (no secret)
import crypto from "crypto";
import { DEF_PLANS, DEF_OWNER, DEF_NICK } from "../../src/defplans.js";
import { LIB } from "../../src/exlib.js";
import { storeOf } from "../../src/plans.js";
const say = (lvl, title, msg) => console.log(`::${lvl} title=${title}::${String(msg).replace(/%/g, "%25").replace(/\n/g, "%0A")}`);
const DRY = process.argv.includes("--dry");

// the docs, checked: every exercise known, at most 12 exercises, a unique key
const seen = new Set(), docs = DEF_PLANS.map(p => {
  if (!/^[a-z0-9]{1,12}$/.test(p.k) || seen.has(p.k)) throw new Error("bad or repeated key " + p.k);
  seen.add(p.k);
  const bad = p.items.filter(x => !LIB[x.id]).map(x => x.id);
  if (bad.length) throw new Error(`plan ${p.k}: unknown exercises ${bad.join(", ")}`);
  if (!p.items.length || p.items.length > 12) throw new Error(`plan ${p.k}: 1–12 exercises`);
  const s = storeOf({ id: p.k, items: p.items }, LIB, p.name);
  return { id: DEF_OWNER + "_" + p.k, f: { o: DEF_OWNER, nick: DEF_NICK, k: p.k, name: s.name, nl: s.name.toLowerCase(), items: s.items, fam: s.fam, eq: s.eq, n: s.items.length } };
});
if (DRY) { docs.forEach(d => console.log(d.id, JSON.stringify({ name: d.f.name, fam: d.f.fam, eq: d.f.eq, n: d.f.n }))); process.exit(0); }

let sa = null;
try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null"); } catch (_) {}
if (!sa || !sa.client_email || !sa.private_key) { say("warning", "Library not seeded", "Secret FIREBASE_SERVICE_ACCOUNT is missing or not valid JSON."); process.exit(0); }
const b64 = x => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
const now = Math.floor(Date.now() / 1000), aud = sa.token_uri || "https://oauth2.googleapis.com/token";
const unsigned = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore", aud, iat: now, exp: now + 3600 });
const jwt = unsigned + "." + crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
const tr = await fetch(aud, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
const tj = await tr.json().catch(() => ({}));
if (!tj.access_token) { say("error", "Library not seeded", `OAuth failed (${tr.status} ${tj.error || ""})`); process.exit(1); }
const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
const H = { authorization: "Bearer " + tj.access_token, "content-type": "application/json" };
const enc = v => (v === null || v === undefined ? { nullValue: null } : typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === "string" ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } });
const encF = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)]));

let made = 0, upd = 0, gone = 0;
for (const d of docs) {
  const url = `${base}/pub/${d.id}`, cur = await fetch(url, { headers: H });
  if (cur.status === 404) {
    // create only if it still does not exist (a second run at the same moment must not reset counters)
    const r = await fetch(`${base}/pub?documentId=${d.id}`, { method: "POST", headers: H, body: JSON.stringify({ fields: { ...encF({ ...d.f, sv: 0, st: 0, sn: 0, avg: 0 }), ts: { timestampValue: new Date().toISOString() } } }) });
    if (!r.ok && r.status !== 409) { say("error", "Library not seeded", `${d.id}: create ${r.status} ${await r.text()}`); process.exit(1); }
    made++;
  } else if (cur.ok) {
    const mask = Object.keys(d.f).map(k => "updateMask.fieldPaths=" + k).join("&");
    const r = await fetch(`${url}?${mask}&currentDocument.exists=true`, { method: "PATCH", headers: H, body: JSON.stringify({ fields: encF(d.f) }) });
    if (!r.ok) { say("error", "Library not seeded", `${d.id}: update ${r.status} ${await r.text()}`); process.exit(1); }
    upd++;
  } else { say("error", "Library not seeded", `${d.id}: read ${cur.status} ${await cur.text()}`); process.exit(1); }
}
// HW App plans that left the list
const q = await fetch(`${base}:runQuery`, { method: "POST", headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "pub" }], where: { fieldFilter: { field: { fieldPath: "o" }, op: "EQUAL", value: { stringValue: DEF_OWNER } } }, limit: 200 } }) });
const keep = new Set(docs.map(d => d.id));
for (const row of q.ok ? await q.json() : []) {
  const name = row.document && row.document.name, id = name && name.split("/").pop();
  if (id && !keep.has(id)) { const r = await fetch(`${base}/pub/${id}`, { method: "DELETE", headers: H }); if (r.ok) gone++; }
}
say("notice", "Library seeded", `HW App plans: ${made} new, ${upd} updated, ${gone} removed (${docs.length} in all).`);
