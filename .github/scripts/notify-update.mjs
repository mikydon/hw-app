// "A new version is out" notification (1.6.5): one FCM message per language to the topic upd-<store>-<lang>, which
// every app with these notifications on is subscribed to (native.js updTopic).
//   node .github/scripts/notify-update.mjs direct 1.6.5   (CI, right after the GitHub release is created)
//   node .github/scripts/notify-update.mjs play 1.6.5     (workflow "Notify Google Play users", once Google approved)
// Needs FIREBASE_SERVICE_ACCOUNT (the same secret the push server uses). Texts: ntUpd + ntUpdD / ntUpdPlayD from src/i18n.
import crypto from "crypto";
const [store, ver] = process.argv.slice(2);
if (!/^(direct|play)$/.test(store || "") || !/^\d+\.\d+\.\d+(\.\d+)?$/.test(ver || "")) { console.log("::error::usage: notify-update.mjs direct|play x.y.z"); process.exit(1); }
let sa = null;
try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null"); } catch (_) {}
if (!sa || !sa.client_email || !sa.private_key) { console.log("::warning title=No update notification::Secret FIREBASE_SERVICE_ACCOUNT is missing or not valid JSON."); process.exit(0); }
const b64 = x => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const aud = sa.token_uri || "https://oauth2.googleapis.com/token";
const unsigned = b64({ alg: "RS256", typ: "JWT" }) + "." + b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud, iat: now, exp: now + 3600 });
const jwt = unsigned + "." + crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key).toString("base64url");
const tr = await fetch(aud, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
const tj = await tr.json().catch(() => ({}));
if (!tj.access_token) { console.log(`::error title=No update notification::OAuth failed (${tr.status} ${tj.error || ""})`); process.exit(1); }
const LANGS = ["en", "sk", "cs", "pl", "hu", "uk", "de", "es", "fr", "it", "pt", "zh", "ja", "ko"];
const en = (await import(new URL("../../src/i18n/en.js", import.meta.url))).default.ui;
const fill = (s, v) => String(s).replace(/\{v\}/g, v);
let sent = 0; const bad = [];
for (const lang of LANGS) {
  const ui = (await import(new URL(`../../src/i18n/${lang}.js`, import.meta.url))).default.ui;
  const title = fill(ui.ntUpd || en.ntUpd, ver), body = (store === "play" ? ui.ntUpdPlayD || en.ntUpdPlayD : ui.ntUpdD || en.ntUpdD);
  const message = {
    topic: `upd-${store}-${lang}`,
    notification: { title, body },
    data: { kind: "upd", v: ver },
    android: { priority: "NORMAL", ttl: "604800s", collapse_key: "upd", notification: { channel_id: "updates", icon: "ic_stat_hw", tag: "upd" } },
  };
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, { method: "POST", headers: { authorization: "Bearer " + tj.access_token, "content-type": "application/json" }, body: JSON.stringify({ message }) });
  if (r.ok) sent++; else bad.push(`${lang} ${r.status} ${((await r.json().catch(() => ({}))).error || {}).status || ""}`);
}
console.log(`::notice title=Update notification::HW App ${ver} → ${sent}/${LANGS.length} topics upd-${store}-*${bad.length ? " (failed: " + bad.join(", ") + ")" : ""}`);
process.exit(sent ? 0 : 1);
