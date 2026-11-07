// 1.9.0 (Michael, Nov 6, 22:13–22:20): page switches float at the bottom (icons, the open page with its name); on Home
// the switch sits inside the Start bar (one compact bar). The last box of a page must end above the bar.
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const h = await start({ viewport: { width: 360, height: 740 }, clock: new Date(2026, 10, 4, 18).getTime(), seed: { history: [entry("2026-11-02", "A", [it("k1", [20, 18]), it("n1", [30, 28])])], profile: { name: "Michael" } } });
const p = h.page;
const gap = async (barSel) => {
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(500);
  return p.evaluate(sel => {
    const bar = document.querySelector(sel).getBoundingClientRect();
    const pg = document.querySelector('.swPage[aria-hidden="false"]') || document.querySelector(".scr");
    const kids = [...pg.querySelectorAll(":scope > *")].filter(e => e.getBoundingClientRect().height > 0 && !e.matches("[data-fstart-space]"));
    return Math.round(bar.top - kids[kids.length - 1].getBoundingClientRect().bottom);
  }, barSel);
};
// Home: one bar with the switch, the minutes and Start
T.ok(await p.locator("[data-fstart-box] [data-home-tabs]").count() === 1, "Home: the page switch is inside the Start bar");
T.eq(await p.locator("[data-ftabs]").count(), 0, "Home: no second floating bar");
const hb = await p.locator("[data-fstart-box]").boundingBox();
T.ok(hb.height <= 80, "Home bar is compact (" + Math.round(hb.height) + " px)");
let g = await gap("[data-fstart-box]"); T.ok(g >= 8, "Home: the last box ends above the bar (" + g + " px)");
await p.click('[data-home-tab="1"]'); await p.waitForTimeout(700);
T.eq(await p.getAttribute('[data-home-tab="1"]', "aria-selected"), "true", "Home: second page open");
g = await gap("[data-fstart-box]"); T.ok(g >= 8, "Home Exercises: last box above the bar (" + g + " px)");
await shot(p, "ftabs_home");
// Profile: floating icons, the open one named
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(700);
T.ok(await p.locator("[data-ftabs=pf] [data-pf-tab]").count() === 4, "Profile: 4 icons in the floating bar");
g = await gap("[data-ftabs=pf] [role=tablist]"); T.ok(g >= 8, "Profile: last box above the bar (" + g + " px)");
await p.click('[data-pf-tab="2"]'); await p.waitForTimeout(700);
T.ok(await p.locator('[data-pf-page="2"][aria-hidden="false"]').count() === 1, "Profile: the Ranks page opens");
T.eq(await p.getAttribute('[data-pf-tab="2"]', "aria-selected"), "true", "the tapped icon is lit");
await shot(p, "ftabs_profile");
// Nov 7: tabs are equal columns as wide as the longest name ("Recommended" was cut at 70 px); the lit pill is one column
await p.click("[data-menu-btn]"); await p.click('[data-screen="plans"]'); await p.waitForTimeout(700);
const tw = await p.evaluate(() => {
  const bs = [...document.querySelectorAll("[data-ftabs=plans] [role=tab]")], k = document.querySelector("[data-ftabs=plans] [data-ftabs-knob]");
  return { w: bs.map(b => Math.round(b.getBoundingClientRect().width)), knob: Math.round(k.getBoundingClientRect().width),
    cut: [...document.querySelectorAll("[data-ftabs=plans] [data-ftabs-label]")].filter(l => l.scrollWidth > l.clientWidth + 1).map(l => l.textContent) };
});
T.eq(tw.cut, [], "Plans: no tab name is cut (" + tw.w.join(", ") + " px)");
T.ok(tw.w[0] === tw.w[1] && tw.w[0] >= 70, "Plans: both tabs equally wide, at least 70 px");
T.ok(Math.abs(tw.knob - tw.w[0]) <= 1, "the lit pill is one tab wide (" + tw.knob + " px)");
// leaving the screen removes the bar
await p.click("[data-menu-btn]"); await p.click('[data-screen="settings"]'); await p.waitForTimeout(500);
T.eq(await p.locator("[data-ftabs]").count(), 0, "Settings: no page switch bar");
T.eq(await p.evaluate(() => document.documentElement.style.getPropertyValue("--ftH")), "", "its room is given back");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
