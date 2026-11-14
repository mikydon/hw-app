// 1.9.4: the Google Play build got no "Support the app" (Patreon) row in Settings (Play's Payments policy).
// 1.10.0 (Michael, Nov 13): the row is gone from every build, so the website, the GitHub APK and Play are the same.
import { start, T } from "./harness.mjs";
import fs from "node:fs";
const openSettings = async p => { await p.click("[data-menu-btn]"); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(600); };
for (const store of [null, "direct", "play"]) {
  const h = await start(store ? { store } : {});
  const p = h.page, name = store || "web";
  await openSettings(p);
  T.ok(await p.locator("[data-about], [data-notif-open], [data-look]").count() > 0, `${name}: Settings is open`);
  T.eq(await p.locator("[data-support]").count(), 0, `${name}: no support row`);
  const html = await p.evaluate(() => document.body.innerText + " " + [...document.querySelectorAll("a[href]")].map(a => a.href).join(" "));
  T.ok(!/patreon|paypal|ko-fi/i.test(html), `${name}: no Patreon, PayPal or Ko-fi text or link on the Settings screen`);
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
  T.ok(!/patreon/i.test(await p.evaluate(() => document.body.innerText)), `${name}: no Patreon in the menu`);
  T.eq(h.errors, [], `${name}: no page errors`);
  await h.close();
}
// no link to it anywhere in the shipped page (the texts of all 15 languages are inside index.html)
T.ok(!/patreon\.com/i.test(fs.readFileSync(new URL("../index.html", import.meta.url), "utf8")), "index.html has no Patreon link at all");
T.done();
