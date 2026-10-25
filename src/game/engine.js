// HW App card game (1.8.0, Michael, Oct 24: a poker-style deck builder, your training gives your cards their strength).
// Pure and deterministic: the same seed, loadout and actions always give the same game, so the push server can
// replay a ranked game (worker/index.js) and the bot plays with the same rules. No text here: names come from the
// locale (gm_*), by id.
//
// The deck: 52 cards, four suits = the four exercise types (push, pull, legs, core), values 2 … 10, J, Q, K, A.
// A scored card gives its chips (2 … 10, faces 10, ace 11) plus 2 × your level in its suit, the best rank you have in
// an exercise of that type (Iron 0 … Obsidian 8; nothing done yet = no bonus).
// A run: antes of three blinds (small, big, boss). Reach the blind's score with your hands (4 a blind, up to 5 cards
// each) and discards (3); the hand you play (pair, straight, "circuit" = all four types…) gives chips × mult. After a
// blind: money, then a shop with jokers (lasting effects) and drills (level up a hand). A boss blind has a twist.
// Modes: "run" = 8 antes (single player); "duel" = 3 antes, both players on the same seed, compared by
// blinds cleared, then total score (against the bot offline, or another player's ranked game).
import { RANK_AT, EX_GROUPS, rankIndex } from "../ranks.js";

