import { createRequire } from "module"; const { chromium } = createRequire("/home/claude/hw-app/tests/harness.mjs")("playwright");
import fs from "fs";
const Y = "#ffd23f", W = "#f4f6ff", K = "#000000";
const bg = `<rect width="512" height="512" rx="116" fill="${K}"/>`;
export const L = {
  A: `${bg}<path d="M118 244 L256 128 L394 244" fill="none" stroke="${Y}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
      <g fill="${W}"><rect x="176" y="326" width="160" height="30" rx="15"/><rect x="132" y="278" width="42" height="126" rx="17"/><rect x="338" y="278" width="42" height="126" rx="17"/><rect x="96" y="304" width="30" height="74" rx="13"/><rect x="386" y="304" width="30" height="74" rx="13"/></g>`,
  B: `${bg}<g fill="${Y}"><rect x="150" y="120" width="64" height="272" rx="28"/><rect x="298" y="120" width="64" height="272" rx="28"/><rect x="196" y="234" width="120" height="44" rx="14"/><rect x="96" y="176" width="40" height="160" rx="18"/><rect x="376" y="176" width="40" height="160" rx="18"/></g>`,
  C: `${bg}<path d="M112 236 L256 116 L400 236 V372 a28 28 0 0 1-28 28 H140 a28 28 0 0 1-28-28 Z" fill="none" stroke="${Y}" stroke-width="34" stroke-linejoin="round"/>
      <g fill="${W}"><rect x="212" y="292" width="88" height="24" rx="12"/><rect x="182" y="258" width="32" height="92" rx="13"/><rect x="298" y="258" width="32" height="92" rx="13"/></g>`,
  D: `${bg}<path d="M132 258 L256 150 L380 258" fill="none" stroke="${Y}" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/>
      <g fill="none" stroke="${W}" stroke-width="34" stroke-linecap="round"><path d="M176 352 H336"/></g><g fill="${W}"><circle cx="150" cy="352" r="38"/><circle cx="362" cy="352" r="38"/></g>`,
};
for (const [k, v] of Object.entries(L)) fs.writeFileSync(`logo-${k}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${v}</svg>`);
if (process.argv[2] !== "lib") {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 520 }, deviceScaleFactor: 1 });
  const svg = (v, s) => `<svg width="${s}" height="${s}" viewBox="0 0 512 512">${v}</svg>`;
  await p.setContent(`<body style="margin:0;background:#1c1d22;color:#fff;font:600 26px sans-serif;display:flex;gap:40px;padding:36px">${Object.entries(L).map(([k, v]) => `<div style="text-align:center">${svg(v, 300)}<div style="margin:14px 0 10px">${k}</div><div style="display:flex;gap:14px;justify-content:center;align-items:end">${svg(v, 96)}${svg(v, 56)}${svg(v, 32)}</div></div>`).join("")}</body>`);
  await p.screenshot({ path: "logo-navrhy.png" }); await b.close();
}
