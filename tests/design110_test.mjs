// 1.10.0 design pass (stage C / Michael's point 6): the calorie week is a row of rings (filled as far as the day's
// food went, red when over the target, solid with ✓ on target), food rows without a note show no dash, and My plans
// without any plan is one card with the New plan button (no seven empty week rows, no group or sort chips).
import { start, T, entry } from "./harness.mjs";
const now = new Date(2026, 10, 11, 18, 0);
const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = n => { const d = new Date(now); d.setDate(d.getDate() - n); return d; };
// target for this profile is about 2280 kcal (maintain, light activity); 3 days: on target, over, half
const log = { [dk(day(0))]: [{ ts: day(0).getTime(), kcal: 1100, note: "" }], [dk(day(1))]: [{ ts: day(1).getTime(), kcal: 3400, note: "" }], [dk(day(2))]: [{ ts: day(2).getTime(), kcal: 2280, note: "lunch" }] };
const kcal = { sex: "m", height: 180, weight: 78, activity: 1.375, goal: { type: "maintain", rate: 0 }, log };
{
  const h = await start({ clock: now.getTime(), seed: { history: [entry(dk(day(3)), "A", [{ id: "k1", name: "x", unit: "", res: [10, 10] }])], kcal, profile: { name: "Alex", birth: { y: 2000 } } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="calories"]'); await p.waitForTimeout(900);
  const days = await p.$$eval("[data-kc-week] [data-kc-day]", e => e.map(x => ({ k: x.getAttribute("data-kc-day"), pct: +x.getAttribute("data-kc-pct"), strokes: [...x.querySelectorAll("circle")].map(c => c.getAttribute("stroke")), ring: !!x.querySelector("svg") })));
  T.eq(days.length, 7, "seven days");
  T.ok(days.every(d => d.ring), "every day is a ring");
  const [over, hit, today] = [days[5], days[4], days[6]];
  T.ok(hit.k === "hit" && hit.strokes.length === 1, `on target: one solid ring (${JSON.stringify(hit)})`);
  T.ok(over.k === "log" && over.pct > 110 && over.strokes.includes("#ff8a80"), `over the target: red arc (${JSON.stringify(over)})`);
  T.ok(today.k === "log" && today.pct > 40 && today.pct < 60 && today.strokes.length === 2, `half way: a partial arc (${JSON.stringify(today)})`);
  T.ok(days.slice(0, 4).every(d => d.k === "none" && d.strokes.length === 1), "days without food: only the track");
  const rows = await p.$$eval("[data-kc-today-list] span", e => e.map(x => x.textContent.trim()));
  T.ok(!rows.includes("—"), "a food row without a note shows no dash");
  await p.click('[data-info="kcweek"]').catch(() => {});
  await p.waitForTimeout(500);
  T.eq(await p.locator("[data-kc-legend] [data-kc-leg]").count(), 3, "legend: logged, over, on target");
  T.eq(h.errors, [], "no page errors (calories)");
  await h.close();
}
{
  const h = await start({ clock: now.getTime() });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="plans"]'); await p.waitForTimeout(700);
  await p.click('[data-plans-seg="mine"]'); await p.waitForTimeout(700);
  T.ok(await p.locator("[data-week-compact]").isVisible(), "no plans: the week is one compact row");
  T.eq(await p.locator("[data-week-row]").count(), 7, "with the seven days");
  T.eq(await p.locator("[data-plans-filter], [data-plan-sort]").count(), 0, "no search, filter or order before the first plan");
  T.ok(await p.locator("[data-plans-empty] [data-plan-new]").isVisible(), "the empty card holds the New plan button");
  await p.click("[data-plan-new]"); await p.waitForTimeout(500); await p.click("[data-plan-back]"); await p.waitForTimeout(500);
  T.ok(await p.locator("[data-plans-filter]").isVisible() && await p.locator("[data-plan-sort]").isVisible(), "with a plan the filter button and the order are there");
  T.eq(h.errors, [], "no page errors (plans)");
  await h.close();
}
// Settings: Appearance is one row that opens its own page (the same header as Exercises); every row has an icon
{
  const h = await start({ clock: now.getTime() });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(700);
  T.eq(await p.locator("[data-look]").count(), 0, "the main Settings page has no theme or layout grid");
  T.ok(await p.locator("[data-row-ico]").count() >= 11, "rows carry an icon tile");
  await p.click("[data-set-look-open]"); await p.waitForTimeout(600);
  T.eq(await p.locator("[data-sub-title]").innerText(), "Appearance", "Appearance page with the shared header");
  T.eq(await p.locator("[data-look]").count(), 6, "the six layouts are there");
  await p.click('[data-look="flat"]'); await p.waitForTimeout(300);
  await p.click("[data-sub-back]"); await p.waitForTimeout(600);
  T.ok(await p.locator("[data-set-look-open]").isVisible(), "back returns to Settings");
  T.ok((await p.locator("[data-set-look-open]").innerText()).includes("Open"), "the row shows the chosen layout");
  await p.click("[data-set-lang] button"); await p.waitForTimeout(500);
  T.ok(await p.locator('[role="listbox"]').isVisible(), "language still opens as a sheet (pick one from a list)");
  T.eq(h.errors, [], "no page errors (settings)");
  await h.close();
}
T.done();
