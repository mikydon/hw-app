// 1.10.0 History: the calendar is the way in. A workout day is a filled cell, a tap opens that day's workout below;
// an empty day offers to add one with that date; the list follows the month; the Progress page has the all-time
// numbers and the chart; the guide chapter walks both pages.
import { start, T, shot, entry } from "./harness.mjs";
const clock = new Date(2026, 10, 11, 18).getTime();
const push = (res, x = {}) => ({ id: "k1", name: "Push-up", unit: "", res, ...x });
const history = [
  entry("2026-10-20", "A", [push([8, 8])]),
  entry("2026-10-28", "B", [push([9, 9])]),
  entry("2026-11-03", null, [{ id: "fw_goblet_squat", name: "Goblet squat", unit: "", res: [10, 10], kg: [16, 16] }], { plan: { id: "p", name: "Gym day", grp: "Gym", wd: 2 } }),
  entry("2026-11-07", "C", [push([10, 11])], { prs: ["k1"] }),
  entry("2026-11-11", "A", [push([12, 12], { note: "felt strong" })], { manual: true }),
];
const openHist = async p => { await p.click("[data-menu-btn]"); await p.click('[data-nav-box] [data-screen="history"]'); await p.waitForTimeout(600); };
{
  const h = await start({ clock, seed: { history, kcal: { sex: "m", weight: 80 }, profile: { skips: { "2026-11-05": { r: "sick", note: "flu" } } } } });
  const p = h.page;
  await openHist(p);
  T.eq(await p.locator("[data-workout-row]").count(), 3, "the list shows this month's workouts only");
  T.eq(await p.locator('[data-cal-train="1"]').count(), 3, "three workout days filled in the calendar");
  T.ok((await p.locator("[data-cal-month-sum]").getAttribute("aria-label")).startsWith("3 workouts"), "month line counts the month");
  T.eq(await p.locator('[data-workout-head][aria-expanded="true"]').count(), 1, "the newest workout is open");
  T.ok((await p.locator("[data-workout-row]").first().innerText()).includes("felt strong"), "its note shows");
  T.eq(await p.locator("[data-cal-cell]:disabled").count(), 19, "future days can't be picked");
  // a workout day → its row opens
  await p.click('[data-cal-day="2026-11-03"]'); await p.waitForTimeout(500);
  const row = p.locator('[data-workout-row][data-date="2026-11-03"]');
  T.eq(await row.locator("[data-workout-head]").getAttribute("aria-expanded"), "true", "tapping a workout day opens that workout");
  T.ok((await row.innerText()).includes("16 kg × 10") && (await row.locator("[data-hist-plan]").innerText()).includes("Gym day · Gym"), "plan name and weights in the row");
  T.eq(await p.locator('[data-workout-head][aria-expanded="true"]').count(), 1, "only one row is open");
  T.eq(await p.locator('[data-cal-day="2026-11-03"]').getAttribute("aria-pressed"), "true", "the day is marked as picked");
  // a skipped day → reason; an empty day → add with that date
  await p.click('[data-cal-skip="2026-11-05"]'); await p.waitForTimeout(300);
  T.ok((await p.locator("[data-day-empty]").innerText()).includes("flu"), "a skipped day shows its reason");
  await p.click('[data-cal-day="2026-11-06"]'); await p.waitForTimeout(300);
  T.ok((await p.locator("[data-day-empty]").innerText()).includes("No workout"), "an empty day says so");
  await shot(p, "hist110_empty");
  await p.click("[data-day-add]"); await p.waitForTimeout(400);
  const boxes = p.locator("[data-edit-val]");
  await boxes.nth(0).fill("7");
  await p.click("[data-edit-save]"); await p.waitForTimeout(500);
  const hs = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history);
  T.ok(hs.some(e => e.date === "2026-11-06" && e.manual), "the added workout got the picked day's date");
  T.eq(await p.locator("[data-workout-row]").count(), 4, "and it is in the list");
  T.eq(await p.locator('[data-cal-day="2026-11-06"]').getAttribute("data-cal-train"), "1", "and in the calendar");
  // previous month
  await p.click('[data-cal-nav="-1"]'); await p.waitForTimeout(400);
  T.eq(await p.locator("[data-workout-row]").count(), 2, "October lists October's workouts");
  T.ok((await p.locator("[data-cal-title]").innerText()).includes("October 2026"), "month title");
  await p.click('[data-cal-nav="-1"]'); await p.waitForTimeout(300);
  T.ok((await p.locator("[data-hist-none]").innerText()).includes("No workouts this month"), "an empty month says so");
  await p.click('[data-cal-nav="1"]'); await p.click('[data-cal-nav="1"]'); await p.waitForTimeout(300);
  T.ok(await p.locator('[data-cal-nav="1"]').isDisabled(), "no months in the future");
  // delete from the row
  await p.locator('[data-workout-row][data-date="2026-11-06"] [data-workout-head]').click(); await p.waitForTimeout(300);
  await p.locator('[data-workout-row][data-date="2026-11-06"] [data-hist-delete]').click();
  await p.click("[data-del-workout-yes]"); await p.waitForTimeout(400);
  T.eq(await p.locator("[data-workout-row]").count(), 3, "deleted through the confirmation box");
  // legend behind the "?"
  await p.locator("[data-month-cal] .exq").first().click(); await p.waitForTimeout(300);
  T.ok((await p.locator("[data-cal-legend]").innerText()).includes("Calories: target hit"), "the legend is behind the ?");
  await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(500);
  // Progress page
  await p.click('[data-hist-tab="1"]'); await p.waitForTimeout(700);
  T.ok(await p.locator("[data-stat-grid]").isVisible() && await p.locator("[data-pc-chart]").isVisible(), "Progress: numbers and chart");
  T.eq(await p.locator("[data-pc-chart]").getAttribute("data-pc-chart"), "k1", "the most used exercise first");
  T.ok((await p.locator("[data-pc-val]").innerText()).includes("12"), "the newest point is picked");
  T.ok((await p.locator("[data-pc-delta]").innerText()).includes("+4"), "change from the first to the last point");
  await p.click('[data-pc-ex="fw_goblet_squat"]'); await p.waitForTimeout(300);
  T.eq(await p.locator("[data-pc-chart]").getAttribute("data-pc-chart"), "fw_goblet_squat", "another exercise");
  await shot(p, "hist110_progress");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
