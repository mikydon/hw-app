// 1.10.0 plan library (Michael, Nov 8): a plan can be shown on your profile (Plans box); others open it and save their
// own copy ("by Zuzka"), never with anyone's weights; a shared plan follows its edits; others' plans can be reported.
import { start, T, shot } from "./harness.mjs";
const plan = { id: "pA", n: 1, name: "Push day", grp: null, ts: 1, mts: 1, items: [{ id: "k1", sets: 4 }, { id: "b5", sets: 2, dur: 45 }], days: {}, ds: "{}" };
const plans = { v: 2, list: [plan], groups: [], seq: 1, del: {}, week: {}, wmts: 1, sort: "date", dir: "desc" };
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
const log = (p, k) => p.evaluate(k => window.__fakeLog.filter(x => x[0] === k), k);

// ─── my side: share a plan, see it on my profile, an edit reaches it ───
{
  const h = await start({ viewport: { width: 380, height: 800 }, cloud: {}, seed: { profile: { name: "Michael", plans } } });
  const p = h.page;
  await go(p, "profile");
  T.ok(await p.locator("[data-pf-plans-empty]").isVisible(), "own profile, nothing shared: a line that leads to Workout plans");
  await p.click("[data-pf-plans-empty]"); await p.waitForTimeout(900);
  T.ok(await p.locator('[data-plan-card="pA"]').isVisible(), "it opens My plans");
  await p.click('[data-plan-card="pA"]'); await p.waitForTimeout(600);
  const sw = p.locator('[data-plan-profile-box] [role="switch"]');
  T.eq(await sw.getAttribute("aria-checked"), "false", "not shared yet");
  await sw.click(); await p.waitForTimeout(500);
  T.eq(await sw.getAttribute("aria-checked"), "true", "shared");
  const sv = (await log(p, "savePlib")).pop();
  T.eq(sv && sv[2], [{ id: "pA", name: "Push day", n: 1, items: [{ id: "k1", sets: 4 }, { id: "b5", sets: 2, dur: 45 }] }], "the shared copy: name, exercises, sets, hold; nothing else");
  await p.fill("[data-plan-name]", "Push day 2"); await p.click("[data-plan-dayview]"); await p.waitForTimeout(2200);
  const sv2 = (await log(p, "savePlib")).pop();
  T.eq(sv2 && sv2[2][0].name, "Push day 2", "a rename reaches the shared plan");
  await go(p, "profile");
  T.ok(await p.locator('[data-pf-plans] [data-pf-plan="pA"]').isVisible(), "my profile shows the plan");
  await p.click('[data-pf-plan="pA"]'); await p.waitForTimeout(500);
  T.ok(await p.locator('[data-plan-editor="pA"]').isVisible(), "tapping my own plan opens it in the editor");
  T.eq(h.errors, [], "no page errors (mine)");
  await h.close();
}

// ─── a friend's profile: open the plan, save a copy, report ───
{
  const shared = { vis: "friends", plans: [{ id: "zz1", name: "Legs with Zuzka", n: 3, items: [{ id: "n1", sets: 3 }, { id: "nope", sets: 3 }, { id: "b5", sets: 9, dur: 99999 }] }] };
  const cloud = { friends: [{ uid: "f1", nick: "Zuzka", xp: 900, lvl: 3 }], cards: { f1: { vis: "friends", lvl: 3, xp: 900, n: 10, streak: 2 } }, plib: { f1: shared } };
  const h = await start({ viewport: { width: 380, height: 800 }, cloud, seed: { profile: { name: "Michael", plans } } });
  const p = h.page;
  await go(p, "friends");
  await p.click('[data-person="f1"]'); await p.waitForTimeout(1200);
  T.ok(await p.locator('[data-pf-plans] [data-pf-plan="zz1"]').isVisible(), "Zuzka's profile shows her plan");
  await p.click('[data-pf-plan="zz1"]'); await p.waitForTimeout(500);
  T.eq(await p.locator("[data-plan-peek-item]").count(), 2, "an unknown exercise from another phone is left out");
  T.ok((await p.textContent("[data-plan-peek]")).includes("By Zuzka"), "it says who made it");
  await shot(p, "plib_peek");
  await p.click("[data-plan-copy]"); await p.waitForTimeout(400);
  T.ok(await p.locator("[data-plan-saved]").isVisible(), "saved");
  const mine = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).plans.list);
  const cp = mine.find(x => x.by === "Zuzka");
  T.ok(cp && cp.name === "Legs with Zuzka" && cp.id !== "zz1" && cp.n === 2, "a copy in my plans with a new id and number: " + JSON.stringify(cp && { name: cp.name, n: cp.n }));
  T.eq(cp && cp.items, [{ id: "n1", sets: 3 }, { id: "b5", sets: 9, dur: 1800 }], "sets and hold times kept (capped), no weights");
  await p.click("[data-plan-report]"); await p.waitForTimeout(300); await p.click("[data-plan-report-yes]"); await p.waitForTimeout(400);
  const rp = (await log(p, "report")).pop();
  T.ok(rp && rp[1] === "f1" && rp[2].includes("Legs with Zuzka"), "reported with the plan's name");
  T.eq(h.errors, [], "no page errors (friend)");
  await h.close();
}
T.done();
