// HW App diamonds, shop and profile looks (1.9.0, Michael, Oct 25, 2026: "start the shop and the diamonds, so things
// make sense together"; plan: https://claude.ai/artifact/KCqpwBSTCXDimUwVj7rEA8).
// Pure functions, no text: names come from the locale by id. Diamonds are EARNED from what is already in the history and
// the badges (derived like XP, so every device agrees and nothing can be typed in), minus what was SPENT (profile.shop).
// Money and ads only come later (Google Play); chests are only earned, never sold (no loot boxes); nothing here
// changes Muscle Deck's Ranked.

export const PRICE = { freeze: 60, boost: 40 };
export const LOOK_PRICE = [80, 150, 300, 600]; // common, uncommon, rare, legendary
export const BOOST_MS = 24 * 3600 * 1000; // an XP boost: 2× XP for the workouts of the next 24 hours
// What earns diamonds (the numbers on the plan page).
export const EARN = { day: 5, streak7: 15, achLevel: 3, single: { 4: 15, 6: 30, 8: 60 }, run: 20 };

// Profile looks. kind: frame | bg | title | name | fx (a profile effect drawn over the whole profile card, like Discord's).
// r = rarity 0–3. won = only won (a badge / the season pass), never sold; the key names what wins it (lookGot in App.jsx).
export const LOOKS = {
  f_iron: { kind: "frame", r: 0 }, f_dots: { kind: "frame", r: 0 }, f_pixel: { kind: "frame", r: 1 }, f_hex: { kind: "frame", r: 1 },
  f_wave: { kind: "frame", r: 1 }, f_pulse: { kind: "frame", r: 2 }, f_flame: { kind: "frame", r: 2 }, f_laurel: { kind: "frame", r: 2 },
  f_neon: { kind: "frame", r: 2 }, f_bolt: { kind: "frame", r: 2 }, f_crown: { kind: "frame", r: 3 },
  f_obsidian: { kind: "frame", r: 3, won: "obsidian" }, f_diamond: { kind: "frame", r: 3, won: "allDiamond" },
  b_glow: { kind: "bg", r: 0 }, b_grid: { kind: "bg", r: 0 }, b_sunset: { kind: "bg", r: 0 }, b_topo: { kind: "bg", r: 1 }, b_stars: { kind: "bg", r: 1 },
  b_waves: { kind: "bg", r: 1 }, b_bubbles: { kind: "bg", r: 1 }, b_ridge: { kind: "bg", r: 2 }, b_city: { kind: "bg", r: 2 }, b_galaxy: { kind: "bg", r: 3 },
  b_aurora: { kind: "bg", r: 3, won: "season" },
  t_iron: { kind: "title", r: 0 }, t_rookie: { kind: "title", r: 0 }, t_grind: { kind: "title", r: 0 }, t_zen: { kind: "title", r: 1 },
  t_beast: { kind: "title", r: 2 }, t_legend: { kind: "title", r: 3 },
  t_bird: { kind: "title", r: 0, won: "early" }, t_owl: { kind: "title", r: 0, won: "night" }, t_comeback: { kind: "title", r: 1, won: "comeback" },
  t_marathon: { kind: "title", r: 1, won: "marathon" }, t_shark: { kind: "title", r: 2, won: "deck" }, t_streak: { kind: "title", r: 2, won: "streak30" },
  t_midnight: { kind: "title", r: 2, won: "midnight" }, t_obsidian: { kind: "title", r: 3, won: "obsidian" },
  n_outline: { kind: "name", r: 0 }, n_grad: { kind: "name", r: 1 }, n_shadow: { kind: "name", r: 1 }, n_ice: { kind: "name", r: 1 },
  n_glow: { kind: "name", r: 2 }, n_fire: { kind: "name", r: 2 }, n_foil: { kind: "name", r: 3 }, n_rainbow: { kind: "name", r: 3 },
  n_gold: { kind: "name", r: 2, won: "triple" },
  fx_snow: { kind: "fx", r: 1 }, fx_sparkle: { kind: "fx", r: 1 }, fx_petals: { kind: "fx", r: 1 }, fx_embers: { kind: "fx", r: 2 },
  fx_lightning: { kind: "fx", r: 3 },
  fx_rain: { kind: "fx", r: 1 }, fx_bubbles: { kind: "fx", r: 1 }, fx_hearts: { kind: "fx", r: 1 }, fx_fireflies: { kind: "fx", r: 2 }, fx_stars: { kind: "fx", r: 2 }, // 1.10.0
  // 1.10.0, Nov 13: 31 more
  f_ring2: { kind: "frame", r: 0 }, f_dash: { kind: "frame", r: 0 }, f_gear: { kind: "frame", r: 1 }, f_petal: { kind: "frame", r: 1 }, f_ice: { kind: "frame", r: 2 },
  f_orbit: { kind: "frame", r: 2 }, f_rainbow: { kind: "frame", r: 3 },
  b_dusk: { kind: "bg", r: 0 }, b_stripes: { kind: "bg", r: 0 }, b_forest: { kind: "bg", r: 1 }, b_ocean: { kind: "bg", r: 1 }, b_circuit: { kind: "bg", r: 2 },
  b_lava: { kind: "bg", r: 2 }, b_synth: { kind: "bg", r: 3 },
  t_home: { kind: "title", r: 0 }, t_noexcuse: { kind: "title", r: 0 }, t_sweat: { kind: "title", r: 1 }, t_ice: { kind: "title", r: 1 }, t_machine: { kind: "title", r: 2 },
  t_titan: { kind: "title", r: 2 }, t_champion: { kind: "title", r: 3 }, t_unbreak: { kind: "title", r: 3 },
  n_mint: { kind: "name", r: 0 }, n_sky: { kind: "name", r: 0 }, n_sunset: { kind: "name", r: 1 }, n_chrome: { kind: "name", r: 2 }, n_neon: { kind: "name", r: 2 }, n_glitch: { kind: "name", r: 3 },
  fx_leaves: { kind: "fx", r: 1 }, fx_code: { kind: "fx", r: 2 }, fx_aura: { kind: "fx", r: 3 },
  fx_frost: { kind: "fx", r: 2, won: "frozen" }, fx_confetti: { kind: "fx", r: 2, won: "bdayW" }, fx_fireworks: { kind: "fx", r: 3, won: "newyear" },
};
export const LOOK_IDS = Object.keys(LOOKS);
export const LOOK_KINDS = ["frame", "bg", "title", "name", "fx"];
export const lookPrice = id => (LOOKS[id] && !LOOKS[id].won ? LOOK_PRICE[LOOKS[id].r] : null);

