// 1.9.4: the Google Play build has no "Support the app" (Patreon) row in Settings (Play's Payments policy);
// the website and the GitHub APK keep it. Also: nothing else in the Play build's Settings names or links Patreon.
import { start, T } from "./harness.mjs";
const openSettings = async p => { await p.click("[data-menu-btn]"); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(600); };
for (const [store, want] of [[null, 1], ["direct", 1], ["play", 0]]) {
  const h = await start(store ? { store } : {});
  const p = h.page;
  await openSettings(p);
  T.ok(await p.locator("[data-about], [data-notif-open], [data-look]").count() > 0, `${store || "web"}: Settings is open`);
  T.eq(await p.locator("[data-support]").count(), want, `${store || "web"}: support row ${want ? "shown" : "hidden"}`);
  if (store === "play") {
    const html = await p.evaluate(() => document.body.innerText + " " + [...document.querySelectorAll("a[href]")].map(a => a.href).join(" "));
    T.ok(!/patreon/i.test(html), "play: no Patreon text or link on the Settings screen");
    await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
    T.ok(!/patreon/i.test(await p.evaluate(() => document.body.innerText)), "play: no Patreon in the menu");
  }
  T.eq(h.errors, [], `${store || "web"}: no page errors`);
  await h.close();
}
T.done();