export const SUITS = ["push", "pull", "legs", "core"];
export const HANDS = ["high", "pair", "two", "circuit", "three", "straight", "flush", "full", "four", "sflush"];
export const HAND_BASE = { high: [5, 1], pair: [10, 2], two: [20, 2], circuit: [25, 3], three: [30, 3], straight: [30, 4], flush: [35, 4], full: [40, 4], four: [60, 7], sflush: [100, 8] };
export const HAND_UP = { high: [10, 1], pair: [15, 1], two: [20, 1], circuit: [20, 2], three: [20, 2], straight: [30, 3], flush: [15, 2], full: [25, 2], four: [30, 3], sflush: [40, 4] };
// Calibrated with the bot (Oct 25, 60 runs each; the bot weighs jokers on sample hands and buys vouchers and packs).
// Michael (01:45): "at the start it's far too easy". Without ranks or with Silver the bot gets through ante 3 and loses
// around ante 4; Emerald in all four types wins ~22 %, Obsidian ~48 %. (A first blind of 800 already stopped a quarter of
// untrained runs, so the start stays at 600 and the late antes grow fast, like the jokers, vouchers and packs do.)
export const ANTE_BASE = [600, 1800, 4000, 8000, 15000, 26000, 42000, 65000];
export const TUT_TARGET = 400;
// The tutorial's deck (App.jsx TUT): a Pair of Kings, a Circuit, 4 Core cards + a discard for the 5th, a Flush.
export const TUT_DECK = [11, 24, 10, 18, 29, 39, 41, 46, 43, 27, 48, 1, 15, 35, 50, 12, 21, 26];
export const BLIND_MUL = [1, 1.5, 2];
export const BLIND_PAY = [3, 4, 5];
export const RULES = { hands: 4, discards: 3, handSize: 8, maxPlay: 5, jokers: 5, money: 4, reroll: 5, drill: 3, interestMax: 5 };
// Boss blinds: wall = 3 × the score; skip_<suit> = that type's cards score nothing; norest = no discards; few = 3 hands.
export const BOSSES = ["wall", "skip_push", "skip_pull", "skip_legs", "skip_core", "norest", "few"];
// Jokers: r = rarity (0 common, 1 uncommon, 2 rare) and price; lv = game level that adds it to the unranked pool
// (ranked uses all of them, the same for everyone).
export const JOKERS = {
  joker: { r: 0, cost: 4, lv: 1 }, // +4 mult
  fan_push: { r: 0, cost: 5, lv: 1 }, fan_pull: { r: 0, cost: 5, lv: 1 }, fan_legs: { r: 0, cost: 5, lv: 1 }, fan_core: { r: 0, cost: 5, lv: 1 }, // +3 mult per scored card of that type
  pairs: { r: 0, cost: 4, lv: 1 }, // +8 mult if the hand has a pair
  threes: { r: 0, cost: 5, lv: 2 }, // +12 mult with three of a kind
  straights: { r: 0, cost: 5, lv: 3 }, // +12 mult with a straight
  flushes: { r: 0, cost: 5, lv: 3 }, // +10 mult with a flush
  chips: { r: 0, cost: 4, lv: 1 }, // +50 chips
  circuit: { r: 0, cost: 5, lv: 2 }, // +15 mult with a circuit (all four types)
  warmup: { r: 0, cost: 5, lv: 4 }, // each scored 2–5: +10 chips
  faces: { r: 0, cost: 5, lv: 4 }, // each scored J, Q, K: +30 chips
  aces: { r: 1, cost: 6, lv: 5 }, // each scored ace: +20 chips, +4 mult
  lastround: { r: 1, cost: 7, lv: 2 }, // × 3 mult on the last hand of a blind (the last round goes to failure)
  even: { r: 1, cost: 6, lv: 6 }, // each scored even card: +4 mult
  odd: { r: 1, cost: 6, lv: 6 }, // each scored odd card: +31 chips
  momentum: { r: 1, cost: 6, lv: 7 }, // +1 mult for every hand played in this game
  bank: { r: 1, cost: 6, lv: 8 }, // +$3 after each blind
  five: { r: 2, cost: 8, lv: 9 }, // × 2 mult when five cards score
  fullbody: { r: 2, cost: 8, lv: 10 }, // × 1.5 mult when the played cards have all four types
  ironcore: { r: 2, cost: 8, lv: 12 }, // each scored core card: × 1.2 mult
  // 1.8.0 (Michael, Oct 25, 02:00: "more jokers, so there are more strategies"): small hands, single types, discards,
  // the first hand, a joker that grows, economy and passive ones (a hand, a discard, a card more)
  rest: { r: 0, cost: 5, lv: 2 }, // +20 chips for every discard you still have
  short: { r: 0, cost: 5, lv: 3 }, // +15 mult when you play 3 cards or fewer
  spotter: { r: 0, cost: 5, lv: 3 }, // +12 mult with two pair or a full house
  coupon: { r: 0, cost: 4, lv: 5 }, // New (reroll) costs $2 less
  fresh: { r: 1, cost: 6, lv: 4 }, // × 1.5 mult on the first hand of each blind
  slate: { r: 1, cost: 6, lv: 5 }, // +1 discard in every blind
  bighand: { r: 1, cost: 7, lv: 6 }, // +1 card in hand
  compound: { r: 1, cost: 6, lv: 7 }, // interest up to $10 instead of $5
  solo: { r: 1, cost: 6, lv: 7 }, // × 3 mult when you play a single card
  wind: { r: 2, cost: 8, lv: 8 }, // +1 hand in every blind
  specialist: { r: 2, cost: 8, lv: 9 }, // × 2 mult when 3+ cards are played and all are one type
  overload: { r: 2, cost: 8, lv: 10 }, // +1 mult for good every time you play a hand with a pair in it (starts at 0)
  double: { r: 2, cost: 8, lv: 11 }, // the first scored card counts twice
  // legendary (Michael, Oct 25, 02:17: "split the jokers into the best ones…"): rare in the shop and in Joker packs
  pr: { r: 3, cost: 14, lv: 12 }, // gains × 0.25 multiplier for every blind beaten after you got it (starts × 1)
  hof: { r: 3, cost: 14, lv: 13 }, // each scored J, Q or K: × 1.5 multiplier
  coach: { r: 3, cost: 15, lv: 14 }, // every hand you play goes up a level (after it scores)
};
// 0 common, 1 uncommon, 2 rare, 3 legendary; the shop rolls them 62 / 28 / 8.5 / 1.5 %
export const RARITIES = ["common", "uncommon", "rare", "legendary"];
// Vouchers (1.8.0, Michael: "something to spend the money on"): one per ante in the shop until bought, for the whole Run.
export const VOUCHERS = { membership: { cost: 10 }, extraset: { cost: 10 }, resttimer: { cost: 10 }, discount: { cost: 10 }, bigbag: { cost: 12 }, savings: { cost: 10 }, restock: { cost: 10 }, scout: { cost: 8 } };
export const VOUCHER_IDS = Object.keys(VOUCHERS);
// Packs: open one, pick 1 of 3 (or skip). jpack = jokers, dpack = drills (level up a hand).
export const PACKS = { jpack: { cost: 5 }, dpack: { cost: 4 } };
export const hasV = (st, id) => (st.vouchers || []).includes(id);
export const jokerSlots = st => RULES.jokers + (hasV(st, "membership") ? 1 : 0);
const price = (st, c) => (hasV(st, "discount") ? Math.max(1, Math.floor(c * 0.75)) : c);
export const JOKER_IDS = Object.keys(JOKERS);
// Perks: one chosen at the start, unlocked by training (checked numbers in ranked).
export const PERKS = {
  streak: { need: s => s.streak >= 7 }, // +1 mult per 7 days of streak (up to +10)
  volume: { need: s => s.n >= 25 }, // start with $4 more
  warmup: { need: s => s.n >= 10 }, // +1 discard each blind
  endurance: { need: s => s.suit.core >= 4 }, // +1 hand each blind
  allround: { need: s => SUITS.every(x => s.suit[x] >= 1) }, // +1 card in hand
  obsidian: { need: s => SUITS.some(x => s.suit[x] >= 8) }, // × 1.5 mult on every hand
};
export const PERK_IDS = Object.keys(PERKS);
// Stakes (1.8.0, Michael: risk without losing anything you have): each one keeps the ones below it.
// 0 white = normal, 1 red = the small blind pays nothing, 2 green = scores × 1.25, 3 black = one discard fewer,
// 4 gold = scores × 1.5 and one card fewer in hand. Ranked always plays white.
export const STAKES = ["white", "red", "green", "black", "gold"];
const stakeMul = k => (k >= 4 ? 1.5 : k >= 2 ? 1.25 : 1);