// a small seeded random (same idea as the card game): the same day always shows the same shop and the same chest
function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(...key) {
  let a = hash(key.join("|"));
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DAY = 86400000;
const dnum = d => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / DAY);
// Streak chains of an every-other-day plan: a gap of more than 2 days ends a chain; freeze days bridge gaps but don't count.
export function chains(dates, freezeDays = []) {
  const wd = new Set(dates), all = [...new Set([...dates, ...freezeDays])].sort();
  const out = []; let cur = 0, prev = null;
  for (const d of all) {
    if (prev !== null && dnum(d) - dnum(prev) > 2) { out.push(cur); cur = 0; }
    if (wd.has(d)) cur++;
    prev = d;
  }
  if (prev !== null) out.push(cur);
  return out.filter(n => n > 0);
}

// in = { dates: workout dates (not added by hand), freezeDays, ach: [{single, step, tier, rk}], ranks: {id: rank index or -1}, runsWon, chests: [diamonds…] }
export function earned(inp) {
  const dates = [...new Set(inp.dates || [])];
  const parts = {
    workouts: dates.length * EARN.day,
    streak: chains(dates, inp.freezeDays || []).reduce((a, n) => a + Math.floor(n / 7) * EARN.streak7, 0),
    badges: (inp.ach || []).reduce((a, x) => a + (x.single ? (x.step ? EARN.single[x.rk ? x.rk[0] : 4] || 15 : 0) : (EARN.achLevel * x.tier * (x.tier + 1)) / 2), 0),
    ranks: Object.values(inp.ranks || {}).reduce((a, r) => a + (r >= 0 ? (r + 1) * (r + 2) : 0), 0),
    deck: (inp.runsWon || 0) * EARN.run,
    chests: (inp.chests || []).reduce((a, n) => a + (n || 0), 0),
    codes: (inp.codes || []).reduce((a, n) => a + (n || 0), 0), // 1.9.0: diamonds from codes (redeemCode)
    gift: Math.max(0, Math.floor(inp.gift || 0)), // 1.9.0: diamonds Michael set for this account (Firestore gift/{uid})
  };
  return { total: Object.values(parts).reduce((a, n) => a + n, 0), parts };
}
// profile.shop = { buys: [{i, w, p, ts, from?, to?}], chest: {week: result} }. Every purchase is its own entry with an
// id, so two devices that bought something while offline both keep their purchases when they sync (mergeShop: union).
// Everything else (spent, freezes, boosts, owned looks) is derived from those entries.
// 1.9.0: codes = {CODE: {d, ts}} = codes this account redeemed (each once; the diamonds count like earned ones)
const raw = profile => { const s = (profile && profile.shop) || {}; const obj = x => (x && typeof x === "object" && !Array.isArray(x) ? x : {}); return { buys: Array.isArray(s.buys) ? s.buys : [], chest: obj(s.chest), codes: obj(s.codes), gift: s.gift && typeof s.gift === "object" ? s.gift : null }; };
export function shopOf(profile) {
  const { buys, chest, codes, gift } = raw(profile);
  const chests = Object.values(chest).filter(Boolean);
  return {
    buys, chest, codes, gift: gift ? Math.max(0, Math.min(GIFT_MAX, Math.floor(gift.d) || 0)) : 0,
    spent: buys.reduce((a, b) => a + (b.p || 0), 0),
    fz: buys.filter(b => b.w === "freeze").length,
    boosts: [...buys.filter(b => b.w === "boost"), ...chests.filter(c => c.kind === "boost")].filter(b => b.from && b.to).map(b => ({ from: b.from, to: b.to })),
    own: [...new Set([...buys.filter(b => LOOKS[b.w]).map(b => b.w), ...chests.filter(c => c.kind === "look").map(c => c.id)])],
  };
}
export function mergeShop(a, b) {
  if (!a) return b; if (!b) return a;
  const ra = raw({ shop: a }), rb = raw({ shop: b }), seen = new Map();
  [...ra.buys, ...rb.buys].forEach(x => { if (x && x.i && !seen.has(x.i)) seen.set(x.i, x); });
  const chest = { ...rb.chest };
  Object.entries(ra.chest).forEach(([w, c]) => { if (!chest[w] || (c && chest[w].ts && c.ts && c.ts < chest[w].ts)) chest[w] = c; }); // the first opening counts
  const codes = { ...rb.codes };
  Object.entries(ra.codes).forEach(([k, c]) => { if (!codes[k] || (c && codes[k].ts && c.ts && c.ts < codes[k].ts)) codes[k] = c; }); // the first redemption counts
  const out = { ...b, ...a, buys: [...seen.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0)), chest };
  if (Object.keys(codes).length) out.codes = codes; else delete out.codes;
  const ga = ra.gift, gb = rb.gift, g = ga && gb ? ((ga.ts || 0) >= (gb.ts || 0) ? ga : gb) : ga || gb; // the newest reading of the server wins
  if (g) out.gift = g; else delete out.gift;
  return out;
}
export const balance = (inp, profile) => earned(inp).total - shopOf(profile).spent;

