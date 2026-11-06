// 1.9.0: the profile card others see carries weighted ranks as ranks (rr), because they depend on the owner's body
// weight; body ranks on someone else's profile use them. Rules: rk ≤ 200 and rr (tested in .github/rules-test).
import { start, T, entry } from "./harness.mjs";
const it = (id, res, kg) => ({ id, name: id, unit: "", res, ...(kg ? { kg } : {}) });
const hist = [entry("2026-11-02", "A", [it("k1", [60, 50])]), entry("2026-11-03", null, [it("fw_dumbbell_bench_press", [10, 9], [24, 24])], { plan: { id: "pA", name: "P", wd: 2 } })];
const h = await start({ clock: new Date(2026, 10, 4, 18).getTime(), seed: { history: hist, profile: { name: "Michael" }, kcal: { sex: "m", weight: 80, height: 180, activity: "light" } }, init: () => { window.__hwTestHooks = true; } });
const p = h.page;
await p.addInitScript(() => { window.__hwTestHooks = true; }); await p.reload(); await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const H = JSON.parse(localStorage.getItem("domaci-trening-v1")).history, P = JSON.parse(localStorage.getItem("domaci-trening-v1-profile"));
  const c = window.__hwCardT.cardData(H, P);
  const json = JSON.parse(JSON.stringify(c)); // as it travels through Firestore
  const m = window.__hwCardT.cardModel(json, { nick: "M" });
  const br = window.__hwCardT.bodyRanks(m);
  const keys = Object.keys(c).sort();
  return { rr: c.rr, rkHasW: "fw_dumbbell_bench_press" in c.rk, mrr: m.rr, chest: br.fam.chest.ids.map(x => x.join(":")), keys };
});
T.ok(r.rr && typeof r.rr.fw_dumbbell_bench_press === "number", "card carries the bench press rank in rr: " + JSON.stringify(r.rr));
T.eq(r.rkHasW, false, "weighted numbers are not in rk");
T.eq(r.mrr.fw_dumbbell_bench_press, r.rr.fw_dumbbell_bench_press, "the viewer reads the same rank back");
T.ok(r.chest.some(x => x.startsWith("fw_dumbbell_bench_press:")) && r.chest.some(x => x.startsWith("k1:")), "someone else's body ranks count both: " + r.chest.join(", "));
// rules field list stays in step with what the app sends
const rules = (await import("fs")).readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const allowed = rules.match(/function cardOk\(\) \{\s*return only\(\[([^\]]+)\]/)[1].replace(/'/g, "").split(/,\s*/);
T.ok(r.keys.every(k => allowed.includes(k)), "every card field is allowed by the rules: " + r.keys.filter(k => !allowed.includes(k)).join(","));
T.ok(/'rk', \{\}\)\.size\(\) <= 200/.test(rules), "rules allow 200 ranked exercises");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
