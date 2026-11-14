// Are the Firestore rules that are LIVE in Firebase the ones in this repo (firestore.rules)?
// The rules are published by hand in the Firebase console, and a forgotten publish breaks features quietly
// (1.9.1: restore points need `match /old/{day}`). This reads the released ruleset through the Firebase Rules API
// and says, as an annotation, whether it matches. Needs FIREBASE_SERVICE_ACCOUNT.
//   node .github/scripts/rules-live.mjs            compare only (every push); also says whether CI may publish
//   node .github/scripts/rules-live.mjs --publish  publish firestore.rules when it differs (main only, after the
//                                                  emulator tests passed; Michael, Nov 13, 2026: "okay" to CI publishing)
// Publishing needs the role "Firebase Rules Admin" on the service account (firebaserules.rulesets.create and
// firebaserules.releases.update); without it the run says so and nothing changes.
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
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
out("same", repo === L);
const PUBLISH = process.argv.includes("--publish");
if (PUBLISH && repo !== L) {
  const post = async (method, p, body) => { const r = await fetch("https://firebaserules.googleapis.com/v1/" + p, { method, headers: { authorization: "Bearer " + tj.access_token, "content-type": "application/json" }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }; };
  const src = fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  const made = await post("POST", `projects/${sa.project_id}/rulesets`, { source: { files: [{ name: "firestore.rules", content: src }] } });
  if (!made.ok || !made.j.name) { say("error", "Firestore rules NOT published", `Creating the ruleset failed (${made.status} ${(made.j.error || {}).status || ""}: ${((made.j.error || {}).message || "").slice(0, 300)}). ${made.status === 403 ? 'Give the service account ' + sa.client_email + ' the role "Firebase Rules Admin" in Google Cloud → IAM, or publish by hand in the Firebase console.' : ""}`); process.exit(1); }
  const name = `projects/${sa.project_id}/releases/cloud.firestore`;
  const put = await post("PATCH", name, { release: { name, rulesetName: made.j.name } });
  if (!put.ok) { say("error", "Firestore rules NOT published", `The ruleset was created but the release was not moved to it (${put.status} ${(put.j.error || {}).status || ""}: ${((put.j.error || {}).message || "").slice(0, 300)}). The live rules are unchanged; publish by hand in the Firebase console.`); process.exit(1); }
  // read back: the release must now serve exactly the repo's file
  const rel2 = await api(name), rs2 = rel2.ok ? await api(rel2.j.rulesetName) : rel2;
  const live2 = norm((((rs2.j.source || {}).files || [])[0] || {}).content || "");
  if (live2 !== repo) { say("error", "Firestore rules: published, but the read-back differs", "Check Firestore → Rules in the Firebase console."); process.exit(1); }
  say("notice", "Firestore rules PUBLISHED by CI", `firestore.rules of this commit is live now (${rel2.j.updateTime || "just now"}). Before: published ${when}.`);
  process.exit(0);
}
// may CI publish? (asked on every run, so a missing role is known before a release needs it)
{
  const r = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${sa.project_id}:testIamPermissions`, { method: "POST", headers: { authorization: "Bearer " + tj.access_token, "content-type": "application/json" }, body: JSON.stringify({ permissions: ["firebaserules.rulesets.create", "firebaserules.releases.update"] }) });
  const j = await r.json().catch(() => ({})), have = j.permissions || [];
  if (!r.ok) say("notice", "Can CI publish the rules? unknown", `The permission check itself was refused (${r.status} ${(j.error || {}).status || ""}); the first publish on main will show it.`);
  else if (have.length === 2) say("notice", "CI can publish the rules", "The service account may create rulesets and move the release: on main, a changed firestore.rules is published after its tests pass.");
  else say("warning", "CI can NOT publish the rules yet", `Missing: ${["firebaserules.rulesets.create", "firebaserules.releases.update"].filter(x => !have.includes(x)).join(", ")}. Google Cloud console → IAM → ${sa.client_email} → add the role "Firebase Rules Admin". Until then publish by hand.`);
}
if (repo === L) { say("notice", "Live Firestore rules = firestore.rules", `Published ${when}.`); process.exit(0); }
// what is missing: rule blocks and markers of each version, so the message says which features are affected
const marks = [["match /old/{day}", "restore points (1.9.1)"], ["'lw'", "last workout on the profile (1.9.0)"], ["match /promo/", "diamond codes (1.9.0)"], ["match /gift/", "gifts (1.9.0)"], ["'rr'", "weighted ranks on the profile (1.9.0)"]];
const miss = marks.filter(([m]) => repo.includes(m) && !L.includes(m)).map(([, n]) => n);
const a = repo.split("\n"), b = L.split("\n"); let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
say("warning", "Live Firestore rules are NOT the repo's firestore.rules",
  `Published ${when}. ${miss.length ? "Missing in the live rules: " + miss.join("; ") + ". " : ""}First difference at line ${i + 1}:\nrepo: ${(a[i] || "(end)").trim().slice(0, 160)}\nlive: ${(b[i] || "(end)").trim().slice(0, 160)}\nLive has ${b.length} lines, the repo ${a.length}. Publish firestore.rules in the Firebase console (Firestore → Rules).`);
