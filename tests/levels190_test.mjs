// 1.9.0 weight levels (Michael, Nov 6): rep range per exercise, a bar that fills with the reps, "level done" at the
// top + 1 → the next time (and the next set) starts heavier; the first time a starting weight is estimated from body
// weight and activity (free weights) or the first set decides (machines).
import { start, T, shot, entry } from "./harness.mjs";
const day = items => ({ id: "pA", n: 1, name: "", grp: null, ts: 1, mts: 1, days: { 3: items } });
const seed = (items, hist) => ({ clock: new Date(2026, 10, 4, 18).getTime(), seed: { history: hist || [], kcal: { sex: "m", weight: 80, height: 180, activity: "light" }, profile: { plans: { list: [day(items)], groups: [], seq: 1, del: {}, active: "pA" } } } });
// 1) last time 16 kg × 13 goblet squats (range 8–12): level done → starts at 18 kg
let h = await start(seed([{ id: "fw_goblet_squat", sets: 2 }], [entry("2026-11-02", null, [{ id: "fw_goblet_squat", name: "Goblet squat", unit: "", res: [13, 11], kg: [16, 16] }], { plan: { id: "pA", name: "Workout Plan 1", wd: 1 } })]));
let p = h.page;
await p.click("[data-fstart-go]"); await p.click("[data-warmup-go]");
T.eq(await p.getAttribute("[data-kg]", "data-kg"), "18", "level done last time → next level 18 kg");
T.ok((await p.locator("[data-goal-kg]").innerText()).includes("New level 18 kg: 8–12 reps"), "goal says new level");
T.ok(await p.locator("[data-level-bar]").count() === 1, "level bar shown");
T.eq(await p.getAttribute("[data-level-bar]", "data-level"), "in", "13 reps at 18 kg starts inside the range");
for (let i = 0; i < 1; i++) await p.click('[aria-label="More"]');
await shot(p, "level_bar");
// set 1: 7 reps → too heavy line, set 2 lighter
await p.click("[data-reps]"); await p.fill("[data-reps-input]", "7"); await p.keyboard.press("Enter");
T.eq(await p.getAttribute("[data-level-bar]", "data-level"), "low", "7 reps = under the range");
await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
const k2 = Number(await p.getAttribute("[data-kg]", "data-kg"));
T.ok(k2 < 18 && k2 >= 14, "after an under-range set the next set suggests a lighter weight (" + k2 + " kg)");
T.eq(h.errors, [], "no page errors (1)"); await h.close();
// 2) first time, free weight: estimate from body weight + activity; machine: no estimate
h = await start(seed([{ id: "fw_dumbbell_bench_press", sets: 2 }, { id: "mc_leg_press", sets: 1 }]));
p = h.page;
await p.click("[data-fstart-go]"); await p.click("[data-warmup-go]");
const est = Number(await p.getAttribute("[data-kg]", "data-kg"));
T.ok(est >= 8 && est <= 16, "first-time dumbbell bench estimate for 80 kg, light activity: " + est + " kg per dumbbell");
T.ok((await p.locator("[data-kg-start]").innerText()).includes("estimated"), "explains the estimate");
// 16 reps at the estimate → level done → set 2 starts heavier
await p.click("[data-reps]"); await p.fill("[data-reps-input]", "16"); await p.keyboard.press("Enter");
T.eq(await p.getAttribute("[data-level-bar]", "data-level"), "up", "16 reps: level done");
await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
T.ok(Number(await p.getAttribute("[data-kg]", "data-kg")) > est, "set 2 starts heavier");
await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
T.ok((await p.locator("[data-kg-start]").innerText()).includes("Machines differ"), "machine: the first set decides");
T.eq(await p.getAttribute("[data-kg]", "data-kg"), "0", "machine starts at 0");
T.eq(h.errors, [], "no page errors (2)"); await h.close();
T.done();
