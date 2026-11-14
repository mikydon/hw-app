// 1.10.0 small ideas Michael approved (Nov 14, 21:33): filters remembered until the app closes (3), ...
import { start, T, shot } from "./harness.mjs";
const pub = [
  { pid: "u1_p1", o: "u1", nick: "Zuzka", name: "Legs every day", items: [{ id: "n1", sets: 4 }], fam: ["legs"], eq: "none", n: 1, sv: 12, st: 0, sn: 0, avg: 0, ts: 3 },
  { pid: "u3_p2", o: "u3", nick: "Ema", name: "Core quickie", items: [{ id: "b5", sets: 3 }], fam: ["core"], eq: "none", n: 1, sv: 2, st: 0, sn: 0, avg: 0, ts: 9 },
];
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
const ids = p => p.$$eval("[data-store-plan]", e => e.map(x => x.getAttribute("data-store-plan")));
// ─── 3: filters stay until the app closes ───
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await go(p, "plans"); await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
  await p.click("[data-store-filter]"); await p.waitForTimeout(400);
  await p.click('[data-store-grp="core"]'); await p.click('[data-store-sort="ts"]'); await p.click("[data-store-show]"); await p.waitForTimeout(400);
  T.eq(await ids(p), ["u3_p2"], "filtered to core");
  await go(p, "history"); await go(p, "plans"); await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
  T.eq(await ids(p), ["u3_p2"], "back on the Library: the filter is still on");
  T.eq(await p.locator('[data-store-tag="grp"]').count(), 1, "its tag shows");
  await p.reload(); await p.waitForTimeout(1200);
  await go(p, "plans"); await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
  T.eq((await ids(p)).length, 2, "after the app restarts: no filter");
  T.eq(h.errors, [], "no page errors (3)");
  await h.close();
}
// ─── 4: an empty list says what to do with one button ───
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await go(p, "plans"); await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
  await p.fill("[data-store-q]", "zzzz"); await p.waitForTimeout(300);
  T.ok(await p.locator('[data-empty-act="store"]').isVisible(), "Library, nothing found: a clear button");
  await p.click('[data-empty-act="store"]'); await p.waitForTimeout(300);
  T.eq((await ids(p)).length, 2, "it clears the search");
  T.eq(await p.inputValue("[data-store-q]"), "", "the field is empty again");
  await go(p, "history");
  T.ok(await p.locator('[data-empty-act="hist"]').isVisible(), "History, a month without workouts: Add a workout");
  await p.click('[data-empty-act="hist"]'); await p.waitForSelector("[data-edit-row]", { timeout: 3000 });
  T.ok(true, "it opens the workout editor");
  T.eq(h.errors, [], "no page errors (4)");
  await h.close();
}
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: {}, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await go(p, "friends"); await p.waitForTimeout(600);
  T.ok(await p.locator('[data-empty-act="friends"]').isVisible(), "Friends, nobody yet: Add a friend");
  await p.click('[data-empty-act="friends"]'); await p.waitForTimeout(700);
  T.ok(await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-fr-add")), "it puts the cursor into the add field");
  T.eq(h.errors, [], "no page errors (4b)");
  await h.close();
}
// ─── 5: grey outlines while a list loads ───
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub, pubDelay: 1500 }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await go(p, "plans"); await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(300);
  T.ok(await p.locator("[data-store-list] [data-skel]").isVisible(), "the Library loads: grey rows");
  T.eq(await p.getAttribute("[data-store-list] [data-skel]", "aria-busy"), "true", "marked busy for screen readers");
  await shot(p, "ideas_skel");
  await p.waitForTimeout(1600);
  T.eq(await p.locator("[data-store-list] [data-skel]").count(), 0, "gone when the plans arrive");
  T.eq((await ids(p)).length, 2, "the plans are there");
  T.eq(h.errors, [], "no page errors (5)");
  await h.close();
}
T.done();
