// 1.10.0 plan store (Michael, Nov 14): Workout plans → Store lists public plans (search by name, author or exercise,
// focus and equipment filters, order by saves / stars / newest); a plan opens with its stars and saves; saving makes
// your copy and counts the save on the server; stars only after a workout from the copy. Publishing is a switch in
// the plan editor.
import { start, T, shot, entry } from "./harness.mjs";
const pub = [
  { pid: "u1_p1", o: "u1", nick: "Zuzka", name: "Legs every day", items: [{ id: "n1", sets: 4 }, { id: "b5", sets: 2, dur: 60 }], fam: ["legs"], eq: "none", n: 2, sv: 12, st: 9, sn: 2, avg: 4.5, ts: 3 },
  { pid: "u2_p9", o: "u2", nick: "Peter", name: "Gym push", items: [{ id: "fw_dumbbell_bench_press", sets: 4 }, { id: "k1", sets: 3 }], fam: ["chest"], eq: "free", n: 2, sv: 30, st: 0, sn: 0, avg: 0, ts: 1 },
  { pid: "u3_p2", o: "u3", nick: "Ema", name: "Core quickie", items: [{ id: "b5", sets: 3 }], fam: ["core"], eq: "none", n: 1, sv: 2, st: 5, sn: 1, avg: 5, ts: 9 },
];
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
const names = p => p.$$eval("[data-store-plan]", e => e.map(x => x.getAttribute("data-store-plan")));
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await go(p, "plans");
  await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
  T.eq(await names(p), ["u2_p9", "u1_p1", "u3_p2"], "most saved first");
  await p.click('[data-store-sort="avg"]'); await p.waitForTimeout(200);
  T.eq(await names(p), ["u3_p2", "u1_p1", "u2_p9"], "top rated");
  await p.click('[data-store-sort="ts"]'); await p.waitForTimeout(200);
  T.eq(await names(p), ["u3_p2", "u1_p1", "u2_p9"], "newest");
  await p.fill("[data-store-q]", "zuz"); await p.waitForTimeout(200);
  T.eq(await names(p), ["u1_p1"], "search by author");
  await p.fill("[data-store-q]", "bench"); await p.waitForTimeout(200);
  T.eq(await names(p), ["u2_p9"], "search by an exercise in the plan");
  await p.fill("[data-store-q]", ""); await p.click('[data-store-grp="core"]'); await p.waitForTimeout(200);
  T.eq(await names(p), ["u3_p2"], "focus filter");
  await p.click('[data-store-grp=""]'); await p.click('[data-store-eq="free"]'); await p.click('[data-store-eq="machine"]'); await p.waitForTimeout(200);
  T.eq((await names(p)).sort(), ["u1_p1", "u3_p2"], "bodyweight only");
  await shot(p, "store_list");
  await p.click('[data-store-plan="u1_p1"]'); await p.waitForTimeout(500);
  T.ok((await p.textContent("[data-plan-peek-stats]")).includes("4.5"), "stars shown");
  await p.click("[data-plan-copy]"); await p.waitForTimeout(500);
  const sv = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "pubSaved"));
  const mine = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).plans.list);
  const cp = mine.find(x => x.from === "u1_p1");
  T.ok(cp && cp.by === "Zuzka" && sv && sv[1] === "u1_p1" && sv[2] === cp.id, "saved: my copy remembers the store plan, and the server counts it");
  T.eq(await p.textContent("[data-plan-peek-sv]"), "13", "saves go up");
  T.eq(await p.getAttribute("[data-plan-rate]", "data-plan-rate"), "wait", "no stars before a workout from the copy");
  await shot(p, "store_peek");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
// ─── trained it: stars; publish switch in the editor ───
{
  const copy = { id: "pC", n: 1, name: "Legs every day", by: "Zuzka", from: "u1_p1", grp: null, ts: 1, mts: 1, items: [{ id: "n1", sets: 4 }], days: {}, ds: "{}" };
  const plans = { v: 2, list: [copy], groups: [], seq: 1, del: {}, week: {}, wmts: 1, sort: "date", dir: "desc" };
  const history = [entry("2026-11-10", null, [{ id: "n1", name: "x", unit: "", res: [10, 10] }], { plan: { id: "pC", name: "Legs every day" } })];
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub }, seed: { history, profile: { name: "Michael", plans } } });
  const p = h.page;
  await go(p, "plans");
  await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900);
  await p.click('[data-store-plan="u1_p1"]'); await p.waitForTimeout(500);
  T.eq(await p.getAttribute("[data-plan-rate]", "data-plan-rate"), "on", "trained it: stars can be given");
  T.eq(await p.locator("[data-plan-copy]").count(), 0, "already saved: no second copy button");
  await p.click('[data-plan-star="4"]'); await p.waitForTimeout(400);
  const rt = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "pubRate"));
  T.eq(rt && rt.slice(1), ["u1_p1", 4], "4 stars sent");
  await p.click(".sheetBox [aria-label='Close'], [data-sheet-close]").catch(() => p.keyboard.press("Escape"));
  await p.waitForTimeout(400);
  await p.click('[data-plans-seg="mine"]'); await p.waitForTimeout(600);
  await p.click('[data-plan-card="pC"]'); await p.waitForTimeout(600);
  await p.click('[data-plan-pub-box] [role="switch"]'); await p.waitForTimeout(500);
  const put = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "pubPut"));
  T.ok(put && put[1].id === "pC" && put[1].fam.includes("legs") && put[1].eq === "none" && put[1].items.length === 1 && !("kg" in put[1].items[0]), "published: focus, equipment, exercises, no weights");
  T.eq(await p.getAttribute('[data-plan-pub-box] [role="switch"]', "aria-checked"), "true", "switch on");
  T.eq(h.errors, [], "no page errors (stars, publish)");
  await h.close();
}
T.done();
