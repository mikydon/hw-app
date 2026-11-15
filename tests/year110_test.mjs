// 1.10.0 (Michael's idea 4, Nov 15): "Your 2026" on Home from Dec 15 to Jan 10 (until closed): workouts, time, the
// longest streak, the months, favourite exercises and a picture to share (here it downloads).
import { start, T, shot, entry } from "./harness.mjs";
import fs from "fs";
const it = [{ id: "k1", name: "Push-up", unit: "", res: [12, 10] }, { id: "n1", name: "Squat", unit: "", res: [20] }];
const days = ["2026-03-02", "2026-03-04", "2026-03-06", "2026-03-08", "2026-06-10", "2026-11-02", "2026-11-04", "2025-12-30"];
const history = days.map((d, i) => entry(d, "ABC"[i % 3], it, { dur: 1200 }));
{
  const h = await start({ clock: new Date(2026, 11, 20, 10).getTime(), viewport: { width: 380, height: 820 }, seed: { history, profile: { name: "Michael" } } });
  const p = h.page;
  await p.waitForTimeout(1000);
  T.eq(await p.getAttribute("[data-notice]", "data-notice"), "year", "Dec 20: the year card");
  T.eq(await p.getAttribute("[data-year]", "data-year"), "2026", "for 2026");
  const st = await p.textContent("[data-year-stats]");
  T.ok(st.startsWith("7") && st.endsWith("4") && st.includes("2"), "7 workouts (not last year's), 2 h, longest streak 4: " + st);
  await p.click("[data-year-open]"); await p.waitForTimeout(600);
  T.ok((await p.textContent("[data-year-more]")).includes("Best month: March"), "best month March");
  T.eq(await p.locator("[data-year-ex]").count(), 2, "favourite exercises");
  await shot(p, "year_card");
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 10000 }), p.click("[data-year-share]")]);
  const file = "tests/out/year_share.png"; await dl.saveAs(file);
  const b = fs.readFileSync(file);
  T.ok(b.readUInt32BE(16) === 1080 && b.readUInt32BE(20) === 1350, "a 1080 × 1350 picture");
  T.eq(dl.suggestedFilename(), "hw-app-2026.png", "named by the year");
  await p.locator("[data-year] > button").first().click(); await p.waitForTimeout(500);
  await p.reload(); await p.waitForTimeout(1200);
  T.eq(await p.locator("[data-year]").count(), 0, "closed for this year");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
{
  const h = await start({ clock: new Date(2027, 0, 5, 10).getTime(), viewport: { width: 380, height: 820 }, seed: { history, profile: { name: "Michael" } } });
  await h.page.waitForTimeout(1000);
  T.eq(await h.page.getAttribute("[data-year]", "data-year"), "2026", "Jan 5: still last year's card");
  await h.close();
}
{
  const h = await start({ clock: new Date(2026, 11, 10, 10).getTime(), viewport: { width: 380, height: 820 }, seed: { history, profile: { name: "Michael" } } });
  await h.page.waitForTimeout(1000);
  T.eq(await h.page.locator("[data-year]").count(), 0, "Dec 10: not yet");
  await h.close();
}
T.done();
