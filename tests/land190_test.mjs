// 1.9.0 (Michael, Nov 7): at the bottom of the long Badges page, a swipe to Ranks (or a tap on Stats) showed an empty
// screen while the page slid in and then jumped up. Now the new page shows its top under the top bar the whole way and
// nothing jumps when the move ends.
import { start, T, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const hist = [];
for (let i = 0; i < 26; i++) { const d = new Date(2026, 7, 1 + i * 3); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; hist.push(entry(k, "ABC"[i % 3], [it("k1", [22, 20, 18]), it("n1", [30, 28, 26]), it("row1", [12, 10, 9]), it("b5", [60, 60, 45])], { rounds: 3 })); }
const h = await start({ viewport: { width: 360, height: 740 }, clock: new Date(2026, 10, 7, 12).getTime(), seed: { history: hist, profile: { name: "Michael" } } });
const p = h.page, cdp = await h.ctx.newCDPSession(p);
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(700);
// a recorder: every frame, where the target page's first box is and whether anything of that page is on screen
const rec = async (page, sel) => p.evaluate(([pg, sel]) => {
  window.__fr = []; const t0 = performance.now();
  const f = () => {
    const el = document.querySelector(`[data-pf-page="${pg}"] ${sel}`), r = el.getBoundingClientRect(), strip = document.querySelector("[data-pf-pager]").getBoundingClientRect();
    const onX = r.right > 0 && r.left < innerWidth, vis = onX && r.bottom > 60 && r.top < innerHeight;
    window.__fr.push({ top: Math.round(r.top), left: Math.round(r.left), vis, onX, sy: Math.round(scrollY), sh: Math.round(strip.height) });
    if (performance.now() - t0 < 1300) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}, [page, sel]);
const check = (fr, what) => {
  const seen = fr.filter(f => f.onX);
  T.ok(seen.length > 5 && seen.every(f => f.vis), `${what}: the new page's top is on screen every frame it is in view (${seen.filter(f => !f.vis).length} empty)`);
  const last = fr[fr.length - 1], settled = fr.filter(f => f.left === last.left);
  const jumps = settled.slice(1).map((f, i) => Math.abs(f.top - settled[i].top)).filter(d => d > 2);
  T.ok(!jumps.length, `${what}: no jump when it lands (${jumps.join(",") || "none"})`);
  T.ok(last.top > 40 && last.top < 200, `${what}: it ends with its top under the top bar (${last.top})`);
};
// 1) Badges → swipe → Ranks, from the bottom of Badges
await p.click('[data-pf-tab="1"]'); await p.waitForTimeout(800);
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400);
T.ok(await p.evaluate(() => scrollY) > 800, "scrolled to the bottom of Badges");
await rec(2, "[data-rank-row]");
const b = await p.locator("[data-pf-pager]").boundingBox();
await cdp.send("Input.synthesizeScrollGesture", { x: 180, y: 400, xDistance: -300, yDistance: 0, gestureSourceType: "mouse", speed: 1400 });
await p.waitForTimeout(1400);
T.eq(await p.getAttribute('[data-pf-tab="2"]', "aria-selected"), "true", "swipe: Ranks open");
check(await p.evaluate(() => window.__fr), "Badges → Ranks (swipe)");
// 2) Badges → tap Stats (skips a page), from the bottom of Badges
await p.click('[data-pf-tab="1"]'); await p.waitForTimeout(900);
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(400);
await rec(3, "[data-pf-stats]");
await p.click('[data-pf-tab="3"]'); await p.waitForTimeout(1400);
check(await p.evaluate(() => window.__fr), "Badges → Stats (tap)");
// 3) back to Badges from Stats at the top: no shift needed, still fine
await p.evaluate(() => window.scrollTo(0, 0)); await p.click('[data-pf-tab="1"]'); await p.waitForTimeout(900);
T.eq(await p.getAttribute('[data-pf-tab="1"]', "aria-selected"), "true", "back to Badges");
T.eq(await p.evaluate(() => [...document.querySelectorAll(".swPage")].filter(x => x.style.transform).length), 0, "no page keeps a shift after landing");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
