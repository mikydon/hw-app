// 1.10.0: History (chapter 5) and Shop (chapter 9) changed, so people who already saw those chapters get them once
// more on their next visit to that screen (one-time mark `tour110`, merged with the 1.9.3 mark `tourPl3`).
import { start, T } from "./harness.mjs";
const bubble = async p => { await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(500); return p.locator("[data-tour-bubble]").innerText(); };
const ui = p => p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-ui") || "{}"));
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(400); await p.click(`[data-nav-box] [data-screen="${s}"]`); };
const skip = async p => { await p.click("[data-tour-skip], [data-tour-bubble] button >> text=Skip the guide").catch(() => {}); await p.waitForTimeout(500); };

// ─── saw every chapter before 1.9.3: 5, 9 and 10 come back once each ───
{
  const h = await start({ seed: { tour: true, profile: { tourDone: [1, 2, 4, 5, 6, 7, 8, 9, 10] } } });
  const p = h.page;
  await p.waitForTimeout(800);
  const u = await ui(p);
  T.ok(u.tour110 === 1 && u.tourPl3 === 1, "both one-time marks set");
  T.ok(Array.isArray(u.tourAuto) && ![5, 7, 9, 10].some(c => u.tourAuto.includes(c)) && u.tourAuto.includes(4), "chapters 5, 7, 9 and 10 marked to show again, the others not");
  await go(p, "history");
  T.ok((await bubble(p)).includes("a green day is a workout"), "visiting History starts the new chapter 5");
  await skip(p);
  await p.reload(); await p.waitForTimeout(1000);
  const u2 = await ui(p);
  T.eq(u2.tour110, 1, "the mark stays after a reload (no second repeat)");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}

// ─── a 1.9.3+ user (tourPl3 already set, saw everything): only 5 and 9 come back, 10 does not ───
{
  const h = await start({ seed: { tour: true, profile: { tourDone: [1, 2, 4, 5, 6, 7, 8, 9, 10] }, ui: { tourPl3: 1, tourAuto: [1, 2, 4, 5, 6, 7, 8, 9, 10] } } });
  const p = h.page;
  await p.waitForTimeout(800);
  const u = await ui(p);
  T.ok(u.tour110 === 1, "1.10 mark set");
  T.ok(!u.tourAuto.includes(5) && !u.tourAuto.includes(7) && !u.tourAuto.includes(9) && u.tourAuto.includes(10) && u.tourAuto.includes(8), "only 5, 7 and 9 dropped; 10 stays seen");
  await go(p, "shop");
  T.ok((await bubble(p)).includes("Diamonds: you earn them"), "visiting the Shop starts the new chapter 9");
  await skip(p);
  await go(p, "plans"); await p.waitForTimeout(1500);
  T.eq(await p.locator("[data-tour-bubble]").count(), 0, "Workout plans does not start chapter 10 again");
  T.eq(h.errors, [], "no page errors (1.9.3+ user)");
  await h.close();
}

// ─── never saw those chapters: nothing is dropped, nothing changes ───
{
  const h = await start({ seed: { tour: true, profile: { tourDone: [1, 2] } } });
  const p = h.page;
  await p.waitForTimeout(800);
  const u = await ui(p);
  T.ok(u.tour110 === 1 && u.tourAuto === undefined, "marks set, the seen list untouched");
  T.eq(h.errors, [], "no page errors (new to the guide)");
  await h.close();
}
T.done();
