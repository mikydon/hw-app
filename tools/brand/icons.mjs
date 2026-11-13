// Every icon and launch picture, rendered from assets/mark.svg (1.10.0, Nov 13, 2026: Michael picked logo "A" =
// the same mark on black, to go with the black default theme). The old render scripts lived in /tmp and were lost.
//   node tools/brand/icons.mjs            → root PNGs, Android legacy icons + launch pictures, the wordmark PNG
//   OUT=<folder> node tools/brand/icons.mjs → also the 512 px Play Store icon (full square, Play rounds it itself)
// The adaptive launcher icon (Android 8+) is ic_launcher_foreground.png (unchanged, transparent) over the colour
// ic_launcher_background in res/values (black since this change).
import { createRequire } from "node:module"; const { chromium } = createRequire(new URL("../../tests/harness.mjs", import.meta.url))("playwright");
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), RES = path.join(ROOT, "android/app/src/main/res/"), F = path.join(ROOT, "fonts/");
const BG = "#000000";
const mark = fs.readFileSync(path.join(ROOT, "assets/mark.svg"), "utf8");
const glyph = mark.replace(/<rect width="512" height="512" rx="116" fill="#[0-9a-f]{6}"\/>/, ""); // the mark without its tile
if (glyph === mark) throw new Error("assets/mark.svg: the tile rect was not found");
const tile = rx => mark.replace('rx="116"', `rx="${rx}"`);
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 1 });
const shot = async (file, w, h, html, clear) => {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<style>*{margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden;background:${clear ? "transparent" : BG}}svg{display:block}</style>${html}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: file, omitBackground: !!clear });
};
const sized = (svg, s, extra = "") => svg.replace("<svg ", `<svg width="${s}" height="${s}" style="${extra}" `);
// website / PWA
for (const s of [192, 512]) {
  await shot(path.join(ROOT, `icon-${s}.png`), s, s, sized(mark, s), true);            // rounded tile on transparent
  await shot(path.join(ROOT, `icon-maskable-${s}.png`), s, s, sized(tile(0), s));       // full square (the launcher cuts the shape)
}
await shot(path.join(ROOT, "apple-touch-icon.png"), 180, 180, sized(tile(0), 180));
// Android before 8 (legacy icons); the app's minSdk is 26, so these only matter to tools that read them
for (const [d, s] of [["mdpi", 48], ["hdpi", 72], ["xhdpi", 96], ["xxhdpi", 144], ["xxxhdpi", 192]]) {
  await shot(`${RES}mipmap-${d}/ic_launcher.png`, s, s, sized(mark, s), true);
  await shot(`${RES}mipmap-${d}/ic_launcher_round.png`, s, s, sized(tile(256), s), true);
}
// launch picture before Android 12 (12+ draws the icon on hw_window_bg itself): the mark alone in the middle
const SPL = [["drawable", 480, 320], ["drawable-land-mdpi", 480, 320], ["drawable-land-hdpi", 800, 480], ["drawable-land-xhdpi", 1280, 720], ["drawable-land-xxhdpi", 1600, 960], ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480], ["drawable-port-hdpi", 480, 800], ["drawable-port-xhdpi", 720, 1280], ["drawable-port-xxhdpi", 960, 1600], ["drawable-port-xxxhdpi", 1280, 1920]];
for (const [d, w, h] of SPL) { const s = Math.round(Math.min(w, h) * 0.44); await shot(`${RES}${d}/splash.png`, w, h, `<div style="width:${w}px;height:${h}px;display:grid;place-items:center">${sized(glyph, s)}</div>`); }
// the wordmark (README) with the app's real fonts
const ff = (fam, file, wt) => `@font-face{font-family:'${fam}';font-weight:${wt};src:url(data:font/woff2;base64,${fs.readFileSync(F + file).toString("base64")}) format('woff2')}`;
const wm = fs.readFileSync(path.join(ROOT, "assets/logo-wordmark.svg"), "utf8");
await shot(path.join(ROOT, "assets/logo-wordmark.png"), 1200, 400, `<style>${ff("Big Shoulders Display", "big-shoulders-display-latin-900-normal.woff2", 900)}${ff("Figtree", "figtree-latin-600-normal.woff2", 600)}</style>${wm.replace("<svg ", '<svg width="1200" height="400" ')}`);
if (process.env.OUT) { fs.mkdirSync(process.env.OUT, { recursive: true }); await shot(path.join(process.env.OUT, "icon-512.png"), 512, 512, sized(tile(0), 512)); }
await b.close();
console.log("icons rendered");
