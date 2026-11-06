// 1.9.0 (Michael, Nov 6: "Wednesda / y" broke out of the box): today's weekday name, the big header of Home's week
// card, fits on one line inside its box on every weekday in every language, on a 360 px and a 412 px phone.
import { start, T } from "./harness.mjs";
const LANGS = "en sk cs pl hu uk de es fr it pt zh ja ko id".split(" ");
for (const w of [360, 412]) {
  for (const lang of LANGS) {
    const h = await start({ lang, viewport: { width: w, height: 800 }, clock: new Date(2026, 10, 2, 18).getTime(), seed: { ui: { setupHidden: true } } });
    const p = h.page, bad = [];
    for (let d = 0; d < 7; d++) {
      if (d) { await p.clock.setFixedTime(new Date(2026, 10, 2 + d, 18).getTime()); await p.reload(); await p.waitForSelector("[data-week-today]"); }
      const r = await p.evaluate(() => {
        const t = document.querySelector("[data-week-today]"), box = t.closest("[data-home-week]");
        const range = document.createRange(); range.selectNodeContents(t); const rects = [...range.getClientRects()];
        const lines = new Set(rects.map(x => Math.round(x.top))).size, tr = range.getBoundingClientRect(), br = box.getBoundingClientRect(), q = document.querySelector("[data-week-count]").getBoundingClientRect();
        return { text: t.innerText, lines, inside: tr.left >= br.left && tr.right <= q.left };
      });
      if (r.lines !== 1 || !r.inside) bad.push(`${r.text} (lines ${r.lines}, clear of the count ${r.inside})`);
    }
    T.ok(!bad.length, `${w}px ${lang}: all 7 weekdays on one line${bad.length ? " — " + bad.join(", ") : ""}`);
    await h.close();
  }
}
T.done();