// 2× XP while a boost runs: a workout saved within [from, to) counts double.
export const boosted = (ts, boosts) => (boosts || []).some(b => ts >= b.from && ts < b.to);
export const boostUntil = (boosts, now = Date.now()) => (boosts || []).filter(b => b.to > now).reduce((a, b) => Math.max(a, b.to), 0);
const nextBoost = (sh, now) => { const from = Math.max(now, boostUntil(sh.boosts, now)); return { from, to: from + BOOST_MS }; }; // a second boost starts after the first
const bid = now => now.toString(36) + Math.floor(Math.random() * 1e6).toString(36);

// Buying. Returns the new profile.shop (only buys + chest are stored) or throws (not enough diamonds / owned / not for sale).
export function buy(profile, bal, what, now = Date.now()) {
  const sh = shopOf(profile), add = x => ({ ...((profile && profile.shop) || {}), buys: [...sh.buys, { i: bid(now), w: what, ts: now, ...x }], chest: sh.chest });
  if (what === "freeze") { if (bal < PRICE.freeze) throw new Error("money"); return add({ p: PRICE.freeze }); }
  if (what === "boost") { if (bal < PRICE.boost) throw new Error("money"); return add({ p: PRICE.boost, ...nextBoost(sh, now) }); }
  const p = lookPrice(what);
  if (p === null) throw new Error("not for sale");
  if (sh.own.includes(what)) throw new Error("owned");
  if (bal < p) throw new Error("money");
  return add({ p });
}

