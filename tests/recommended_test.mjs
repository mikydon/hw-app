// Regression: the recommended A/B/C workout still works as before 1.9.0 (circuit of rounds, 30 s / 60 s rests that now
// wait for "Ready", swap, minimize + mini player, reload keeps the running workout, the saved entry).
import { start, T, shot, entry } from "./harness.mjs";
const now = new Date(2026, 10, 4, 18, 0).getTime();
const h = await start({ clock: now, seed: { history: [entry("2026-11-02", "C", [{ id: "k3", name: "Diamond push-up", unit: "", res: [10, 9] }])] } });
const p = h.page;
T.ok((await p.locator("[data-day-title]").innerText()).includes("A"), "next day after C is A");
await p.click('[data-fround="2"]');
await p.click("[data-fstart-go]");
await p.click("[data-warmup-go]");
const ids = ["k1", "row1", "n1", "b5"];
// round 1
T.ok((await p.locator("body").innerText()).includes("Push-up"), "first exercise push-up");
await p.click("[data-done-btn]");
T.ok(Number(await p.getAttribute("[data-rest-timer]", "data-rest-left")) <= 30, "30 s between exercises");
await p.click("[data-rest-ready]");
// row1 is one arm at a time: right then left
await p.click("[data-side-next]"); await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
// swap squat for lunge
await p.locator("button", { hasText: "⇄" }).first().click().catch(() => {});
const swapped = await p.locator(".sheetBox").count();
if (swapped) { await p.locator('.sheetBox button:has-text("Reverse lunge")').first().click(); }
T.ok(swapped === 1, "swap sheet opens");
await p.waitForTimeout(300);
if ((await p.locator("[data-side-next]").count())) await p.click("[data-side-next]");
await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
// plank hold 15 s
await p.click('[data-dur="15"]'); await p.locator("button", { hasText: "Start" }).last().click();
await p.clock.runFor(5500); await p.clock.runFor(16000);
T.ok((await p.locator("body").innerText()).toLowerCase().includes("round"), "round done: 60 s rest");
T.ok(Number(await p.getAttribute("[data-rest-timer]", "data-rest-left")) > 30, "60 s between rounds");
// minimize: mini player shows the rest, then reload keeps the workout
await p.click("[data-minimize] button");
await p.waitForTimeout(400);
T.ok(await p.locator("[data-mini]").count() === 1, "mini player while minimized");
await p.reload(); await p.waitForTimeout(800);
T.ok(await p.locator("[data-rest-timer]").count() === 1, "after a reload the workout opens on the same rest");
await p.click("[data-rest-ready]");
// round 2
await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
await p.click("[data-side-next]"); await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
if ((await p.locator("[data-side-next]").count())) await p.click("[data-side-next]");
await p.click("[data-done-btn]"); await p.click("[data-rest-ready]");
await p.click('[data-dur="15"]'); await p.locator("button", { hasText: "Start" }).last().click();
await p.clock.runFor(5500); await p.clock.runFor(16000);
await p.click("[data-cool-finish]");
await p.waitForTimeout(500);
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history.slice(-1)[0]);
T.eq(saved.day, "A", "saved as day A"); T.eq(saved.rounds, 2, "2 rounds");
T.ok(!saved.plan, "no plan field");
T.ok(saved.items.some(x => x.id === "lunge"), "swapped exercise saved");
T.ok(saved.items.every(x => x.res.length === 2), "every item has 2 rounds");
T.ok(saved.rests && saved.rests.k1 && saved.rests.k1.length >= 1, "rests saved");
await shot(p, "summary_rec");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
