// 1.9.0 (Michael, Nov 7): the profile shows the level once (no circle on the photo), the "since" line became a row of
// earned badges like Discord (tap = a small card, tap the card = the badge's levels), and the body parts are tiles
// under the figures (no hidden "tap the middle" list).
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const hist = [];
for (let i = 0; i < 26; i++) { const d = new Date(2026, 7, 1 + i * 3); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; hist.push(entry(k, "ABC"[i % 3], [it("k1", [22, 20, 18]), it("n1", [30, 28, 26]), it("row1", [12, 10, 9]), it("b5", [60, 60, 45])], { rounds: 3 })); }
const h = await start({ viewport: { width: 360, height: 760 }, dpr: 2, clock: new Date(2026, 10, 7, 12).getTime(), seed: { history: hist, profile: { name: "Michael" } } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(800);
T.eq(await p.locator("[data-pf-level]").count(), 0, "no level circle on the photo");
T.ok(await p.locator("[data-pf-lv]").count() === 1, "the Level tile stays");
const n = Number(await p.getAttribute("[data-hero-badges]", "data-hero-badges"));
T.ok(n >= 3, `badge row under the name (${n} badges)`);
T.eq(await p.getAttribute("[data-hero-badge] >> nth=0", "data-hero-badge"), "tenure", "\"Training for\" first (it replaced the since line)");
await p.locator("[data-pf-hero]").scrollIntoViewIfNeeded();
await shot(p, "hero_row");
// tap = small card
await p.click("[data-hero-badge] >> nth=0"); await p.waitForTimeout(400);
T.ok(await p.locator('[data-hero-pop="tenure"]').isVisible(), "tap shows the small card");
const txt = await p.textContent("[data-hero-pop]");
T.ok(/since your first workout/.test(txt), "the card says how long: " + txt.replace(/\s+/g, " ").slice(0, 80));
const pb = await p.locator("[data-hero-pop]").boundingBox();
T.ok(pb.x >= 0 && pb.x + pb.width <= 360 && pb.y >= 0, "the card is on screen");
await shot(p, "hero_pop");
// tap elsewhere closes it
await p.mouse.click(20, 700); await p.waitForTimeout(300);
T.eq(await p.locator("[data-hero-pop]").count(), 0, "a tap elsewhere closes the card");
// tap the card opens the badge's levels
await p.click("[data-hero-badge] >> nth=1"); await p.waitForTimeout(300);
const k2 = await p.getAttribute("[data-hero-pop]", "data-hero-pop");
await p.click("[data-hero-pop]"); await p.waitForTimeout(500);
T.ok(await p.locator(`[data-badge-sheet="${k2}"]`).isVisible(), "tap on the card opens the badge (" + k2 + ")");
await p.keyboard.press("Escape"); await p.click('[aria-label="Close"] >> nth=-1').catch(() => {}); await p.waitForTimeout(500);
// body tiles
T.eq(await p.locator("[data-body-all] [data-body-fam]").count(), 9, "nine body part tiles under the figures");
const chest = await p.getAttribute('[data-body-fam="chest"]', "data-rank");
T.ok(Number(chest) >= 0, "chest has a rank on its tile");
await p.click('[data-body-fam="chest"]'); await p.waitForTimeout(500);
T.ok(await p.locator('[data-body-sheet="chest"]').isVisible(), "a tile opens its part");
await p.click('[aria-label="Close"] >> nth=-1'); await p.waitForTimeout(500);
// a tap on the head (no muscle) opens nothing
const fb = await p.locator('[data-body-side="front"]').boundingBox();
await p.mouse.click(fb.x + fb.width / 2, fb.y + 12); await p.waitForTimeout(400);
T.eq(await p.locator("[data-body-sheet]").count(), 0, "a tap next to the muscles opens nothing");
await p.locator("[data-body-ranks]").scrollIntoViewIfNeeded();
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
await shot(p, "hero_body");
// others' profile without badges falls back to the line (the Shop preview has no badge row)
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
