// 1.10.0 (Michael's idea 3, Nov 15): last week on Home, Monday to Wednesday until closed: workouts, sets, time, the
// change from the week before, the days trained, and a picture to share (here it downloads).
import { start, T, shot, entry } from "./harness.mjs";
import fs from "fs";
const mon = new Date(2026, 10, 16, 10, 0); // Monday
const it = [{ id: "k1", name: "Push-up", unit: "", res: [12, 10] }, { id: "b5", name: "Plank", unit: "s", res: ["45s", "60s"] }];
const history = [entry("2026-11-04", "A", it, { dur: 900 }), entry("2026-11-09", "A", it, { dur: 1100 }), entry("2026-11-11", "B", it, { dur: 1200 }), entry("2026-11-14", "C", it, { dur: 1000 })];
{
  const h = await start({ clock: mon.getTime(), viewport: { width: 380, height: 820 }, seed: { history, profile: { name: "Michael" } } });
  const p = h.page;
  await p.waitForTimeout(1000);
  T.eq(await p.getAttribute("[data-notice]", "data-notice"), "recap", "Monday: last week's card");
  T.eq(await p.getAttribute("[data-recap]", "data-recap"), "2026-11-09", "the week of Nov 9");
  const stats = await p.textContent("[data-recap-stats]");
  T.eq(stats, "31255 min", "3 workouts, 12 sets, 55 min");
  T.ok((await p.textContent("[data-recap-vs]")).includes("2 workouts more"), "2 more than the week before: " + (await p.textContent("[data-recap-vs]")));
  T.eq(await p.$$eval("[data-recap-days] [data-on]", e => e.map(x => x.getAttribute("data-on")).join("")), "1010010", "Mon, Wed, Sat");
  await shot(p, "recap_card");
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 10000 }), p.click("[data-recap-share]")]);
  const file = "tests/out/recap_share.png"; await dl.saveAs(file);
  const b = fs.readFileSync(file);
  T.ok(b.readUInt32BE(16) === 1080 && b.readUInt32BE(20) === 1350, "a 1080 × 1350 picture");
  T.eq(await p.getAttribute("[data-recap-share]", "data-state"), "saved", "saved on the website");
  await p.locator("[data-recap] > button").first().click(); await p.waitForTimeout(500);
  T.eq(await p.locator("[data-recap]").count(), 0, "closed");
  await p.reload(); await p.waitForTimeout(1200);
  T.eq(await p.locator("[data-recap]").count(), 0, "stays closed this week");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
{
  const thu = new Date(2026, 10, 19, 10, 0);
  const h = await start({ clock: thu.getTime(), viewport: { width: 380, height: 820 }, seed: { history, profile: { name: "Michael" } } });
  await h.page.waitForTimeout(1000);
  T.eq(await h.page.locator("[data-recap]").count(), 0, "Thursday: no card");
  await h.close();
}
{
  const h = await start({ clock: mon.getTime(), viewport: { width: 380, height: 820 }, seed: { history: history.slice(0, 1), profile: { name: "Michael" } } });
  await h.page.waitForTimeout(1000);
  T.eq(await h.page.locator("[data-recap]").count(), 0, "no workout last week: no card");
  await h.close();
}
T.done();
