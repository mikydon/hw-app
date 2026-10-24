// 1.8.0: unit tests for the card game engine (src/game/engine.js). Run: node tools/game_test.mjs
import * as G from "../src/game/engine.js";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗ FAIL:", m); } };
const C = (suit, v) => G.SUITS.indexOf(suit) * 13 + (v - 2); // card id
console.log("hands");
const hv = cs => G.handOf(cs).hand;
ok(hv([C("push", 5)]) === "high", "one card: high card");
ok(hv([C("push", 5), C("pull", 5)]) === "pair", "pair");
ok(hv([C("push", 5), C("pull", 5), C("legs", 9), C("core", 9)]) === "circuit", "two pair in four types: the circuit counts (it is worth more)");
ok(hv([C("push", 5), C("pull", 5), C("legs", 9), C("legs", 9)]) === "two", "two pair");
ok(hv([C("push", 5), C("pull", 7), C("legs", 9), C("core", 11)]) === "circuit", "all four types = circuit");
ok(hv([C("push", 5), C("pull", 5), C("legs", 5)]) === "three", "three of a kind");
ok(hv([C("push", 2), C("pull", 3), C("legs", 4), C("core", 5), C("push", 6)]) === "straight", "straight");
ok(hv([C("push", 14), C("pull", 2), C("legs", 3), C("core", 4), C("push", 5)]) === "straight", "A-2-3-4-5 straight");
ok(hv([C("core", 2), C("core", 7), C("core", 9), C("core", 11), C("core", 13)]) === "flush", "flush");
ok(hv([C("push", 9), C("pull", 9), C("legs", 9), C("core", 4), C("push", 4)]) === "full", "full house");
ok(hv([C("push", 9), C("pull", 9), C("legs", 9), C("core", 9)]) === "four", "four of a kind");
ok(hv([C("legs", 6), C("legs", 7), C("legs", 8), C("legs", 9), C("legs", 10)]) === "sflush", "straight flush");
console.log("score");
const st0 = G.newGame({ seed: "s1", mode: "run", suit: { push: 3, pull: -1, legs: 0, core: 8 } });
let sc = G.scoreOf(st0, [C("push", 5), C("pull", 5)]);
ok(sc.chips === 10 + (5 + 6) + 5 && sc.mult === 2 && sc.score === 52, `pair of 5s: (10 + 5+6 push Gold + 5 pull) × 2 = 52 (${sc.chips} × ${sc.mult})`);
sc = G.scoreOf({ ...st0, jokers: [{ id: "joker" }, { id: "fan_push" }] }, [C("push", 5), C("pull", 5)]);
ok(sc.mult === 2 + 3 + 4, "jokers: +3 (push card) +4");
sc = G.scoreOf({ ...st0, jokers: [{ id: "lastround" }], handsLeft: 1 }, [C("core", 14)]);
ok(sc.mult === 3 && sc.chips === 5 + 11 + 16, "last hand ×3; core Obsidian +16 chips");
sc = G.scoreOf({ ...st0, blind: 2, boss: "skip_push" }, [C("push", 5), C("pull", 5)]);
ok(sc.chips === 10 + 5, "boss: push cards score nothing");
console.log("a game");
const opts = { seed: "abc", mode: "duel", suit: { push: 2, pull: 2, legs: 2, core: 2 } };
const a = G.newGame(opts), b = G.newGame(opts);
ok(JSON.stringify(a.hand) === JSON.stringify(b.hand) && a.hand.length === 8 && a.target === 300, "same seed = same cards; 8 in hand; target 300");
let t0 = Date.now();
const bot = G.botGame(opts, 10);
const ms = Date.now() - t0;
const rep = G.replay(opts, bot.moves);
ok(JSON.stringify(G.resultOf(rep)) === JSON.stringify(G.resultOf(bot.st)), `replay gives the same result (${JSON.stringify(G.resultOf(rep))}, bot game ${ms} ms, ${bot.moves.length} moves)`);
ok(bot.st.cleared >= 3, "a strong bot with Silver everywhere clears the first ante");
let threw = false; try { G.act(a, { t: "play", c: [9] }); } catch (_) { threw = true; }
ok(threw, "a card that isn't in hand: bad move");
threw = false; try { G.act({ ...a, discardsLeft: 0 }, { t: "discard", c: [0] }); } catch (_) { threw = true; }
ok(threw, "discard without discards: bad move");
const s2 = G.act(a, { t: "discard", c: [0, 1, 2] });
ok(s2.hand.length === 8 && s2.discardsLeft === 2 && s2.deck.length === 41, "discard 3: draw 3 back");
// a shop
let g = G.newGame({ ...opts, seed: "shop1" }); let guard = 0;
while (g.phase === "blind" && guard++ < 20) g = G.act(g, G.botMove(g, 10));
ok(g.phase === "shop" && g.shop.items.length === 3 && g.money > 4, `after the first blind: shop with 2 jokers + 1 drill, $${g.money}`);
const g2 = G.act({ ...g, money: 50 }, { t: "buy", i: 0 });
ok(g2.jokers.length === 1 && g2.money === 50 - g.shop.items[0].cost, "buy a joker");
const g3 = G.act(g2, { t: "reroll" });
ok(g3.shop.rerolls === 1 && g3.money === g2.money - 5, "reroll costs $5");
const g4 = G.act(g3, { t: "next" });
ok(g4.phase === "blind" && g4.blind === 1 && g4.target === 450, "next: the big blind, 450");
// stakes
const sk = G.newGame({ ...opts, mode: "run", seed: "stk", stake: 4 });
ok(sk.target === 450 && sk.discardsLeft === 2 && sk.hand.length === 7, `gold stake: 300 × 1.5, one discard fewer, 7 cards (${sk.target}, ${sk.discardsLeft}, ${sk.hand.length})`);
let rs = G.newGame({ ...opts, seed: "stk2", stake: 1 }); guard = 0;
while (rs.phase === "blind" && guard++ < 20) rs = G.act(rs, G.botMove(rs, 10));
ok(rs.phase === "shop" && rs.last.pay === rs.handsLeft && rs.money === 4 + rs.handsLeft, `red stake: the small blind pays only $1 per spare hand (+$${rs.last.pay})`);
ok(G.newGame({ ...opts, stake: 2 }).target === 375, "green stake: × 1.25");
// loadout
const lo = G.loadout({ bests: { k1: 50, b5: 620, row1: 5 }, streak: 14, n: 30 });
ok(lo.suit.push === 7 && lo.suit.core === 8 && lo.suit.pull === 0 && lo.suit.legs === -1, `suit levels from ranks (${JSON.stringify(lo.suit)})`);
ok(["streak", "volume", "warmup", "endurance", "obsidian"].every(p => lo.perks.includes(p)) && !lo.perks.includes("allround"), `perks (${lo.perks})`);
// win rates of the bot at different strengths over 30 seeds (sanity, not too easy)
const wr = (lv, suit) => { let c = 0; for (let i = 0; i < 30; i++) c += G.botGame({ seed: "w" + i, mode: "run", suit }, lv).st.cleared; return c / 30; };
const weak = wr(3, { push: -1, pull: -1, legs: -1, core: -1 }), strong = wr(10, { push: 6, pull: 6, legs: 6, core: 6 });
console.log(`   run: blinds cleared on average: weak bot, no training ${weak.toFixed(1)}; strong bot, Emerald ${strong.toFixed(1)} (of 24)`);
ok(strong > weak, "training makes the deck stronger");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
