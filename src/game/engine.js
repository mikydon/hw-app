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
// Calibrated with the bot (Oct 25, 80 runs each). Michael (01:45): "at the start it's far too easy", so the first antes
// ask for more and the curve is smoother: without ranks the bot now loses around ante 3–4 (a quarter of runs by blind 8),
// Emerald in all four types wins ~18 %, Obsidian ~35 %; a person who plans the shop does better.
export const ANTE_BASE = [600, 1400, 2700, 4800, 7800, 11500, 16500, 23000];
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
};
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
export function scoreOf(st, cards) {
  const { hand, scored } = handOf(cards);
  const lv = (st.levels && st.levels[hand]) || 0;
  let chips = HAND_BASE[hand][0] + HAND_UP[hand][0] * lv, mult = HAND_BASE[hand][1] + HAND_UP[hand][1] * lv;
  const steps = [];
  const boss = st.boss && st.blind === 2 ? st.boss : null;
  const dead = s => boss === "skip_" + s;
  const J = st.jokers.map(j => j.id);
  for (const c of scored) {
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
  st.hand = [];
  st.boss = st.blind === 2 ? BOSSES[Math.floor(rng(st.seed, "boss", st.ante)() * BOSSES.length)] : null;
  const boss = st.boss;
  st.handsLeft = RULES.hands + (st.perk === "endurance" ? 1 : 0) - (boss === "few" ? 1 : 0);
  st.discardsLeft = boss === "norest" ? 0 : Math.max(0, RULES.discards + (st.perk === "warmup" ? 1 : 0) - (st.stake >= 3 ? 1 : 0));
  st.target = targetOf(st.ante, st.blind, boss, st.stake);
  st.score = 0;
  st.phase = "blind";
  draw(st);
}
function draw(st) { const size = RULES.handSize + (st.perk === "allround" ? 1 : 0) - (st.stake >= 4 ? 1 : 0); while (st.hand.length < size && st.deck.length) st.hand.push(st.deck.shift()); }
// opts: {seed, mode: "run"|"duel", suit: {push..core: level}, perk, streak, pool: [joker ids] (what the shop may offer)}
export function newGame(opts) {
  const st = {
    v: 1, seed: String(opts.seed), mode: opts.mode === "duel" ? "duel" : "run", antes: opts.mode === "duel" ? 3 : 8,
    suit: Object.fromEntries(SUITS.map(s => [s, Math.max(-1, Math.min(8, Math.floor(((opts.suit || {})[s] ?? -1))))])),
    perk: PERK_IDS.includes(opts.perk) ? opts.perk : null, streak: Math.max(0, opts.streak | 0), stake: Math.max(0, Math.min(STAKES.length - 1, opts.stake | 0)),
    pool: (opts.pool || JOKER_IDS).filter(j => JOKERS[j]),
    ante: 0, blind: 0, money: RULES.money + (opts.perk === "volume" ? 4 : 0), jokers: [], levels: {}, played: 0,
    total: 0, cleared: 0, best: 0, shop: null, last: null, n: 0,
  };
  startBlind(st);
  return st;
}
const clone = st => JSON.parse(JSON.stringify(st));
function makeShop(st, rerolls) {
  const r = rng(st.seed, "shop", st.ante, st.blind, rerolls);
  const own = new Set(st.jokers.map(j => j.id));
  const pick = () => {
    const roll = r(), rar = roll < 0.7 ? 0 : roll < 0.95 ? 1 : 2;
    let list = st.pool.filter(j => !own.has(j) && JOKERS[j].r === rar);
    if (!list.length) list = st.pool.filter(j => !own.has(j));
    if (!list.length) return null;
    const j = list[Math.floor(r() * list.length)]; own.add(j); return j;
  };
  const items = [];
  for (let i = 0; i < 2; i++) { const j = pick(); if (j) items.push({ k: "joker", id: j, cost: JOKERS[j].cost }); }
  items.push({ k: "drill", id: HANDS[Math.floor(r() * HANDS.length)], cost: RULES.drill });
  return { items, rerolls, rerollCost: RULES.reroll + rerolls };
}
// After a blind is beaten: pay, interest, the shop (or the end).
function blindWon(st) {
  st.cleared++;
  const pay = (st.blind === 0 && st.stake >= 1 ? 0 : BLIND_PAY[st.blind]) + st.handsLeft + Math.min(RULES.interestMax, Math.floor(st.money / 5)) + (st.jokers.some(j => j.id === "bank") ? 3 : 0);
  st.money += pay; st.last = { ...(st.last || {}), pay };
  const lastBlind = st.blind === 2 && st.ante + 1 >= st.antes;
  if (lastBlind) { st.phase = "won"; return; }
  st.phase = "shop"; st.shop = makeShop(st, 0);
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
    st.handsLeft--; st.played++; st.score += sc.score; st.total += sc.score; st.best = Math.max(st.best, sc.score);
    st.hand = st.hand.filter((_, i) => !idx.includes(i));
    st.last = { t: "play", cards, hand: sc.hand, chips: sc.chips, mult: sc.mult, score: sc.score };
    if (st.score >= st.target) blindWon(st);
    else if (st.handsLeft <= 0) st.phase = "over";
    else draw(st);
    return st;
  }
  if (st.phase === "shop") {
    const sh = st.shop;
    if (a.t === "buy") {
      const it = sh.items[a.i];
      if (!it || it.sold || st.money < it.cost) bad("buy");
      if (it.k === "joker") { if (st.jokers.length >= RULES.jokers) bad("full"); st.jokers.push({ id: it.id, cost: it.cost }); }
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
      st.money -= sh.rerollCost; st.shop = makeShop(st, sh.rerolls + 1); st.last = { t: "reroll" };
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
  if (st.phase === "shop") {
    const items = st.shop.items.map((it, i) => ({ ...it, i })).filter(it => !it.sold && it.cost <= st.money && (it.k !== "joker" || st.jokers.length < RULES.jokers));
    const j = items.filter(it => it.k === "joker").sort((a, b) => b.cost - a.cost)[0];
    if (j) return { t: "buy", i: j.i };
    const d = items.find(it => it.k === "drill");
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
