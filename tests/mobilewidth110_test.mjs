// 1.10.1 (Michael, Nov 15, after 1.10.0 went out: "on the phone Workout plans sits somewhere bottom right, all bugged",
// the guide only dimmed the screen): a positioned part of the Library page (the search icon, the hidden "Loading…" of the
// skeleton rows) had its containing block outside the swipe strip, so it stuck out 400 px to the right; a real phone
// browser / WebView then widens the page and zooms out. Desktop Chromium never shows it, so this test runs as a phone
// (isMobile: the meta viewport and zoom like Android): every screen and every swipe page must stay as wide as the phone.
import { start, T, entry } from "./harness.mjs";
import { DEF_PLANS } from "../src/defplans.js";
const pub = DEF_PLANS.map((d, i) => ({ pid: "hwapp_" + d.k, o: "hwapp", nick: "HW App", k: d.k, name: d.name, items: d.items, fam: ["chest"], eq: "none", n: 1, sv: 40 - i, st: 0, sn: 0, avg: 0, ts: 1 + i }));
const P = (id, n, ts, items) => ({ id, n, name: "", grp: null, ts, mts: ts, items, days: {}, ds: "{}" });
const plans = { v: 2, list: [P("pA", 1, 1e12, [{ id: "k1", sets: 3 }])], groups: [], seq: 1, del: {}, week: { 1: "pA" }, wmts: 1, sort: "date", dir: "asc" };
const hist = [entry("2026-11-10", "A", [{ id: "k1", name: "k1", unit: "", res: [12, 10] }]), entry("2026-11-12", "B", [{ id: "r1", name: "r1", unit: "", res: [8, 8] }])];
const W = 412;
const width = p => p.evaluate(() => ({ inner: innerWidth, doc: document.documentElement.scrollWidth, scale: visualViewport.scale }));
for (const [nm, extra] of [["signed in", { cloud: { pub, friends: [{ uid: "f1", nick: "Zuzka", xp: 900, lvl: 3 }] } }], ["signed out", {}]]) {
  const h = await start({ viewport: { width: W, height: 915 }, dpr: 2.625, mobile: true, seed: { history: hist, profile: { name: "M", plans }, kcal: { sex: "m", weight: 78, height: 182, activity: "light", goal: { type: "maintain" }, log: {} } }, ...extra });
  const p = h.page; await p.waitForTimeout(900);
  for (const scr of ["train", "plans", "calories", "history", "profile", "friends", "game", "shop", "settings"]) {
    await p.tap("[data-menu-btn]"); await p.waitForTimeout(500);
    await p.tap(`[data-nav-box] [data-screen="${scr}"]`); await p.waitForTimeout(1300);
    const tabs = await p.$$eval("[data-ftabs] [role=tab]", e => e.length);
    for (let i = 0; i < Math.max(1, tabs); i++) {
      if (tabs && i > 0) { const ok = await p.locator("[data-ftabs] [role=tab]").nth(i).tap({ timeout: 3000 }).then(() => true, () => false); if (!ok) { T.ok(false, `${nm}: ${scr} page ${i + 1}: its tab can't be tapped (the page is pushed off the screen)`); continue; } await p.waitForTimeout(700); }
      const w = await width(p);
      T.ok(w.inner === W && w.doc <= W, `${nm}: ${scr}${tabs ? " page " + (i + 1) : ""} stays ${W} px wide (inner ${w.inner}, page ${w.doc})`);
    }
  }
  T.eq(h.errors, [], nm + ": no page errors");
  await h.close();
}
// the Workout plans guide shows its first bubble on a phone, signed in (the case Michael hit)
{
  const h = await start({ viewport: { width: W, height: 915 }, dpr: 2.625, mobile: true, time: null, seed: { tour: true, profile: { name: "M", tourDone: [1, 2, 4, 5, 6, 7, 8, 9, 10] } }, cloud: { pub } });
  const p = h.page; await p.waitForTimeout(900);
  await p.tap("[data-menu-btn]"); await p.waitForTimeout(500); await p.tap("[data-tour-open]"); await p.waitForTimeout(700);
  await p.tap('[data-tour-ch="10"]');
  await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(600);
  const b = await p.locator("[data-tour-bubble]").boundingBox(), w = await width(p);
  T.ok(b && b.x >= 0 && b.x + b.width <= W && b.y >= 0 && b.y + b.height <= 915, "the Workout plans guide's bubble is on the phone screen");
  T.ok(w.inner === W, "and the page is not zoomed out");
  T.eq(h.errors, [], "no page errors (guide on a phone)");
  await h.close();
}
T.done();
