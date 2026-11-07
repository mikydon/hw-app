// 1.9.0 (Michael, Nov 7: "the basic Muscle Deck fixes in this update"): selling asks first (table, shop, open pack),
// a full joker pack can be saved by selling inside it, a joker pack in the shop shows "Full" and can't be opened, and
// the ✕ box offers Save and quit / Quit without saving (= a lost game).
import { start, T, shot } from "./harness.mjs";
import * as G from "../src/game/engine.js";

// a bot game up to a shop with every joker slot taken and a joker pack it can pay for
function fixture() {
  for (let k = 0; k < 400; k++) {
    const opts = { seed: "ff" + k, mode: "run", suit: { push: 3, pull: 3, legs: 3, core: 3 } };
    let st = G.newGame(opts); const moves = [];
    for (let n = 0; n < 500 && st.phase !== "over" && st.phase !== "won"; n++) {
      if (st.phase === "shop" && !st.pack && st.jokers.length >= G.jokerSlots(st)) {
        const i = st.shop.items.findIndex(it => it.k === "pack" && G.isJokerPack(it.id) && !it.sold && st.money >= it.cost);
        if (i >= 0) return { opts, moves, i, st };
      }
      const m = G.botMove(st, 5); if (!m) break; st = G.act(st, m); moves.push(m);
    }
  }
}
const F = fixture();
T.ok(!!F, "fixture: full joker slots + an affordable joker pack");
const GAME_KEY = "domaci-trening-v1-game";
const open = async (h, extra) => {
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.click('[data-screen="game"]'); await p.waitForTimeout(500);
  await p.click("[data-gm-continue]"); await p.waitForSelector("[data-game]"); await p.waitForTimeout(400);
};

// 1) shop with full slots: the joker pack is marked and locked
{
  const h = await start({ seed: { extra: { [GAME_KEY]: { mode: "run", opts: F.opts, moves: F.moves, at: 1 } } } });
  const p = h.page; await open(h);
  T.eq(await p.getAttribute("[data-game]", "data-game"), "shop", "the saved game opens in the shop");
  const row = `[data-gm-item="pack"]:has([data-gm-buy="${F.i}"])`;
  T.ok(await p.isVisible(`${row} [data-gm-full]`), "the joker pack shows the Full mark");
  T.ok(await p.isDisabled(`[data-gm-buy="${F.i}"]`), "and can't be opened");
  const other = await p.$$eval("[data-gm-item=pack]", els => els.filter(e => !e.querySelector("[data-gm-full]")).length);
  T.ok(true, `packs without the mark: ${other} (drill packs stay open)`);
  // a tap on one of your jokers holds it up (centred), Sell asks in the same box
  const J = "[data-gm-shop] [data-gm-jokers] [data-joker]";
  const n0 = await p.$$eval(J, e => e.length), money0 = await p.textContent("[data-gm-money]");
  T.eq(await p.getAttribute("[data-gm-slots]", "data-gm-slots"), `${n0}/${n0}`, "the joker row shows the slots: full");
  await p.locator(J).first().click(); await p.waitForSelector("[data-gm-inspect]"); await p.waitForTimeout(400);
  T.ok(await p.isVisible("[data-gm-joker-info]") && await p.isVisible("[data-gm-joker-sell]"), "the joker up close: its text + Sell");
  await shot(p, "deck190_inspect");
  await p.click("[data-gm-joker-sell]");
  T.eq(await p.getAttribute("[data-gm-inspect]", "data-state"), "ask", "Sell asks first");
  T.ok(await p.isVisible("[data-gm-sell-ask]") && await p.isVisible("[data-gm-sell-yes]"), "the question and a red Sell");
  await p.waitForTimeout(300); await shot(p, "deck190_sell_ask");
  await p.click("[data-confirm-no]");
  T.eq(await p.getAttribute("[data-gm-inspect]", "data-state"), "view", "Cancel goes back to the card");
  await p.click("[data-gm-inspect-close]"); await p.waitForTimeout(250);
  T.ok(!(await p.$("[data-gm-inspect]")) && (await p.$$eval(J, e => e.length)) === n0, "closed, nothing sold");
  await p.locator(J).first().click(); await p.click("[data-gm-joker-sell]"); await p.click("[data-gm-sell-yes]");
  T.eq(await p.getAttribute("[data-gm-inspect]", "data-state"), "sold", "sold: the card turns into coins");
  await p.waitForTimeout(900);
  T.eq(await p.$$eval(J, e => e.length), n0 - 1, "after the confirmation one joker is sold");
  T.ok((await p.textContent("[data-gm-money]")) !== money0, "money changed");
  T.ok(!(await p.$(`${row} [data-gm-full]`)) && !(await p.isDisabled(`[data-gm-buy="${F.i}"]`)), "a free slot: the pack is open to buy again");
  // a tap on a shop card opens its full text
  await p.click('[data-gm-item-open="0"]');
  T.eq(await p.getAttribute('[data-gm-item-open="0"]', "aria-expanded"), "true", "a shop card opens its details");
  await shot(p, "deck190_shop");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}

