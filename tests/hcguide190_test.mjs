// 1.9.0 Health Connect guide (a tester: not installed, connecting didn't work): the card says it isn't installed and
// opens a 3-step guide with Install / Check again (spinner, then ✓) and the apps' help links; once installed the card
// moves on by itself. Also: every button darkens while pressed (global CSS).
import { start, T, shot } from "./harness.mjs";
const h = await start({ seed: { kcal: { sex: "m", weight: 80, height: 180, activity: "light", birth: null, goal: { type: "maintain" } }, profile: { birth: { y: 2000, m: 1, d: 1 } } } });
const p = h.page;
await p.evaluate(() => { window.__hcState = { available: false, reason: "Health Connect is unavailable on this device." }; window.__hwHealthSim = async () => { await new Promise(r => setTimeout(r, 200)); return window.__hcState; }; });
await p.click("[data-menu-btn]"); await p.click('[data-nav-box] [data-screen="calories"]'); await p.waitForTimeout(800);
const card = p.locator("[data-health-card]");
if (!(await p.locator('[data-hc="unavailable"]').count())) await card.locator("[data-fold-head]").first().click().catch(() => {});
await p.waitForTimeout(500);
T.ok(await p.locator('[data-hc="unavailable"]').count() === 1, "card: Health Connect not installed");
await p.click("[data-health-card] [data-hc-guide-open]");
T.ok(await p.locator("[data-hc-guide]").count() === 1, "guide opens");
T.eq(await p.getAttribute('[data-hc-step="1"]', "data-done"), "0", "step 1 not done");
T.ok(await p.locator("[data-hc-install]").count() === 1, "install button");
T.eq(await p.locator("[data-hc-src]").count(), 4, "4 apps with steps or links");
await p.evaluate(() => { window.__hcState = { available: true, granted: false }; });
await p.click("[data-hc-recheck]");
T.ok(await p.locator("[data-hc-recheck] .hwSpin").count() === 1, "Check again shows a spinner while it runs");
await p.waitForTimeout(700);
T.ok(await p.locator("[data-hc-recheck] .hwDone").count() === 1 || await p.getAttribute('[data-hc-step="1"]', "data-done") === "1", "then a ✓");
await shot(p, "hc_guide");
T.eq(await p.getAttribute('[data-hc-step="1"]', "data-done"), "1", "step 1 done after installing");
const press = await p.evaluate(() => { const b = document.querySelector("[data-hc-recheck], [data-hc-guide-connect]"); return [...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(r => String(r.cssText).includes(":active") && String(r.cssText).includes("brightness")); } catch (_) { return false; } }); });
T.ok(press, "pressed buttons darken (global :active rule)");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
