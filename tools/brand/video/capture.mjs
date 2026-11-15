// Marketing video, step 1 (1.10.0, Michael Nov 13: "a real video with animations, not a slideshow"): records short
// clips of the REAL app (its own animations) with Chrome's screencast, resampled to 30 fps JPEG frames.
// node tools/brand/video/capture.mjs [clip,…]   → $OUT/<clip>/00000.jpg … (default OUT = scratchpad/video/clips)
// Clips: workout (Home → Start → warm-up → reps → rest), summary, body, looks, deck. English, Black theme.
import { start, entry } from "../../../tests/harness.mjs";
import * as G from "../../../src/game/engine.js";
import fs from "node:fs";
const OUT = process.env.OUT || "/tmp/claude-0/-home-claude/13cd6817-ba32-5f61-a043-b3a139dad897/scratchpad/video/clips/";
const ONLY = process.argv[2] ? process.argv[2].split(",") : null;
const VIEW = { width: 390, height: 844 }, DPR = 2, FPS = 30;
const now = new Date(); now.setHours(17, 30, 0, 0);
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const it = (id, res, kg) => ({ id, name: id, unit: "", res, ...(kg ? { kg } : {}) });
const hist = [];
for (let i = 1; i < 40; i++) {
  const d = new Date(now); d.setDate(d.getDate() - i * 2 - (i % 5 === 0 ? 1 : 0)); const g = i / 40, day = "ABC"[i % 3];
  const items = day === "A" ? [it("k1", [Math.round(28 - 8 * g), Math.round(25 - 8 * g), Math.round(22 - 7 * g)]), it("row1", [14, 13, 12]), it("n1", [30, 28, 25]), it("b5", ["90s", "80s", "75s"])]
    : day === "B" ? [it("r1", [12, 11, 10]), it("n4", [12, 11, 10]), it("n2", [14, 13, 12]), it("b2", [20, 18, 16])]
    : [it("k3", [16, 14, 12]), it("row2", [12, 12, 10]), it("bridge", [25, 24, 22]), it("hollow", ["45s", "40s", "35s"])];
  hist.push(entry(key(d), day, items, { dur: 1100 + (i % 4) * 90 }));
}
hist.reverse();
const own = ["f_neon", "t_champion", "b_dusk", "n_neon", "fx_fireflies", "c_gold"];
const seed = { history: hist, profile: { name: "Alex", birth: { y: 1998 }, tourDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], look: { frame: "f_neon", title: "t_champion", bg: "b_dusk" }, shop: { buys: own.map((i, k) => ({ i, w: "look", p: 0, ts: k + 1 })) } },
  kcal: { sex: "m", weight: 78, height: 182, activity: "light", goal: { type: "maintain" }, log: {} } };
// a Muscle Deck save on a blind with jokers
let gst = null, gmoves = [], gopts = null;
for (let k = 0; k < 60 && !gst; k++) { gopts = { seed: "rd" + k, mode: "run", suit: { push: 4, pull: 3, legs: 4, core: 3 } }; let s = G.newGame(gopts), mv = [];
  for (let n = 0; n < 400 && s.phase !== "over" && s.phase !== "won"; n++) { if (s.phase === "blind" && s.jokers.length >= 4 && Object.keys(s.levels || {}).length && s.score === 0) { gst = s; gmoves = mv; break; } const m = G.botMove(s, 5); s = G.act(s, m); mv.push(m); } }

