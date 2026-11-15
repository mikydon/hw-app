// 1.10.0 (Michael's idea 11, Nov 15): Light and Automatic themes. Light = the Black theme with the page inverted
// (html[data-light]); colours that mean something stay (data-keep-color: rank emblems, the body figure, cards, switch
// knobs, the dark theme tiles). Automatic = light from 7:00 to 19:00, your last dark theme at night (settings.darkTheme),
// and it switches on its own while the app is open.
import { start, T, shot, entry } from "./harness.mjs";
const day = new Date(2026, 10, 15, 10, 0), eve = new Date(2026, 10, 15, 18, 58);
const it = [{ id: "k1", name: "Push-up", unit: "", res: [12, 12] }];
const st = p => p.evaluate(() => ({ light: document.documentElement.hasAttribute("data-light"), filter: getComputedStyle(document.documentElement).filter, meta: (document.querySelector('meta[name="theme-color"]') || {}).content, body: getComputedStyle(document.body).backgroundColor }));
// ─── Light from the start ───
{
  const h = await start({ clock: day.getTime(), viewport: { width: 380, height: 820 }, seed: { settings: { theme: "light" }, history: [entry("2026-11-13", "A", it)], profile: { name: "Michael" } } });
  const p = h.page; await p.waitForTimeout(900);
  const s = await st(p);
  T.ok(s.light && s.filter.includes("invert"), "light: the page is inverted: " + s.filter);
  T.eq(s.meta, "#ffffff", "the status bar colour is white");
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(700);
  const knob = await p.evaluate(() => [...document.querySelectorAll("[data-keep-color]")].filter(e => e.parentElement && e.parentElement.style.width === "50px").length);
  T.ok(knob > 0, "switch knobs stay white: " + knob);
  await p.click("[data-set-look-open]"); await p.waitForTimeout(600);
  T.eq(await p.getAttribute('[data-theme-pick="light"]', "aria-pressed"), "true", "the Light tile is picked");
  T.ok(await p.locator('[data-theme-pick="navy"][data-keep-color]').count() === 1, "dark theme tiles keep their real colours");
  T.ok(await p.locator("[data-theme-pick]").count() === 10, "8 dark themes + Light + Automatic");
  await shot(p, "theme_light_look");
  // a dark theme: back to dark, and it is remembered for Automatic
  await p.click('[data-theme-pick="ocean"]'); await p.waitForTimeout(500);
  T.ok(!(await st(p)).light, "Ocean: dark again");
  await p.click('[data-theme-pick="auto"]'); await p.waitForTimeout(500);
  T.ok((await st(p)).light, "Automatic at 10:00: light");
  T.ok((await p.textContent("[data-theme-auto-d]")).includes("Ocean"), "the line names the night theme: " + await p.textContent("[data-theme-auto-d]"));
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-settings")));
  T.eq([saved.theme, saved.darkTheme], ["auto", "ocean"], "saved: auto + ocean");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
// ─── Automatic switches at 19:00 while the app is open, to the remembered dark theme ───
{
  const h = await start({ clock: eve.getTime(), viewport: { width: 380, height: 820 }, seed: { settings: { theme: "auto", darkTheme: "navy" }, profile: { name: "Michael" } } });
  const p = h.page; await p.waitForTimeout(900);
  T.ok((await st(p)).light, "18:58: light");
  await p.clock.runFor(3 * 60000); await p.waitForTimeout(400);
  const s = await st(p);
  T.ok(!s.light, "19:01: dark");
  T.eq(s.body, "rgb(14, 27, 54)", "the night theme is Navy");
  T.eq(h.errors, [], "no page errors (auto)");
  await h.close();
}
// ─── Rank emblems and the body keep their colours ───
{
  const h = await start({ clock: day.getTime(), viewport: { width: 380, height: 820 }, seed: { settings: { theme: "light" }, history: [entry("2026-11-13", "A", it)], profile: { name: "Michael" } } });
  const p = h.page; await p.waitForTimeout(800);
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="profile"]'); await p.waitForTimeout(900);
  T.ok(await p.locator("[data-body-figs][data-keep-color]").count() === 1, "the body figure keeps its metals");
  T.ok(await p.locator("[data-rank-icon][data-keep-color]").count() > 0, "rank emblems keep their colours");
  T.eq(h.errors, [], "no page errors (profile)");
  await h.close();
}
// ─── Dark themes are untouched ───
{
  const h = await start({ clock: day.getTime(), viewport: { width: 380, height: 820 }, seed: { settings: { theme: "wine" }, profile: { name: "Michael" } } });
  const p = h.page; await p.waitForTimeout(800);
  const s = await st(p);
  T.ok(!s.light && s.filter === "none", "Wine: no filter");
  T.eq(s.body, "rgb(34, 9, 15)", "Wine as it always was");
  await h.close();
}
T.done();
