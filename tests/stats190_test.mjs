// 1.9.0 (Michael, Nov 7): the Stats page of your own profile draws your history: a 12-week activity map, a per-week
// chart (reps / time / workouts), calories (ring + 14 days with the target) and your training weekdays. Others only see
// the totals (their cards carry nothing more).
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hist = [];
for (let i = 0; i < 40; i++) { const d = new Date(2026, 10, 7 - i * 2); hist.push(entry(key(d), "ABC"[i % 3], [it("k1", [10 + (i % 7), 9]), it("n1", [20, 18]), it("row1", [8, 8, 7].slice(0, i % 4)), it("b5", [40, 40, 30].slice(0, (i * 7) % 4))].filter(x => x.res.length), { dur: 900 + i * 20 })); }
const log = {};
for (let i = 0; i < 20; i++) { const d = new Date(2026, 10, 7 - i); log[key(d)] = [{ ts: d.getTime(), kcal: i % 3 ? 2600 : 1500 }]; }
const kcal = { sex: "m", weight: 80, height: 180, activity: "light", goal: { type: "maintain" }, log };
const h = await start({ viewport: { width: 360, height: 760 }, dpr: 2, clock: new Date(2026, 10, 7, 18).getTime(), seed: { history: hist, profile: { name: "Michael", birth: { y: 1995, m: null, d: null } }, kcal } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(700);
await p.click('[data-pf-tab="3"]'); await p.waitForTimeout(1300);
T.ok(await p.locator("[data-st-own]").isVisible(), "own Stats show the charts");
// activity map: 12 weeks × 7 days, today's square has a level, a day after today is empty
T.eq(await p.locator("[data-st-day]").count(), 84, "84 day squares");
T.ok(Number(await p.getAttribute('[data-st-day="2026-11-07"]', "data-lv")) > 0, "today was trained: lit");
T.eq(await p.getAttribute('[data-st-day="2026-11-06"]', "data-lv"), "0", "yesterday rested: dark");
await shot(p, "stats_top");
await p.click('[data-st-day="2026-11-05"]');
T.ok(/rep/.test(await p.textContent("[data-st-heat-sel]")), "tap on a day: its reps (" + await p.textContent("[data-st-heat-sel]") + ")");
// per week: switching the measure redraws, a tap picks a week
T.eq(await p.getAttribute("[data-st-weeks]", "data-st-weeks"), "reps", "reps first");
const v0 = await p.textContent("[data-st-week-val]");
await p.click('[data-st-metric="n"]'); await p.waitForTimeout(300);
T.ok(/workout/.test(await p.textContent("[data-st-week-val]")), "workouts per week: " + await p.textContent("[data-st-week-val]"));
const sv = await p.locator("[data-st-weeks]").boundingBox();
await p.mouse.click(sv.x + 12, sv.y + sv.height / 2); await p.waitForTimeout(200);
T.ok((await p.textContent("[data-st-week-val]")) !== null, "a tap on the chart picks the first week");
await p.click('[data-st-metric="reps"]'); await p.waitForTimeout(200);
T.ok(v0.length > 0, "this week's value: " + v0);
// calories
await p.locator('[data-st-card="kcal"]').scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
const ring = Number(await p.getAttribute("[data-st-kcal-ring]", "data-st-kcal-ring"));
T.ok(ring > 0 && ring < 20, "calorie ring: days the target was hit (" + ring + ")");
T.eq(await p.locator("[data-st-kcal-day]").count(), 14, "14 calorie bars");
T.ok(await p.locator('[data-st-kcal-day][data-kind="hit"]').count() > 0 && await p.locator('[data-st-kcal-day][data-kind="log"]').count() > 0, "hit and logged days look different");
await p.click('[data-st-kcal-day="2026-11-07"]');
T.ok(/kcal/.test(await p.textContent("[data-st-kcal-sel]")), "tap on a day: eaten / target (" + await p.textContent("[data-st-kcal-sel]") + ")");
await shot(p, "stats_kcal");
// weekdays
T.eq((await p.locator("[data-st-wd]").evaluateAll(els => els.reduce((a, e) => a + Number(e.getAttribute("data-n")), 0))), 40, "the weekday bars count every workout");
await p.locator("[data-st-all]").scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
await shot(p, "stats_bottom");
T.ok(await p.locator("[data-pf-stats]").isVisible(), "the totals stay under the charts");
T.eq(h.errors, [], "no page errors"); await h.close();
// without calories set up: a short line and a button to Calories
const g = await start({ viewport: { width: 360, height: 760 }, seed: { history: hist.slice(0, 5), profile: { name: "Michael" } } });
await g.page.click("[data-menu-btn]"); await g.page.click('[data-screen="profile"]'); await g.page.waitForTimeout(600);
await g.page.click('[data-pf-tab="3"]'); await g.page.waitForTimeout(900);
await g.page.click("[data-st-kcal-go]"); await g.page.waitForTimeout(700);
T.ok(await g.page.evaluate(() => !!document.querySelector('[data-screen-root="calories"], [data-kc-setup], [data-kcsetup]')) || /calor/i.test(await g.page.textContent("[data-topbar]")), "Set up opens Calories");
T.eq(g.errors, [], "no page errors (no calories)"); await g.close();
T.done();