// guide chapter 5 walks the calendar, +, a workout and the Progress page
{
  const h = await start({ clock, seed: { tour: true, history, profile: { tourDone: [1, 2, 4, 6, 7, 8, 9, 10] } } });
  const p = h.page;
  const bubble = async () => { await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(500); return p.locator("[data-tour-bubble]").innerText(); };
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400); await p.click("[data-tour-open]"); await p.waitForTimeout(400); await p.click('[data-tour-ch="5"]');
  T.ok((await bubble()).includes("a green day is a workout"), "guide: calendar");
  await p.click("[data-tour-next]");
  T.ok((await bubble()).includes("Forgot to log a workout"), "guide: add");
  await p.click("[data-tour-next]");
  T.ok((await bubble()).includes("open, edit or delete"), "guide: a workout");
  await p.click("[data-tour-next]");
  T.ok((await bubble()).includes("Tap Progress"), "guide: tap Progress (the tab's real name)");
  await p.click('[data-hist-tab="1"]', { force: true });
  T.ok((await bubble()).includes("your best set in every workout"), "guide: the chart");
  await shot(p, "hist110_tour");
  await p.click("[data-tour-next]");
  T.ok((await bubble()).includes("saved on your phone"), "guide: last bubble");
  await p.click("[data-tour-next]"); await p.waitForTimeout(700);
  T.eq(await p.locator('[data-hist-tab="0"]').getAttribute("aria-selected"), "true", "back on the Calendar page");
  T.eq(h.errors, [], "no page errors (guide)");
  await h.close();
}
T.done();
