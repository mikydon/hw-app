// 1.9.3 guide gaps from 1.9.0: Home chapter shows the menu order pencil; the workout chapter explains the kg field
// (weighted exercises only), notes and adding an exercise during a workout. Nothing in the workout changes by the guide.
import { start, T, shot } from "./harness.mjs";
const clock = new Date(2026, 10, 4, 10, 0).getTime(); // Wednesday
const bubble = async p => { await p.waitForSelector("[data-tour-bubble]", { timeout: 9000 }); await p.waitForTimeout(600); return p.locator("[data-tour-bubble]").innerText(); };

// ─── Home chapter: the last bubbles are the menu and the pencil ───
{
  const h = await start({ clock, seed: { tour: true, profile: { tourDone: [2, 4, 5, 6, 7, 8, 9, 10] } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
  await p.click("[data-tour-open]"); await p.waitForTimeout(400);
  await p.click('[data-tour-ch="1"]');
  let saw = false;
  for (let i = 0; i < 14; i++) {
    const t = await bubble(p);
    if (t.includes("Tap here to see today's exercises")) { await p.click('[data-home-tab="1"]', { force: true }); continue; }
    if (t.includes("Everything else is in the menu")) { await p.click("[data-menu-btn]", { force: true }); continue; }
    if (t.includes("The pencil changes the order")) {
      saw = true;
      T.ok(await p.locator("[data-nav-pencil]").isVisible(), "the menu stays open on the pencil step");
      await shot(p, "tour193_pencil");
      await p.click("[data-tour-next]");
      T.ok((await bubble(p)).includes("That's Home"), "then the last bubble");
      break;
    }
    await p.click("[data-tour-next]");
  }
  T.ok(saw, "Home chapter: pencil bubble");
  T.eq(h.errors, [], "no page errors (home)");
  await h.close();
}

// ─── workout chapter with a weighted exercise from today's plan ───
{
  const plan = { id: "pW", n: 1, name: "Gym", grp: null, ts: 1, mts: 1, items: [{ id: "fw_dumbbell_bench_press", sets: 2 }, { id: "k1", sets: 2 }], days: {}, ds: "" };
  const plans = { v: 2, list: [plan], groups: [], seq: 1, del: {}, week: { 3: "pW" }, wmts: 1, sort: "date", dir: "desc" };
  const h = await start({ clock, seed: { tour: true, ui: { tour3: true }, profile: { tourDone: [1], plans }, kcal: { sex: "m", weight: 80, height: 180, activity: "light" } } });
  const p = h.page;
  await p.click("[data-fstart-go]");
  const seen = [];
  for (let i = 0; i < 16; i++) {
    const t = await bubble(p);
    seen.push(t);
    if (t.includes("When you're warmed up, tap here")) { await p.click("[data-warmup-go]", { force: true }); continue; }
    if (t.includes("When you finish a set, tap here")) { await p.click("[data-done-btn]", { force: true }); continue; }
    if (t.includes("With weights, set the kg here")) await shot(p, "tour193_kg");
    if (t.includes("Notes: write how it went")) await shot(p, "tour193_note");
    const last = t.includes("Good luck");
    await p.click("[data-tour-next]");
    if (last) break;
  }
  const all = seen.join("\n---\n");
  T.ok(all.includes("With weights, set the kg here"), "kg bubble on a weighted exercise");
  T.ok(all.includes("Notes: write how it went"), "notes bubble");
  T.ok(all.includes("Not tired yet? Add another exercise here"), "add-exercise bubble");
  T.ok(all.indexOf("Rest: 30 s") < all.indexOf("Notes: write") && all.indexOf("Notes: write") < all.indexOf("Not tired yet"), "order: rest, notes, add exercise");
  T.ok(all.includes("Good luck"), "chapter ends");
  const sess = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).session);
  T.ok(sess && !Object.values(sess.notes || {}).some(Boolean) && !(sess.extra || []).length, "the guide wrote no note and added no exercise");
  T.eq(h.errors, [], "no page errors (workout)");
  await h.close();
}

// ─── workout chapter on the recommended A/B/C: no kg bubble ───
{
  const h = await start({ clock, seed: { tour: true, ui: { tour3: true }, profile: { tourDone: [1] } } });
  const p = h.page;
  await p.click('[data-fround="3"], [data-fstart-go]');
  if (await p.locator("[data-warmup-go]").count() === 0) await p.click("[data-fstart-go]").catch(() => {});
  const seen = [];
  for (let i = 0; i < 16; i++) {
    const t = await bubble(p);
    seen.push(t);
    if (t.includes("When you're warmed up, tap here")) { await p.click("[data-warmup-go]", { force: true }); continue; }
    if (t.includes("When you finish a set, tap here")) { await p.click("[data-done-btn]", { force: true }); continue; }
    const last = t.includes("Good luck");
    await p.click("[data-tour-next]");
    if (last) break;
  }
  const all = seen.join("\n");
  T.ok(!all.includes("With weights, set the kg here"), "no kg bubble without weights");
  T.ok(all.includes("Notes: write how it went") && all.includes("Not tired yet?"), "notes + add exercise also on A/B/C");
  T.eq(h.errors, [], "no page errors (A/B/C)");
  await h.close();
}
T.done();
