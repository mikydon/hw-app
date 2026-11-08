// Plans screen (1.9.2: a plan = one workout, My week gives each weekday a plan): recommended tab, new plan numbering,
// editor (exercises, sets, own hold time, the plan's days), the week card, groups, sorting, delete, persistence;
// then Home: today's plan, a rest day, the Start picker (last done green), and a week without plans → recommended.
import { start, T, shot, entry } from "./harness.mjs";
const h = await start({ clock: new Date(2026, 10, 4, 10, 0).getTime() }); // Wednesday
const p = h.page;
const go = async scr => { await p.click("[data-menu-btn]"); await p.click(`[data-nav-box] [data-screen="${scr}"]`); await p.waitForTimeout(500); };
await go("plans");
T.ok(await p.locator("[data-plans]").count() === 1, "plans screen opens from the menu");
T.ok(await p.locator("[data-plan-rec] [data-plan-inuse]").count() === 1, "recommended plan is in use by default");
await shot(p, "plans_rec");
await p.click('[data-plans-seg="mine"]');
T.ok(await p.locator("[data-plans-empty]").isVisible(), "empty list text");
T.ok(await p.locator("[data-week-none]").isVisible(), "week: make a plan first");
await p.click("[data-plan-new]");
T.ok(await p.locator("[data-plan-editor]").count() === 1, "new plan opens the editor");
T.eq(await p.getAttribute("[data-plan-name]", "placeholder"), "Workout Plan 1", "default name Workout Plan 1");
T.ok(await p.locator('[data-plan-day="1"]').isDisabled(), "no days before it has exercises");
await p.click("[data-plan-add]");
await p.fill("[data-lib-search]", "press-up");
T.ok(await p.locator('[data-lib-row="k1"] [data-lib-aka]').count() === 1, "alias search shows the matched alias");
await p.click('[data-lib-pick="k1"]');
await p.fill("[data-lib-search]", "plank");
await p.click('[data-lib-pick="b5"]');
await p.fill("[data-lib-search]", "leg press");
T.ok(await p.locator("[data-lib-more]").count() === 1, "machines hidden by default, 'more' button shown");
await p.click("[data-lib-more]");
await p.click('[data-lib-pick="mc_leg_press"]');
await p.locator(".sheetBox button[aria-label]").first().click();
await p.waitForTimeout(400);
T.eq(await p.locator("[data-plan-item]").count(), 3, "three exercises");
await p.click('[data-plan-item="k1"] [data-step="sets+"]');
T.eq(await p.getAttribute('[data-plan-item="k1"] [data-plan-sets]', "data-plan-sets"), "4", "sets 3 → 4");
await p.click('[data-plan-item="b5"] [data-step="dur+"]');
T.eq(await p.getAttribute('[data-plan-item="b5"] [data-plan-dur]', "data-own"), "1", "own hold time set");
await p.click('[data-plan-item="b5"] [data-plan-dur-reset]');
T.eq(await p.getAttribute('[data-plan-item="b5"] [data-plan-dur]', "data-own"), "0", "reset brings the recommended time back");
await p.click('[data-plan-down="k1"]');
T.eq(await p.locator("[data-plan-item]").evaluateAll(n => n.map(x => x.dataset.planItem)), ["b5", "k1", "mc_leg_press"], "move down");
await p.fill("[data-plan-name]", "Push day");
// the plan's days: Mon, Wed, Fri
for (const d of [1, 3, 5]) await p.click(`[data-plan-day="${d}"]`);
T.eq(await p.locator('[data-plan-day][data-on="1"]').evaluateAll(n => n.map(x => x.dataset.planDay)), ["1", "3", "5"], "Mon, Wed, Fri picked");
await p.click('[data-plan-day="5"]');
T.eq(await p.getAttribute('[data-plan-day="5"]', "data-on"), "0", "tap again = rest day");
await shot(p, "plans_editor");
await p.click("[data-plan-tips]");
T.ok(await p.locator('[data-plan-hints] [data-hint="rest"]').count() === 1, "rest-in-a-row warning (Wed → Mon)");
await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(300);
await p.click("[data-plan-back]");
T.eq(await p.getAttribute('[data-week-row="1"]', "data-week-plan") !== "", true, "week: Monday has the plan");
T.eq(await p.getAttribute('[data-week-row="2"]', "data-week-plan"), "", "week: Tuesday is a rest day");
T.ok(await p.locator("[data-week-rest]").count() === 1, "week warns about rest days in a row");
// second plan, put on Tuesday and Thursday from the week card
await p.click("[data-plan-new]");
await p.click("[data-plan-add]"); await p.fill("[data-lib-search]", "squat"); await p.locator("[data-lib-pick]").first().click();
await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(300);
await p.fill("[data-plan-name]", "Legs");
await p.click('[data-plan-day="3"]');
T.eq(await p.getAttribute('[data-plan-day="1"]', "data-other"), "1", "Monday belongs to another plan (dot)");
await p.click("[data-plan-back]");
T.ok((await p.locator('[data-week-row="3"]').innerText()).includes("Legs"), "Wednesday moved to Legs");
await p.click('[data-week-row="4"]');
T.ok(await p.locator("[data-week-sheet]").isVisible(), "a weekday opens the plan choice");
await p.locator("[data-week-pick]").filter({ hasText: "Legs" }).click(); await p.waitForTimeout(300);
T.ok((await p.locator('[data-week-row="4"]').innerText()).includes("Legs"), "Thursday = Legs");
await shot(p, "plans_week");
// third plan, delete it, the next is 4 (numbers never reused)
await p.click("[data-plan-new]"); await p.click("[data-plan-back]");
T.eq(await p.locator("[data-plan-card]").count(), 3, "3 plans");
await p.locator("[data-plan-card]").filter({ hasText: "Workout Plan 3" }).click(); await p.click("[data-plan-del]"); await p.click("[data-plan-del-yes]");
T.eq(await p.locator("[data-plan-card]").count(), 2, "deleted one");
await p.click("[data-plan-new]"); T.eq(await p.getAttribute("[data-plan-name]", "placeholder"), "Workout Plan 4", "numbers not reused: 4"); await p.click("[data-plan-back]");
// groups + sorting
await p.click("[data-plan-newgrp]"); await p.fill("[data-plan-grp-input]", "Gym"); await p.click("[data-plan-grp-save]");
T.ok(await p.locator('[data-plan-grp][aria-pressed="true"]').innerText() === "Gym", "new group selected");
T.eq(await p.locator("[data-plan-card]").count(), 0, "no plan in Gym yet");
await p.click("[data-plan-new]"); T.ok(await p.locator('[data-plan-setgrp][aria-pressed="true"]').innerText() === "Gym", "new plan made in the group"); await p.click("[data-plan-back]");
await p.click('[data-plan-grp=""]');
await p.click("[data-plan-sort]");
const byName = await p.locator("[data-plan-card]").allInnerTexts();
T.ok(byName[0].includes("Workout Plan 5"), "name desc: Workout Plan 5 first");
await p.click('[data-plan-grp=""]');
// stored: v2, week, and the mirror for 1.9.x phones (Push day on Monday only)
const st = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).plans);
const push = st.list.find(x => x.name === "Push day"), legs = st.list.find(x => x.name === "Legs");
T.eq([st.v, st.week[1], st.week[3], st.week[4]], [2, push.id, legs.id, legs.id], "stored week");
T.eq(Object.keys(push.days), ["1"], "mirror: Push day shows on Monday for 1.9.x phones");
T.eq(Object.keys(legs.days), ["3", "4"], "mirror: Legs on Wednesday and Thursday");
await p.reload(); await p.waitForTimeout(800);
await go("plans");
T.eq(await p.locator("[data-plan-card]").count(), 4, "plans kept after reload");