// 2) an open joker pack with full slots (a game saved before 1.9.0): sell inside, then pick
{
  const st = G.act(F.st, { t: "buy", i: F.i });
  const h = await start({ seed: { extra: { [GAME_KEY]: { mode: "run", opts: F.opts, moves: [...F.moves, { t: "buy", i: F.i }], at: 1 } } } });
  const p = h.page; await open(h);
  await p.waitForSelector("[data-gm-pack-open]");
  T.ok(await p.isVisible("[data-gm-pack-full]") && await p.isDisabled('[data-gm-pick="0"]'), "full: the picks are locked and the line says to sell");
  T.eq(await p.$$eval("[data-gm-pack-sell]", e => e.length), st.jokers.length, "your jokers are listed inside the pack with Sell");
  await p.click('[data-gm-pack-sell="1"]'); await p.waitForSelector("[data-gm-sell-yes]");
  T.eq(await p.getAttribute("[data-gm-inspect]", "data-state"), "ask", "the pack's Sell asks at once");
  const zi = await p.evaluate(() => [getComputedStyle(document.querySelector("[data-gm-inspect]")).zIndex, getComputedStyle(document.querySelector("[data-gm-pack-open]")).zIndex].map(Number));
  T.ok(zi[0] > zi[1], "the confirmation is on top of the pack");
  await p.waitForTimeout(350); await shot(p, "deck190_pack_confirm");
  await p.click("[data-gm-sell-yes]"); await p.waitForTimeout(900);
  T.ok(!(await p.isDisabled('[data-gm-pick="0"]')) && !(await p.$("[data-gm-pack-own]")), "a slot is free: picks unlocked");
  await p.click('[data-gm-pick="0"]'); await p.waitForTimeout(500);
  T.ok(!(await p.$("[data-gm-pack-open]")), "picked: the pack closes");
  const sv = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), GAME_KEY);
  T.eq(sv.moves.slice(-2).map(m => m.t), ["sell", "pick"], "the saved game has the sale and the pick");
  T.ok((() => { try { G.replay(F.opts, sv.moves); return true; } catch (_) { return false; } })(), "and it replays");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}

// 3) the ✕ box: Save and quit keeps the Run; Quit without saving = a lost game
{
  const h = await start({ seed: { profile: { game: { xp: 50, games: 3, wins: 1 } }, extra: { [GAME_KEY]: { mode: "run", opts: F.opts, moves: F.moves.slice(0, 1), at: 1 } } } });
  const p = h.page; await open(h);
  T.eq(await p.getAttribute("[data-game]", "data-game"), "blind", "a blind is on");
  // selling on the table: tap a joker? (none yet at move 1) → just the quit box
  await p.click("[data-gm-quit]"); await p.waitForSelector("[data-confirm]");
  T.ok(await p.isVisible("[data-gm-quit-yes]") && await p.isVisible("[data-gm-quit-nosave]"), "the ✕ box: Save and quit + Quit without saving");
  await p.waitForTimeout(350); await shot(p, "deck190_quit");
  await p.click("[data-gm-quit-yes]"); await p.waitForTimeout(400);
  T.ok(!(await p.$("[data-game]")), "Save and quit closes the table");
  T.ok(await p.isVisible("[data-gm-continue]"), "the Run waits under Continue");
  const sv = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), GAME_KEY);
  T.eq(sv.moves.length, 1, "with its moves");
  await p.click("[data-gm-continue]"); await p.waitForSelector("[data-game]"); await p.waitForTimeout(300);
  await p.click("[data-gm-quit]"); await p.click("[data-gm-quit-nosave]"); await p.waitForSelector("[data-gm-quit-nosave-yes]");
  T.ok(true, "Quit without saving asks again");
  await p.click("[data-confirm-no]"); await p.waitForTimeout(250);
  T.ok(await p.isVisible("[data-gm-quit-yes]"), "Cancel goes back to the two choices");
  await p.click("[data-confirm-no]"); await p.waitForTimeout(250);
  T.ok(!!(await p.$("[data-game]")) && !(await p.$("[data-confirm]")), "Keep playing closes the box");
  await p.click("[data-gm-quit]"); await p.click("[data-gm-quit-nosave]"); await p.click("[data-gm-quit-nosave-yes]"); await p.waitForTimeout(400);
  T.ok(!(await p.$("[data-game]")) && !(await p.$("[data-gm-continue]")), "the Run is gone");
  const pr = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).game);
  T.ok(pr.games === 4 && pr.wins === 1 && pr.xp === 50, `counted as a lost game, no XP (${JSON.stringify(pr)})`);
  T.eq(await p.evaluate(k => localStorage.getItem(k), GAME_KEY), null, "no saved game left");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}

// 4) selling during a blind (a joker on the table → its sheet → Sell → confirm)
{
  let st = G.newGame(F.opts), moves = [];
  for (let n = 0; n < 300 && !(st.phase === "blind" && st.jokers.length); n++) { const m = G.botMove(st, 5); st = G.act(st, m); moves.push(m); }
  const h = await start({ seed: { extra: { [GAME_KEY]: { mode: "run", opts: F.opts, moves, at: 1 } } } });
  const p = h.page; await open(h);
  const n0 = await p.$$eval("[data-gm-jokers] > button", e => e.length);
  await p.waitForTimeout(500); await shot(p, "deck190_table0");
  await p.click("[data-gm-jokers] > button"); await p.waitForSelector("[data-gm-joker-sell]");
  await p.click("[data-gm-joker-sell]"); await p.click("[data-gm-sell-yes]"); await p.waitForTimeout(900);
  T.eq(await p.$$eval("[data-gm-jokers] > button", e => e.length), n0 - 1, "sold on the table");
  await shot(p, "deck190_table");
  T.eq(await p.getAttribute("[data-game]", "data-game"), "blind", "the blind goes on");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
T.done();
