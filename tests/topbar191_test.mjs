// 1.9.1 (Michael, Nov 7, screenshot): at start the top bar's plate covered only the status bar and the title sat under
// it until a scroll. The phone's safe-area inset (--sat) arrives after the first frame; it only makes the plate's shape
// layer taller, so the shape must be redrawn then too.
import { start, T } from "./harness.mjs";
const h = await start({ viewport: { width: 412, height: 860 } });
const p = h.page;
const bottomOf = () => p.evaluate(() => {
  const g = document.querySelector("[data-topbar-goo]");
  // the plate is the first shape: "… V a A r r 0 0 1 x <bottom> H …"
  const m = g.style.clipPath.match(/V [\d.]+ A [\d.]+ [\d.]+ 0 0 1 [\d.]+ ([\d.]+) H/);
  return { H: g.offsetHeight, maxY: m ? Number(m[1]) : -1 };
});
await p.waitForTimeout(800);
const a = await bottomOf();
T.ok(Math.abs(a.maxY - a.H) < 2, `plate shape reaches the bottom at start (${a.maxY} / ${a.H})`);
await p.evaluate(() => document.documentElement.style.setProperty("--safe-area-inset-top", "40px"));
await p.waitForTimeout(400);
const b = await bottomOf();
T.ok(b.H >= a.H + 39, `the inset arrives later: the layer grows (${a.H} → ${b.H})`);
T.ok(Math.abs(b.maxY - b.H) < 2, `…and the plate is redrawn to its new bottom (${b.maxY} / ${b.H})`);
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