// ─── Home with the week (today = Wednesday = Legs) ───
await go("train");
T.ok((await p.locator("[data-home-next]").innerText()).includes("Legs"), "Home: today's plan");
T.ok((await p.getAttribute("[data-fstart-go]", "data-start")) !== null, "Start bar");
T.ok((await p.locator("[data-fstart-go]").innerText()).length > 0, "Start label");
await p.click('[data-week-day="2026-11-07"]'); // Saturday: rest day
T.ok((await p.locator("[data-home-next]").innerText()).toLowerCase().includes("rest"), "Saturday = rest day");
await p.click("[data-fstart-go]");
T.ok(await p.locator("[data-start-picker]").isVisible(), "rest day: Start opens the picker");
T.eq(await p.locator("[data-pick-plan]").count(), 2, "plans with exercises are offered (Legs, Push day)");
T.eq(await p.getAttribute("[data-pick-plan] >> nth=0", "data-pick-today"), "1", "today's plan first");
T.ok(await p.locator("[data-pick-rec-rounds]").count() === 2, "recommended with 19 / 13 min");
T.ok(await p.locator("[data-pick-free]").count() === 1, "free workout");
T.eq(await p.locator("[data-pick-last]").count(), 0, "nothing done yet: nothing green");
await shot(p, "start_picker");
await p.locator("[data-pick-plan]").filter({ hasText: "Push day" }).click();
T.ok(await p.locator("[data-warmup-go]").isVisible(), "picking a plan starts it");
T.eq(h.errors, [], "no page errors");
await h.close();

// ─── plans but no week: Start opens the picker; the last done is green ───
{
  const plan = { id: "pX", n: 1, name: "Arms", grp: null, ts: 1, mts: 1, items: [{ id: "k1", sets: 2 }], days: {}, ds: "{}" };
  const hist = [entry("2026-11-02", "A", [{ id: "k1", name: "k1", unit: "", res: [10, 10] }]), entry("2026-11-03", null, [{ id: "k1", name: "k1", unit: "", res: [12, 12] }], { plan: { id: "pX", name: "Arms", wd: 2 } })];
  const g = await start({ clock: new Date(2026, 10, 4, 10, 0).getTime(), seed: { history: hist, profile: { plans: { v: 2, list: [plan], groups: [], seq: 1, del: {}, week: {}, wmts: 0, sort: "date", dir: "desc" } } } });
  const q = g.page;
  T.ok(await q.locator("[data-day-picker='hero']").count() === 1, "no week: Home shows the recommended A/B/C");
  await q.click("[data-fstart-go]");
  T.ok(await q.locator("[data-start-picker]").isVisible(), "plans but no week: Start opens the picker");
  T.eq(await q.getAttribute("[data-pick-last]", "data-pick-last") !== null && await q.locator("[data-pick-plan='pX'] [data-pick-last]").count(), 1, "yesterday's plan is green");
  await q.click('[data-pick-rec-rounds="2"]');
  T.ok(await q.locator("[data-warmup-go]").isVisible(), "recommended from the picker starts");
  T.eq(g.errors, [], "no page errors (no week)");
  await g.close();
}
// ─── no plans at all: everything as before ───
{
  const g = await start({ clock: new Date(2026, 10, 4, 10, 0).getTime() });
  T.ok(await g.page.locator("[data-fround]").count() === 2, "no plans: the 19 / 13 min squares as before");
  T.eq(await g.page.locator("[data-home-other]").count(), 0, "no 'train something else' without plans");
  await g.close();
}
T.done();
