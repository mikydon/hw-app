// 1.10.0 (Michael, Nov 14): HW App's own plans are in the Library from the start (owner "hwapp", src/defplans.js,
// written by CI). They show in the user's language with an "official" mark, come first among plans saved equally
// often, can be saved and starred like anyone's, and have no Report button.
import { start, T, shot } from "./harness.mjs";
import { DEF_PLANS } from "../src/defplans.js";
import { LIB } from "../src/exlib.js";
const core = DEF_PLANS.find(x => x.k === "core");
const pub = [
  { pid: "u3_p2", o: "u3", nick: "Ema", name: "Core quickie", items: [{ id: "b5", sets: 3 }], fam: ["core"], eq: "none", n: 1, sv: 0, st: 0, sn: 0, avg: 0, ts: 9 },
  { pid: "hwapp_core", o: "hwapp", nick: "HW App", k: "core", name: core.name, items: core.items, fam: ["core"], eq: "none", n: core.items.length, sv: 0, st: 0, sn: 0, avg: 0, ts: 1 },
  { pid: "hwapp_zz", o: "hwapp", nick: "HW App", k: "zz", name: "Brand new plan", items: [{ id: "k1", sets: 3 }], fam: ["chest"], eq: "none", n: 1, sv: 0, st: 0, sn: 0, avg: 0, ts: 0 },
];
T.ok(DEF_PLANS.every(p => p.items.every(x => LIB[x.id])), "every exercise of the HW App plans exists");
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub }, seed: { profile: { name: "Michael" }, settings: { lang: "sk" } } });
  const p = h.page;
  await go(p, "plans");
  await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
  const ids = await p.$$eval("[data-store-plan]", e => e.map(x => x.getAttribute("data-store-plan")));
  T.eq(ids[0], "hwapp_core", "equal saves: HW App's plan first");
  const row = p.locator('[data-store-plan="hwapp_core"]');
  T.ok((await row.textContent()).includes("Brucho za 10 minút"), "the name in the app's language");
  T.eq(await row.locator("[data-store-official]").count(), 1, "the official mark");
  T.eq(await p.locator('[data-store-plan="u3_p2"] [data-store-official]').count(), 0, "no mark on a person's plan");
  T.ok((await p.locator('[data-store-plan="hwapp_zz"]').textContent()).includes("Brand new plan"), "a plan newer than this app: the server's name");
  await p.fill("[data-store-q]", "brucho"); await p.waitForTimeout(300);
  T.eq(await p.$$eval("[data-store-plan]", e => e.map(x => x.getAttribute("data-store-plan"))), ["hwapp_core"], "search finds the translated name");
  await p.fill("[data-store-q]", ""); await p.waitForTimeout(200);
  await shot(p, "defplans_list");
  await row.click(); await p.waitForSelector("[data-plan-peek]", { timeout: 5000 }); await p.waitForTimeout(300);
  T.eq(await p.locator("[data-plan-peek] [data-store-official]").count(), 1, "the mark next to the author in the plan");
  T.eq(await p.locator("[data-plan-report]").count(), 0, "no Report for HW App's plans");
  await p.click("[data-plan-copy]"); await p.waitForTimeout(400);
  const cp = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).plans.list[0]);
  T.ok(cp && cp.name === "Brucho za 10 minút" && cp.by === "HW App" && cp.from === "hwapp_core", "saved copy: the shown name, by HW App: " + JSON.stringify(cp && { name: cp.name, by: cp.by, from: cp.from }));
  const sv = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "pubSaved"));
  T.ok(sv && sv[1] === "hwapp_core", "the save is counted on the server");
  await p.waitForTimeout(1000);
  T.eq(await p.getAttribute('[data-plans-seg="mine"]', "aria-pressed"), "true", "from the Library straight to My plans");
  T.ok(await p.locator(`[data-plan-card="${cp.id}"][data-flash]`).isVisible(), "the saved plan flashes");
  await shot(p, "defplans_saved");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
T.done();
