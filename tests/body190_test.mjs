// 1.9.0 body ranks on the Profile (Michael, Nov 6) + muscle icons instead of muscle texts.
// A body part's rank = floor((best + second best exercise rank) / 2), a missing second counts as Iron (0).
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res, kg) => ({ id, name: id, unit: "", res, ...(kg ? { kg } : {}) });
const hist = [
  entry("2026-11-02", "A", [it("k1", [60, 50]), it("n1", [30, 28]), it("b5", [90, 80])]),
  entry("2026-11-03", null, [it("fw_dumbbell_bench_press", [10, 9], [10, 10])], { plan: { id: "pA", name: "Workout Plan 1", wd: 2 } }),
];
const h = await start({ clock: new Date(2026, 10, 4, 18).getTime(), seed: { history: hist, profile: { name: "Michael" }, kcal: { sex: "m", weight: 80, height: 180, activity: "light" } } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]');
await p.waitForSelector("[data-body-ranks]");
T.ok(await p.locator("[data-body-ranks] [data-body-side]").count() === 2, "front + back figures");
const box = await p.locator("[data-body-ranks]").boundingBox(), hero = await p.locator("[data-body-ranks] ~ *").first().boundingBox();
T.ok(box && hero && box.y < hero.y, "body ranks are the first box of the Profile page");
// every part is a tile under the figures (always visible)
await p.waitForSelector("[data-body-all]");
T.eq(await p.locator("[data-body-all] [data-body-fam]").count(), 9, "nine part tiles");
T.eq(await p.getAttribute('[data-body-fam="back"]', "data-rank"), "-1", "back not trained = grey");
const chest = Number(await p.getAttribute('[data-body-fam="chest"]', "data-rank"));
await p.click('[data-body-fam="chest"]');
await p.waitForSelector("[data-body-sheet=chest]");
const rows = await p.locator("[data-body-ex]").evaluateAll(els => els.map(e => [e.getAttribute("data-body-ex"), Number(e.getAttribute("data-rank"))]));
T.ok(rows.some(r => r[0] === "k1") && rows.some(r => r[0] === "fw_dumbbell_bench_press"), "chest lists push-ups and the bench press");
T.eq(chest, Math.floor((rows[0][1] + (rows[1] ? rows[1][1] : 0)) / 2), "chest = average of the two best (" + rows.map(r => r.join(":")).join(", ") + ")");
T.ok(rows[0][1] >= rows[rows.length - 1][1], "best first");
await shot(p, "body_sheet");
await p.click(`[data-body-sheet] >> xpath=ancestor::*[contains(@class,"sheetBox")]//button[@aria-label="Close"]`); await p.waitForTimeout(500);
T.eq(await p.locator("[data-body-sheet]").count(), 0, "sheet closes");
// tapping a body part on the drawing opens the same sheet (scroll back first: the tile tap scrolled the figure under the top bar)
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
await p.locator('[data-body-side="back"] [data-fam="glutes"]').first().click({ force: true });
T.ok(await p.waitForSelector("[data-body-sheet=glutes]", { timeout: 3000 }).then(() => true, () => false), "tap on the drawing opens that part");
await p.click(`[data-body-sheet] >> xpath=ancestor::*[contains(@class,"sheetBox")]//button[@aria-label="Close"]`); await p.waitForTimeout(500);
await shot(p, "body_profile");
// muscle icons instead of the muscle texts on Home → Exercises (recommended day A)
await p.click("[data-menu-btn]"); await p.click('[data-screen="train"]');
await p.waitForTimeout(500);
T.ok(await p.locator("[data-muscle-icons]").count() > 0, "exercise rows show muscle icons");
const lbl = await p.getAttribute("[data-muscle-icons]", "aria-label");
T.ok(lbl && lbl.length > 3, "icons carry the muscle names for screen readers: " + lbl);
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