// The shop's looks this week (Michael, Oct 25: "they changed when I bought something; change them every week for
// now, we have few", then "every Friday"): 6 of the looks for sale, fixed by the week's key (App.jsx shopDay = the
// latest Friday), the same on every device. Bought ones stay
// in the list (shown as owned), so a purchase never reshuffles it.
export const DAILY_N = 6;
export function shopLooks(week) {
  const r = rng("shop", week), list = LOOK_IDS.filter(id => !LOOKS[id].won);
  const out = [];
  while (out.length < DAILY_N && list.length) out.push(list.splice(Math.floor(r() * list.length), 1)[0]);
  return out;
}

// Weekly chest (all 3 weekly challenges): fixed by the week, so opening it on any device gives the same thing.
// 70 % 20–60 diamonds, 20 % an XP boost, 10 % a common/uncommon look you don't have (diamonds if you have them all).
export const CHEST_ODDS = [["dia", 70], ["boost", 20], ["look", 10]];
export function weeklyChest(week, own = []) {
  const r = rng("chest", week), x = r() * 100;
  if (x >= 90) { const list = LOOK_IDS.filter(id => !LOOKS[id].won && LOOKS[id].r <= 1 && !own.includes(id)); if (list.length) return { kind: "look", id: list[Math.floor(r() * list.length)] }; }
  if (x >= 70 && x < 90) return { kind: "boost" };
  return { kind: "dia", n: 20 + Math.floor(r() * 41) };
}
// Opening: the result goes into profile.shop.chest[week] (diamonds counted in earned(), a boost or look derived by shopOf).
export function openChest(profile, week, now = Date.now()) {
  const sh = shopOf(profile);
  if (sh.chest[week]) throw new Error("opened");
  let res = { ...weeklyChest(week, sh.own), ts: now };
  if (res.kind === "boost") res = { ...res, ...nextBoost(sh, now) };
  return { shop: { ...((profile && profile.shop) || {}), buys: sh.buys, chest: { ...sh.chest, [week]: res } }, res };
}
// 1.9.0 (Michael, Nov 7: "a field in the Shop for codes, set up on a server so nobody needs an update; I make up any
// code, e.g. Jozo, and it gives 200 diamonds"): a code lives in Firestore promo/{CODE} {d, until?}; normCode makes what
// was typed match the document's name (capitals, no spaces). redeemCode records it once in profile.shop.codes.
export const normCode = s => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
export const CODE_MAX_D = 100000;
export function redeemCode(profile, code, promo, now = Date.now()) {
  const c = normCode(code), sh = shopOf(profile);
  if (!c || c.length < 2 || c.length > 32) throw new Error("code-bad");
  if (sh.codes[c]) throw new Error("code-used");
  if (!promo || !(promo.d > 0)) throw new Error("code-none");
  if (promo.until && now > promo.until) throw new Error("code-old");
  const d = Math.min(CODE_MAX_D, Math.floor(promo.d));
  return { shop: { ...((profile && profile.shop) || {}), buys: sh.buys, chest: sh.chest, codes: { ...sh.codes, [c]: { d, ts: now } } }, d, code: c };
}
// 1.9.0 (Michael, Nov 7: "can't I just add diamonds to my account in Firebase, without a code?"): Firestore gift/{uid}
// {d} = diamonds given to that one account (only its owner can read it; written by hand in the console). The app reads it
// while signed in and keeps the newest value in profile.shop.gift {d, ts}; changing d later changes the gift.
export const GIFT_MAX = 1e9;
export function withGift(profile, d, now = Date.now()) {
  const sh = (profile && profile.shop) || {}, v = Math.max(0, Math.min(GIFT_MAX, Math.floor(Number(d) || 0)));
  const cur = sh.gift && typeof sh.gift === "object" ? sh.gift : null;
  if (!v && !cur) return null;              // nothing given, nothing stored
  if (cur && cur.d === v) return null;       // no change
  return { ...sh, gift: { d: v, ts: now } };
}
export const codeDiamonds = profile => Object.values(shopOf(profile).codes).map(c => (c && c.d > 0 ? Math.min(CODE_MAX_D, Math.floor(c.d)) : 0));
export const chestDiamonds = profile => Object.values(shopOf(profile).chest).map(c => (c && c.kind === "dia" ? c.n : 0));

// Looks won by playing (not bought): which ones this person has earned. got = {obsidian, early, night, comeback, deck, streak30, season}
export function wonLooks(got) { return LOOK_IDS.filter(id => LOOKS[id].won && got[LOOKS[id].won]); }
