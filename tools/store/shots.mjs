// Google Play phone screenshots for 1.9.0+ in every language: 8 screens, 412×733 CSS px at 1080/412 → 1080×1921 (cropped to 1920 later)
import { start, entry } from "/home/claude/hw-app/tests/harness.mjs";
import * as G from "/home/claude/hw-app/src/game/engine.js";
import { DEF_PLANS } from "/home/claude/hw-app/src/defplans.js";
import { storeOf } from "/home/claude/hw-app/src/plans.js";
import { LIB } from "/home/claude/hw-app/src/exlib.js";
import fs from "node:fs";
const LANGS = (process.env.LANGS || "en,sk,cs,pl,hu,uk,de,es,fr,it,pt,zh,ja,ko,id").split(",");
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const ROOT = process.env.OUT || "/home/claude/hw-app/store/out/shots/";
const NOW = new Date(2026, 10, 7, 17, 30).getTime();
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const it = (id, res, kg) => ({ id, name: id, unit: "", res, ...(kg ? { kg } : {}) });
const hist = [];
for (let i = 1; i < 40; i++) {
  const d = new Date(2026, 10, 7 - i * 2 - (i % 5 === 0 ? 1 : 0)); const g = i / 40;
  const day = "ABC"[i % 3];
  const items = day === "A" ? [it("k1", [Math.round(28 - 8 * g), Math.round(25 - 8 * g), Math.round(22 - 7 * g)]), it("row1", [14, 13, 12]), it("n1", [30, 28, 25]), it("b5", ["90s", "80s", "75s"])]
    : day === "B" ? [it("r1", [12, 11, 10]), it("fw_goblet_squat", [12, 11, 10], [24, 24, 24]), it("n2", [14, 13, 12]), it("b2", [20, 18, 16])]
    : [it("k3", [16, 14, 12]), it("fw_one_arm_dumbbell_row", [12, 12, 10], [22, 22, 22]), it("bridge", [25, 24, 22]), it("hollow", ["45s", "40s", "35s"])];
  hist.push(entry(key(d), day, items, { dur: 1100 + (i % 4) * 90 }));
}
// two strong recent workouts, so the body map on the Profile shows real colour (Platinum to Amethyst)
hist.push(entry(key(new Date(2026, 10, 3)), "A", [it("k1", [42, 38, 35]), it("row1", [27, 25, 24]), it("n1", [46, 42, 40]), it("b5", ["160s", "140s", "120s"]), it("bw_calf_raise", [72, 65, 60]), it("r1", [26, 24, 22])], { dur: 1260 }));
hist.push(entry(key(new Date(2026, 10, 5)), "B", [it("k3", [29, 26, 24]), it("row2", [24, 22, 20]), it("n2", [28, 26, 24]), it("bridge", [62, 58, 55]), it("hollow", ["95s", "85s", "80s"]), it("bw_split_squat", [32, 30, 28]), it("bw_side_plank", ["80s", "70s", "60s"]), it("sbridge", [26, 24, 22])], { dur: 1380 }));
hist.sort((a, b) => b.ts - a.ts);
hist.reverse();
// 1.9.2: plans are single workouts + a week (Mon A, Tue B, Wed A, Fri A, Sat B)
const P = (id, n, name, ts, items) => ({ id, n, name, grp: null, ts, mts: ts, items, days: {}, ds: "{}" });
const plans = { v: 2, list: [
  P("pA", 1, "", NOW - 9e8, [{ id: "k1", sets: 3 }, { id: "row1", sets: 3 }, { id: "n1", sets: 3 }, { id: "b5", sets: 2 }]),
  P("pB", 2, "", NOW - 5e8, [{ id: "fw_goblet_squat", sets: 4 }, { id: "fw_one_arm_dumbbell_row", sets: 4 }, { id: "hollow", sets: 2 }]),
], groups: [], seq: 2, del: {}, week: { 1: "pA", 2: "pB", 3: "pA", 5: "pA", 6: "pB" }, wmts: 1, sort: "date", dir: "asc" };
const kcLog = {};
for (let i = 0; i < 20; i++) { const d = new Date(2026, 10, 7 - i); kcLog[key(d)] = [{ ts: d.getTime() + 3600e3 * 12, kcal: 1900 + ((i * 137) % 600), note: "" }]; }
const seed = { history: hist, profile: { name: "Alex", birth: { y: 1998 }, tourDone: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], plans, look: { frame: "f_neon", title: "t_rookie" }, shop: { buys: [{ i: "f_neon", w: "look", p: 0, ts: 1 }, { i: "t_rookie", w: "look", p: 0, ts: 1 }] } },
  kcal: { sex: "m", weight: 78, height: 182, activity: "light", goal: { type: "maintain" }, log: kcLog } };
