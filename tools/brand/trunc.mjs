// Clipped-text scan: every menu screen in every language at 360 px. Lists texts that are cut (ellipsis or hidden
// overflow). node trunc.mjs <out.json>   → compare two runs with: node trunc.mjs --diff a.json b.json
import fs from "fs";
if (process.argv[2] === "--diff") {
  const a = new Set(JSON.parse(fs.readFileSync(process.argv[3]))), b = JSON.parse(fs.readFileSync(process.argv[4]));
  const neu = b.filter(x => !a.has(x)); console.log("before", a.size, "after", b.length, "new", neu.length); console.log(neu.slice(0, 60).join("\n")); process.exit(0);
}
const { start } = await import("/home/claude/hw-app/tests/harness.mjs");
const { history, kcal } = await import("./shots.mjs");
const LANGS = (process.env.LANGS || "en sk cs pl hu uk de es fr it pt zh ja ko id").split(" ");
const SCREENS = ["train", "calories", "history", "profile", "plans", "shop", "game", "settings", "friends"];
const out = [];
for (const lang of LANGS) {
  const h = await start({ clock: new Date(2026, 10, 11, 18).getTime(), lang, viewport: { width: 360, height: 780 }, seed: { history, kcal, profile: { name: "Michael" } } });
  const p = h.page;
  for (const s of SCREENS) {
    if (s !== "train") { await p.click("[data-menu-btn]"); await p.waitForTimeout(250); await p.locator(`[data-nav-box] [data-screen="${s}"]`).click(); }
    await p.waitForTimeout(700);
    const hits = await p.evaluate(() => {
      const r = [];
      for (const el of document.querySelectorAll("body *")) {
        if (!el.childNodes.length || el.closest("[aria-hidden='true']:not(.swPage)") ) continue;
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!own) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || !el.offsetWidth) continue;
        const cutX = (cs.overflowX !== "visible") && el.scrollWidth > el.clientWidth + 1;
        const cutY = (cs.overflowY !== "visible") && el.scrollHeight > el.clientHeight + 2 && cs.whiteSpace === "nowrap";
        if (cutX || cutY) r.push((cutX ? "X " : "Y ") + el.textContent.trim().slice(0, 40));
      }
      return r;
    });
    hits.forEach(t => out.push(`${lang} | ${s} | ${t}`));
  }
  if (h.errors.length) console.log(lang, "errors", h.errors.slice(0, 2));
  await h.close();
}
fs.writeFileSync(process.argv[2], JSON.stringify([...new Set(out)]));
console.log("cut texts:", new Set(out).size);
