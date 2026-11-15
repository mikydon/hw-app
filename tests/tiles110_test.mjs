// 1.10.0 (Michael's idea 6, Nov 15: "tiles: your friends' plans, the most stars and so on; the arrow opens all of them
// in that order"): the Library opens on sections with their top 3; a section's arrow shows the whole list in its order
// (friends / HW App narrow it, with a removable chip); a search or a filter shows the list; ‹ Sections goes back.
import { start, T, shot } from "./harness.mjs";
const mk = (pid, o, nick, name, x) => ({ pid, o, nick, name, items: [{ id: "k1", sets: 3 }], fam: ["chest"], eq: "none", n: 1, sv: 0, st: 0, sn: 0, avg: 0, ts: 1, ...x });
const wk = (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
const pub = [
  mk("emaUUUUUU_a", "emaUUUUUU", "Ema", "Ema push", { sv: 9, ts: 5, avg: 4.5, sn: 4, wk, ws: 3 }),
  mk("benUUUUUU_b", "benUUUUUU", "Ben", "Ben legs", { sv: 20, ts: 9, avg: 3.0, sn: 2 }),
  mk("zoeUUUUUU_c", "zoeUUUUUU", "Zoe", "Zoe core", { sv: 2, ts: 12 }),
  mk("hwapp_core", "hwapp", "HW App", "Core in 10 minutes", { k: "core", sv: 1, ts: 0 }),
];
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub, friends: [{ uid: "emaUUUUUU", nick: "Ema", xp: 100 }] }, seed: { profile: { name: "Michael" } } });
const p = h.page;
await go(p, "plans");
await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
T.eq(await p.getAttribute("[data-store]", "data-store-mode"), "tiles", "the Library opens on sections");
T.eq(await p.$$eval("[data-store-tile]", e => e.map(x => x.getAttribute("data-store-tile"))), ["wk", "avg", "friends", "sv", "hwapp", "ts"], "this week, top rated, friends, most saved, HW App, newest");
T.eq(await p.$$eval('[data-store-tile="avg"] [data-store-tile-plan]', e => e.map(x => x.getAttribute("data-store-tile-plan"))), ["emaUUUUUU_a", "benUUUUUU_b"], "top rated: only rated plans, best first");
T.eq(await p.$$eval('[data-store-tile="friends"] [data-store-tile-plan]', e => e.map(x => x.getAttribute("data-store-tile-plan"))), ["emaUUUUUU_a"], "friends' plans");
T.eq(await p.$$eval('[data-store-tile="ts"] [data-store-tile-plan]', e => e.map(x => x.getAttribute("data-store-tile-plan"))), ["zoeUUUUUU_c", "benUUUUUU_b", "emaUUUUUU_a"], "newest: 3 at most");
await shot(p, "tiles_store");
await p.click('[data-store-tile="ts"] [data-store-tile-plan="zoeUUUUUU_c"]'); await p.waitForSelector('[data-plan-peek="zoeUUUUUU_c"]');
T.ok(true, "a plan in a section opens it");
await p.mouse.click(190, 60); await p.waitForTimeout(600);
await p.click('[data-store-tile-open="avg"]'); await p.waitForTimeout(400);
T.eq(await p.getAttribute("[data-store]", "data-store-mode"), "list", "the arrow: the whole list");
T.eq((await p.$$eval("[data-store-plan]", e => e.map(x => x.getAttribute("data-store-plan"))))[0], "emaUUUUUU_a", "in that order (stars)");
T.ok(await p.locator("[data-store-tiles-back]").isVisible(), "‹ Sections");
await p.click("[data-store-tiles-back]"); await p.waitForTimeout(400);
T.eq(await p.getAttribute("[data-store]", "data-store-mode"), "tiles", "back to the sections");
await p.click('[data-store-tile-open="friends"]'); await p.waitForTimeout(400);
T.eq(await p.$$eval("[data-store-plan]", e => e.map(x => x.getAttribute("data-store-plan"))), ["emaUUUUUU_a"], "friends: only their plans");
T.ok(await p.locator('[data-store-tag="who"]').isVisible(), "with a removable chip");
await p.click('[data-store-tag="who"] button'); await p.waitForTimeout(300);
T.eq((await p.$$eval("[data-store-plan]", e => e.length)), 4, "chip removed: every plan");
await p.click("[data-store-tiles-back]"); await p.waitForTimeout(300);
await p.fill("[data-store-q]", "core"); await p.waitForTimeout(300);
T.eq(await p.getAttribute("[data-store]", "data-store-mode"), "list", "typing a search: the list");
T.eq(await p.$$eval("[data-store-plan]", e => e.map(x => x.getAttribute("data-store-plan"))).then(x => x.sort()), ["hwapp_core", "zoeUUUUUU_c"], "search results");
await p.fill("[data-store-q]", ""); await p.waitForTimeout(300);
T.eq(await p.getAttribute("[data-store]", "data-store-mode"), "tiles", "search cleared: sections again");
T.eq(h.errors, [], "no page errors");
await h.close();
{ // the guide (chapter 10) shows the sections
  const h2 = await start({ viewport: { width: 380, height: 820 }, cloud: { pub }, seed: { tour: true, profile: { name: "Michael", tourDone: [1] } } });
  const q = h2.page;
  await q.click("[data-menu-btn]"); await q.waitForTimeout(400); await q.click("[data-tour-open]"); await q.waitForTimeout(400); await q.click('[data-tour-ch="10"]');
  let seen = false;
  for (let i = 0; i < 14 && !seen; i++) { await q.waitForSelector("[data-tour-bubble]"); await q.waitForTimeout(800); const t = await q.textContent("[data-tour-bubble]"); if (t.includes("Sections show")) seen = true; else await q.click("[data-tour-next]"); }
  T.ok(seen, "chapter 10 has a bubble for the sections");
  T.eq(h2.errors, [], "no page errors (guide)");
  await h2.close();
}
T.done();
