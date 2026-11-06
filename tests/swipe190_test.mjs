// 1.9.0 (Michael, Nov 7): every screen with a bottom page switch can be swiped with a finger (Friends and Plans could
// only be tapped), the switch is small (icon + tiny name), its lit pill slides with the pages, and a tap glides like a
// swipe (it used to jump, and the lit tab came late).
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const h = await start({ viewport: { width: 360, height: 740 }, cloud: { friends: [{ uid: "f1", nick: "Jozo", lvl: 3 }] },
  seed: { history: [entry("2026-11-02", "A", [it("k1", [20, 18]), it("n1", [30, 28])])], profile: { name: "Michael" } } });
const p = h.page;
const cdp = await h.ctx.newCDPSession(p);
const swipe = async (sel, dx) => {
  const b = await p.locator(sel).boundingBox();
  await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + Math.min(120, b.height / 2)), xDistance: dx, yDistance: 0, gestureSourceType: "mouse", speed: 1600 });
  await p.waitForTimeout(700);
};
const knobX = name => p.evaluate(n => { const k = document.querySelector(`[data-ftabs=${n}] [data-ftabs-knob]`) || document.querySelector(`[data-${n}-tabs] [data-ftabs-knob]`); return k ? new DOMMatrix(getComputedStyle(k).transform).m41 : null; }, name);
// a tap: record the strip's scrollLeft and the pill every frame
const glide = async (name, tab) => {
  await p.evaluate(([n, t]) => {
    const el = document.querySelector(`[data-${n}-pager]`), k = document.querySelector(`[data-${n}-tabs] [data-ftabs-knob]`);
    window.__fr = []; const t0 = performance.now();
    const f = () => { window.__fr.push([el.scrollLeft, k ? new DOMMatrix(getComputedStyle(k).transform).m41 : 0, document.querySelector(`[data-${n}-tab="${t}"], [data-${n}-tab]:nth-child(${t + 2})`)?.getAttribute("aria-selected")]); if (performance.now() - t0 < 900) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }, [name, tab]);
  await p.click(`[data-${name}-tabs] [role=tab] >> nth=${tab}`);
  await p.waitForTimeout(1000);
  return p.evaluate(() => window.__fr);
};
const checkGlide = (fr, what) => {
  const xs = fr.map(f => f[0]), moving = xs.filter((x, i) => i && x !== xs[i - 1]).length;
  const mono = xs.every((x, i) => !i || Math.abs(x - xs[i - 1]) < 1 || Math.sign(x - xs[i - 1]) === Math.sign(xs[xs.length - 1] - xs[0]));
  T.ok(moving >= 14, `${what}: the tap glides over ${moving} frames`);
  T.ok(mono, `${what}: never moves back`);
  const ks = fr.map(f => f[1]), kMoving = ks.filter((x, i) => i && Math.abs(x - ks[i - 1]) > 0.5).length;
  T.ok(kMoving >= 10, `${what}: the lit pill slides with it (${kMoving} frames)`);
};

// Home: the pill in the Start bar slides with a tap
checkGlide(await glide("home", 1), "Home");
T.eq(await p.getAttribute('[data-home-tab="1"]', "aria-selected"), "true", "Home: Exercises lit");
await swipe("[data-home-pager]", 300); // finger to the right = back to the first page
T.eq(await p.getAttribute('[data-home-tab="0"]', "aria-selected"), "true", "Home: swipe back works");

// Friends: swipe with a finger
await p.click("[data-menu-btn]"); await p.click('[data-screen="friends"]');
await p.waitForSelector("[data-fr-pager]", { timeout: 8000 });
T.ok(await p.locator('[data-fr-view="friends"]').count() === 1 && await p.locator('[data-fr-view="board"]').count() === 1, "Friends: both views are pages");
const fb = await p.locator("[data-ftabs=fr] [role=tablist]").boundingBox();
T.ok(fb.height <= 58 && fb.width <= 170, `Friends: small bar (${Math.round(fb.width)}×${Math.round(fb.height)})`);
T.ok(await p.locator("[data-ftabs=fr] [data-ftabs-label]").count() === 2, "Friends: tiny names under the icons");
await shot(p, "swipe_friends");
await swipe("[data-fr-pager]", -300);
T.eq(await p.getAttribute('[data-seg="board"]', "aria-selected"), "true", "Friends: a swipe opens the leaderboard");
T.ok(await knobX("fr") > 20, "Friends: the pill moved to the second tab");
checkGlide(await glide("fr", 0), "Friends");
T.eq(await p.getAttribute('[data-seg="friends"]', "aria-selected"), "true", "Friends: tap back to friends");

// Plans: swipe with a finger
await p.click("[data-menu-btn]"); await p.click('[data-screen="plans"]');
await p.waitForSelector("[data-plans-pager]", { timeout: 8000 });
await swipe("[data-plans-pager]", -300);
T.eq(await p.getAttribute('[data-plans-seg="mine"]', "aria-selected"), "true", "Plans: a swipe opens My plans");
T.ok(await p.locator('[data-plans-page="1"] [data-plan-new]').isVisible(), "Plans: My plans is on screen");
checkGlide(await glide("plans", 0), "Plans");

// Profile and Calories keep working
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(600);
const pb = await p.locator("[data-ftabs=pf] [role=tablist]").boundingBox();
T.ok(pb.height <= 58 && pb.width <= 300, `Profile: small bar (${Math.round(pb.width)}×${Math.round(pb.height)})`);
checkGlide(await glide("pf", 2), "Profile");
await shot(p, "swipe_profile");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
