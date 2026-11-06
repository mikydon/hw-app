// 1.9.0 workout from an own plan: Home offers today's weekday, weights (kg × reps), a hold with the plan's own time,
// a carry, the rest that counts into minus and saves the real rest, adding an exercise mid-workout, the long-rest
// question, the history entry (plan name copy, kg arrays, rests), records with weights, and the XP limit.
import { start, T, shot, entry } from "./harness.mjs";
const now = new Date(2026, 10, 4, 18, 0).getTime(); // Wednesday
const plan = { id: "pA", n: 3, name: "", grp: "gG", ts: 1, mts: 1, days: { 3: [{ id: "fw_dumbbell_bench_press", sets: 2 }, { id: "b5", sets: 1, dur: 20 }, { id: "fw_farmer_s_carry", sets: 1 }], 5: [{ id: "k1", sets: 2 }] } };
const hist = [entry("2026-11-02", null, [{ id: "fw_dumbbell_bench_press", name: "Dumbbell bench press", unit: "", res: [8, 8], kg: [20, 20] }], { plan: { id: "pA", name: "Workout Plan 3", grp: "Gym", wd: 1 }, day: null })];
const h = await start({ clock: now, seed: { history: hist, profile: { plans: { list: [plan], groups: [{ id: "gG", name: "Gym", ts: 1, mts: 1 }], seq: 3, del: {}, active: "pA", sort: "date", dir: "desc" } }, kcal: { sex: "m", weight: 80, height: 180, activity: "light" } } });
const p = h.page;
T.ok(await p.locator("[data-home-plan]").count() === 1, "Home shows the plan in use");
T.eq(await p.getAttribute("[data-day-title]", "data-plan-wd"), "3", "offers today (Wednesday)");
T.ok((await p.locator("[data-home-plan-name]").innerText()).includes("WORKOUT PLAN 3 · GYM") || (await p.locator("[data-home-plan-name]").innerText()).toLowerCase().includes("workout plan 3 · gym"), "plan name + group");
T.ok(Number(await p.getAttribute("[data-fstart-mins]", "data-fstart-mins")) > 3, "minutes estimated from the plan");
await shot(p, "home_plan");
await p.click('[data-home-wd="2"]'); T.ok(await p.locator("[data-plan-rest-home]").count() === 1, "Tuesday = rest day");
await p.click('[data-home-wd="3"]');
await p.click("[data-fstart-go]");
await p.click("[data-warmup-go]");
// set 1: bench press, starts at last time's 20 kg × 8
T.eq(await p.getAttribute("[data-kg]", "data-kg"), "20", "weight starts at last time's");
T.ok((await p.locator("[data-goal-kg]").innerText()).includes("20 kg × 9"), "goal: one more rep at the same weight");
await p.click("[data-kg-plus]");
T.eq(await p.getAttribute("[data-kg]", "data-kg"), "21", "+1 kg for dumbbells");
await p.click("[data-done-btn]");
// a note during the rest: belongs to the rest by default, a second one to the exercise
await p.click("[data-note-open]"); await p.fill("[data-note-text]", "left shoulder tight");
await p.click('[data-note-target="ex:fw_dumbbell_bench_press"]'); await p.fill("[data-note-text]", "felt strong");
await p.click("[data-note-close]");
// rest: 90 s for weights, + buttons, count into minus
T.ok(await p.locator("[data-rest-line]").count() === 1, "rest explains itself");
T.ok(await p.locator("[data-rest-web]").count() === 1, "website line about the screen-off beep");
const l0 = Number(await p.getAttribute("[data-rest-timer]", "data-rest-left"));
T.ok(l0 >= 89 && l0 <= 90, "weights rest 90 s");
await p.click('[data-rest-add="30"]'); await p.waitForTimeout(300);
T.ok(Number(await p.getAttribute("[data-rest-timer]", "data-rest-left")) >= 118, "+30 s");
await p.clock.runFor(135 * 1000);
T.ok(await p.locator("[data-rest-over]").count() === 1, "counts into minus after 0");
T.ok(await p.locator('[data-mini], [data-work]').count() === 0, "did not move on by itself");
await p.click("[data-rest-ready]");
// set 2 (kept the 21 kg from set 1)
T.eq(await p.getAttribute("[data-kg]", "data-kg"), "20", "set 2 starts at last time's set-2 weight");
await p.click("[data-done-btn]");
await p.click("[data-rest-ready]");
// plank with the plan's own 20 s
T.ok(await p.locator('[data-dur="20"][aria-pressed="true"]').count() === 1 || (await p.locator("text=20").count()) > 0, "hold uses the plan's own time");
// add an exercise during the workout
await p.click("[data-add-extra]");
await p.fill("[data-lib-search]", "calf raise");
await p.click('[data-lib-pick="bw_calf_raise"]');
await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(400);
await p.locator("text=Start").last().click();
await p.clock.runFor(5500); await p.clock.runFor(21000);
// rest after the plank; then wait 11 minutes to get the long-rest question
await p.clock.runFor(11 * 60 * 1000);
await p.click("[data-rest-ready]");
T.ok(await p.locator("[data-confirm]").count() === 1, "long break asks whether to count it");
await p.click("[data-confirm-no]");
// carry: weight + time
T.ok(await p.locator("[data-kg-field]").count() === 1, "carry has a weight");
await p.click("[data-kg-plus]"); await p.click("[data-kg-plus]");
await p.locator("text=Start").last().click();
await p.clock.runFor(5500); await p.clock.runFor(31000);
await p.click("[data-rest-ready]");
// 3 sets of the added calf raise
for (let i = 0; i < 3; i++) { await p.click("[data-done-btn]"); if (i < 2) await p.click("[data-rest-ready]"); }
await p.click("[data-cool-finish]");
await p.waitForTimeout(500);
await shot(p, "summary_plan");
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history.slice(-1)[0]);
T.eq(saved.plan && saved.plan.name, "Workout Plan 3", "history keeps the plan name");
T.eq(saved.plan && saved.plan.grp, "Gym", "and the group name");
T.eq(saved.plan && saved.plan.wd, 3, "and the weekday");
const bench = saved.items.find(x => x.id === "fw_dumbbell_bench_press");
T.eq(bench.kg, [21, 20], "kg per set saved");
T.eq(bench.note, "felt strong", "exercise note saved"); T.eq(bench.rn, ["left shoulder tight", null], "rest note saved with the rest after set 1");
T.ok(saved.prs.includes("fw_dumbbell_bench_press"), "21 kg × 8 beats 20 kg × 8: record");
T.ok(saved.items.find(x => x.id === "bw_calf_raise").x === 1, "added exercise marked");
T.ok(saved.rests && saved.rests.fw_dumbbell_bench_press && saved.rests.fw_dumbbell_bench_press[0] >= 130 && saved.rests.b5[0] === 60, "real rest saved (135 s waited); a long break left out saves the recommended 60 s: " + JSON.stringify(saved.rests));
T.ok(saved.dur < 11 * 60, "long break not counted in the time (" + saved.dur + " s)");
const carry = saved.items.find(x => x.id === "fw_farmer_s_carry");
T.ok(carry && carry.kg && carry.kg[0] === 2 && /s$/.test(carry.res[0]), "carry saved as kg + seconds");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
