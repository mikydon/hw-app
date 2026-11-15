// 1.10.1 (Michael, Nov 15, after 1.10.0 went out: "on Workout plans the guide only dims the screen, nothing shows and
// nothing can be tapped"): the guide can never lock the app. A step that breaks is skipped, a step that hangs is skipped
// by the watchdog after 8 s, between steps a Skip button shows after 3 s (and Android back skips then), the bubble
// always lands on the screen.
import { start, T, entry } from "./harness.mjs";
const P = (id, n, ts, items) => ({ id, n, name: "", grp: null, ts, mts: ts, items, days: {}, ds: "{}" });
const plans = { v: 2, list: [P("pA", 1, 1e12, [{ id: "k1", sets: 3 }])], groups: [], seq: 1, del: {}, week: { 1: "pA" }, wmts: 1, sort: "date", dir: "asc" };
const seed = { tour: true, profile: { name: "M", plans, tourDone: [1, 2, 4, 5, 6, 7, 8, 9, 10] }, ui: { tourPl3: 1, tourAuto: [1, 2, 4, 5, 6, 7, 8, 9, 10] } };
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(400); await p.click(`[data-nav-box] [data-screen="${s}"]`); };
const state = p => p.evaluate(() => ({ bub: !!document.querySelector("[data-tour-bubble]"), wait: !!document.querySelector("[data-tour-wait]"), skip: !!document.querySelector("[data-tour-wait-skip]"), i: (document.querySelector("[data-tour-step]") || {}).getAttribute ? document.querySelector("[data-tour-step]").getAttribute("data-tour-step") : null }));
// ─── normal run: bubbles on the screen, never floated without reason ───
{
  const h = await start({ viewport: { width: 412, height: 860 }, seed, time: null });
  const p = h.page; await p.waitForTimeout(900);
  await go(p, "plans"); await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(500);
  const b = await p.locator("[data-tour-bubble]").boundingBox();
  T.ok(b && b.y >= 0 && b.y + b.height <= 860, "the first Plans bubble is on the screen");
  T.eq(await p.locator("[data-tour-flt]").count(), 0, "and not forced to float");
  T.eq(h.errors, [], "no page errors (normal run)");
  await h.close();
}
// ─── a step that hangs: Skip shows after 3 s, the watchdog moves on after 8 s ───
{
  const h = await start({ viewport: { width: 412, height: 860 }, seed, time: null });
  const p = h.page; await p.waitForTimeout(900);
  await p.evaluate(() => { window.__hwTourStall = 60000; });
  await go(p, "plans"); await p.waitForTimeout(1500);
  let s = await state(p);
  T.ok(s.wait && !s.skip, "while a step is being prepared: the dim layer, no button yet");
  await p.waitForTimeout(2500);
  s = await state(p);
  T.ok(s.wait && s.skip, "after 3 s a Skip button shows on the dim layer");
  T.ok(/^10\.0 /.test(await p.textContent("[data-tour-why]")), "with a small clue (chapter.step phase) for a bug report: " + await p.textContent("[data-tour-why]"));
  await p.click("[data-tour-wait-skip]"); await p.waitForTimeout(500);
  s = await state(p);
  T.ok(!s.wait && !s.bub, "Skip ends the guide: the screen is free");
  await p.click('[data-plans-seg="mine"]'); await p.waitForTimeout(500);
  T.ok(true, "the screen can be tapped again");
  T.eq(h.errors, [], "no page errors (hang)");
  await h.close();
}
{
  const h = await start({ viewport: { width: 412, height: 860 }, seed, time: null });
  const p = h.page; await p.waitForTimeout(900);
  await p.evaluate(() => { window.__hwTourStall = 60000; });
  await go(p, "plans"); await p.waitForSelector("[data-tour-wait-skip]", { timeout: 8000 });
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  const s = await state(p);
  T.ok(!s.wait && !s.bub, "stuck between steps: back (Esc) ends the guide too");
  await h.close();
}
{
  const h = await start({ viewport: { width: 412, height: 860 }, seed, time: null });
  const p = h.page; await p.waitForTimeout(900);
  await p.evaluate(() => { window.__hwTourStall = 9000; });
  await go(p, "plans"); await p.waitForTimeout(1000);
  await p.evaluate(() => { window.__hwTourStall = 0; });
  await p.waitForTimeout(8500);
  const s = await state(p);
  T.ok(s.bub && s.i !== "0", "the watchdog skipped the hanging step after 8 s and the guide went on: step " + s.i);
  T.eq(h.errors, [], "no page errors (watchdog)");
  await h.close();
}
// ─── a step that breaks: skipped, the guide goes on ───
{
  const h = await start({ viewport: { width: 412, height: 860 }, seed, time: null });
  const p = h.page; await p.waitForTimeout(900);
  await p.evaluate(() => { window.__hwTourThrow = 1; setTimeout(() => { window.__hwTourThrow = 0; }, 1200); });
  await go(p, "plans"); await p.waitForTimeout(4000);
  const s = await state(p);
  T.ok(s.bub || !s.wait, "a broken step never leaves only the dim layer (bubble " + s.bub + ", step " + s.i + ")");
  await h.close();
}
T.done();
