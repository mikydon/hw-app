// 1.9.0 (Michael, Nov 6: "Wednesda / y" broke out of the box): the weekday title on Home fits on one line inside its
// box for every weekday in every language, on a 360 px and a 412 px phone.
import { start, T } from "./harness.mjs";
const LANGS = "en sk cs pl hu uk de es fr it pt zh ja ko id".split(" ");
const days = {}; for (let d = 1; d <= 7; d++) days[d] = [{ id: "k1", sets: 2 }];
for (const w of [360, 412]) {
  for (const lang of LANGS) {
    const h = await start({ lang, viewport: { width: w, height: 800 }, clock: new Date(2026, 10, 4, 18).getTime(), seed: { ui: { setupHidden: true }, profile: { plans: { list: [{ id: "pA", n: 1, name: "", grp: null, ts: 1, mts: 1, days }], groups: [], seq: 1, del: {}, active: "pA" } } } });
    const p = h.page, bad = [];
    for (let d = 1; d <= 7; d++) {
      await p.click(`[data-home-wd="${d}"]`);
      const r = await p.evaluate(() => {
        const t = document.querySelector("[data-day-title]"), box = t.closest("[data-home-hero]");
        const range = document.createRange(); range.selectNodeContents(t); const rects = [...range.getClientRects()];
        const lines = new Set(rects.map(x => Math.round(x.top))).size, tr = range.getBoundingClientRect(), br = box.getBoundingClientRect();
        return { text: t.innerText, lines, inside: tr.left >= br.left && tr.right <= br.right - 8 };
      });
      if (r.lines !== 1 || !r.inside) bad.push(`${r.text} (lines ${r.lines}, inside ${r.inside})`);
    }
    T.ok(!bad.length, `${w}px ${lang}: all 7 weekdays on one line inside the box${bad.length ? " — " + bad.join(", ") : ""}`);
    await h.close();
  }
}
T.done();
