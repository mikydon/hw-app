// 1.10.0 (Michael, Nov 15): the evening streak reminder. The app sends one reminder for the evening of the day the
// streak would end (2 days after the last workout or freeze), in the app's language, with the freeze text when a freeze
// would save it; a workout moves it on; switching it off clears it; Settings → Notifications has the switch and the
// hour (18–21). The native side is HwRemindPlugin + RemindReceiver (APK); here window.__hwRemind records the calls.
import { start, T, shot, entry } from "./harness.mjs";
const now = new Date(2026, 10, 15, 10, 0); // Sunday 10:00
const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const it = [{ id: "k1", name: "Push-up", unit: "", res: [10, 10] }];
const ago = n => { const d = new Date(now); d.setDate(d.getDate() - n); return dk(d); };
const init = () => {
  window.__remind = [];
  window.__hwRemind = { set: async o => { window.__remind.push(["set", o]); }, clear: async () => { window.__remind.push(["clear"]); } };
  window.__hwNotifSim = { perm: "granted" };
};
const last = p => p.evaluate(() => window.__remind[window.__remind.length - 1]);
const at = (day, h) => { const [y, m, d] = day.split("-").map(Number); return new Date(y, m - 1, d, h).getTime(); };
// ─── trained Friday + Wednesday: the streak ends tonight (Sunday) ───
{
  const h = await start({ clock: now.getTime(), viewport: { width: 380, height: 820 }, init, seed: { history: [entry(ago(4), "A", it), entry(ago(2), "B", it)], profile: { name: "Michael", freezeDays: [] } } });
  const p = h.page;
  await p.waitForTimeout(1500);
  const r = await last(p);
  T.eq(r && r[0], "set", "a reminder is set");
  T.eq(r && r[1].at, at(dk(now), 19), "tonight 19:00 (2 days after Friday)");
  T.ok(r && r[1].title.includes("🔥 2") && r[1].title.includes("tonight"), "title with the streak: " + (r && r[1].title));
  T.ok(r && r[1].body.includes("freeze"), "a freeze would save it: the freeze text: " + (r && r[1].body));
  // Settings → Notifications: the row, the hour
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(800);
  T.ok(await p.locator("[data-notif-open]").isVisible(), "the notifications row");
  await p.click("[data-notif-open]"); await p.waitForSelector("[data-notif-sheet]");
  T.eq(await p.getAttribute("[data-remind]", "data-remind"), "1", "the reminder is on by default");
  await p.click('[data-remind-at="21"]'); await p.waitForTimeout(1200);
  T.eq((await last(p))[1].at, at(dk(now), 21), "another hour: set again");
  await p.waitForTimeout(300); await shot(p, "remind_sheet");
  await p.click('[data-remind] [role="switch"]'); await p.waitForTimeout(1200);
  T.eq((await last(p))[0], "clear", "switched off: cleared");
  T.eq(await p.locator("[data-remind-at]").count(), 0, "no hours while off");
  T.ok((await p.textContent("[data-notif-sheet]")).length > 0, "sheet still open");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  T.ok((await p.textContent("[data-notif-sum]")).includes("of"), "summary: some of the kinds on: " + (await p.textContent("[data-notif-sum]")));
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
// ─── trained today: two days on; no streak: nothing; past the hour on the last day: nothing ───
{
  const h = await start({ clock: now.getTime(), viewport: { width: 380, height: 820 }, init, seed: { history: [entry(ago(2), "A", it), entry(dk(now), "B", it)], profile: { name: "Michael", freezeDays: [ago(1), ago(3), ago(5)] }, settings: { lang: "sk", remindAt: 20 } } });
  const p = h.page;
  await p.waitForTimeout(1500);
  const r = await last(p);
  T.eq(r && r[1].at, at(ago(-2), 20), "trained today: Tuesday 20:00");
  T.ok(r && r[1].title.includes("séria") && !r[1].body.includes("zamrazenie"), "Slovak, no freeze left (3 used): " + JSON.stringify(r && r[1]));
  T.eq(h.errors, [], "no page errors (today)");
  await h.close();
}
{
  const h = await start({ clock: now.getTime(), viewport: { width: 380, height: 820 }, init, seed: { history: [entry(ago(9), "A", it)], profile: { name: "Michael" } } });
  await h.page.waitForTimeout(1500);
  T.eq((await last(h.page))[0], "clear", "no streak: no reminder");
  await h.close();
}
{
  const late = new Date(2026, 10, 15, 22, 0);
  const h = await start({ clock: late.getTime(), viewport: { width: 380, height: 820 }, init, seed: { history: [entry(ago(2), "A", it)], profile: { name: "Michael" } } });
  await h.page.waitForTimeout(1500);
  T.eq((await last(h.page))[0], "clear", "after 19:00 on the last day: nothing (the person is in the app)");
  await h.close();
}
T.done();
