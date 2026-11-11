// Startup cost (not a pass/fail test): node tests/perf_start.mjs [lang] [runs]
// 6x CPU throttle ≈ a mid-range phone. Prints the median time to the first screen and the script time.
import { start } from "./harness.mjs";
const lang = process.argv[2] || "sk", runs = Number(process.argv[3] || 7);
const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const first = [], script = [], heap = [];
for (let i = 0; i < runs; i++) {
  const h = await start({ lang });
  const p = h.page, c = await p.context().newCDPSession(p);
  await c.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await c.send("Performance.enable");
  await p.evaluate(() => { performance.clearMarks(); });
  const t0 = Date.now();
  await p.reload({ waitUntil: "commit" });
  await p.waitForSelector("[data-topbar]", { timeout: 60000 });
  first.push(Date.now() - t0);
  const m = Object.fromEntries((await c.send("Performance.getMetrics")).metrics.map(x => [x.name, x.value]));
  script.push(m.ScriptDuration * 1000); heap.push(m.JSHeapUsedSize / 1048576);
  await h.close();
}
console.log(`lang ${lang}: first screen ${med(first)} ms, script ${med(script).toFixed(0)} ms, heap ${med(heap).toFixed(1)} MB (median of ${runs}, 6x CPU)`);
