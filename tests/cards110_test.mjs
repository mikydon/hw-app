// 1.10.0 (Michael, Nov 15: "card variations in the shop for Muscle Deck and Ranked; the players against you see your
// cards; a card collection on the profile"): card styles are looks (kind "card"): picked in the profile looks, drawn on
// the game's cards, shown in a card collection on the profile, and in Ranked the other player's style is shown.
import { start, T, shot, entry } from "./harness.mjs";
import { rankedOpts } from "../worker/index.js";
const it = [{ id: "k1", name: "Push-up", unit: "", res: [20, 18] }];
const buys = ["c_gold", "c_neon"].map((w, i) => ({ i: "cd" + i, w, p: 0, ts: 1 + i }));
const go = async (p, s) => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click(`[data-nav-box] [data-screen="${s}"]`); await p.waitForTimeout(800); };
{
  const h = await start({ viewport: { width: 380, height: 820 }, seed: { history: [entry("2026-11-02", "A", it)], profile: { name: "Michael", shop: { buys } } } });
  const p = h.page;
  await go(p, "profile");
  // the collection
  await p.waitForSelector("[data-pf-cards]");
  T.eq(await p.$$eval("[data-pf-card]", e => e.map(x => x.getAttribute("data-pf-card") + ":" + x.getAttribute("data-own")).join(" ")),
    "classic:1 c_night:0 c_mint:0 c_carbon:0 c_marble:0 c_gold:1 c_neon:1 c_holo:0 c_obsidian:0", "the collection: classic + the two owned in colour, the rest locked");
  T.ok((await p.textContent("[data-pf-cards]")).includes("3/9"), "3 of 9");
  // wear Gold in the looks
  await p.click("[data-pf-looks]"); await p.waitForSelector("[data-looks-sheet]");
  await p.click('[data-look-kind="card"]'); await p.waitForTimeout(300);
  T.ok(await p.locator("[data-looks-cards] [data-card-fan]").isVisible(), "the preview shows cards");
  await p.click('[data-look-own="c_gold"]'); await p.waitForTimeout(300);
  T.eq(await p.getAttribute("[data-looks-cards] [data-card-fan]", "data-card-fan"), "c_gold", "in the chosen style");
  await shot(p, "cards_looks");
  await p.click("[data-looks-save]"); await p.waitForTimeout(600);
  T.eq(await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).look.card), "c_gold", "saved in the profile looks");
  await p.waitForSelector('[data-pf-card="c_gold"][data-on="1"]');
  T.ok(true, "the collection marks the one in use");
  await p.locator('[data-pf-card="c_gold"]').scrollIntoViewIfNeeded(); await shot(p, "cards_collection");
  // the game's cards wear it
  await go(p, "game");
  await p.evaluate(() => { const b = document.querySelector('[data-gm-mode="run"]'); if (b) b.click(); });
  await p.waitForTimeout(600);
  const goBtn = p.locator("[data-gm-go]"); if (await goBtn.count()) { await goBtn.first().click(); }
  await p.waitForSelector("[data-card]", { timeout: 8000 }); await p.waitForTimeout(800);
  const bg = await p.$eval("[data-card]", e => getComputedStyle(e).backgroundImage);
  T.ok(bg.includes("gradient") && /255, 210, 63|ffd23f/i.test(bg), "the hand is drawn in Gold: " + bg.slice(0, 80));
  T.ok(await p.locator("[data-card] .cdShine").count() > 0, "with its shine");
  await shot(p, "cards_game");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
// Ranked: the other player's style in the game and the server gets yours
{
  const opts = rankedOpts("rk1");
  const cloud = { ranked: { r: 1000, w: 0, l: 0, d: 0 }, rkStart: { why: "ok", seed: "rk1", opp: { nick: "Ema", r: 1010, sk: "c_neon" }, r: 1000, left: 1 } };
  const h = await start({ viewport: { width: 380, height: 820 }, cloud, seed: { history: [entry(new Date().toISOString().slice(0, 10), "A", it)], profile: { name: "Michael", shop: { buys }, look: { card: "c_gold" }, game: { tut: 1 } } } });
  const p = h.page;
  await go(p, "game");
  await p.click('[data-gm-mode="ranked"]'); await p.waitForSelector("[data-gm-rk-sheet]");
  if (await p.locator("[data-gm-rk-go]").isDisabled()) { T.ok(false, "Ranked start is off (no workout today in this clock)"); }
  else {
    await p.click("[data-gm-rk-go]"); await p.waitForSelector("[data-gm-hud]", { timeout: 8000 }); await p.waitForTimeout(600);
    T.eq(await p.getAttribute("[data-gm-opp]", "data-gm-opp"), "c_neon", "the opponent chip in their style");
    T.ok((await p.textContent("[data-gm-opp]")).includes("Ema"), "with their name");
    await shot(p, "cards_ranked");
  }
  T.ok(opts.antes === 2, "ranked options unchanged");
  T.eq(h.errors, [], "no page errors (ranked)");
  await h.close();
}
T.done();
