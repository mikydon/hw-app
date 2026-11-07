// 1.9.1 (Michael, Nov 7): (1) on the lock screen the app's 3-2-1 beeps came late (its web part wakes about once a
// second there): with an APK whose service beeps itself ({beeps: true}), the app stays quiet while it is off screen
// ("front" events) and beeps as before while on screen; the service gets the sound/vibration settings.
// (2) Settings → "Rest timer with the screen off": allow it later, or open Android's settings once it is blocked.
import { start, T } from "./harness.mjs";
const fake = ([perm, beeps]) => {
  window.__restLog = []; window.__osc = [];
  const AC = window.AudioContext; // count the app's beeps (every beep makes one oscillator)
  window.AudioContext = function () { const c = new AC(); const o = c.createOscillator.bind(c); c.createOscillator = () => { window.__osc.push(Date.now()); return o(); }; return c; };
  window.__hwRest = {
    state: async () => ({ activity: perm }),
    ask: async () => { window.__restLog.push(["ask"]); perm = "granted"; return { activity: perm }; },
    start: async o => { window.__restLog.push(["start", o]); return beeps ? { beeps: true } : undefined; },
    stop: async () => { window.__restLog.push(["stop"]); },
    openSettings: async () => { window.__restLog.push(["settings"]); },
    addListener: (ev, cb) => { window.__front = cb; return { remove() {} }; },
  };
};
const T0 = new Date(2026, 10, 7, 18).getTime();
for (const [name, beeps, front] of [["off screen, new APK", true, false], ["on screen, new APK", true, true], ["off screen, 1.9.0 APK", false, false]]) {
  const h = await start({ clock: T0, seed: { extra: { "domaci-trening-v1-restperm": "granted" } } });
  const p = h.page;
  await p.addInitScript(fake, ["granted", beeps]); await p.reload(); await p.waitForTimeout(800);
  await p.click("[data-fstart-go]"); await p.click("[data-warmup-go]");
  await p.click("body"); // unlock the audio
  await p.click("[data-done-btn]"); await p.waitForTimeout(300);
  const st = (await p.evaluate(() => window.__restLog)).find(x => x[0] === "start");
  T.ok(st && st[1].sound === true && st[1].buzz === true && st[1].vol > 0, `${name}: the service gets sound, vibration and volume`);
  if (!front) await p.evaluate(() => window.__front && window.__front({ on: false }));
  const before = await p.evaluate(() => window.__osc.length);
  await p.clock.runFor(95000); await p.waitForTimeout(300);
  const n = (await p.evaluate(() => window.__osc.length)) - before;
  if (beeps && !front) T.eq(n, 0, `${name}: the app stays quiet (the service plays 3-2-1-0)`);
  else T.ok(n >= 4, `${name}: the app beeps 3-2-1-0 itself (${n})`);
  T.eq(h.errors, [], `${name}: no page errors`); await h.close();
}
for (const perm of ["prompt", "denied", "granted"]) {
  const h = await start();
  const p = h.page;
  await p.addInitScript(fake, [perm, true]); await p.reload(); await p.waitForTimeout(800);
  await p.click("[data-menu-btn]"); await p.click('[data-screen="settings"]'); await p.waitForTimeout(600);
  const row = p.locator("[data-rest-row]");
  await row.scrollIntoViewIfNeeded();
  T.eq(await row.getAttribute("aria-checked"), perm === "granted" ? "true" : "false", `${perm}: switch shows the permission`);
  T.eq(await p.locator("[data-rest-row-blocked]").count(), perm === "denied" ? 1 : 0, `${perm}: blocked line only when Android blocks it`);
  if (perm === "denied") await p.screenshot({ path: "tests/out/rest191_row.png" });
  await row.click(); await p.waitForTimeout(400);
  const log = (await p.evaluate(() => window.__restLog)).map(x => x[0]);
  if (perm === "prompt") { T.ok(log.includes("ask"), "prompt: a tap asks Android"); T.eq(await row.getAttribute("aria-checked"), "true", "prompt: allowed → on"); }
  else T.ok(log.includes("settings") && !log.includes("ask"), `${perm}: a tap opens the app's Android settings`);
  T.eq(h.errors, [], `${perm}: no page errors`); await h.close();
}
const w = await start(); await w.page.click("[data-menu-btn]"); await w.page.click('[data-screen="settings"]'); await w.page.waitForTimeout(500);
T.eq(await w.page.locator("[data-rest-row]").count(), 0, "website: no row"); await w.close();
T.done();
