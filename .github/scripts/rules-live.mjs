// Are the Firestore rules that are LIVE in Firebase the ones in this repo (firestore.rules)?
// The rules are published by hand in the Firebase console, and a forgotten publish breaks features quietly
// (1.9.1: restore points need `match /old/{day}`). This reads the released ruleset through the Firebase Rules API
// and says, as an annotation, whether it matches. Read only. Needs FIREBASE_SERVICE_ACCOUNT.
//   node .github/scripts/rules-live.mjs
import crypto from "crypto";
import fs from "fs";
const say = (lvl, title, msg) => console.log(`::${lvl} title=${title}::${String(msg).replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A")}`);
let sa = null;
try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null"); } catch (_) {}
if (!sa || !sa.client_email || !sa.private_key) { say("warning", "Live rules not checked", "Secret FIREBASE_SERVICE_ACCOUNT is missing or not valid JSON."); process.exit(0); }
const b64 = x => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
const now = Math.floor(Date.now() / 1000), aud = sa.token_uri || "https://oauth2.googleapis.com/token";
const unsigned = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform", aud, iat: now, exp: now + 600 });
const jwt = unsigned + "." + crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
const tr = await fetch(aud, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
const tj = await tr.json().catch(() => ({}));
if (!tj.access_token) { say("warning", "Live rules not checked", `OAuth failed (${tr.status} ${tj.error || ""})`); process.exit(0); }
const api = async p => { const r = await fetch("https://firebaserules.googleapis.com/v1/" + p, { headers: { authorization: "Bearer " + tj.access_token } }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }; };
const rel = await api(`projects/${sa.project_id}/releases/cloud.firestore`);
if (!rel.ok) { say("warning", "Live rules not checked", `The service account cannot read the released rules (${rel.status} ${(rel.j.error || {}).status || ""}). In Google Cloud → IAM give it the role "Firebase Rules Viewer" to switch this check on.`); process.exit(0); }
const rs = await api(rel.j.rulesetName);
if (!rs.ok) { say("warning", "Live rules not checked", `Ruleset not readable (${rs.status} ${(rs.j.error || {}).status || ""}).`); process.exit(0); }
const live = (((rs.j.source || {}).files || [])[0] || {}).content || "";
const norm = s => s.replace(/\r/g, "").split("\n").map(l => l.replace(/\s+$/, "")).join("\n").trim();
const repo = norm(fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8")), L = norm(live);
const when = rel.j.updateTime || rs.j.createTime || "?";
if (repo === L) { say("notice", "Live Firestore rules = firestore.rules", `Published ${when}.`); process.exit(0); }
// what is missing: rule blocks and markers of each version, so the message says which features are affected
const marks = [["match /old/{day}", "restore points (1.9.1)"], ["'lw'", "last workout on the profile (1.9.0)"], ["match /promo/", "diamond codes (1.9.0)"], ["match /gift/", "gifts (1.9.0)"], ["'rr'", "weighted ranks on the profile (1.9.0)"]];
const miss = marks.filter(([m]) => repo.includes(m) && !L.includes(m)).map(([, n]) => n);
const a = repo.split("\n"), b = L.split("\n"); let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
say("warning", "Live Firestore rules are NOT the repo's firestore.rules",
  `Published ${when}. ${miss.length ? "Missing in the live rules: " + miss.join("; ") + ". " : ""}First difference at line ${i + 1}:\nrepo: ${(a[i] || "(end)").trim().slice(0, 160)}\nlive: ${(b[i] || "(end)").trim().slice(0, 160)}\nLive has ${b.length} lines, the repo ${a.length}. Publish firestore.rules in the Firebase console (Firestore → Rules).`);