// ── random numbers: mulberry32 from a string seed; every stream has its own key, so choices never shift them ──
function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(...key) {
  let a = hash(key.join("|"));
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const newSeed = () => Math.random().toString(36).slice(2, 10);

// ── cards ──
export const suitOf = c => SUITS[Math.floor(c / 13)];
export const valueOf = c => (c % 13) + 2; // 2 … 14 (11 J, 12 Q, 13 K, 14 A)
export const chipsOf = c => { const v = valueOf(c); return v === 14 ? 11 : v > 10 ? 10 : v; };

// What training gives: the level in each suit (the best rank in an exercise of that type, -1 = none) and the perks.
// stats = {bests: {exerciseId: best set}, streak, n}.
export function loadout(stats = {}) {
  const bests = stats.bests || {}, suit = {};
  SUITS.forEach((s, i) => { let lv = -1; EX_GROUPS[i].forEach(id => { const b = bests[id]; if (typeof b === "number" && isFinite(b) && RANK_AT[id]) lv = Math.max(lv, rankIndex(id, b)); }); suit[s] = lv; });
  const st = { suit, streak: stats.streak || 0, n: stats.n || 0 };
  return { suit, streak: st.streak, n: st.n, perks: PERK_IDS.filter(p => PERKS[p].need(st)) };
}
// the exercise shown on a face card (the best one you have of that type, or the program's)
export function faceExercise(c, bests = {}) {
  const g = EX_GROUPS[Math.floor(c / 13)];
  const done = g.filter(id => typeof bests[id] === "number").sort((a, b) => rankIndex(b, bests[b]) - rankIndex(a, bests[a]));
  const list = done.length ? done : g;
  return list[(valueOf(c) - 11) % list.length];
}

// ── hands ──
export function handOf(cards) {
  const vals = cards.map(valueOf), suits = cards.map(suitOf);
  const count = {}; vals.forEach(v => { count[v] = (count[v] || 0) + 1; });
  const groups = Object.entries(count).map(([v, n]) => [+v, n]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.length === 5 && new Set(suits).size === 1;
  const uniq = [...new Set(vals)].sort((a, b) => a - b);
  let straight = false;
  if (cards.length === 5 && uniq.length === 5) {
    straight = uniq[4] - uniq[0] === 4 || (uniq[4] === 14 && uniq[0] === 2 && uniq[3] === 5); // A-2-3-4-5
  }
  const of = n => cards.filter(c => valueOf(c) === n);
  if (straight && flush) return { hand: "sflush", scored: cards.slice() };
  if (groups[0][1] === 4) return { hand: "four", scored: of(groups[0][0]) };
  if (groups[0][1] === 3 && groups[1] && groups[1][1] >= 2) return { hand: "full", scored: cards.slice() };
  if (flush) return { hand: "flush", scored: cards.slice() };
  if (straight) return { hand: "straight", scored: cards.slice() };
  if (groups[0][1] === 3) return { hand: "three", scored: of(groups[0][0]) };
  if (new Set(suits).size === 4) return { hand: "circuit", scored: cards.slice() };
  if (groups[0][1] === 2 && groups[1] && groups[1][1] === 2) return { hand: "two", scored: [...of(groups[0][0]), ...of(groups[1][0])] };
  if (groups[0][1] === 2) return { hand: "pair", scored: of(groups[0][0]) };
  const top = cards.slice().sort((a, b) => valueOf(b) - valueOf(a) || b - a)[0];
  return { hand: "high", scored: [top] };
}
const contains = (cards, h) => {
  const vals = cards.map(valueOf), count = {}; vals.forEach(v => { count[v] = (count[v] || 0) + 1; });
  const ns = Object.values(count);
  if (h === "pair") return ns.some(n => n >= 2);
  if (h === "three") return ns.some(n => n >= 3);
  return false;
};

// The score of playing these cards now. Returns {hand, scored, chips, mult, score, steps} (steps = what added what,
// for the animation: [{c?, j?, chips?, mult?, x?}]).
export const hasPair = cards => contains(cards, "pair");
const owns = (st, id) => st.jokers.some(j => j.id === id);
export function scoreOf(st, cards) {
  const { hand, scored } = handOf(cards);
  const lv = (st.levels && st.levels[hand]) || 0;
  let chips = HAND_BASE[hand][0] + HAND_UP[hand][0] * lv, mult = HAND_BASE[hand][1] + HAND_UP[hand][1] * lv;
  const steps = [];
  const boss = st.boss && st.blind === 2 ? st.boss : null;
  const dead = s => boss === "skip_" + s;
  const J = st.jokers.map(j => j.id);
  // "double": the first scored card counts twice (its chips and every per-card joker again)
  const seq = J.includes("double") && scored.length ? [scored[0], ...scored] : scored;
  for (const c of seq) {
    const s = suitOf(c), v = valueOf(c);
    if (dead(s)) { steps.push({ c, dead: 1 }); continue; }
    const add = chipsOf(c) + 2 * Math.max(0, st.suit[s]);
    chips += add; steps.push({ c, chips: add });
    for (const j of J) {
      if (j === "fan_" + s) { mult += 3; steps.push({ c, j, mult: 3 }); }
      else if (j === "warmup" && v <= 5) { chips += 10; steps.push({ c, j, chips: 10 }); }
      else if (j === "faces" && v >= 11 && v <= 13) { chips += 30; steps.push({ c, j, chips: 30 }); }
      else if (j === "aces" && v === 14) { chips += 20; mult += 4; steps.push({ c, j, chips: 20, mult: 4 }); }
      else if (j === "even" && v <= 10 && v % 2 === 0) { mult += 4; steps.push({ c, j, mult: 4 }); }
      else if (j === "odd" && (v === 14 || (v <= 10 && v % 2 === 1))) { chips += 31; steps.push({ c, j, chips: 31 }); }
      else if (j === "ironcore" && s === "core") { mult *= 1.2; steps.push({ c, j, x: 1.2 }); }
      else if (j === "hof" && v >= 11 && v <= 13) { mult *= 1.5; steps.push({ c, j, x: 1.5 }); }
    }
  }
  const has = h => hand === h || (h === "pair" && contains(cards, "pair")) || (h === "three" && contains(cards, "three"));
  for (const j of J) {
    if (j === "joker") { mult += 4; steps.push({ j, mult: 4 }); }
    else if (j === "chips") { chips += 50; steps.push({ j, chips: 50 }); }
    else if (j === "pairs" && has("pair")) { mult += 8; steps.push({ j, mult: 8 }); }
    else if (j === "threes" && has("three")) { mult += 12; steps.push({ j, mult: 12 }); }
    else if (j === "straights" && (hand === "straight" || hand === "sflush")) { mult += 12; steps.push({ j, mult: 12 }); }
    else if (j === "flushes" && (hand === "flush" || hand === "sflush")) { mult += 10; steps.push({ j, mult: 10 }); }
    else if (j === "circuit" && new Set(cards.map(suitOf)).size === 4) { mult += 15; steps.push({ j, mult: 15 }); }
    else if (j === "momentum" && st.played > 0) { mult += st.played; steps.push({ j, mult: st.played }); }
    else if (j === "lastround" && st.handsLeft === 1) { mult *= 3; steps.push({ j, x: 3 }); }
    else if (j === "five" && scored.length === 5) { mult *= 2; steps.push({ j, x: 2 }); }
    else if (j === "fullbody" && new Set(cards.map(suitOf)).size === 4) { mult *= 1.5; steps.push({ j, x: 1.5 }); }
    else if (j === "rest" && st.discardsLeft > 0) { chips += 20 * st.discardsLeft; steps.push({ j, chips: 20 * st.discardsLeft }); }
    else if (j === "short" && cards.length <= 3) { mult += 15; steps.push({ j, mult: 15 }); }
    else if (j === "spotter" && (hand === "two" || hand === "full")) { mult += 12; steps.push({ j, mult: 12 }); }
    else if (j === "overload") { const v = (st.jokers.find(x => x.id === "overload").v || 0) + (hasPair(cards) ? 1 : 0); if (v) { mult += v; steps.push({ j, mult: v }); } }
    else if (j === "fresh" && !(st.bp > 0)) { mult *= 1.5; steps.push({ j, x: 1.5 }); }
    else if (j === "solo" && cards.length === 1) { mult *= 3; steps.push({ j, x: 3 }); }
    else if (j === "specialist" && cards.length >= 3 && new Set(cards.map(suitOf)).size === 1) { mult *= 2; steps.push({ j, x: 2 }); }
    else if (j === "pr") { const v = st.jokers.find(x => x.id === "pr").v || 0; if (v) { const x = Math.round((1 + 0.25 * v) * 100) / 100; mult *= x; steps.push({ j, x }); } }
  }
  if (st.perk === "streak") { const m = Math.min(10, Math.floor((st.streak || 0) / 7)); if (m) { mult += m; steps.push({ p: "streak", mult: m }); } }
  if (st.perk === "obsidian") { mult *= 1.5; steps.push({ p: "obsidian", x: 1.5 }); }
  mult = Math.round(mult * 100) / 100;
  return { hand, scored, chips, mult, score: Math.floor(chips * mult), steps };
}

// ── a game ──
export function targetOf(ante, blind, boss, stake = 0) { return Math.round(ANTE_BASE[Math.min(ante, 7)] * (blind === 2 && boss === "wall" ? 3 : BLIND_MUL[blind]) * stakeMul(stake)); }
function startBlind(st) {
  const r = rng(st.seed, "deck", st.ante, st.blind);
  st.deck = shuffle([...Array(52).keys()], r);
  // the tutorial's first blind: a fixed order on top (the rest of the deck stays shuffled)
  if (st.tdeck && st.ante === 0 && st.blind === 0) st.deck = [...st.tdeck, ...st.deck.filter(c => !st.tdeck.includes(c))];
  st.bp = 0;
  st.hand = [];
  st.boss = st.blind === 2 ? BOSSES[Math.floor(rng(st.seed, "boss", st.ante)() * BOSSES.length)] : null;
  const boss = st.boss;
  st.handsLeft = RULES.hands + (st.perk === "endurance" ? 1 : 0) + (owns(st, "wind") ? 1 : 0) + (hasV(st, "extraset") ? 1 : 0) - (boss === "few" ? 1 : 0);
  st.discardsLeft = boss === "norest" ? 0 : Math.max(0, RULES.discards + (st.perk === "warmup" ? 1 : 0) + (owns(st, "slate") ? 1 : 0) + (hasV(st, "resttimer") ? 1 : 0) - (st.stake >= 3 ? 1 : 0));
  st.target = st.tut ? TUT_TARGET : targetOf(st.ante, st.blind, boss, st.stake);
  st.score = 0;
  st.phase = "blind";
  draw(st);
}
function draw(st) { const size = RULES.handSize + (st.perk === "allround" ? 1 : 0) + (owns(st, "bighand") ? 1 : 0) + (hasV(st, "bigbag") ? 1 : 0) - (st.stake >= 4 ? 1 : 0); while (st.hand.length < size && st.deck.length) st.hand.push(st.deck.shift()); }
// opts: {seed, mode: "run"|"duel", suit: {push..core: level}, perk, streak, pool: [joker ids] (what the shop may offer)}
export function newGame(opts) {
  const st = {
    v: 1, seed: String(opts.seed), mode: opts.mode === "duel" ? "duel" : "run", antes: opts.mode === "duel" ? 3 : 8,
    suit: Object.fromEntries(SUITS.map(s => [s, Math.max(-1, Math.min(8, Math.floor(((opts.suit || {})[s] ?? -1))))])),
    perk: PERK_IDS.includes(opts.perk) ? opts.perk : null, streak: Math.max(0, opts.streak | 0), stake: Math.max(0, Math.min(STAKES.length - 1, opts.stake | 0)),
    pool: (opts.pool || JOKER_IDS).filter(j => JOKERS[j]),
    ante: 0, blind: 0, money: RULES.money + (opts.perk === "volume" ? 4 : 0), jokers: [], levels: {}, played: 0, vouchers: [], pack: null,
    total: 0, cleared: 0, best: 0, shop: null, last: null, n: 0,
  };
  // tutorial: up to 52 different cards on top of the first blind's deck
  if (opts.tut) st.tut = 1; // the tutorial: a fixed deck, a small target, a fixed shop
  if (Array.isArray(opts.deck)) { const d = [...new Set(opts.deck.filter(c => Number.isInteger(c) && c >= 0 && c < 52))]; if (d.length) st.tdeck = d; }
  startBlind(st);
  return st;
}
const clone = st => JSON.parse(JSON.stringify(st));
function rollJoker(st, r, own) {
  const roll = r(), rar = roll < 0.62 ? 0 : roll < 0.9 ? 1 : roll < 0.985 ? 2 : 3;
  let list = st.pool.filter(j => !own.has(j) && JOKERS[j].r === rar);
  if (!list.length) list = st.pool.filter(j => !own.has(j) && JOKERS[j].r < 3);
  if (!list.length) list = st.pool.filter(j => !own.has(j));
  if (!list.length) return null;
  const j = list[Math.floor(r() * list.length)]; own.add(j); return j;
}
// this ante's voucher (the same all ante, not changed by New), or null when bought or none are left
export function anteVoucher(st) {
  const left = VOUCHER_IDS.filter(v => !hasV(st, v));
  if (!left.length || (st.vbought || []).includes(st.ante)) return null;
  return left[Math.floor(rng(st.seed, "voucher", st.ante)() * left.length)];
}
function makeShop(st, rerolls) {
  if (st.tut) return { items: [{ k: "joker", id: "joker", cost: 4 }, { k: "joker", id: "pairs", cost: 4 }, { k: "drill", id: "pair", cost: 3 }], rerolls, rerollCost: RULES.reroll + rerolls };
  const r = rng(st.seed, "shop", st.ante, st.blind, rerolls);
  const own = new Set(st.jokers.map(j => j.id));
  const items = [];
  for (let i = 0; i < (hasV(st, "restock") ? 3 : 2); i++) { const j = rollJoker(st, r, own); if (j) items.push({ k: "joker", id: j, cost: price(st, JOKERS[j].cost) }); }
  items.push({ k: "drill", id: HANDS[Math.floor(r() * HANDS.length)], cost: price(st, RULES.drill) });
  const pk = r() < 0.55 ? "jpack" : "dpack";
  items.push({ k: "pack", id: pk, cost: price(st, PACKS[pk].cost) });
  const v = anteVoucher(st);
  if (v) items.push({ k: "voucher", id: v, cost: VOUCHERS[v].cost });
  const off = (st.jokers.some(j => j.id === "coupon") ? 2 : 0) + (hasV(st, "scout") ? 2 : 0);
  return { items, rerolls, rerollCost: Math.max(1, RULES.reroll + rerolls - off) };
}
function openPack(st, id, k) {
  const r = rng(st.seed, "pack", st.ante, st.blind, k);
  if (id === "jpack") { const own = new Set(st.jokers.map(j => j.id)), opts = []; for (let i = 0; i < 3; i++) { const j = rollJoker(st, r, own); if (j) opts.push(j); } return { id, opts }; }
  const hands = HANDS.slice(), opts = [];
  for (let i = 0; i < 3; i++) opts.push(hands.splice(Math.floor(r() * hands.length), 1)[0]);
  return { id, opts };
}
// After a blind is beaten: pay, interest, the shop (or the end).
function blindWon(st) {
  st.cleared++;
  const cap = RULES.interestMax + (owns(st, "compound") ? 5 : 0) + (hasV(st, "savings") ? 5 : 0);
  const pay = (st.blind === 0 && st.stake >= 1 ? 0 : BLIND_PAY[st.blind]) + st.handsLeft + Math.min(cap, Math.floor(st.money / 5)) + (st.jokers.some(j => j.id === "bank") ? 3 : 0);
  st.jokers.forEach(j => { if (j.id === "pr") j.v = (j.v || 0) + 1; });
  st.money += pay; st.last = { ...(st.last || {}), pay };
  const lastBlind = st.blind === 2 && st.ante + 1 >= st.antes;
  if (lastBlind) { st.phase = "won"; return; }
  st.phase = "shop"; st.shop = { ...makeShop(st, 0), pay }; // pay stays with the shop (st.last changes with every buy)
}
// One move. Returns the new state; an impossible move throws (the server rejects such a replay).
export function act(state, a) {
  const st = clone(state);
  st.n++;
  const bad = m => { throw new Error("bad move: " + m); };
  if (st.phase === "blind") {
    if (a.t !== "play" && a.t !== "discard") bad(a.t);
    const idx = [...new Set(a.c || [])];
    if (!idx.length || idx.length > RULES.maxPlay || idx.some(i => !(i >= 0 && i < st.hand.length))) bad("cards");
    const cards = idx.map(i => st.hand[i]);
    if (a.t === "discard") {
      if (st.discardsLeft <= 0) bad("no discards");
      st.discardsLeft--;
      st.hand = st.hand.filter((_, i) => !idx.includes(i));
      draw(st); st.last = { t: "discard", cards };
      return st;
    }
    if (st.handsLeft <= 0) bad("no hands");
    const sc = scoreOf(st, cards);
    st.handsLeft--; st.played++; st.bp = (st.bp || 0) + 1; st.score += sc.score;
    if (hasPair(cards)) st.jokers.forEach(j => { if (j.id === "overload") j.v = (j.v || 0) + 1; });
    if (owns(st, "coach")) st.levels[sc.hand] = (st.levels[sc.hand] || 0) + 1; st.total += sc.score; st.best = Math.max(st.best, sc.score);
    st.hand = st.hand.filter((_, i) => !idx.includes(i));
    st.last = { t: "play", cards, hand: sc.hand, chips: sc.chips, mult: sc.mult, score: sc.score };
    if (st.score >= st.target) blindWon(st);
    else if (st.handsLeft <= 0) st.phase = "over";
    else draw(st);
    return st;
  }
  if (st.phase === "shop") {
    const sh = st.shop;
    // an open pack: pick one of its options or skip it; nothing else until then
    if (st.pack) {
      if (a.t === "skip") { st.pack = null; st.last = { t: "skip" }; return st; }
      if (a.t !== "pick") bad("pack open");
      const o = st.pack.opts[a.i]; if (o === undefined) bad("pick");
      if (st.pack.id === "jpack") { if (st.jokers.length >= jokerSlots(st)) bad("full"); st.jokers.push({ id: o, cost: JOKERS[o].cost }); }
      else st.levels[o] = (st.levels[o] || 0) + 1;
      st.last = { t: "pick", id: o, pack: st.pack.id }; st.pack = null;
      return st;
    }
    if (a.t === "buy") {
      const it = sh.items[a.i];
      if (!it || it.sold || st.money < it.cost) bad("buy");
      if (it.k === "joker") { if (st.jokers.length >= jokerSlots(st)) bad("full"); st.jokers.push({ id: it.id, cost: it.cost }); if (it.id === "coupon") sh.rerollCost = Math.max(1, sh.rerollCost - 2); }
      else if (it.k === "voucher") { st.vouchers = [...(st.vouchers || []), it.id]; st.vbought = [...(st.vbought || []), st.ante]; if (it.id === "scout") sh.rerollCost = Math.max(1, sh.rerollCost - 2); }
      else if (it.k === "pack") { st.pack = openPack(st, it.id, (st.packs = (st.packs || 0) + 1)); }
      else st.levels[it.id] = (st.levels[it.id] || 0) + 1;
      st.money -= it.cost; it.sold = 1; st.last = { t: "buy", it };
      return st;
    }
    if (a.t === "sell") {
      const j = st.jokers[a.i]; if (!j) bad("sell");
      st.jokers.splice(a.i, 1); st.money += Math.max(1, Math.floor(j.cost / 2)); st.last = { t: "sell", id: j.id };
      return st;
    }
    if (a.t === "reroll") {
      if (st.money < sh.rerollCost) bad("reroll");
      st.money -= sh.rerollCost; st.shop = { ...makeShop(st, sh.rerolls + 1), pay: sh.pay }; st.last = { t: "reroll" };
      return st;
    }
    if (a.t === "next") {
      st.shop = null;
      if (st.blind === 2) { st.ante++; st.blind = 0; } else st.blind++;
      startBlind(st); st.last = { t: "next" };
      return st;
    }
    bad(a.t);
  }
  bad("game over");
}
// The result two games are compared by: blinds cleared, then the total score.
export const resultOf = st => ({ cleared: st.cleared, total: st.total, won: st.phase === "won", best: st.best });
export const beats = (a, b) => (a.cleared !== b.cleared ? a.cleared > b.cleared : a.total > b.total);
// Play a list of moves from the start (the server checks a ranked game this way). Stops at the first bad move.
export function replay(opts, moves, maxMoves = 600) {
  let st = newGame(opts);
  for (const m of (moves || []).slice(0, maxMoves)) {
    if (st.phase !== "blind" && st.phase !== "shop") break;
    st = act(st, m);
  }
  return st;
}

// ── the bot ──
// Candidate hands instead of every subset (fast enough for the push server): each value group, two pairs, full
// houses, the best flush per type, straights, one card of each type, and single cards.
function candidates(hand) {
  const idx = hand.map((c, i) => i), byVal = {}, bySuit = {};
  idx.forEach(i => { (byVal[valueOf(hand[i])] = byVal[valueOf(hand[i])] || []).push(i); (bySuit[suitOf(hand[i])] = bySuit[suitOf(hand[i])] || []).push(i); });
  const hi = list => list.slice().sort((x, y) => valueOf(hand[y]) - valueOf(hand[x]));
  const groups = Object.values(byVal).filter(g => g.length >= 2).sort((x, y) => y.length - x.length || valueOf(hand[y[0]]) - valueOf(hand[x[0]]));
  const out = [];
  idx.forEach(i => out.push([i]));
  groups.forEach(g => out.push(g.slice(0, 4)));
  for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
    out.push([...groups[a].slice(0, 2), ...groups[b].slice(0, 2)]);
    if (groups[a].length >= 3) out.push([...groups[a].slice(0, 3), ...groups[b].slice(0, 2)]);
    if (groups[b].length >= 3) out.push([...groups[b].slice(0, 3), ...groups[a].slice(0, 2)]);
  }
  Object.values(bySuit).forEach(l => { if (l.length >= 5) out.push(hi(l).slice(0, 5)); });
  const one = SUITS.map(s => bySuit[s] && hi(bySuit[s])[0]).filter(x => x !== undefined);
  if (one.length === 4) { out.push(one); const rest = hi(idx.filter(i => !one.includes(i)))[0]; if (rest !== undefined) out.push([...one, rest]); }
  for (let lo = 1; lo <= 10; lo++) { // straights (1 = ace low)
    const pick = [];
    for (let v = lo; v < lo + 5; v++) { const g = byVal[v === 1 ? 14 : v]; if (!g) break; const same = g.find(i => pick.length && suitOf(hand[i]) === suitOf(hand[pick[0]])); pick.push(same !== undefined ? same : g[0]); }
    if (pick.length === 5) out.push(pick);
  }
  // pad small hands with high cards that don't change the hand (extra cards don't score, but are thrown away)
  return out;
}
export function bestPlay(st) {
  let best = null;
  for (const idx of candidates(st.hand)) {
    const s = scoreOf(st, idx.map(i => st.hand[i])).score;
    if (!best || s > best.s) best = { idx, s };
  }
  return best;
}
// How good a set of jokers is for the bot: the best play's score on a few fixed sample hands of the next blind, with
// rough weights for the ones that don't score by themselves (an extra hand, discard or card, cheaper rerolls, interest).
const PASSIVE = { wind: 1.25, bighand: 1.12, slate: 1.06, rest: 1.04, compound: 1.04, coupon: 1.02, bank: 1.04 };
function jokerValue(st, jokers) {
  const r = rng(st.seed, "botshop", st.ante, st.blind), deck = shuffle([...Array(52).keys()], r);
  const t = { ...st, jokers, boss: null, handsLeft: 2, discardsLeft: 1, bp: 1, played: st.played };
  let sum = 0;
  for (let k = 0; k < 5; k++) { t.hand = deck.slice(k * 8, k * 8 + 8); sum += bestPlay(t).s; }
  return jokers.reduce((v, j) => v * (PASSIVE[j.id] || 1), sum);
}
// level 0 … 10: how well it plays (a weaker bot sometimes plays a worse hand and never rerolls)
export function botMove(st, level = 5) {
  const r = rng(st.seed, "bot", st.n, level);
  if (st.phase === "blind") {
    const b = bestPlay(st), need = st.target - st.score;
    const sloppy = r() * 10 > level + 3;
    if (b.s >= need || st.discardsLeft <= 0 || st.handsLeft <= 1 || b.s * st.handsLeft >= need * (sloppy ? 0.6 : 1.1)) {
      if (sloppy && b.idx.length > 1 && b.s < need) return { t: "play", c: b.idx.slice(0, b.idx.length - 1) };
      return { t: "play", c: b.idx };
    }
    // discard what isn't part of the best hand (lowest first, up to 5)
    const keep = new Set(b.idx), out = st.hand.map((c, i) => i).filter(i => !keep.has(i)).sort((x, y) => valueOf(st.hand[x]) - valueOf(st.hand[y])).slice(0, 5);
    return out.length ? { t: "discard", c: out } : { t: "play", c: b.idx };
  }
  if (st.phase === "shop" && st.pack) {
    const now = jokerValue(st, st.jokers);
    let best = null;
    st.pack.opts.forEach((o, i) => {
      let v;
      if (st.pack.id === "jpack") { if (st.jokers.length >= jokerSlots(st)) return; v = jokerValue(st, [...st.jokers, { id: o, cost: JOKERS[o].cost }]); }
      else v = jokerValue({ ...st, levels: { ...st.levels, [o]: (st.levels[o] || 0) + 1 } }, st.jokers);
      if (!best || v > best.v) best = { v, i };
    });
    return best && best.v > now ? { t: "pick", i: best.i } : { t: "skip" };
  }
  if (st.phase === "shop") {
    // vouchers that pay off over a Run, while there is money left over
    const vi = st.shop.items.findIndex(it => it.k === "voucher" && !it.sold && st.money >= it.cost + 3 && ["membership", "extraset", "bigbag", "restock", "discount"].includes(it.id));
    if (vi >= 0) return { t: "buy", i: vi };
    // 1.8.0: it weighs jokers on a few sample hands (what a person would see) instead of taking the dearest one,
    // and swaps out its weakest joker when the slots are full and a much better one is offered
    const value = jokers => jokerValue(st, jokers);
    const now = value(st.jokers);
    const offers = st.shop.items.map((it, i) => ({ ...it, i })).filter(it => !it.sold && it.k === "joker");
    let best = null;
    for (const it of offers) {
      if (st.jokers.length < jokerSlots(st)) { if (it.cost <= st.money) { const v = value([...st.jokers, { id: it.id, cost: it.cost }]); if (!best || v > best.v) best = { v, m: { t: "buy", i: it.i } }; } }
      else st.jokers.forEach((jk, ji) => { if (st.money + Math.max(1, Math.floor(jk.cost / 2)) < it.cost) return; const v = value(st.jokers.map((x, k) => (k === ji ? { id: it.id, cost: it.cost } : x))); if (v > now * 1.15 && (!best || v > best.v)) best = { v, m: { t: "sell", i: ji } }; });
    }
    if (best && best.v > now * 1.02) return best.m;
    const pk = st.shop.items.findIndex(it => it.k === "pack" && !it.sold && st.money >= it.cost + 4 && (it.id === "dpack" || st.jokers.length < jokerSlots(st)));
    if (pk >= 0) return { t: "buy", i: pk };
    const d = st.shop.items.map((it, i) => ({ ...it, i })).find(it => !it.sold && it.k === "drill" && it.cost <= st.money);
    if (d && st.money - d.cost >= 5) return { t: "buy", i: d.i };
    return { t: "next" };
  }
  return null;
}
// A whole bot game (offline duel, or the server's stand-in when there is no other player yet).
export function botGame(opts, level = 5, maxMoves = 600) {
  let st = newGame(opts); const moves = [];
  while ((st.phase === "blind" || st.phase === "shop") && moves.length < maxMoves) { const m = botMove(st, level); moves.push(m); st = act(st, m); }
  return { st, moves };
}
// The bot's training for an offline duel at your game level: it gets stronger as you level up.
export function botLoadout(level) {
  const lv = Math.max(-1, Math.min(8, Math.floor(level / 2) - 1));
  return { suit: Object.fromEntries(SUITS.map((s, i) => [s, Math.max(-1, Math.min(8, lv + (i % 2)))])), perk: level >= 6 ? "warmup" : null, streak: 0 };
}
// Unranked game level from XP (a game gives 100 per blind cleared, +500 for a won run, +200 for a won duel).
export function gameLevel(xp) { let lvl = 1, need = 300, rest = xp | 0; while (rest >= need) { rest -= need; lvl++; need += 150; } return { lvl, into: rest, need }; }
export const poolFor = level => JOKER_IDS.filter(j => JOKERS[j].lv <= level);
