// 1.10.0 (Michael's idea 5, Nov 15): in the Library the author's name opens their profile; the profile has a friend
// request button (sent = greyed); Back returns to that plan in the Library. (The author's "someone saved/rated your
// plan" notification is the Worker: tools/worker_together_test.mjs.)
import { start, T, shot } from "./harness.mjs";
const allPlans = async p => { if (await p.locator("[data-store-all]").count()) { await p.click("[data-store-all]"); await p.waitForTimeout(300); } }; // 1.10.0: the Library opens on sections
const pub = [{ pid: "emaUUUUUU_p2", o: "emaUUUUUU", nick: "Ema", name: "Core quickie", items: [{ id: "b5", sets: 3 }], fam: ["core"], eq: "none", n: 1, sv: 3, st: 0, sn: 0, avg: 0, ts: 9 }];
const cards = { emaUUUUUU: { vis: "all", lvl: 7, xp: 900, streak: 4, best: 9, n: 20, reps: 800, min: 300, since: "2026-09-01", ach: {}, av: {}, prs: 3, rk: {}, rr: {}, show: [], ts: Date.now() } };
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
{
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub, cards }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await go(p, "plans");
  await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900); await allPlans(p);
  await p.click('[data-store-plan="emaUUUUUU_p2"]'); await p.waitForSelector("[data-plan-peek]");
  T.ok(await p.locator('[data-plan-by="emaUUUUUU"]').isVisible(), "the author's name is a button");
  await p.click('[data-plan-by="emaUUUUUU"]'); await p.waitForSelector('[data-pv="emaUUUUUU"]', { timeout: 6000 }); await p.waitForTimeout(800);
  T.eq(await p.getAttribute('[data-pv="emaUUUUUU"]', "data-pv-state"), "ok", "Ema's profile");
  T.ok((await p.textContent("[data-pv-head]")).includes("Ema"), "her name on top");
  T.ok(await p.locator("[data-pv-add]").isVisible() && (await p.textContent("[data-pv-add]")).includes("Add friend"), "a friend request pill");
  await shot(p, "pv_from_library");
  await p.click("[data-pv-add]"); await p.waitForTimeout(500);
  const sent = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "sendRequest"));
  T.eq(sent && sent[1], "emaUUUUUU", "the request goes to Ema");
  T.eq(await p.getAttribute("[data-pv-add]", "data-state"), "sent", "button: sent");
  T.ok(await p.locator("[data-pv-add]").isDisabled(), "and can't be sent twice");
  T.ok((await p.textContent("[data-pv-add]")).includes("Request sent"), "and says so");
  const bb = await p.locator("[data-pv-add]").boundingBox(), hb = await p.locator("[data-pv-head]").boundingBox();
  T.ok(bb.height <= 40 && bb.y >= hb.y - 2 && bb.y + bb.height <= hb.y + hb.height + 2, "a small pill in the top bar, not a big button on the page");
  await p.click("[data-pv-back]"); await p.waitForTimeout(1200);
  T.ok(await p.locator('[data-plan-peek="emaUUUUUU_p2"]').isVisible(), "Back: the plan in the Library again");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
{ // a friend already: no button; my own plan: the name is not a button
  const mine = [{ ...pub[0], pid: "me_p1", o: "me", nick: "Michael" }];
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: { pub: [...pub, ...mine], cards, friends: [{ uid: "emaUUUUUU", nick: "Ema", xp: 900 }] }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await go(p, "plans");
  await p.click('[data-plans-seg="store"]'); await p.waitForTimeout(900); await allPlans(p);
  await p.click('[data-store-plan="emaUUUUUU_p2"]'); await p.waitForSelector("[data-plan-peek]");
  await p.click('[data-plan-by="emaUUUUUU"]'); await p.waitForSelector('[data-pv="emaUUUUUU"]', { timeout: 6000 }); await p.waitForTimeout(600);
  T.eq(await p.locator("[data-pv-add]").count(), 0, "a friend: no request button");
  T.eq(h.errors, [], "no page errors (friend)");
  await h.close();
}
T.done();
