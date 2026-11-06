// 1.9.0 History: plan / free workouts show their saved plan name, weights show kg × reps, editing keeps the plan and
// changes kg; records are recomputed with weights; the calendar shows a short mark.
import { start, T, shot, entry } from "./harness.mjs";
const h = await start({ clock: new Date(2026, 10, 6, 18).getTime(), seed: { kcal: { sex: "m", weight: 80 }, history: [
  entry("2026-11-02", null, [{ id: "fw_goblet_squat", name: "Goblet squat", unit: "", res: [10, 10], kg: [16, 16] }], { plan: { id: "gone", name: "Workout Plan 7", grp: "Gym", wd: 1 } }),
  entry("2026-11-04", null, [{ id: "fw_goblet_squat", name: "Goblet squat", unit: "", res: [10, 8], kg: [16, 16] }], { plan: { id: "gone", name: "Leg day", wd: 3 } }),
] } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-nav-box] [data-screen="history"]'); await p.waitForTimeout(500);
T.ok((await p.locator("[data-hist-plan]").first().innerText()).includes("Leg day"), "deleted plan's name kept in history");
T.ok((await p.locator("[data-hist-plan]").nth(1).innerText()).includes("Workout Plan 7 · Gym"), "plan name + group");
T.ok((await p.locator("[data-workouts]").innerText()).includes("16 kg × 10"), "weights shown as kg × reps");
const cal = await p.locator("[data-workouts], body").first().innerText();
await shot(p, "history190");
// edit the newest: second set 16 → 18 kg × 10 → record over Nov 2
await p.locator("[data-workout-row] button", { hasText: "" }).filter({ has: p.locator("svg") }).first();
await p.locator('[data-workout-row] button:has-text("Edit")').first().click();
T.ok(await p.locator("[data-edit-plan]").count() === 1, "editor keeps the plan (no A/B/C)");
await p.locator('[data-edit-row="fw_goblet_squat"] [data-edit-kg="1"]').fill("18");
await p.locator('[data-edit-row="fw_goblet_squat"] [data-edit-val="1"]').fill("10");
await p.click('[data-edit-row="fw_goblet_squat"] [data-edit-sets-plus]');
await p.locator('[data-edit-row="fw_goblet_squat"] [data-edit-val="2"]').fill("6");
await p.locator('[data-edit-row="fw_goblet_squat"] [data-edit-kg="2"]').fill("20,5");
await p.click("[data-edit-save]"); await p.waitForTimeout(400);
const hs = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history);
const e = hs.find(x => x.date === "2026-11-04");
T.eq(e.plan.name, "Leg day", "plan kept after edit"); T.ok(!e.day, "no A/B/C added");
T.eq(e.items[0].kg, [16, 18, 20.5], "kg edited, comma accepted, third set added");
T.ok(e.prs.includes("fw_goblet_squat"), "record recomputed with weights");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
