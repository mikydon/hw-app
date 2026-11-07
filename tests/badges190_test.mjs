// 1.9.0 (Michael, Nov 7: "make more badges"): 14 new ones from weights, own plans, body parts, notes, the new
// exercises, and three secret dates. Secret ones stay hidden until earned.
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res, kg, extra) => ({ id, name: id, unit: "", res, ...(kg ? { kg } : {}), ...(extra || {}) });
const hist = [
  entry("2025-12-25", "A", [it("k1", [20, 18]), it("n1", [35, 30])]),
  entry("2026-02-13", "B", [it("fw_pull_up", [6, 5]), it("row1", [12, 10])]), // a Friday the 13th
  entry("2026-11-02", null, [it("fw_dumbbell_bench_press", [10, 10, 10, 10], [25, 25, 25, 25]), it("fw_goblet_squat", [12, 12, 12], [20, 20, 20], { note: "felt strong" })], { plan: { id: "pA", name: "Workout Plan 1", wd: 1 } }),
];
const h = await start({ viewport: { width: 360, height: 760 }, clock: new Date(2026, 10, 7, 12).getTime(), seed: { history: hist, profile: { name: "Michael" }, kcal: { sex: "m", weight: 80, height: 180 } } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(600);
await p.click('[data-pf-tab="1"]'); await p.waitForTimeout(900);
const tier = k => p.getAttribute(`[data-ach-row="${k}"]`, "data-tier");
T.eq(await tier("variety"), "2", "Variety: 6 different exercises = level 2 (3, 5, …)");
T.eq(await tier("sets"), "0", "Sets: 15 sets, the first level is 25");
T.eq(await tier("lifted"), "1", "Weight lifted: 4×10×25 + 3×12×20 = 1720 kg = level 1 (500)");
T.eq(await tier("plans"), "1", "My plans: one workout from an own plan");
T.eq(await tier("squats"), "3", "Squats in a set: 35 = level 3");
T.eq(await tier("pullups"), "3", "Pull-ups in a set: 6 = level 3");
T.ok(Number(await tier("ton")) > 0, "A ton: 1720 kg in one workout");
T.ok(Number(await tier("notes")) > 0, "Dear diary: a note in a workout");
T.eq(await tier("bigDay"), "0", "Big day: not 500 reps");
T.eq(await tier("allBody"), "0", "Whole body: not every part yet");
T.ok(Number(await tier("xmas")) > 0, "secret Christmas spirit: trained on Dec 25");
T.ok(Number(await tier("friday13")) > 0, "secret Lucky 13: trained on Friday 13th");
T.eq(await p.locator('[data-ach-row="leap"]').count(), 0, "secret Leap day stays hidden until earned");
await p.locator('[data-ach-row="lifted"]').scrollIntoViewIfNeeded(); await shot(p, "badges190");
await p.click('[data-ach-row="lifted"]'); await p.waitForTimeout(400);
T.ok(/kg/.test(await p.textContent("[data-badge-sheet]")), "the badge sheet speaks kilograms");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
