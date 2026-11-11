import { createRequire } from "module"; const { chromium } = createRequire("/home/claude/hw-app/tests/harness.mjs")("playwright");
import fs from "fs";
const F = "/home/claude/hw-app/fonts/", SH = "/home/claude/hw-app/store/out/shots/en/";
const b64 = f => fs.readFileSync(f).toString("base64");
const font = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${b64(F + file)}) format('woff2')}`;
const css = `${font("BSD", "big-shoulders-display-latin-900-normal.woff2", 900)}${font("Fig", "figtree-latin-600-normal.woff2", 600)}${font("Fig", "figtree-latin-700-normal.woff2", 700)}
*{box-sizing:border-box}body{margin:0;background:#000;color:#f4f6ff;font-family:Fig,sans-serif;overflow:hidden;position:relative}
.glow{position:absolute;inset:0;background:radial-gradient(900px 700px at 78% 108%,#ffd23f33,transparent 62%),radial-gradient(700px 600px at 0% 0%,#74b9ff1c,transparent 60%)}
.brand{position:absolute;left:64px;top:60px;display:flex;align-items:center;gap:18px;font:900 44px BSD;letter-spacing:.04em}
.brand svg{width:72px;height:72px;border-radius:18px;box-shadow:0 0 0 2px #2b2f38}
h1{position:absolute;left:64px;right:64px;margin:0;font:900 132px/0.92 BSD;text-transform:uppercase;letter-spacing:-.005em}
h1 b{color:#ffd23f;font-weight:900}
.sub{position:absolute;left:64px;right:64px;font:600 40px/1.25 Fig;color:#aab3c8}
.phone{position:absolute;border-radius:64px;border:8px solid #2b2f38;background:#000;overflow:hidden;box-shadow:0 40px 120px #000,0 0 0 2px #111317,0 0 90px #ffd23f22}
.phone img{display:block;width:100%}
.cta{position:absolute;left:64px;display:inline-flex;align-items:center;gap:14px;background:#ffd23f;color:#141414;font:700 38px Fig;padding:22px 34px;border-radius:999px;box-shadow:0 8px 0 #c29300}`;
const logo = fs.readFileSync("logo-A.svg", "utf8");
const page = ({ w, h, head, sub, shot, story }) => {
  const pw = story ? 720 : 640, left = (w - pw) / 2, top = story ? 210 : 170, fs = story ? 132 : 120;
  return `<style>${css}body{width:${w}px;height:${h}px}h1{font-size:${fs}px}</style><div class="glow"></div>
  <div class="brand">${logo}<span>HW APP</span></div>
  <h1 style="top:${top}px">${head}</h1>
  <div class="sub" style="top:${top + fs * 0.92 * 2 + 30}px">${sub}</div>
  <div class="phone" style="left:${left}px;top:${top + fs * 0.92 * 2 + 130}px;width:${pw}px"><img src="data:image/png;base64,${b64(SH + shot)}"></div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:${story ? 330 : 260}px;background:linear-gradient(180deg,#0000,#000 62%)"></div>
  <div class="cta" style="left:50%;transform:translateX(-50%);bottom:${story ? 90 : 56}px;white-space:nowrap">Free on Google Play</div>`;
};
const base = [
  ["1-home", { head: "19 minutes.<br><b>No equipment.</b>", sub: "Three workouts. Every other day.", shot: "01_home.png" }],
  ["2-ranks", { head: "Every rep<br><b>ranks up.</b>", sub: "Iron to Obsidian, for every exercise.", shot: "05_profile.png" }],
  ["3-deck", { head: "Push-ups power<br><b>your cards.</b>", sub: "Muscle Deck: the card game inside.", shot: "08_deck.png" }],
  ["4-plans", { head: "Build your<br><b>own plan.</b>", sub: "134 exercises. Home or gym.", shot: "04_plans.png" }],
  ["5-stats", { head: "See yourself<br><b>get stronger.</b>", sub: "Every set, every week, in one place.", shot: "06_stats.png" }],
];
const items = [...base.map(([n, o]) => ["post-" + n, o]), ...base.map(([n, o]) => ["story-" + n, { ...o, story: 1 }])];
const b = await chromium.launch();
for (const [name, o] of items) {
  const w = 1080, h = o.story ? 1920 : 1350;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(page({ w, h, ...o })); await p.waitForTimeout(400);
  await p.screenshot({ path: `ig/${name}.png` }); await p.close();
}
await b.close();
