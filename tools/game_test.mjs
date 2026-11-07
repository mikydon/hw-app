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
ok(JSON.stringify(a.hand) === JSON.stringify(b.hand) && a.hand.length === 8 && a.target === G.ANTE_BASE[0], `same seed = same cards; 8 in hand; target ${G.ANTE_BASE[0]}`);
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
ok(g.phase === "shop" && g.shop.items.filter(x => x.k === "joker").length === 2 && g.shop.items.some(x => x.k === "drill") && g.shop.items.some(x => x.k === "pack") && g.shop.items.some(x => x.k === "voucher") && g.money > 4, `after the first blind: shop with 2 jokers, a drill, a pack and the ante's voucher, $${g.money}`);
const g2 = G.act({ ...g, money: 50 }, { t: "buy", i: 0 });
ok(g2.jokers.length === 1 && g2.money === 50 - g.shop.items[0].cost, "buy a joker");
const g3 = G.act(g2, { t: "reroll" });
ok(g3.shop.rerolls === 1 && g3.money === g2.money - 5, "reroll costs $5");
const g4 = G.act(g3, { t: "next" });
ok(g4.phase === "blind" && g4.blind === 1 && g4.target === G.ANTE_BASE[0] * 1.5, "next: the big blind, × 1.5");
// stakes
const sk = G.newGame({ ...opts, mode: "run", seed: "stk", stake: 4 });
ok(sk.target === G.ANTE_BASE[0] * 1.5 && sk.discardsLeft === 2 && sk.hand.length === 7, `gold stake: × 1.5, one discard fewer, 7 cards (${sk.target}, ${sk.discardsLeft}, ${sk.hand.length})`);
let rs = G.newGame({ ...opts, seed: "stk2", stake: 1 }); guard = 0;
while (rs.phase === "blind" && guard++ < 20) rs = G.act(rs, G.botMove(rs, 10));
ok(rs.phase === "shop" && rs.last.pay === rs.handsLeft && rs.money === 4 + rs.handsLeft, `red stake: the small blind pays only $1 per spare hand (+$${rs.last.pay})`);
ok(G.newGame({ ...opts, stake: 2 }).target === G.ANTE_BASE[0] * 1.25, "green stake: × 1.25");
// loadout
const lo = G.loadout({ bests: { k1: 50, b5: 620, row1: 5 }, streak: 14, n: 30 });
ok(lo.suit.push === 7 && lo.suit.core === 8 && lo.suit.pull === 0 && lo.suit.legs === -1, `suit levels from ranks (${JSON.stringify(lo.suit)})`);
ok(["streak", "volume", "warmup", "endurance", "obsidian"].every(p => lo.perks.includes(p)) && !lo.perks.includes("allround"), `perks (${lo.perks})`);
// win rates of the bot at different strengths over 30 seeds (sanity, not too easy)
const wr = (lv, suit) => { let c = 0; for (let i = 0; i < 30; i++) c += G.botGame({ seed: "w" + i, mode: "run", suit }, lv).st.cleared; return c / 30; };
console.log("new jokers (1.8.0, Oct 25)");
{
  const base = G.newGame({ seed: "j1", mode: "run", suit: { push: -1, pull: -1, legs: -1, core: -1 } });
  const S = (jokers, extra = {}) => ({ ...base, jokers: jokers.map(id => (typeof id === "string" ? { id, cost: 5 } : id)), ...extra });
  const pairC = [C("push", 5), C("pull", 5)];
  ok(G.scoreOf(S(["rest"], { discardsLeft: 3 }), pairC).chips === 10 + 10 + 60, "rest: +20 chips per discard left");
  ok(G.scoreOf(S(["short"]), pairC).mult === 2 + 15 && G.scoreOf(S(["short"]), [C("push", 2), C("push", 4), C("push", 6), C("push", 8)]).mult === 1, "short: +15 mult only with 3 cards or fewer");
  ok(G.scoreOf(S(["spotter"]), [C("push", 5), C("pull", 5), C("legs", 9), C("legs", 9)]).mult === 2 + 12, "spotter: +12 mult with two pair");
  ok(G.scoreOf(S(["fresh"], { bp: 0 }), pairC).mult === 3 && G.scoreOf(S(["fresh"], { bp: 1 }), pairC).mult === 2, "fresh: × 1.5 only on the first hand of a blind");
  ok(G.scoreOf(S(["solo"]), [C("core", 14)]).mult === 3, "solo: × 3 with one card");
  ok(G.scoreOf(S(["specialist"]), [C("legs", 2), C("legs", 2), C("legs", 9)]).mult === 2 * 2 && G.scoreOf(S(["specialist"]), pairC).mult === 2, "specialist: × 2 when 3+ cards are one type");
  const d = G.scoreOf(S(["double"]), pairC);
  ok(d.chips === 10 + 5 + 5 + 5, `double: the first scored card counts twice (${d.chips})`);
  ok(G.scoreOf(S([{ id: "overload", cost: 8, v: 4 }]), pairC).mult === 2 + 5 && G.scoreOf(S([{ id: "overload", cost: 8, v: 4 }]), [C("push", 9)]).mult === 1 + 4, "overload: its count, +1 when this hand has a pair");
  // passive ones through a real game
  let g = G.newGame({ seed: "j2", mode: "run", suit: { push: 8, pull: 8, legs: 8, core: 8 }, perk: "obsidian" });
  while (g.phase === "blind") g = G.act(g, G.botMove(g, 10));
  g = { ...g, money: 99, jokers: [], shop: { items: [{ k: "joker", id: "wind", cost: 8 }, { k: "joker", id: "slate", cost: 6 }, { k: "joker", id: "coupon", cost: 4 }], rerolls: 0, rerollCost: 5 } };
  for (const i of [0, 1, 2]) g = G.act(g, { t: "buy", i });
  ok(g.shop.rerollCost === 3, "coupon: New costs $2 less at once");
  g = G.act(g, { t: "next" });
  ok(g.handsLeft === 5 + (g.boss === "few" ? -1 : 0) && g.discardsLeft === 4, `wind +1 hand, slate +1 discard (${g.handsLeft}, ${g.discardsLeft})`);
  let o = G.newGame({ seed: "j3", mode: "run", suit: {} }); o.jokers = [{ id: "overload", cost: 8 }];
  const pi = o.hand.findIndex((c, i) => o.hand.some((x, k) => k !== i && G.valueOf(x) === G.valueOf(c)));
  if (pi >= 0) { const pj = o.hand.findIndex((x, k) => k !== pi && G.valueOf(x) === G.valueOf(o.hand[pi])); o = G.act(o, { t: "play", c: [pi, pj] }); ok(o.jokers[0].v === 1, "overload grows by 1 after a hand with a pair"); }
  const t = G.newGame({ seed: "j4", mode: "run", suit: {}, deck: [C("push", 13), C("pull", 13), C("legs", 4)] });
  ok(t.hand[0] === C("push", 13) && t.hand[1] === C("pull", 13) && t.hand[2] === C("legs", 4) && new Set(t.hand).size === 8, "tutorial deck: the given cards come first");
  ok(G.JOKER_IDS.length === 62, `62 jokers (38 + 24 new in 1.8.2) (${G.JOKER_IDS.length})`);
}
console.log("vouchers, packs, legendary jokers (1.8.0, Oct 25, 02:17)");
{
  let g = G.newGame({ seed: "v1", mode: "run", suit: { push: 8, pull: 8, legs: 8, core: 8 }, perk: "obsidian" });
  while (g.phase === "blind") g = G.act(g, G.botMove(g, 10));
  g = { ...g, money: 200 };
  const vi = g.shop.items.findIndex(x => x.k === "voucher"), vid = g.shop.items[vi].id;
  const rr = G.act(g, { t: "reroll" });
  ok(rr.shop.items.find(x => x.k === "voucher").id === vid, "New doesn't change the ante's voucher");
  let b = G.act(g, { t: "buy", i: vi });
  ok(b.vouchers.includes(vid) && !G.act(b, { t: "reroll" }).shop.items.some(x => x.k === "voucher"), "a bought voucher is gone for the rest of the ante");
  const m = { ...g, vouchers: ["membership", "extraset", "resttimer", "discount", "bigbag"] };
  ok(G.jokerSlots(m) === 6, "membership: 6 joker slots");
  const nx = G.act(m, { t: "next" });
  ok(nx.handsLeft >= 4 + (nx.boss === "few" ? 0 : 1) && nx.discardsLeft === 4 && nx.hand.length === 9, `extraset/resttimer/bigbag: +1 hand, +1 discard, 9 cards (${nx.handsLeft}, ${nx.discardsLeft}, ${nx.hand.length})`);
  const pi = g.shop.items.findIndex(x => x.k === "pack");
  let pk = G.act({ ...g, shop: { ...g.shop, items: g.shop.items.map((x, i) => (i === pi ? { ...x, id: "jpack" } : x)) } }, { t: "buy", i: pi });
  ok(pk.pack && pk.pack.id === "jpack" && pk.pack.opts.length === 3, "a Joker pack opens with 3 jokers");
  let threw = false; try { G.act(pk, { t: "next" }); } catch (_) { threw = true; }
  ok(threw, "nothing else until you pick or skip");
  const got = G.act(pk, { t: "pick", i: 1 });
  ok(got.jokers.some(j => j.id === pk.pack.opts[1]) && !got.pack, "pick: the joker is yours");
  const dp = G.act({ ...g, shop: { ...g.shop, items: g.shop.items.map((x, i) => (i === pi ? { ...x, id: "dpack" } : x)) } }, { t: "buy", i: pi });
  const lv = G.act(dp, { t: "pick", i: 0 });
  ok(lv.levels[dp.pack.opts[0]] === (g.levels[dp.pack.opts[0]] || 0) + 1, "Drill pack: the picked hand goes up a level");
  ok(!G.act(dp, { t: "skip" }).pack, "skip closes the pack");
  const base = G.newGame({ seed: "j1", mode: "run", suit: { push: -1, pull: -1, legs: -1, core: -1 } });
  const S = (jokers, extra = {}) => ({ ...base, jokers, ...extra });
  ok(G.scoreOf(S([{ id: "hof", cost: 14 }]), [G.SUITS.indexOf("push") * 13 + 11, G.SUITS.indexOf("pull") * 13 + 11]).mult === 4.5, "hof: × 1.5 for each scored face card (2 × 1.5 × 1.5)");
  ok(G.scoreOf(S([{ id: "pr", cost: 14, v: 4 }]), [C("push", 5), C("pull", 5)]).mult === 4, "pr: × 2 after 4 blinds");
  let c = G.newGame({ seed: "j3", mode: "run", suit: {} }); c.jokers = [{ id: "coach", cost: 15 }];
  const h0 = G.handOf([c.hand[0]]).hand; c = G.act(c, { t: "play", c: [0] });
  ok(c.levels[h0] === 1, "coach: the played hand went up a level");
  ok(G.JOKER_IDS.filter(j => G.JOKERS[j].r === 3).length === 4, "4 legendary jokers");
  let tt = G.newGame({ seed: "tutorial", mode: "run", suit: {}, tut: 1, deck: G.TUT_DECK });
  ok(tt.target === 400 && tt.hand.join() === G.TUT_DECK.slice(0, 8).join(), "tutorial: target 400, the fixed first hand");
}
console.log("1.8.2: more jokers, vouchers and packs; easier targets; saved games survive new rules");
{
  const base = G.newGame({ seed: "n1", mode: "run", suit: { push: -1, pull: -1, legs: -1, core: -1 } });
  const S = (jokers, extra = {}) => ({ ...base, jokers: jokers.map(id => (typeof id === "string" ? { id, cost: 5 } : id)), ...extra });
  const pair = [C("push", 5), C("pull", 5)], full = [C("push", 5), C("pull", 5), C("legs", 5), C("core", 9), C("push", 9)];
  const sc = (j, cards, extra) => G.scoreOf(S(j, extra), cards);
  const p0 = sc([], pair);
  ok(sc(["reps"], pair).chips === p0.chips + 12, "reps: +6 chips per scored card");
  ok(sc(["tempo"], pair).mult === p0.mult + 4, "tempo: +2 mult per played card");
  ok(sc(["buddy"], pair).chips === p0.chips + 40, "buddy: +40 chips with a pair");
  ok(sc(["heavy"], [C("push", 12), C("pull", 12)]).mult === p0.mult + 6 && sc(["heavy"], pair).mult === p0.mult, "heavy: +3 mult per scored 10+ only");
  ok(sc(["light"], pair).mult === p0.mult + 6, "light: +3 mult per scored 2–5");
  ok(sc(["patience"], pair, { discardsLeft: 3 }).mult === p0.mult + 12, "patience: +4 mult per discard left");
  ok(sc(["pace"], pair, { handsLeft: 4 }).mult === p0.mult + 12, "pace: +3 mult per hand left");
  ok(sc(["gold"], pair, { money: 17 }).mult === p0.mult + 3, "gold: +1 mult per $5");
  ok(sc(["burner"], pair, { discardsLeft: 0 }).mult === p0.mult * 2 && sc(["burner"], pair, { discardsLeft: 1 }).mult === p0.mult, "burner: × 2 only with no discards left");
  const fh = sc([], full);
  ok(fh.hand === "full" && sc(["fullx"], full).mult === fh.mult * 2.5, "fullx: × 2.5 with a full house");
  ok(sc(["twin"], pair).mult === p0.mult * 1.5, "twin: × 1.5 with a pair");
  ok(sc(["joker", "chips", "team"], pair).mult === Math.round((p0.mult + 4) * 1.4 * 100) / 100, "team: × 1.4 with two other jokers");
  ok(sc(["goat"], pair).mult === p0.mult * 3, "goat: × 3");
  ok(sc(["ironpush"], pair).mult === Math.round(p0.mult * 1.2 * 100) / 100, "ironpush: × 1.2 per scored push card");
  ok(sc([], pair, { vouchers: ["routine"], bp: 0 }).mult === p0.mult + 10 && sc([], pair, { vouchers: ["routine"], bp: 1 }).mult === p0.mult, "routine: +10 mult on the first hand only");
  let vb = G.newGame({ seed: "n2", mode: "run", suit: {} }); vb.jokers = [{ id: "vblock", cost: 6 }];
  vb = G.act(vb, { t: "play", c: [0] }); ok(vb.jokers[0].v === 6, "vblock grows by 6 chips after a hand");
  ok(G.targetOf(0, 0, null, 0, ["deload"]) === Math.round(G.ANTE_BASE[0] * 0.85) && G.targetOf(0, 2, "few", 0, ["bossscout"]) === Math.round(G.ANTE_BASE[0] * 2 * 0.75), "deload −15 %, bossscout −25 % on boss blinds");
  let g = G.newGame({ seed: "v1", mode: "run", suit: { push: 8, pull: 8, legs: 8, core: 8 }, perk: "obsidian" });
  while (g.phase === "blind") g = G.act(g, G.botMove(g, 10));
  g = { ...g, money: 200 };
  const pi = g.shop.items.findIndex(x => x.k === "pack");
  const withPack = (id, extra = {}) => G.act({ ...g, ...extra, shop: { ...g.shop, items: g.shop.items.map((x, i) => (i === pi ? { ...x, id } : x)) } }, { t: "buy", i: pi });
  ok(withPack("jmega").pack.opts.length === 5 && withPack("dmega").pack.opts.length === 5, "big packs show 5 choices");
  const rp = withPack("rpack"); ok(rp.pack.opts.length === 2 && rp.pack.opts.every(j => G.JOKERS[j].r >= 2), "rare pack: 2 jokers, rare or better");
  ok(withPack("jpack", { vouchers: ["packplus"] }).pack.opts.length === 4, "packplus: one more choice");
  const dm = withPack("dpack", { vouchers: ["drillmaster"] }); ok(G.act(dm, { t: "pick", i: 0 }).levels[dm.pack.opts[0]] === (g.levels[dm.pack.opts[0]] || 0) + 2, "drillmaster: a drill levels up twice");
  ok(G.isJokerPack("jmega") && G.isJokerPack("rpack") && !G.isJokerPack("dmega"), "joker packs: jpack, jmega, rpack");
  let sh = G.newGame({ seed: "v1", mode: "run", suit: { push: 8, pull: 8, legs: 8, core: 8 }, perk: "obsidian" }); sh.vouchers = ["shelf"];
  while (sh.phase === "blind") sh = G.act(sh, G.botMove(sh, 10));
  ok(sh.shop.items.filter(x => x.k === "pack").length === 2, "shelf: two packs in the shop");
  const opts = { seed: "keep", mode: "run", suit: { push: 3, pull: 3, legs: 3, core: 3 } };
  const { moves } = G.botGame(opts, 10, 40);
  const bad = [...moves.slice(0, 20), { t: "buy", i: 99 }, ...moves.slice(20)];
  const k = G.replayKeep(opts, bad);
  ok(k.n === 20 && (k.st.phase === "blind" || k.st.phase === "shop"), `replayKeep stops before a move that no longer fits (${k.n})`);
  ok(G.VOUCHER_IDS.length === 16 && Object.keys(G.PACKS).length === 5, "16 vouchers, 5 packs");
}
const weak = wr(3, { push: -1, pull: -1, legs: -1, core: -1 }), strong = wr(10, { push: 6, pull: 6, legs: 6, core: 6 });
console.log(`   run: blinds cleared on average: weak bot, no training ${weak.toFixed(1)}; strong bot, Emerald ${strong.toFixed(1)} (of 24)`);
ok(strong > weak, "training makes the deck stronger");
console.log("1.9.0: selling during a blind and with a pack open");
{
  // a bot game up to a shop with every joker slot taken and a joker pack it can pay for
  let found = null;
  for (let k = 0; k < 400 && !found; k++) {
    const opts = { seed: "ff" + k, mode: "run", suit: { push: 3, pull: 3, legs: 3, core: 3 } };
    let st = G.newGame(opts);
    for (let n = 0; n < 500 && st.phase !== "over" && st.phase !== "won"; n++) {
      if (st.phase === "shop" && !st.pack && st.jokers.length >= G.jokerSlots(st)) {
        const i = st.shop.items.findIndex(it => it.k === "pack" && G.isJokerPack(it.id) && !it.sold && st.money >= it.cost);
        if (i >= 0) { found = { st, i }; break; }
      }
      const m = G.botMove(st, 5); if (!m) break; st = G.act(st, m);
    }
  }
  ok(!!found, "found a shop with full joker slots and a joker pack");
  if (found) {
    let st = G.act(found.st, { t: "buy", i: found.i });
    ok(!!st.pack && st.pack.opts.length > 0, "the pack is open");
    let threw = false; try { G.act(st, { t: "pick", i: 0 }); } catch (_) { threw = true; }
    ok(threw, "full slots: a pick is refused");
    const m0 = st.money, j0 = st.jokers[0];
    st = G.act(st, { t: "sell", i: 0 });
    ok(st.pack && st.jokers.length === G.jokerSlots(st) - 1 && st.money === m0 + Math.max(1, Math.floor(j0.cost / 2)), "selling inside the open pack frees a slot and pays half");
    const want = st.pack.opts[0];
    st = G.act(st, { t: "pick", i: 0 });
    ok(!st.pack && st.jokers.some(j => j.id === want), "then the pick works");
  }
  // a sale during a blind
  let st = G.newGame({ seed: "sellb", mode: "run", suit: { push: 3, pull: 3, legs: 3, core: 3 } });
  for (let n = 0; n < 300 && !(st.phase === "blind" && st.jokers.length); n++) { const m = G.botMove(st, 5); if (!m) break; st = G.act(st, m); }
  ok(st.phase === "blind" && st.jokers.length > 0, "a blind with a joker");
  const n0 = st.jokers.length, m1 = st.money, after = G.act(st, { t: "sell", i: 0 });
  ok(after.phase === "blind" && after.jokers.length === n0 - 1 && after.money > m1 && after.hand.length === st.hand.length, "selling during a blind keeps the hand and pays");
  let bad = false; try { G.act(st, { t: "sell", i: 9 }); } catch (_) { bad = true; }
  ok(bad, "selling a joker you don't have is refused");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
