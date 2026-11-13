// Google Play phone screenshots with a tagline, 1080×1920, and the feature graphic 1024×500 (1.10.0, Nov 13, 2026;
// Michael: "new photos for the Play Store"). Made from the plain screenshots of tools/store/shots.mjs
// (store/out/shots/<lang>/), so run that first.  node tools/store/framed.mjs   (LANGS=en,sk)
// Google's rules for preview assets (support.google.com/googleplay/android-developer/answer/9866151, read Nov 13):
//  - screenshots show the real app; taglines take at most 20 % of the image and are no call to action ("Download
//    now", "Install now", "Play now", "Try now"), no price ("Free"), no ranking, award or "Best / #1 / Top / New";
//  - at least four screenshots of 1080 px or more to be shown in recommendations;
//  - taglines should be translated for each listing language (CAPS below; a language without texts is skipped);
//  - tablets / large screens: no added text, so those keep the plain screenshots;
//  - feature graphic: no device pictures, not pure black / white / dark grey, nothing important near the edges.
import { createRequire } from "node:module"; const { chromium } = createRequire(new URL("../../tests/harness.mjs", import.meta.url))("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), S = path.join(ROOT, "store/out/"), F = path.join(ROOT, "fonts/");
const SHOTS = ["01_home", "02_workout", "03_summary", "04_plans", "05_profile", "06_stats", "07_calories", "08_deck"];
// [headline (<b> = the yellow part, <br> = line break), one line under it], in the order of SHOTS; last = feature graphic headline
const CAPS = {
  en: [
    ["Train at home in<br><b>under 20 minutes</b>", "With or without equipment"],
    ["Beat your<br><b>last workout</b>", "The app shows what to aim for"],
    ["Earn XP, records<br>and <b>badges</b>", "After every workout"],
    ["Build your<br><b>own plans</b>", "134 exercises for home and gym"],
    ["Level up<br><b>every muscle</b>", "9 ranks, from Iron to Obsidian"],
    ["See your<br><b>progress</b>", "Every workout, week by week"],
    ["Hit your<br><b>calorie target</b>", "Your workouts are counted in"],
    ["Muscle Deck:<br><b>the card game</b>", "Your training makes your cards stronger"],
    ["Home workouts<br>in 19 minutes", "Plans, ranks, streaks and a card game"],
  ],
};
const LANGS = (process.env.LANGS ? process.env.LANGS.split(",") : Object.keys(CAPS)).filter(l => CAPS[l]);
const ff = (fam, file, w) => fs.existsSync(F + file) ? `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(F + file).toString("base64")}) format('woff2')}` : "";
const fonts = ["latin", "latin-ext"].map(s => ff("BSD", `big-shoulders-display-${s}-900-normal.woff2`, 900) + ff("Fig", `figtree-${s}-600-normal.woff2`, 600) + ff("Fig", `figtree-${s}-700-normal.woff2`, 700)).join("")
  + ["latin", "latin-ext", "cyrillic"].map(s => ff("Osw", `oswald-${s}-700-normal.woff2`, 700)).join("");
const img = p => "data:image/png;base64," + fs.readFileSync(p).toString("base64");
const mark = fs.readFileSync(path.join(ROOT, "assets/mark.svg"), "utf8");
const GLOW = ["#ffd23f", "#ffd23f", "#4ade80", "#ffd23f", "#74b9ff", "#ffd23f", "#4ade80", "#ffd23f"]; // a soft light behind the screen
const shotPage = (l, i) => `<!doctype html><html lang="${l}"><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;overflow:hidden;background:#000;position:relative;font-family:Fig,'Noto Sans','Noto Sans CJK SC',sans-serif}
.glow{position:absolute;inset:0;background:radial-gradient(900px 620px at 50% 0%,${GLOW[i]}2e,transparent 70%),radial-gradient(800px 700px at 50% 62%,${GLOW[i]}14,transparent 70%)}
.cap{position:absolute;left:60px;right:60px;top:0;height:372px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
h1{font:900 104px/0.95 BSD,Osw,'Noto Sans CJK SC',sans-serif;text-transform:uppercase;color:#f4f6ff;letter-spacing:.2px}h1 b{color:#ffd23f;font-weight:900}
p{margin-top:18px;font:600 38px/1.2 Fig,'Noto Sans','Noto Sans CJK SC',sans-serif;color:#aab3c8}
.scr{position:absolute;left:105px;top:360px;width:870px;height:1548px;border-radius:52px;overflow:hidden;background:#000;box-shadow:0 0 0 3px #2b2f38,0 30px 90px #000,0 0 120px ${GLOW[i]}1f}
.scr img{display:block;width:100%}
</style><div class="glow"></div><div class="cap"><h1>${CAPS[l][i][0]}</h1><p>${CAPS[l][i][1]}</p></div>
<div class="scr"><img src="${img(S + "shots/" + l + "/" + SHOTS[i] + ".png")}"></div></html>`;
// a piece of a screenshot as a card: [file, top, height] in screenshot pixels (1080 wide)
const crop = (l, file, top, h, w, style) => `<div class="card" style="width:${w}px;height:${Math.round(h * w / 1000)}px;${style}"><img src="${img(S + "shots/" + l + "/" + file + ".png")}" style="width:${Math.round(1080 * w / 1000)}px;margin-left:-${Math.round(40 * w / 1000)}px;margin-top:-${Math.round(top * w / 1000)}px"></div>`;
const featurePage = l => `<!doctype html><html lang="${l}"><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box;margin:0}body{width:1024px;height:500px;overflow:hidden;position:relative;background:linear-gradient(135deg,#ffdc5c 0%,#ffd23f 45%,#ffb62e 100%);font-family:Fig,sans-serif}
.left{position:absolute;left:84px;top:0;bottom:0;width:480px;display:flex;flex-direction:column;justify-content:center}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:20px}.brand svg{width:64px;height:64px;border-radius:16px;box-shadow:0 6px 18px #0003}
.name{font:900 50px/1 BSD,Osw,sans-serif;color:#141414;letter-spacing:.5px}
h1{font:900 82px/0.94 BSD,Osw,'Noto Sans CJK SC',sans-serif;text-transform:uppercase;color:#141414}
p{margin-top:16px;font:700 23px/1.3 Fig,'Noto Sans',sans-serif;color:#3d3212}
.card{position:absolute;border-radius:26px;overflow:hidden;background:#000;box-shadow:0 0 0 2px #1b1b1b,0 22px 50px #5a3d0066}.card img{display:block}
</style><div class="left"><div class="brand">${mark}<div class="name">HW APP</div></div><h1>${CAPS[l][8][0]}</h1><p>${CAPS[l][8][1]}</p></div>
${crop(l, "05_profile", 236, 640, 300, "left:690px;top:-40px;transform:rotate(7deg)")}
${crop(l, "03_summary", 640, 560, 300, "left:560px;top:250px;transform:rotate(-5deg)")}
${crop(l, "01_home", 225, 545, 330, "left:640px;top:96px;transform:rotate(-2deg)")}
</html>`;
const b = await chromium.launch();
for (const l of LANGS) {
  fs.mkdirSync(S + "framed/" + l, { recursive: true });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (let i = 0; i < SHOTS.length; i++) {
    if (process.env.ONLY && !SHOTS[i].includes(process.env.ONLY)) continue;
    await p.setContent(shotPage(l, i)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    const m = await p.evaluate(() => { const h = document.querySelector("h1").getBoundingClientRect(), q = document.querySelector("p").getBoundingClientRect(); return { top: Math.round(h.top), bottom: Math.round(q.bottom), wide: Math.max(h.width, q.width) > 961 || document.querySelector("h1").scrollWidth > 961 }; });
    // the tagline is the text block: it must end above the screen and stay under 20 % of the picture (384 px)
    if (m.bottom > 352 || m.bottom - m.top > 384 || m.wide) console.log(`!! ${l} ${SHOTS[i]}: the tagline does not fit`, JSON.stringify(m));
    await p.screenshot({ path: `${S}framed/${l}/${SHOTS[i]}.png`, omitBackground: false });
  }
  await p.setViewportSize({ width: 1024, height: 500 });
  await p.setContent(featurePage(l)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({ path: `${S}framed/${l}/feature.png` });
  await p.close(); console.log(l, "done");
}
await b.close();