// A finger: a soft ring where the "tap" lands, then the click.
async function tap(p, sel, hold = 120) {
  await p.locator(sel).first().scrollIntoViewIfNeeded(); await p.waitForTimeout(120);
  const b = await p.locator(sel).first().boundingBox();
  if (!b) throw new Error("no " + sel);
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await p.evaluate(([x, y]) => {
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;left:${x - 26}px;top:${y - 26}px;width:52px;height:52px;border-radius:99px;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.75);z-index:2147483647;pointer-events:none;transform:scale(.6);opacity:0;transition:transform .18s ease-out,opacity .18s`;
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = "scale(1)"; d.style.opacity = "1"; });
    setTimeout(() => { d.style.transition = "transform .35s ease-out,opacity .35s"; d.style.transform = "scale(1.5)"; d.style.opacity = "0"; }, 260);
    setTimeout(() => d.remove(), 700);
  }, [x, y]);
  await p.waitForTimeout(hold);
  await p.mouse.click(x, y);
}
// Smooth scroll by dy over ms (requestAnimationFrame, eased)
const glide = (p, dy, ms) => p.evaluate(([dy, ms]) => new Promise(res => { const y0 = scrollY, t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; scrollTo(0, y0 + dy * e); if (k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }), [dy, ms]);

// Records fn() with the screencast; writes a constant 30 fps sequence (each slot = the newest frame before it).
async function rec(p, name, fn) {
  const cdp = await p.context().newCDPSession(p);
  const frames = [];
  cdp.on("Page.screencastFrame", f => { frames.push({ t: f.metadata.timestamp, d: f.data }); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: VIEW.width * DPR, maxHeight: VIEW.height * DPR, everyNthFrame: 1 });
  await p.waitForTimeout(250);
  const t0 = Date.now() / 1000;
  await fn();
  const t1 = Date.now() / 1000;
  await p.waitForTimeout(200);
  await cdp.send("Page.stopScreencast");
  const dir = OUT + name + "/"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  frames.sort((a, b) => a.t - b.t);
  const n = Math.round((t1 - t0) * FPS); let j = 0, last = frames[0];
  for (let i = 0; i < n; i++) {
    const t = t0 + i / FPS;
    while (j < frames.length && frames[j].t <= t) last = frames[j++];
    fs.writeFileSync(dir + String(i).padStart(5, "0") + ".jpg", Buffer.from(last.d, "base64"));
  }
  console.log(name, n, "frames from", frames.length, "screencast frames");
}
const clearNotices = async p => { for (let k = 0; k < 6; k++) { const n = await p.getAttribute("[data-notice]", "data-notice").catch(() => "none"); if (!n || n === "none") break; await p.evaluate(() => { const b = document.querySelector("[data-notice] button[aria-label]"); if (b) b.click(); }); await p.waitForTimeout(600); } };
const menu = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(450); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(1300); };
const go = name => !ONLY || ONLY.includes(name);
const open = async (extra) => { const h = await start({ dpr: DPR, viewport: VIEW, seed: { ...seed, ...(extra || {}) } }); await h.page.waitForTimeout(1200); return h; };

if (go("workout")) {
  const h = await open(); const p = h.page;
  await clearNotices(p); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  await rec(p, "workout", async () => {
    await p.waitForTimeout(1100);
    await tap(p, "[data-fstart-go]"); await p.waitForTimeout(1400);
    await tap(p, "[data-warmup-go]"); await p.waitForTimeout(1300);
    for (let k = 0; k < 4; k++) { await tap(p, 'button[aria-label="More"]', 80); await p.waitForTimeout(330); }
    await p.waitForTimeout(500);
    await tap(p, "[data-done-btn]"); await p.waitForTimeout(2200);
  });
  if (h.errors.length) console.log(h.errors); await h.close();
}
if (go("summary")) {
  const day = items => ({ id: "pS", n: 3, name: "", grp: null, ts: 1, mts: 1, items, days: {}, ds: "{}" });
  const h4 = [];
  for (let i = 0; i < 4; i++) { const d = new Date(now); d.setDate(d.getDate() - 9 + i * 2); h4.push(entry(key(d), null, [it("k1", [10, 9])], { plan: { id: "pS", name: "", wd: 5 }, dur: 900 })); }
  const h = await start({ dpr: DPR, viewport: VIEW, clock: now.getTime(), seed: { history: h4, kcal: seed.kcal, profile: { name: "Alex", birth: { y: 1998 }, tourDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], plans: { list: [day([{ id: "k1", sets: 2 }, { id: "n1", sets: 2 }])], groups: [], seq: 3, del: {}, v: 2, week: { [((now.getDay() + 6) % 7) + 1]: "pS" }, wmts: 1 } } } });
  const p = h.page; await p.waitForTimeout(1200);
  await p.click("[data-fstart-go]"); await p.click("[data-warmup-go]");
  const reps = async n => { await p.clock.runFor(70000); await p.click("[data-reps]"); await p.fill("[data-reps-input]", String(n)); await p.keyboard.press("Enter"); await p.click("[data-done-btn]"); await p.clock.runFor(45000); };
  const next = async () => { const r = p.locator("[data-rest-ready]"); if (await r.count()) await r.click(); };
  for (const step of [() => reps(14), next, () => reps(12), next, () => reps(24), next, () => reps(22), next]) await step();
  await p.waitForSelector("[data-cool-finish]"); await p.waitForTimeout(600);
  await rec(p, "summary", async () => {
    await p.waitForTimeout(400);
    await tap(p, "[data-cool-finish]"); await p.waitForTimeout(4200);
  });
  if (h.errors.length) console.log(h.errors); await h.close();
}
if (go("body")) {
  const h = await open(); const p = h.page;
  await menu(p, "profile"); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
  await rec(p, "body", async () => {
    await p.waitForTimeout(900);
    await tap(p, "[data-body-toggle]"); await p.waitForTimeout(1500);
    await glide(p, 330, 900); await p.waitForTimeout(900);
  });
  if (h.errors.length) console.log(h.errors); await h.close();
}
if (go("looks")) {
  const h = await open(); const p = h.page;
  await menu(p, "shop"); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  await rec(p, "looks", async () => {
    await p.waitForTimeout(700);
    await tap(p, '[data-shop-tab="1"]'); await p.waitForTimeout(1300);
    await glide(p, 520, 1600); await p.waitForTimeout(900);
  });
  if (h.errors.length) console.log(h.errors); await h.close();
}
if (go("deck")) {
  const h = await open({ extra: { "domaci-trening-v1-game": { mode: "run", opts: gopts, moves: gmoves, at: 1 } } }); const p = h.page;
  await menu(p, "game"); await p.click("[data-gm-continue]"); await p.waitForSelector("[data-game]"); await p.waitForTimeout(1200);
  const vals = await p.$$eval("[data-gm-hand] [data-card]", e => e.map(x => +x.getAttribute("data-card")));
  const byV = {}; vals.forEach(c => { const v = c % 13; (byV[v] = byV[v] || []).push(c); });
  const best = Object.values(byV).sort((a, b) => b.length - a.length)[0];
  await rec(p, "deck", async () => {
    await p.waitForTimeout(700);
    for (const c of best.slice(0, 3)) { await tap(p, `[data-gm-hand] [data-card="${c}"]`); await p.waitForTimeout(380); }
    await p.waitForTimeout(500);
    await tap(p, "[data-gm-play]"); await p.waitForTimeout(3600);
  });
  if (h.errors.length) console.log(h.errors); await h.close();
}
