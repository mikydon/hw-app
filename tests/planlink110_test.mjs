// 1.10.0 (Michael's idea 7, Nov 15): a share link for one plan. The plan editor shares a link that carries the plan
// (exercises, sets, hold times; never weights); opening it (…/hw-app/?plan=1&i=…, where plan/index.html sends the
// browser; the app gets …/hw-app/plan/?i=… as an App Link) shows the plan: save a copy or try it. No account needed.
import { start, T, shot } from "./harness.mjs";
import * as PLN from "../src/plans.js";
// the link itself
{
  const q = PLN.planLink({ name: "Legs & core", items: [{ id: "n1", sets: 3 }, { id: "b5", sets: 2, dur: 45 }, { id: "bw_calf_raise", sets: 4, kg: [20, 20] }] }, "Michael");
  T.ok(!q.includes("kg") && !q.includes("20"), "no weights in the link: " + q);
  const back = PLN.planFromLink("?" + q);
  T.eq([back.name, back.by, back.items], ["Legs & core", "Michael", [{ id: "n1", sets: 3 }, { id: "b5", sets: 2, dur: 45 }, { id: "bw_calf_raise", sets: 4 }]], "read back the same");
  T.eq(PLN.planFromLink("?i=<script>.3,../etc.2"), null, "nonsense ids: nothing");
  T.eq(PLN.planFromLink("?i=n1.999.99999").items, [{ id: "n1", sets: PLN.MAX_SETS, dur: 1800 }], "numbers kept in range");
  T.eq(PLN.planFromLink("?n=x"), null, "no exercises: nothing");
}
const plans = { v: 2, seq: 1, list: [{ id: "p1", n: 1, name: "Legs day", grp: null, ts: 1, mts: 1, items: [{ id: "n1", sets: 3 }, { id: "b5", sets: 2, dur: 45 }], days: {}, ds: "{}" }], week: {}, groups: [], del: {} };
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
// the editor shares it (no share sheet here: copied)
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: {}, seed: { profile: { name: "Michael", plans } } });
  const p = h.page;
  await p.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await go(p, "plans"); await p.click('[data-plans-seg="mine"]'); await p.waitForTimeout(500);
  await p.click('[data-plan-card="p1"]'); await p.waitForTimeout(600);
  T.ok(await p.locator("[data-plan-link]").isVisible(), "the editor has Share a link");
  await p.click("[data-plan-link]"); await p.waitForTimeout(500);
  const txt = await p.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  T.ok(txt.includes("/hw-app/plan/?i=n1.3%2Cb5.2.45") && txt.includes("n=Legs+day") && txt.includes("by=Michael") && txt.includes("Legs day:"), "the link with the plan in it: " + txt);
  T.ok((await p.textContent("[data-plan-link-msg]")).length > 0, "a line says it was copied");
  await shot(p, "planlink_editor");
  T.eq(h.errors, [], "no page errors (share)");
  await h.close();
}
// opening the link on the website: the plan shows, a copy can be saved
{
  const h = await start({ viewport: { width: 380, height: 820 }, seed: { profile: { name: "Ema" } }, query: "?plan=1&i=n1.3%2Cb5.2.45%2Cnope.3&n=Legs+day&by=Michael" });
  const p = h.page;
  await p.waitForSelector("[data-plan-link='1']", { timeout: 8000 });
  T.ok((await p.textContent(".sheetWrap")).includes("Legs day") && (await p.textContent(".sheetWrap")).includes("Michael"), "the plan's name and who shared it");
  T.eq(await p.$$eval("[data-plan-peek-item]", e => e.map(x => x.getAttribute("data-plan-peek-item"))), ["n1", "b5"], "its exercises (an unknown one is dropped)");
  T.ok(!(await p.evaluate(() => location.search)).includes("plan"), "the address is cleaned");
  T.eq(await p.locator("[data-plan-report]").count(), 0, "no Report (nobody's account behind a link)");
  T.ok(await p.locator("[data-plan-try]").isVisible(), "Try it");
  await shot(p, "planlink_open");
  await p.click("[data-plan-copy]"); await p.waitForTimeout(1500);
  const cp = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).plans.list[0]);
  T.ok(cp && cp.name === "Legs day" && cp.by === "Michael" && cp.items.length === 2 && cp.items[1].dur === 45, "saved as my own copy: " + JSON.stringify(cp && { name: cp.name, by: cp.by, n: cp.items.length }));
  T.eq(await p.getAttribute('[data-plans-seg="mine"]', "aria-pressed"), "true", "then My plans");
  T.eq(h.errors, [], "no page errors (open)");
  await h.close();
}
// a rude name in a link is not shown
{
  const h = await start({ viewport: { width: 380, height: 820 }, seed: { profile: { name: "Ema" } }, query: "?plan=1&i=n1.3&n=fuck+this&by=admin" });
  const p = h.page;
  await p.waitForSelector("[data-plan-link='1']", { timeout: 8000 });
  const t = await p.textContent(".sheetWrap");
  T.ok(!/fuck/i.test(t) && !/admin/i.test(t), "rude name and reserved nick are dropped: " + t.slice(0, 80));
  await h.close();
}
T.done();
