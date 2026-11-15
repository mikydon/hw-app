// Guide chapter 10 (Workout plans), 1.9.3: Recommended → My plans → My week → New plan; with a plan the guide opens it
// and walks the editor (days in my week, exercises, tips) without changing anything; without plans those steps are
// skipped. People who saw chapter 10 before 1.9.3 get it once more on their next visit to Plans.
import { start, T, shot } from "./harness.mjs";
const bubble = async p => { await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(500); return p.locator("[data-tour-bubble]").innerText(); };
const openCh10 = async p => {
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
  await p.click("[data-tour-open]"); await p.waitForTimeout(400);
  T.ok(await p.locator('[data-tour-ch="10"]').count() === 1, "chapter 10 in the guide list");
  await p.click('[data-tour-ch="10"]');
};
const intro = async p => {
  T.ok((await bubble(p)).includes("Tap Recommended"), "step 1: tap Recommended");
  await p.click('[data-plans-seg="rec"]', { force: true });
  T.ok((await bubble(p)).includes("recommended plan"), "step 2: the recommended plan");
  await p.click("[data-tour-next]");
  T.ok((await bubble(p)).includes("Tap My plans"), "step 3: tap My plans");
  await p.click('[data-plans-seg="mine"]', { force: true });
  T.ok((await bubble(p)).includes("My week: tap a day"), "step 4: My week");
  T.ok(await p.locator("[data-plan-week]").isVisible(), "My week is on screen");
  await p.click("[data-tour-next]");
  T.ok((await bubble(p)).includes("New plan makes a new workout"), "step 5: New plan (real button name)");
};

// ─── no plans: the editor steps are skipped ───
{
  const h = await start({ seed: { tour: true, profile: { tourDone: [1] } } });
  const p = h.page;
  await openCh10(p);
  await intro(p);
  await p.click("[data-tour-next]"); await p.waitForTimeout(700);
  { const bt = await bubble(p); T.ok(bt.includes("The Library"), "no plans: the editor steps are skipped, then the Library (1.10.0): " + bt); }
  await p.click("[data-tour-next]"); await p.waitForTimeout(700);
  { const bt = await bubble(p); T.ok(bt.includes("No week set"), "then the last bubble: " + bt); }
  T.eq(await p.locator("[data-plan-card]").count(), 0, "the guide made no plan");
  await p.click("[data-tour-next]"); await p.waitForTimeout(600);
  const done = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).tourDone);
  T.ok(done.includes(10), "chapter 10 saved as done");
  T.eq(h.errors, [], "no page errors (no plans)");
  await h.close();
}

// ─── with a plan: open it and walk the editor ───
const plan = { id: "pA", n: 1, name: "Push day", grp: null, ts: 1, mts: 1, items: [{ id: "k1", sets: 3 }, { id: "b5", sets: 2 }], days: { 1: [{ id: "k1", sets: 3 }, { id: "b5", sets: 2 }] }, ds: "" };
const plans = { v: 2, list: [plan], groups: [], seq: 1, del: {}, week: { 1: "pA" }, wmts: 1, sort: "date", dir: "desc" };
{
  const h = await start({ seed: { tour: true, profile: { tourDone: [1], plans } } });
  const p = h.page;
  const before = await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).plans.list));
  await openCh10(p);
  await intro(p);
  await p.click("[data-tour-next]"); await p.waitForTimeout(500);
  { const bt = await bubble(p); T.ok(bt.includes("Search your plans here"), "1.10.0: the filter bubble: " + bt); }
  await p.click("[data-tour-next]"); await p.waitForTimeout(500);
  { const bt = await bubble(p); T.ok(bt.includes("Tap a plan to open it"), "step 6: tap a plan: " + bt); }
  await p.click('[data-plan-card="pA"]', { force: true });
  T.ok((await bubble(p)).includes("Days in my week: tap the days you train this plan; they light up"), "step 7: days in my week");
  T.ok(await p.locator("[data-plan-editor]").count() === 1, "the editor is open");
  await shot(p, "tour10_days");
  await p.click("[data-tour-next]");
  T.ok((await bubble(p)).includes("Exercises: add them"), "step 8: exercises");
  await p.click("[data-tour-next]");
  T.ok((await bubble(p)).includes("The bulb gives tips"), "step 9: tips");
  await shot(p, "tour10_tips");
  await p.click("[data-tour-next]"); await p.waitForTimeout(500);
  T.ok((await bubble(p)).includes("show the plan on your profile"), "1.10.0: share / publish");
  await p.click("[data-tour-next]"); await p.waitForTimeout(800);
  T.ok((await bubble(p)).includes("The Library"), "1.10.0: the Library");
  await p.click("[data-tour-next]"); await p.waitForTimeout(700);
  T.ok((await bubble(p)).includes("No week set"), "last bubble");
  await p.click("[data-tour-next]"); await p.waitForTimeout(600);
  const after = await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).plans.list.map(x => ({ ...x }))));
  T.eq(JSON.parse(after).map(x => [x.id, x.name, x.items]), JSON.parse(before).map(x => [x.id, x.name, x.items]), "the guide changed nothing in the plan");
  T.eq(h.errors, [], "no page errors (with a plan)");
  await h.close();
}

// ─── saw chapter 10 before 1.9.3: it shows once more on the next visit to Plans, then never again ───
{
  const h = await start({ seed: { tour: true, profile: { tourDone: [1, 2, 4, 5, 6, 7, 8, 9, 10] } } });
  const p = h.page;
  await p.waitForTimeout(800);
  const ui = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-ui")));
  // (1.10.0 marks 4, 5, 7, 9 and 10 to show again too: tour110_test; 2, 6 and 8 stay seen)
  T.ok(ui.tourPl3 === 1 && Array.isArray(ui.tourAuto) && !ui.tourAuto.includes(10) && ui.tourAuto.includes(6), "chapter 10 marked to show again, unchanged ones not");
  await p.click("[data-menu-btn]"); await p.click('[data-nav-box] [data-screen="plans"]');
  T.ok((await bubble(p)).includes("Tap Recommended"), "visiting Plans starts the new chapter 10");
  await p.click("[data-tour-skip], [data-tour-bubble] button >> text=Skip the guide").catch(() => {});
  await p.reload(); await p.waitForTimeout(1000);
  const ui2 = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-ui")));
  T.eq(ui2.tourPl3, 1, "the one-time mark stays (no second repeat)");
  T.eq(h.errors, [], "no page errors (repeat once)");
  await h.close();
}
T.done();