// Muscle Deck save: a blind with jokers and drill levels
let gst = null, gmoves = [], gopts = null;
for (let k = 0; k < 60 && !gst; k++) { gopts = { seed: "rd" + k, mode: "run", suit: { push: 4, pull: 3, legs: 4, core: 3 } }; let s = G.newGame(gopts), mv = [];
  for (let n = 0; n < 400 && s.phase !== "over" && s.phase !== "won"; n++) { if (s.phase === "blind" && s.jokers.length >= 4 && Object.keys(s.levels || {}).length && s.score === 0) { gst = s; gmoves = mv; break; } const m = G.botMove(s, 5); s = G.act(s, m); mv.push(m); } }
// sample cloud data (fake cloud of the tests): Library plans and two duos
const dayKey = n => key(new Date(NOW - n * 864e5));
const wkOf = (() => { const d = new Date(NOW); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
const pubOf = (pid, o, nick, name, items, x) => ({ pid, o, nick, n: 1, ts: NOW - 3e8, sv: 0, st: 0, sn: 0, avg: 0, ...storeOf({ id: pid, items }, LIB, name), ...x });
const DEF_X = { a: { sv: 412, avg: 4.8, sn: 96, ws: 31, wk: wkOf }, b: { sv: 301, avg: 4.7, sn: 70 }, c: { sv: 255, avg: 4.7, sn: 61 }, start: { sv: 380, avg: 4.9, sn: 88, ws: 24, wk: wkOf }, core: { sv: 274, avg: 4.6, sn: 52, ws: 12, wk: wkOf }, db: { sv: 198, avg: 4.8, sn: 40 } };
const pub = [
  ...DEF_PLANS.map((d, i) => pubOf("hwapp_" + d.k, "hwapp", "HW App", d.name, d.items, { k: d.k, ts: NOW - 9e8 - i * 1e6, ...(DEF_X[d.k] || { sv: 40 + i * 9, avg: 4.5, sn: 8 }) })),
  pubOf("maraUUUUU_p1", "maraUUUUU", "Mara", "Morning push", [{ id: "k1", sets: 4 }, { id: "k3", sets: 3 }, { id: "r1", sets: 3 }, { id: "b5", sets: 2 }], { sv: 87, avg: 4.6, sn: 21, ws: 15, wk: wkOf, ts: NOW - 2e8 }),
  pubOf("theoUUUUU_p2", "theoUUUUU", "Theo", "Glutes and legs", [{ id: "n1", sets: 4 }, { id: "bw_split_squat", sets: 3 }, { id: "bridge", sets: 3 }, { id: "bw_calf_raise", sets: 3 }], { sv: 64, avg: 4.4, sn: 13, ts: NOW - 1e8 }),
  pubOf("noraUUUUU_p3", "noraUUUUU", "Nora", "Dumbbell 30", [{ id: "fw_goblet_squat", sets: 3 }, { id: "fw_dumbbell_bench_press", sets: 3 }, { id: "fw_one_arm_dumbbell_row", sets: 3 }], { sv: 52, avg: 4.9, sn: 11, ts: NOW - 5e7 }),
];
const friends = [{ uid: "maraUUUUU", nick: "Mara", xp: 5200, lvl: 9 }, { uid: "theoUUUUU", nick: "Theo", xp: 3100, lvl: 7 }, { uid: "noraUUUUU", nick: "Nora", xp: 1400, lvl: 4 }];
const tdays = (a, b) => { const d = []; for (let i = a; i <= b; i += 2) d.push(dayKey(i)); return d; };
const me = { prof: { nick: "Alex", code: "K7RQ2PXM" } };
const CLOUD = {
  "04_library": { ...me, pub, friends },
  "06_together": {
    ...me, friends,
    fstreaks: [
      { id: "maraUUUUU_me", other: "maraUUUUU", by: "me", ok: true, start: dayKey(41), k: "wk", ks: dayKey(20), g: 7 },
      { id: "theoUUUUU_me", other: "theoUUUUU", by: "theoUUUUU", ok: true, start: dayKey(15), k: "w", g: 6 },
    ],
    vdays: {
      maraUUUUU: { d: tdays(1, 41), s: { [dayKey(1)]: 14, [dayKey(3)]: 12, [dayKey(5)]: 13 }, k: Array.from({ length: 21 }, (_, i) => dayKey(i)), f: [] },
      theoUUUUU: { d: tdays(0, 16), s: { [dayKey(0)]: 11, [dayKey(2)]: 10, [dayKey(4)]: 12 }, k: [], f: [] },
    },
    rew: { i: { x1: "a", x2: "b" } },
  },
};
const menu = async (p, s) => { if (await p.locator("[data-menu-btn]").isVisible().catch(() => false)) { await p.click("[data-menu-btn]"); await p.waitForTimeout(400); } await p.click(`[data-screen="${s}"]`); await p.waitForTimeout(1400); };
const SHOTS = [
  ["01_home", async p => { for (let k = 0; k < 6; k++) { const n = await p.getAttribute("[data-notice]", "data-notice").catch(() => "none"); if (!n || n === "none") break; await p.evaluate(() => { const b = document.querySelector("[data-notice] button[aria-label]"); if (b) b.click(); }); await p.waitForTimeout(600); } await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400); }],
  ["02_workout", async p => { await p.click("[data-fstart-go]"); await p.click("[data-warmup-go]"); await p.waitForSelector("[data-done-btn]"); await p.waitForTimeout(900); }],
  ["03_summary", "summary"],
  // 1.10.0: the Library (other people's plans + HW App's own) and Together replace My plans and Stats
  ["04_library", async p => { await menu(p, "plans"); await p.click('[data-plans-seg="store"]', { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1600); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400); }],
  ["05_profile", async p => { await menu(p, "profile"); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(700); }],
  ["06_together", async p => { await menu(p, "friends"); await p.click('[data-seg="together"]', { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1600); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400); }],
  ["07_calories", async p => { await menu(p, "calories"); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(900); }],
  ["08_deck", async p => {
    await menu(p, "game"); await p.click("[data-gm-continue]"); await p.waitForSelector("[data-game]"); await p.waitForTimeout(900);
    const vals = await p.$$eval("[data-gm-hand] [data-card]", e => e.map(x => +x.getAttribute("data-card")));
    const byV = {}; vals.forEach(c => { const v = c % 13; (byV[v] = byV[v] || []).push(c); });
    const pair = Object.values(byV).find(a => a.length >= 2) || vals.slice(0, 2);
    for (const c of pair.slice(0, 2)) await p.click(`[data-gm-hand] [data-card="${c}"]`);
    await p.waitForTimeout(1000);
  }],
  // README only (MORE=1): History and Shop are not among the 8 store screenshots
  ...(process.env.MORE ? [
    ["04_plans", async p => { await menu(p, "plans"); await p.click('[data-plans-seg="mine"]', { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1200); }],
    ["06_stats", async p => { await menu(p, "profile"); await p.click('[data-pf-tab="3"]', { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1600); }],
    ["09_history", async p => { await menu(p, "history"); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(900); }],
    ["10_shop", async p => { await menu(p, "shop"); await p.click('[data-shop-tab="1"]', { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1600); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600); }],
  ] : []),
];
const VIEW = { width: +(process.env.W || 412), height: +(process.env.H || 733) }, DPR = +(process.env.DPR || 1080 / 412);
for (const lang of LANGS) {
  fs.mkdirSync(ROOT + lang, { recursive: true });
  for (const [name, fn] of SHOTS) {
    if (ONLY && !ONLY.includes(name)) continue;
    if (fn === "summary") {
      // a plan workout that beats last time: records, ranks, badges on the summary
      const day = items => ({ id: "pS", n: 3, name: "", grp: null, ts: 1, mts: 1, items, days: {}, ds: "{}" });
      const h4 = [];
      for (let i = 0; i < 4; i++) h4.push(entry(`2026-10-${String(20 + i * 2).padStart(2, "0")}`, null, [it("k1", [10, 9])], { plan: { id: "pS", name: "", wd: 5 }, dur: 900 }));
      const h = await start({ lang, dpr: DPR, viewport: VIEW, clock: new Date(2026, 10, 7, 18).getTime(), seed: { history: h4, kcal: seed.kcal, profile: { name: "Alex", birth: { y: 1998 }, plans: { list: [day([{ id: "k1", sets: 2 }, { id: "fw_goblet_squat", sets: 2 }])], groups: [], seq: 3, del: {}, v: 2, week: { 6: "pS" }, wmts: 1 } } } });
      const p = h.page;
      try {
        await p.click("[data-fstart-go]"); await p.click("[data-warmup-go]");
        const reps = async n => { await p.clock.runFor(70000); await p.click("[data-reps]"); await p.fill("[data-reps-input]", String(n)); await p.keyboard.press("Enter"); await p.click("[data-done-btn]"); await p.clock.runFor(45000); };
        const next = async () => { const r = p.locator("[data-rest-ready]"); if (await r.count()) await r.click(); };
        for (const step of [() => reps(14), next, () => reps(12), next, () => reps(12), next, () => reps(10), next]) await step();
        await p.click("[data-cool-finish]");
        await p.waitForSelector("[data-summary]", { timeout: 6000 }); await p.waitForTimeout(2800);
        await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
        await p.screenshot({ path: `${ROOT}${lang}/${name}.png` });
      } catch (e) { console.log(lang, name, "FAIL", String(e).slice(0, 200)); }
      if (h.errors.length) console.log(lang, name, h.errors);
      await h.close(); continue;
    }
    const extra = name === "08_deck" ? { extra: { "domaci-trening-v1-game": { mode: "run", opts: gopts, moves: gmoves, at: 1 } } } : {};
    const kc = CLOUD[name] ? { ...seed.kcal, log: { ...seed.kcal.log, ...Object.fromEntries(Array.from({ length: 21 }, (_, i) => [dayKey(i), [{ ts: NOW - i * 864e5, kcal: 2100, note: "" }]])) } } : seed.kcal;
    const h = await start({ lang, dpr: DPR, viewport: VIEW, clock: NOW, ...(CLOUD[name] ? { cloud: CLOUD[name] } : {}), seed: { ...seed, kcal: kc, ...extra } });
    const p = h.page; await p.waitForTimeout(1000);
    try { if (fn) await fn(p); await p.screenshot({ path: `${ROOT}${lang}/${name}.png` }); }
    catch (e) { console.log(lang, name, "FAIL", String(e).slice(0, 200)); }
    if (h.errors.length) console.log(lang, name, h.errors);
    await h.close();
  }
  console.log("done", lang);
}
