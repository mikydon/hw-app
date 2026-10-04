import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { L, t as T, tp as TP, fmt, setLang, detectLang, LANGS, fmtLong, fmtShortDM, fmtMonthYear, weekdaysShort, capFirst } from "./i18n/index.js";

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Scoreboard look: deep navy, chalk-white type, one signal yellow for "do this
// now", mint for done, sky blue for rest. The giant condensed number on the
// session screen is the one loud element; everything else stays quiet.
const C = {
  ink: "#0e1b36",
  panel: "#16284d",
  panelHi: "#1f3765",
  line: "#2c4679",
  chalk: "#eef2ff",
  dim: "#93a3c9",
  signal: "#ffd23f",
  signalInk: "#1d1700",
  mint: "#5fe3a1",
  sky: "#7cc4ff",
};
// Dark themes share the accent colours; only the surfaces change, so contrast stays the same.
const THEMES = {
  navy:   {   ink: "#0e1b36", panel: "#16284d", panelHi: "#1f3765", line: "#2c4679", chalk: "#eef2ff", dim: "#93a3c9", edge: "#0f2147" },
  black:  { ink: "#000000", panel: "#111317", panelHi: "#1d2027", line: "#2b2f38", chalk: "#f2f4f8", dim: "#9aa1ae", edge: "#08090b" },
  forest: {    ink: "#0d1f17", panel: "#142d22", panelHi: "#1d3d2f", line: "#2a5240", chalk: "#eefaf3", dim: "#94b3a3", edge: "#0a1912" },
  plum:   { ink: "#1d1230", panel: "#2a1b45", panelHi: "#37245a", line: "#4a3374", chalk: "#f4effc", dim: "#ad9cc8", edge: "#150c24" },
  ocean:  { ink: "#071f26", panel: "#0e2f38", panelHi: "#15414c", line: "#1f5966", chalk: "#ecfafc", dim: "#8fb5bd", edge: "#06181e" },
  wine:   { ink: "#22090f", panel: "#34111b", panelHi: "#461a26", line: "#622637", chalk: "#fdeff2", dim: "#c49ba6", edge: "#18060b" },
  slate:  { ink: "#15181d", panel: "#1f242b", panelHi: "#2a313a", line: "#3a434f", chalk: "#f1f4f8", dim: "#9aa6b4", edge: "#0e1115" },
  coffee: { ink: "#1c140f", panel: "#2a1f17", panelHi: "#382a20", line: "#4d3a2c", chalk: "#fbf3ec", dim: "#b8a291", edge: "#130d09" },
};
const APP_VERSION = "1.3.1";
// Big Shoulders has no Cyrillic, so Oswald (also condensed) covers Ukrainian. The browser only
// downloads the Oswald unicode ranges a page actually uses.
const DISPLAY = "'Big Shoulders Display', 'Oswald', 'Arial Narrow', Impact, sans-serif";
const BODY = "'Figtree', -apple-system, 'Segoe UI', sans-serif";

function useFonts() {
  useEffect(() => {
    const add = (id, href) => {
      if (document.getElementById(id)) return;
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet"; l.href = href;
      document.head.appendChild(l);
    };
    add("f-bsd", "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&display=swap");
    add("f-fig", "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap");
    add("f-osw", "https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap");
  }, []);
}

// ─── AUDIO (unchanged — tested and working on Android) ──────────────────────
function unlockAudio() {
  if (window._wac) return;
  try { window._wac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
}
// User settings (sounds, volume, vibration…) are mirrored here so plain functions can read them.
const VOLUME = { low: 0.45, mid: 1, high: 1.6 };
const setting = k => (window._wset ? window._wset[k] : undefined);
const volMul = () => VOLUME[setting("volume")] || 1;
function beep(freq, dur, vol) {
  try {
    if (setting("sndTimer") === false) return;
    vol = Math.min(1, vol * volMul());
    const ctx = window._wac;
    if (!ctx) return;
    const play = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + dur);
    };
    if (ctx.state === "suspended") ctx.resume().then(play); else play();
  } catch (_) {}
}
const soundExercise = () => beep(1047, 0.2, 0.5);
const soundRest = () => beep(659, 0.2, 0.5);
const soundPrepEnd = () => beep(880, 0.12, 0.4);

// Fun effects: all notes are scheduled on the audio clock inside ONE play call.
// No setTimeout chains — those are what broke the sound on Android before.
function melody(notes, type = "triangle", vol = 0.3, cat = "fx") {
  if (setting(cat === "tap" ? "sndTap" : "sndFx") === false) return;
  vol = Math.min(1, vol * volMul());
  try {
    const ctx = window._wac;
    if (!ctx) return;
    const play = () => {
      const t0 = ctx.currentTime + 0.02;
      notes.forEach(([f, at, d]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + at + d);
        o.start(t0 + at);
        o.stop(t0 + at + d + 0.03);
      });
    };
    if (ctx.state === "suspended") ctx.resume().then(play); else play();
  } catch (_) {}
}
// Reward sounds come in several variants; the same one never plays twice in a row.
// (Timer beeps above stay fixed on purpose, so you recognise them without looking.)
const SFX = {
  check: [
    [[[880, 0, 0.09], [1318, 0.07, 0.16]], "triangle", 0.3],
    [[[1175, 0, 0.07], [1568, 0.06, 0.15]], "sine", 0.3],
    [[[740, 0, 0.07], [1109, 0.06, 0.16]], "triangle", 0.3],
    [[[1319, 0, 0.16]], "triangle", 0.32],
  ],
  set: [
    [[[784, 0, 0.1], [1175, 0.09, 0.22]], "triangle", 0.3],
    [[[659, 0, 0.08], [880, 0.07, 0.08], [1319, 0.14, 0.22]], "triangle", 0.3],
    [[[1047, 0, 0.09], [1568, 0.08, 0.22]], "sine", 0.32],
    [[[523, 0, 0.07], [784, 0.06, 0.07], [1047, 0.12, 0.2]], "square", 0.12],
    [[[880, 0, 0.06], [988, 0.06, 0.06], [1175, 0.12, 0.24]], "triangle", 0.3],
    [[[988, 0, 0.07], [1319, 0.07, 0.32]], "square", 0.11],
  ],
  record: [
    [[[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.42]], "triangle", 0.3],
    [[[392, 0, 0.1], [494, 0.1, 0.1], [587, 0.2, 0.1], [784, 0.3, 0.45]], "triangle", 0.32],
    [[[523, 0, 0.09], [523, 0.12, 0.09], [523, 0.24, 0.09], [698, 0.36, 0.45]], "square", 0.12],
    [[[659, 0, 0.1], [831, 0.1, 0.1], [988, 0.2, 0.1], [1319, 0.3, 0.45]], "triangle", 0.3],
  ],
  finish: [
    [[[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.22], [784, 0.64, 0.12], [1047, 0.78, 0.55]], "triangle", 0.3],
    [[[392, 0, 0.12], [523, 0.12, 0.12], [659, 0.24, 0.12], [784, 0.36, 0.12], [1047, 0.5, 0.55]], "triangle", 0.3],
    [[[523, 0, 0.15], [784, 0.15, 0.15], [1047, 0.3, 0.15], [1319, 0.45, 0.6]], "sine", 0.32],
    [[[587, 0, 0.1], [740, 0.1, 0.1], [880, 0.2, 0.1], [1175, 0.32, 0.12], [880, 0.46, 0.1], [1175, 0.58, 0.55]], "square", 0.11],
  ],
  level: [
    [[[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.12], [1319, 0.48, 0.12], [1568, 0.6, 0.6]], "square", 0.13],
    [[[659, 0, 0.1], [784, 0.1, 0.1], [988, 0.2, 0.1], [1319, 0.3, 0.1], [988, 0.42, 0.08], [1319, 0.52, 0.08], [1760, 0.62, 0.6]], "triangle", 0.3],
    [[[440, 0, 0.12], [554, 0.12, 0.12], [659, 0.24, 0.12], [880, 0.36, 0.12], [1109, 0.48, 0.12], [1319, 0.6, 0.65]], "triangle", 0.3],
  ],
};
const lastSfx = {};
function playSfx(kind) {
  const list = SFX[kind];
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastSfx[kind]) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  lastSfx[kind] = i;
  const [notes, type, vol] = list[i];
  melody(notes, type, vol);
}
const sfxTap = () => melody([[1180 + Math.floor(Math.random() * 6) * 50, 0, 0.05]], "sine", 0.12, "tap");
const sfxCheck = () => playSfx("check");
const sfxSet = () => playSfx("set");
const sfxRecord = () => playSfx("record");
const sfxFinish = () => playSfx("finish");
const sfxLevel = () => playSfx("level");
function vibrate(pat) { if (setting("vibrate") === false) return; try { navigator.vibrate?.(pat); } catch (_) {} }
if (typeof document !== "undefined") {
  document.addEventListener("click", unlockAudio, { once: true });
}

// ─── EXERCISES ──────────────────────────────────────────────────────────────
// type "reps": number logged per round. type "time": hold timer.
// unit is a code ("arm", "leg", "side"); its text comes from the locale. Names and
// instructions for every exercise live in src/i18n/<lang>.js and are filled in by applyLang().
const EX = {
  k1: {
    type: "reps", start: 15, unit: "",
    yt: "https://www.youtube.com/watch?v=es_Tz8Si75o",
  },
  row1: {
    type: "reps", start: 12, unit: "arm",
    yt: "https://www.youtube.com/watch?v=ytEalkENNiQ",
  },
  n1: {
    type: "reps", start: 15, unit: "",
    yt: "https://www.youtube.com/watch?v=zJBLDJMJiDE",
  },
  b5: {
    type: "time", durs: [30, 45, 60, 75], dur: 45, unit: "",
    yt: "https://www.youtube.com/watch?v=ASdvN_XEl_c",
  },
  r1: {
    type: "reps", start: 12, unit: "",
    yt: "https://www.youtube.com/watch?v=pHR5yG6xBps",
  },
  row2: {
    type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=g8wWFlr2gQU",
  },
  n2: {
    type: "reps", start: 12, unit: "leg",
    yt: "https://www.youtube.com/watch?v=DeCnHqrN22U",
  },
  b2: {
    type: "reps", start: 10, unit: "side",
    yt: "https://www.youtube.com/watch?v=4XLEnwUr1d8",
  },
  k3: {
    type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=_6AvEX9-k8E",
  },
  row3: {
    type: "reps", start: 12, unit: "arm",
    yt: "https://www.youtube.com/watch?v=ytEalkENNiQ",
  },
  n7: {
    type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=cWSsWpuxmYM",
  },
  b4: {
    type: "reps", start: 15, unit: "side",
    yt: "https://www.youtube.com/watch?v=9FGilxCbdz8",
  },
};

// ─── ALTERNATIVES (for "Swap exercise") ──────────────────────────────────────
Object.assign(EX, {
  kKnee: {
    tag: "easier", type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=z8nUnCdZXQI",
  },
  kIncl: {
    tag: "easier", type: "reps", start: 12, unit: "",
    yt: "https://www.youtube.com/watch?v=-9S9gdRwwak",
  },
  superman: {
    tag: "noDoor", type: "reps", start: 12, unit: "",
    yt: "https://www.youtube.com/watch?v=cZxtPxeR2H8",
  },
  ytw: {
    tag: "noDoor", type: "reps", start: 6, unit: "",
    yt: "https://www.youtube.com/watch?v=OmgJCA_lzrs",
  },
  lunge: {
    tag: "noChair", type: "reps", start: 10, unit: "leg",
    yt: "https://www.youtube.com/watch?v=ALl174GTuoY",
  },
  bridge: {
    tag: "easier", type: "reps", start: 15, unit: "",
    yt: "https://www.youtube.com/watch?v=Q_Bpj91Yiis",
  },
  wallsit: {
    tag: "hold", type: "time", durs: [30, 45, 60, 90], dur: 45, unit: "",
    yt: "https://www.youtube.com/watch?v=6caT9GsL4TA",
  },
  birddog: {
    tag: "easier", type: "reps", start: 10, unit: "side",
    yt: "https://www.youtube.com/watch?v=DkPT1fR_B9A",
  },
  hollow: {
    tag: "hold", type: "time", durs: [20, 30, 45], dur: 30, unit: "",
    yt: "https://www.youtube.com/watch?v=LlDNef_Ztsc",
  },
  legraise: {
    tag: "similar", type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=JB2oyawG9KI",
  },
});
const ALT_GROUPS = [
  ["k1", "k3", "r1", "kIncl", "kKnee"],
  ["row1", "row2", "row3", "superman", "ytw"],
  ["n1", "n2", "n7", "lunge", "bridge", "wallsit"],
  ["b5", "b2", "b4", "birddog", "hollow", "legraise"],
];
// Same order as ALT_GROUPS; names come from the locale (grp_push…).
const GROUP_KEYS = ["push", "pull", "legs", "core"];
const groupOf = id => ALT_GROUPS.findIndex(g => g.includes(id));
// Exercises turned off in Settings → Exercises ("I can't do this one").
const exOff = () => new Set(setting("exOff") || []);
const isOn = id => !exOff().has(id);
function altsFor(id, exclude) { const g = ALT_GROUPS.find(x => x.includes(id)) || []; return g.filter(x => x !== id && !exclude.includes(x) && isOn(x)); }

// Every day: one push, one pull, one legs, one core.
const DAYS = [
  { id: "A", ids: ["k1", "row1", "n1", "b5"] },
  { id: "B", ids: ["r1", "row2", "n2", "b2"] },
  { id: "C", ids: ["k3", "row3", "n7", "b4"] },
];
const MAIN_IDS = DAYS.flatMap(d => d.ids);
const dayOfMain = id => (DAYS.find(d => d.ids.includes(id)) || {}).id;
// The exercise a plan slot really uses. If you turned the slot's exercise off, it is replaced by
// another exercise of the same type (push/pull/legs/core), so every workout still trains all four.
// It looks from the slot onwards and first skips exercises another day already uses, so A, B and C
// keep different exercises where possible.
function effId(slot, off = exOff()) {
  if (!off.has(slot)) return slot;
  const g = ALT_GROUPS[groupOf(slot)] || [slot];
  const i = g.indexOf(slot);
  const order = g.slice(i + 1).concat(g.slice(0, i)).filter(x => !off.has(x));
  return order.find(x => !MAIN_IDS.includes(x)) || order[0] || slot;
}

// When every round last time hit "at", the app suggests the harder version.
const LEVEL_UP_AT = {
  k1: 25,
  row1: 20,
  n1: 20,
  b5: 60,
  r1: 15,
  row2: 20,
  n2: 15,
  b2: 15,
  k3: 20,
  row3: 20,
  n7: 15,
  b4: 25,
};

const WARMUP = [
  { id: "w1", yt: "https://www.youtube.com/watch?v=fxwa7edi4Y0" },
  { id: "w2", yt: "https://www.youtube.com/watch?v=difYoBtZi2s" },
  { id: "w3", yt: "https://www.youtube.com/watch?v=A5H1IRn_pd4" },
  { id: "w4", yt: "https://www.youtube.com/watch?v=aFkv2m9FTGs" },
];

const COOL = [
  { id: "c1", fig: "hf", dur: 30, yt: "https://www.youtube.com/watch?v=KT0HlPGCl6k" },
  { id: "c2", fig: "hf", dur: 30, yt: "https://www.youtube.com/watch?v=KT0HlPGCl6k" },
  { id: "c3", fig: "child", dur: 30, yt: "https://www.youtube.com/watch?v=2MJGg-dUKh0" },
];

// History logged before this version (empty for a fresh install).
const SEED_HISTORY = [];

const STORAGE_KEY = "domaci-trening-v1";
const REST_BETWEEN = 30;   // between exercises
const REST_ROUND = 60;     // after a full round

// ─── HELPERS ────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, "0");
function dateKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtDate(k, withYear) { return fmtLong(parseKey(k), withYear); }
function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
function fmtRes(r, unit) { if (r === null || r === undefined) return "–"; return typeof r === "number" ? `${r}${unitStr(unit)}` : String(r); }
// History saved before v1.2 stores Slovak unit suffixes; map them to the new codes.
const LEGACY_UNIT = { "/ruku": "arm", "/nohu": "leg", "/stranu": "side" };
const unitCode = u => LEGACY_UNIT[u] || u || "";
function unitStr(u) { const c = unitCode(u); return c ? L.units[c] || c : ""; }
function perUnit(u) { const c = unitCode(u); return c ? L.perUnit[c] || "" : ""; }
// Logged items keep the name they had when saved; show the current language's name instead.
const exName = it => (EX[it.id] && EX[it.id].name) || it.name;

// base: slot → exercise fixed when the workout started (after replacing turned-off exercises).
function buildSeq(dayId, rounds, swaps = {}, base = {}) {
  const day = DAYS.find(d => d.id === dayId);
  const seq = [];
  for (let r = 0; r < rounds; r++) day.ids.forEach(slot => { const b = base[slot] || effId(slot); seq.push({ id: swaps[slot] || b, slot, base: b, r }); });
  return seq;
}
// History stays sorted by date (then time), so "last workout" is always the newest one.
function sortHistory(h) { return h.map((e, i) => [e, i]).sort((a, b) => (a[0].date < b[0].date ? -1 : a[0].date > b[0].date ? 1 : entryTs(a[0]) - entryTs(b[0]) || a[1] - b[1])).map(x => x[0]); }
// Records and rank-ups are stored per workout. After an edit, delete or manual add they are
// worked out again in date order, with the same rules as at the end of a workout.
function recomputeFlags(h) {
  const out = [];
  h.forEach(e => {
    const top = it => Math.max(...it.res.map(numVal).filter(n => !isNaN(n)));
    const prs = e.items.filter(it => { const b = bestFor(out, it.id); return b !== null && top(it) > b; }).map(it => it.id);
    const rankUps = e.items.map(it => { const to = rankIdx(it.id, top(it)); return to > rankIdx(it.id, bestFor(out, it.id)) ? { id: it.id, to } : null; }).filter(Boolean);
    out.push({ ...e, prs, rankUps });
  });
  return out;
}
function lastFor(history, id) {
  for (let i = history.length - 1; i >= 0; i--) {
    const it = history[i].items.find(x => x.id === id && x.res.some(v => v !== null && v !== undefined));
    if (it) return { date: history[i].date, res: it.res };
  }
  return null;
}
const numVal = v => (typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN);
function bestFor(history, id) {
  let b = null;
  history.forEach(sess => sess.items.forEach(it => {
    if (it.id !== id) return;
    it.res.forEach(v => { const n = numVal(v); if (!isNaN(n) && (b === null || n > b)) b = n; });
  }));
  return b;
}
function levelUpFor(history, id) {
  const at = LEVEL_UP_AT[id];
  const l = lastFor(history, id);
  if (!at || !l) return null;
  const nums = l.res.map(numVal).filter(n => !isNaN(n));
  return nums.length && Math.min(...nums) >= at ? EX[id].lvl : null;
}
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }

// XP: 10 per set, 25 per personal record, 10 for full warm-up, 10 for cool-down.
function setsIn(e) { return e.items.reduce((a, it) => a + it.res.filter(v => v !== null && v !== undefined).length, 0); }
function xpFor(e) { return 10 * setsIn(e) + 25 * ((e.prs && e.prs.length) || 0) + (e.warm ? 10 : 0) + (e.cool ? 10 : 0); }
function totalXP(h) { return h.reduce((a, e) => a + xpFor(e), 0) + challengeXP(h); }
function levelInfo(xp) { let lvl = 1, need = 100, rest = xp; while (rest >= need) { rest -= need; lvl++; need += 50; } return { lvl, into: rest, need }; }
// Streak for an every-other-day plan: it holds while no gap is longer than 2 days.
// META (from the profile) holds freeze days that bridge a gap and a manual reset time.
let META = { freezeDays: [], streakResetTs: 0 };
function entryTs(e) { return e.ts || parseKey(e.date).getTime() + 12 * 3600000; }
function streakInfo(history, today) {
  const train = new Set(history.filter(e => entryTs(e) > (META.streakResetTs || 0)).map(e => e.date));
  const resetDay = META.streakResetTs ? dateKey(new Date(META.streakResetTs)) : "";
  const frozen = (META.freezeDays || []).filter(k => k > resetDay);
  const dates = [...new Set([...train, ...frozen])].sort();
  if (!dates.length) return { n: 0, gap: null };
  let n = train.has(dates[dates.length - 1]) ? 1 : 0;
  for (let i = dates.length - 1; i > 0; i--) {
    if (daysBetween(dates[i - 1], dates[i]) <= 2) { if (train.has(dates[i - 1])) n++; } else break;
  }
  const gap = daysBetween(dates[dates.length - 1], today);
  return { n: gap <= 2 ? n : 0, gap, frozenToday: frozen.includes(today) };
}

// ─── WEEKLY CHALLENGES ──────────────────────────────────────────────────────
// Each week (Mon–Sun) has 3 challenges: "3 trainings" + 2 rotating ones.
// Completing all 3 also earns a 🧊 streak freeze. XP is derived from history.
function weekKey(k) { const d = parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); }
function sumReps(w, ids) { return w.reduce((a, e) => a + e.items.filter(it => !ids || ids.includes(it.id)).reduce((b, it) => b + it.res.reduce((c, v) => c + (typeof v === "number" ? v : 0), 0), 0), 0); }
const CH_BASE = { id: "w3", icon: "📅", goal: 3, xp: 50, val: w => w.length };
const CH_POOL = [
  { id: "pr1", icon: "🏆", goal: 1, xp: 40, val: w => w.reduce((a, e) => a + ((e.prs && e.prs.length) || 0), 0) },
  { id: "r3", icon: "💪", goal: 1, xp: 40, val: w => w.filter(e => e.rounds === 3).length },
  { id: "warm", icon: "🔥", goal: 2, xp: 30, val: w => w.filter(e => e.warm).length },
  { id: "cool", icon: "🧘", goal: 2, xp: 30, val: w => w.filter(e => e.cool).length },
  { id: "push100", icon: "🦾", goal: 100, xp: 50, val: w => sumReps(w, ["k1", "k3", "r1", "kKnee", "kIncl"]) },
  { id: "rank", icon: "🎖️", goal: 1, xp: 60, val: w => w.reduce((a, e) => a + ((e.rankUps && e.rankUps.length) || 0), 0) },
  { id: "reps300", icon: "📈", goal: 300, xp: 40, val: w => sumReps(w, null) },
  { id: "legs100", icon: "🦵", goal: 100, xp: 40, val: w => sumReps(w, ["n1", "n2", "n7", "lunge", "bridge"]) },
];
function challengesFor(wk) {
  const seed = Math.round(parseKey(wk).getTime() / 604800000);
  const a = ((seed % CH_POOL.length) + CH_POOL.length) % CH_POOL.length;
  let b = (((seed * 5 + 3) % CH_POOL.length) + CH_POOL.length) % CH_POOL.length;
  if (b === a) b = (b + 1) % CH_POOL.length;
  return [CH_BASE, CH_POOL[a], CH_POOL[b]];
}
function challengeStatus(history, wk) {
  const w = history.filter(e => weekKey(e.date) === wk);
  return challengesFor(wk).map(c => { const v = c.val(w); return { id: c.id, icon: c.icon, goal: c.goal, xp: c.xp, v: Math.min(v, c.goal), done: v >= c.goal }; });
}
function challengeXP(history) {
  const wks = [...new Set(history.map(e => weekKey(e.date)))];
  return wks.reduce((a, wk) => a + challengeStatus(history, wk).filter(c => c.done).reduce((b, c) => b + c.xp, 0), 0);
}
function freezesAvailable(history) {
  const wks = [...new Set(history.map(e => weekKey(e.date)))];
  const earned = wks.filter(wk => challengeStatus(history, wk).every(c => c.done)).length + 1; // 1 free to start
  return Math.max(0, Math.min(2, earned - (META.freezeDays || []).length));
}
// Motivation (texts in the locale).
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
// Random index 0..n-1 that differs from `not` (when there is a choice).
function pickOther(n, not) { if (n <= 1) return 0; let i = Math.floor(Math.random() * n); if (i === not) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n; return i; }
// Daily line on the Train tab. Right after a workout (today or yesterday) it is a rest day, so the
// line comes from `restDay` and never says "go train". Otherwise it comes from `quotes`.
function dayKind(history, today) {
  const last = history[history.length - 1];
  return last && daysBetween(last.date, today) <= 1 ? "rest" : "train";
}
const dailyPool = kind => (kind === "rest" ? L.restDay : L.quotes);
// Picks today's line (random, but none shown in the last 3 days) and the texts of the "done today"
// card (new ones for every workout). Returns the same object when nothing needs to change.
function uiForToday(ui, history, today) {
  let n = ui;
  const kind = dayKind(history, today);
  if (!(ui.daily && ui.daily.date === today && ui.daily.kind === kind)) {
    const recent = (ui.recent || []).filter(r => { const d = daysBetween(r.date, today); return d >= 0 && d <= 3; });
    const blocked = new Set(recent.filter(r => r.kind === kind).map(r => r.i));
    const all = dailyPool(kind).map((_, i) => i);
    const free = all.filter(i => !blocked.has(i));
    const i = pick(free.length ? free : all);
    n = { ...n, daily: { date: today, kind, i }, recent: [...recent, { date: today, kind, i }] };
  }
  const last = history[history.length - 1];
  if (last && last.date === today) {
    const ts = entryTs(last);
    if (!(ui.doneVar && ui.doneVar.ts === ts)) {
      const prev = ui.doneVar || {};
      n = { ...n, doneVar: { ts, t: pickOther(L.doneTitles.length, prev.t), s: pickOther(L.doneSubs.length, prev.s) } };
    }
  }
  return n;
}


function nextDayIdx(history) {
  if (!history.length) return 0;
  const i = DAYS.findIndex(d => d.id === history[history.length - 1].day);
  return i < 0 ? 0 : (i + 1) % DAYS.length;
}
function logText(entry) {
  const head = T("dayDate", { d: entry.day, date: fmtDate(entry.date, true) });
  const lines = entry.items.map(it => `${exName(it)}: ${it.res.map((r, i) => `${i + 1}. ${fmtRes(r, it.unit)}`).join("  ")}`);
  return [head, ...lines].join("\n");
}

// Storage: Claude's artifact storage when available, otherwise the browser's
// localStorage (GitHub Pages / home-screen app). Data stays on the device.
const store = {
  async get(k) {
    if (window.storage && window.storage.get) { try { const r = await window.storage.get(k); return r ? r.value : null; } catch (_) { return null; } }
    try { return window.localStorage.getItem(k); } catch (_) { return null; }
  },
  async set(k, v) {
    if (window.storage && window.storage.set) { try { await window.storage.set(k, v); } catch (_) {} return; }
    try { window.localStorage.setItem(k, v); } catch (_) {}
  },
};
async function saveAll(st) { await store.set(STORAGE_KEY, JSON.stringify(st)); }
async function loadAll() { try { const v = await store.get(STORAGE_KEY); if (v) return JSON.parse(v); } catch (_) {} return null; }

// Wall-clock countdown: survives the phone throttling timers in background.
function useCountdown(endAt, onEnd, onTick) {
  const calc = () => (endAt ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  const endRef = useRef(onEnd); endRef.current = onEnd;
  const tickRef = useRef(onTick); tickRef.current = onTick;
  useEffect(() => {
    if (!endAt) { setLeft(0); return; }
    let last = Math.ceil((endAt - Date.now()) / 1000);
    setLeft(Math.max(0, last));
    let fired = false;
    const iv = setInterval(() => {
      const s = Math.ceil((endAt - Date.now()) / 1000);
      if (s !== last) {
        last = s;
        setLeft(Math.max(0, s));
        if (s > 0 && tickRef.current) tickRef.current(s);
      }
      if (s <= 0 && !fired) { fired = true; clearInterval(iv); if (endRef.current) endRef.current(); }
    }, 200);
    return () => clearInterval(iv);
  }, [endAt]);
  return left;
}

function useWakeLock() {
  useEffect(() => {
    let lock = null;
    const get = async () => { if (setting("keepAwake") === false) return; try { lock = await navigator.wakeLock?.request("screen"); } catch (_) {} };
    const onVis = () => { if (document.visibilityState === "visible") get(); };
    get();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); try { lock?.release(); } catch (_) {} };
  }, []);
}

// ─── EXERCISE ILLUSTRATIONS ────────────────────────────────────────────────
// Original stick-figure drawings built from joint positions. Lengths are fixed
// and elbows/knees are solved with 2-bone IK, so proportions stay consistent.
const FL = { torso: 26, neck: 4, head: 7, ua: 15, fa: 14, th: 20, sh: 20 };
const GROUND = 94;
const rad = d => (d * Math.PI) / 180;
const dirv = (p, ang, len) => [p[0] + len * Math.cos(rad(ang)), p[1] + len * Math.sin(rad(ang))];
function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 0.001;
  if (d >= l1 + l2 - 0.01) {
    const k = l1 / d, k2 = (l1 + l2) / d;
    return { mid: [a[0] + dx * k, a[1] + dy * k], end: [a[0] + dx * k2, a[1] + dy * k2] };
  }
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const px = a[0] + (dx * x) / d, py = a[1] + (dy * x) / d;
  return { mid: [px - (bend * h * dy) / d, py + (bend * h * dx) / d], end: b };
}
// Standing/leaning body from the feet: lean = degrees backwards from vertical (negative = forward).
function fromFeet(foot, lean) { const a = -90 - lean; return { hip: dirv(foot, a, FL.th + FL.sh), torso: a }; }

const FIGS = {
  k1: [
    { hip: [50, 76.4], torso: -26, hands: [[73.4, GROUND], [75.4, GROUND]], armBend: [1, 1], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1], hide: ["farLeg"] },
    { hip: [50.3, 87.9], torso: -8.7, hands: [[73.4, GROUND], [75.4, GROUND]], armBend: [1, 1], feet: [[10.8, GROUND], [12.8, GROUND]], legBend: [1, 1], hide: ["farLeg"] },
  ],
  k3: [
    { hip: [50, 76.4], torso: -26, hands: [[73.4, GROUND], [74.4, GROUND]], armBend: [1, 1], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1], hide: ["farLeg"], props: [{ t: "diamondTop" }] },
    { hip: [50.3, 87.9], torso: -8.7, hands: [[73.4, GROUND], [74.4, GROUND]], armBend: [1, 1], feet: [[10.8, GROUND], [12.8, GROUND]], legBend: [1, 1], hide: ["farLeg"] },
  ],
  b5: [
    { hip: [53, 86], torso: -12.5, hands: [[93, GROUND], [95, GROUND]], elbows: [[78, GROUND], [80, GROUND]], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1] },
    { hip: [52, 92], torso: -26, hands: [[93, GROUND], [95, GROUND]], elbows: [[78, GROUND], [80, GROUND]], feet: [[12, GROUND], [12.5, 93]], legBend: [1, 1], bad: true },
  ],
  n1: [
    { hip: [58, 54], torso: -90, hands: [[84, 33], [86, 33]], armBend: [1, 1], feet: [[58, GROUND], [60, GROUND]], legBend: [1, 1] },
    { hip: [48, 82], torso: -58, hands: [[88, 58], [90, 58]], armBend: [1, 1], feet: [[60, GROUND], [62, GROUND]], legBend: [-1, -1] },
  ],
  r1: [
    { hip: [58.8, 44.6], torso: 68.8, head: 85, belly: [0.42, 0.88], fl: { th: 27, sh: 27, torso: 24 }, hands: [[78, GROUND], [79, GROUND]], armBend: [1, 1], feet: [[37, GROUND], [38, GROUND]], legBend: [1, 1], hide: ["farLeg"] },
    { hip: [79.2, 60.3], torso: 55, head: 39.5, fl: { th: 27, sh: 27, torso: 24 }, hands: [[78, GROUND], [79, GROUND]], elbows: [[78, 80], [79, 80]], feet: [[37, GROUND], [38, GROUND]], legBend: [1, 1], hide: ["farLeg"] },
  ],
  row1: [
    { ...fromFeet([88, GROUND], 17), hands: [[97, 37.2], [70.5, 59.7]], armBend: [-1, 1], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm", "farLeg"] },
    { ...fromFeet([88, GROUND], 2), hands: [[97, 37.2], [86.5, 56.8]], elbows: [[83.4, 38.5], [84.3, 43]], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm", "farLeg"] },
  ],
  row3: [
    { ...fromFeet([88, GROUND], 17), hands: [[97.4, 31], [70.5, 59.7]], armBend: [-1, 1], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm"] },
    { ...fromFeet([88, GROUND], 2), hands: [[97.4, 31], [86.8, 56.8]], elbows: [[83.5, 30.5], [86.2, 42.8]], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm"] },
  ],
  row2: [
    { ...fromFeet([96, GROUND], 30), hands: [[89.3, 49], [89.8, 48.6]], armBend: [-1, -1], feet: [[96, GROUND], [98, GROUND]], legBend: [1, 1], props: [{ t: "door" }, { t: "towel", from: [104, 56], to: [89.6, 48.8] }] },
    { ...fromFeet([96, GROUND], 12), hands: [[90, 42], [91, 42.5]], armBend: [1, 1], feet: [[96, GROUND], [98, GROUND]], legBend: [1, 1], props: [{ t: "door" }, { t: "towel", from: [104, 56], to: [90.5, 42.3] }] },
  ],
  n2: [
    { hip: [63, 57], torso: -88, hands: [[64, 84], [60, 84]], armBend: [1, 1], feet: [[78, GROUND], [30, 70]], legBend: [-1, -1], props: [{ t: "chair" }] },
    { hip: [58, 72], torso: -80, hands: [[60, 99], [56, 99]], armBend: [1, 1], feet: [[78, GROUND], [30, 70]], legBend: [-1, -1], props: [{ t: "chair" }] },
  ],
  b2: [
    { hip: [42, 88], torso: 0, head: 0, hands: [[68, 59], [70, 59.5]], armBend: [1, 1], feet: [[22, 68], [24, 68]], legBend: [1, 1], supine: true },
    { hip: [42, 88], torso: 0, head: 0, hands: [[97, 86], [70, 59.5]], armBend: [1, 1], feet: [[22, 68], [2, 86]], legBend: [1, 1], supine: true },
  ],
  n7: [
    { hip: [54, 72], torso: 30, head: 10, hands: [[48, 92.5], [50, 92.5]], armBend: [1, 1], feet: [[34, GROUND - 2], [36, GROUND - 2]], legBend: [1, 1], props: [{ t: "towelFloor", x: 28 }], supine: true },
    { hip: [50, 80], torso: 22, head: 10, hands: [[45.2, 93], [47.2, 93]], armBend: [1, 1], feet: [[12, GROUND - 2], [12.5, GROUND - 1.5]], legBend: [1, 1], props: [{ t: "towelFloor", x: 6 }] },
  ],
  b4: [
    { hip: [44, 88], torso: -22, head: -40, hands: [[72, 76], [73, 75]], elbows: [[60, 70], [75, 63.5]], feet: [[32, 64], [5, 79]], legBend: [1, 1], supine: true },
    { hip: [44, 88], torso: -22, head: -40, hands: [[73, 75], [72, 76]], elbows: [[75, 63.5], [60, 70]], feet: [[5, 79], [32, 64]], legBend: [1, 1] },
  ],
  kKnee: [
    { hip: [52.95, 80.26], torso: -35.94, hands: [[74, GROUND], [76, GROUND]], armBend: [1, 1], feet: [[18, 85], [20, 85]], legBend: [-1, -1], hide: ["farLeg"] },
    { hip: [56.46, 88.52], torso: -10, hands: [[74, GROUND], [76, GROUND]], armBend: [1, 1], feet: [[18, 85], [20, 85]], legBend: [-1, -1], hide: ["farLeg"] },
  ],
  kIncl: [
    { hip: [51.2, 64.7], torso: -47.1, hands: [[81, 72], [82, 72]], armBend: [1, 1], feet: [[24, GROUND], [25, GROUND]], legBend: [1, 1], hide: ["farLeg"], props: [{ t: "table" }] },
    { hip: [59.78, 76.11], torso: -26.57, hands: [[81, 72], [82, 72]], armBend: [1, 1], feet: [[24, GROUND], [25, GROUND]], legBend: [1, 1], hide: ["farLeg"], props: [{ t: "table" }] },
  ],
  superman: [
    { hip: [46, 89], torso: 0, head: -8, hands: [[101, 90], [102, 90]], armBend: [1, 1], feet: [[6, 91], [8, 91]], legBend: [1, 1] },
    { hip: [46, 89], torso: -12, head: -22, hands: [[98, 74], [100, 74]], armBend: [1, 1], feet: [[7, 80], [7.5, 79]], legBend: [1, 1] },
  ],
  ytw: [
    { hip: [40, 89], torso: -8, head: -14, hands: [[94, 76], [96, 76]], armBend: [1, 1], feet: [[0, 90], [0, 91]], legBend: [1, 1] },
    { hip: [40, 89], torso: -8, head: -14, hands: [[64, 77], [65, 78]], elbows: [[51, 82.5], [52, 83.5]], feet: [[0, 90], [0, 91]], legBend: [1, 1] },
  ],
  lunge: [
    { hip: [58, 54], torso: -90, hands: [[60, 80], [56, 80]], armBend: [1, 1], feet: [[58, GROUND], [60, GROUND]], legBend: [-1, -1] },
    { hip: [40, 72], torso: -88, hands: [[42, 98], [38, 98]], armBend: [1, 1], feet: [[60, GROUND], [16, GROUND - 1]], legBend: [-1, -1] },
  ],
  bridge: [
    { hip: [46, 89], torso: 0, head: 0, hands: [[44, 92], [46, 92]], armBend: [1, 1], feet: [[28, GROUND], [30, GROUND]], legBend: [1, 1], supine: true },
    { hip: [51.1, 80.3], torso: 17.2, head: 0, hands: [[46, 93], [48, 93]], armBend: [1, 1], feet: [[28, GROUND], [30, GROUND]], legBend: [1, 1] },
  ],
  wallsit: [
    { hip: [27, 74], torso: -90, hands: [[27.5, 77], [28.5, 77]], armBend: [1, 1], feet: [[47, GROUND], [49, GROUND]], legBend: [-1, -1], props: [{ t: "wall" }] },
  ],
  birddog: [
    { hip: [40, 74], torso: -20.3, hands: [[64, GROUND], [66, GROUND]], armBend: [1, 1], feet: [[20, GROUND], [22, GROUND]], legBend: [-1, -1] },
    { hip: [40, 74], torso: -20.3, hands: [[94, 62], [66, GROUND]], armBend: [1, 1], feet: [[20, GROUND], [0, 70]], legBend: [-1, -1] },
  ],
  hollow: [
    { hip: [50, 89], torso: -14, head: -24, hands: [[104, 72], [106, 72]], armBend: [1, 1], feet: [[11, 80], [11, 79]], legBend: [1, 1] },
  ],
  legraise: [
    { hip: [50, 89], torso: 0, head: 0, hands: [[48, 92], [50, 92]], armBend: [1, 1], feet: [[50, 49], [52, 49]], legBend: [1, 1], supine: true },
    { hip: [50, 89], torso: 0, head: 0, hands: [[48, 92], [50, 92]], armBend: [1, 1], feet: [[10.3, 84], [10.5, 83]], legBend: [1, 1] },
  ],
  hf: [
    { hip: [56, 76], torso: -92, hands: [[60, 80], [56, 80]], armBend: [1, 1], feet: [[84, GROUND], [24, GROUND]], legBend: [-1, -1] },
  ],
  child: [
    { hip: [32, 84], torso: 0, head: 18, hands: [[86, GROUND], [88, GROUND]], armBend: [1, 1], feet: [[30, GROUND], [32, GROUND]], legBend: [-1, -1] },
  ],
};

function Stick({ p }) {
  // p.fl can override limb lengths for one pose (e.g. longer legs where the proportions matter).
  const fl = p.fl ? { ...FL, ...p.fl } : FL;
  const shoulder = dirv(p.hip, p.torso, fl.torso);
  const headC = dirv(shoulder, p.head ?? p.torso, fl.neck + fl.head);
  const near = C.chalk, far = "#6f80aa";
  const parts = [];
  [1, 0].forEach(i => {
    const col = i === 0 ? near : far;
    let elbow, hand;
    if (p.elbows) { elbow = p.elbows[i]; hand = p.hands[i]; }
    else { const a = ik(shoulder, p.hands[i], fl.ua, fl.fa, p.armBend[i]); elbow = a.mid; hand = a.end; }
    const lg = ik(p.hip, p.feet[i], fl.th, fl.sh, p.legBend[i]);
    // hide: ["farArm", "farLeg"] leaves out the back limb when it would only confuse (e.g. one-arm rows).
    if (!(i === 1 && (p.hide || []).includes("farLeg"))) parts.push({ i, col, pts: [p.hip, lg.mid, lg.end] });
    if (!(i === 1 && (p.hide || []).includes("farArm"))) parts.push({ i, col, pts: [shoulder, elbow, hand] });
  });
  const line = pts => pts.map(q => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
  // Yellow belly stripe along the front of the torso, so you can tell belly from back.
  // Front = torso direction turned 90° clockwise (faces right when standing); flipped when lying on the back.
  const tv = [shoulder[0] - p.hip[0], shoulder[1] - p.hip[1]];
  const tl = Math.hypot(tv[0], tv[1]) || 1;
  const nrm = [(-tv[1] / tl) * (p.supine ? -1 : 1), (tv[0] / tl) * (p.supine ? -1 : 1)];
  const at = (t, off) => [p.hip[0] + tv[0] * t + nrm[0] * off, p.hip[1] + tv[1] * t + nrm[1] * off];
  const belly = p.belly ? [at(p.belly[0], 4.6), at(p.belly[1], 4.6)] : [at(0.22, 4.6), at(0.72, 4.6)]; // p.belly: [from, to] along the torso
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {parts.filter(x => x.i === 1).map((x, k) => <polyline key={`f${k}`} points={line(x.pts)} stroke={x.col} strokeWidth="5" />)}
      <polyline points={line([p.hip, shoulder])} stroke={near} strokeWidth="6" />
      <polyline points={line(belly)} stroke={C.signal} strokeWidth="2.6" />
      <circle cx={headC[0]} cy={headC[1]} r={FL.head} fill={near} stroke="none" />
      {parts.filter(x => x.i === 0).map((x, k) => <polyline key={`n${k}`} points={line(x.pts)} stroke={x.col} strokeWidth="5" />)}
      {p.grip && (() => { const h = parts.find(x => x.i === 0 && x.pts[0] === shoulder).pts[2]; return <circle cx={h[0]} cy={h[1]} r="3" fill={near} />; })()}
    </g>
  );
}

function Prop({ pr }) {
  const s = { stroke: C.sky, strokeWidth: 3, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  // Door frame (jamb) seen from the side as one solid post; the hand grips its front edge.
  if (pr.t === "frame") return <g><rect x="95.5" y="6" width="9" height="90" rx="1" fill={C.sky} fillOpacity="0.28" stroke={C.sky} strokeWidth="3" /><line x1="104.5" y1="6" x2="118" y2="6" {...s} /></g>;
  if (pr.t === "door") return <g><rect x="102" y="10" width="5" height="86" {...s} /><circle cx="104.5" cy="56" r="2.5" fill={C.sky} /></g>;
  if (pr.t === "towel") return <line x1={pr.from[0]} y1={pr.from[1]} x2={pr.to[0]} y2={pr.to[1]} stroke={C.signal} strokeWidth="3" strokeLinecap="round" />;
  if (pr.t === "chair") return <g {...s}><line x1="8" y1="72" x2="36" y2="72" /><line x1="10" y1="72" x2="10" y2="96" /><line x1="34" y1="72" x2="34" y2="96" /><line x1="10" y1="72" x2="10" y2="44" /></g>;
  if (pr.t === "table") return <g {...s}><line x1="80" y1="74" x2="118" y2="74" /><line x1="84" y1="74" x2="84" y2="96" /><line x1="114" y1="74" x2="114" y2="96" /></g>;
  if (pr.t === "wall") return <line x1="20" y1="4" x2="20" y2="96" {...s} strokeWidth="4" />;
  if (pr.t === "towelFloor") return <rect x={pr.x} y={GROUND} width="14" height="3" rx="1" fill={C.signal} />;
  // Small "seen from above" inset: palms side by side, index fingers and thumbs touching = diamond.
  // Dashed line straight down from the shoulder: shows that the hands are placed behind it (under the chest).
  if (pr.t === "plumb") return <line x1={pr.x} y1={pr.y} x2={pr.x} y2={GROUND} stroke={C.sky} strokeWidth="1.4" strokeDasharray="2.2 1.8" />;
  if (pr.t === "diamondTop") {
    // Both hands seen from above (like a photo of real hands): fingers together, turned inwards,
    // straight thumbs starting lower on the palm. Index fingertips touch at the top, thumb tips at the
    // bottom. The small light-blue diamond sits inside the gap without touching the fingers.
    const hand = (
      <g>
        <rect x="-5" y="-5" width="10.6" height="10.4" rx="3.2" fill={C.chalk} />
        <g stroke={C.chalk} strokeWidth="2.2" strokeLinecap="round">
          <line x1="-3.3" y1="-4" x2="-3.3" y2="-11.8" /><line x1="-1.1" y1="-4" x2="-1.1" y2="-13.2" />
          <line x1="1.1" y1="-4" x2="1.1" y2="-13.8" /><line x1="3.3" y1="-4" x2="3.3" y2="-13" />
        </g>
        <line x1="4.8" y1="1.2" x2="11.38" y2="-1.47" stroke={C.chalk} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    );
    return (
      <g>
        <rect x="3" y="7" width="52" height="34" rx="6" fill={C.panel} stroke={C.line} strokeWidth="1.2" />
        <path d="M29 21.2 L31.4 24.8 L29 28.4 L26.6 24.8 Z" fill={C.sky} opacity="0.8" />
        <g transform="translate(17.69 26.5) rotate(35)">{hand}</g>
        <g transform="translate(40.31 26.5) scale(-1 1) rotate(35)">{hand}</g>
        {/* thin gaps where the fingertips touch, so it reads as two hands */}
        <g stroke={C.panel} strokeWidth="0.7"><line x1="29" y1="16.2" x2="29" y2="19.1" /><line x1="29" y1="30.5" x2="29" y2="33.3" /></g>
      </g>
    );
  }
  if (pr.t === "diamond") return <path d={`M${pr.x} ${pr.y - 5} L${pr.x + 5} ${pr.y} L${pr.x} ${pr.y + 5} L${pr.x - 5} ${pr.y} Z`} stroke={C.signal} strokeWidth="2" fill="none" />;
  return null;
}

function ExFigure({ id }) {
  const poses = FIGS[id];
  if (!poses) return null;
  return (
    <div style={{ margin: "4px 0 14px" }} role="img" aria-label={T("figureAria", { labels: poses.map(p => p.label).join(", ") })}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {poses.map((p, i) => (
        <div key={i} style={{ flex: poses.length > 1 ? 1 : "0 1 62%", background: C.ink, border: `1.5px solid ${p.bad ? "#ff8a80" : C.line}`, borderRadius: 14, padding: "6px 4px 8px", textAlign: "center" }}>
          <svg viewBox="0 0 120 100" style={{ width: "100%", height: "auto", display: "block" }}>
            <line x1="0" y1={GROUND + 3} x2="120" y2={GROUND + 3} stroke={C.line} strokeWidth="2" />
            {(p.props || []).map((pr, k) => <Prop key={k} pr={pr} />)}
            <Stick p={p} />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: p.bad ? "#ff8a80" : C.dim, marginTop: 4, lineHeight: 1.3 }}>{poses.length > 1 ? `${i + 1}. ` : ""}{p.label}</div>
        </div>
      ))}
      </div>
      <div style={{ fontSize: 11, color: C.dim, textAlign: "center", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span aria-hidden="true" style={{ width: 16, height: 3, borderRadius: 2, background: C.signal, display: "inline-block" }} />{T("figBelly")}
      </div>
    </div>
  );
}

// ─── RANKS ──────────────────────────────────────────────────────────────────
// Per-exercise rank from your best single set ever (strict form + tempo).
// Thresholds = Iron, Bronze, Silver, Gold, Platinum, Diamond (names come from the locale).
// First ranks come fast; Diamond is elite (e.g. 50 slow push-ups in one set).
const RANKS = [
  { name: "", icon: "🪵", color: "#c08a55" },
  { name: "", icon: "⚙️", color: "#9aa5b8" },
  { name: "", icon: "🥉", color: "#e0955a" },
  { name: "", icon: "🥈", color: "#cfd8ea" },
  { name: "", icon: "🥇", color: "#ffd23f" },
  { name: "", icon: "💠", color: "#6fe3d8" },
  { name: "", icon: "💎", color: "#9fd8ff" },
];
const RANK_AT = {
  k1: [5, 10, 18, 25, 35, 50], k3: [4, 8, 12, 18, 25, 35], r1: [4, 8, 12, 16, 22, 30],
  row1: [6, 10, 14, 18, 24, 30], row2: [5, 8, 12, 16, 20, 28], row3: [6, 10, 14, 18, 24, 30],
  n1: [8, 12, 18, 25, 35, 50], n2: [5, 8, 12, 16, 20, 30], n7: [4, 6, 10, 14, 18, 25],
  b5: [20, 30, 45, 60, 90, 180], b2: [5, 8, 12, 15, 20, 30], b4: [8, 12, 16, 20, 30, 40],
};
function rankIdx(id, best) {
  const at = RANK_AT[id];
  if (!at || best === null || best === undefined || isNaN(best)) return 0;
  let r = 0; at.forEach((v, i) => { if (best >= v) r = i + 1; });
  return r;
}
function rankNext(id, best) {
  const at = RANK_AT[id]; const r = rankIdx(id, best);
  if (!at || r >= at.length) return null;
  return { rank: RANKS[r + 1], need: at[r] - (best || 0), at: at[r] };
}
function RankBadge({ id, best, small }) {
  if (!RANK_AT[id]) return null;
  const r = RANKS[rankIdx(id, best)];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: small ? 12 : 13, fontWeight: 700, color: r.color, border: `1.5px solid ${r.color}55`, borderRadius: 99, padding: small ? "1px 8px" : "3px 10px", whiteSpace: "nowrap" }}>
      <span aria-hidden="true">{r.icon}</span>{r.name}
    </span>
  );
}
function RankLadder({ id, best }) {
  const at = RANK_AT[id]; if (!at) return null;
  const cur = rankIdx(id, best);
  const unit = EX[id].type === "time" ? " s" : unitStr(EX[id].unit);
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontWeight: 700, color: C.chalk, marginBottom: 8 }}>{best !== null ? T("ladderTitle", { v: `${best}${unit}` }) : T("ladderNone")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {RANKS.map((r, i) => (
          <div key={i} style={{ border: `1.5px solid ${i === cur ? r.color : C.line}`, background: i === cur ? `${r.color}22` : "transparent", borderRadius: 10, padding: "6px 4px", textAlign: "center", opacity: i > cur ? 0.6 : 1 }}>
            <div style={{ fontSize: 18 }}>{r.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.name}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{i === 0 ? T("rankStart") : `${at[i - 1]}${unit}+`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SHARED UI ──────────────────────────────────────────────────────────────
const btnBase = { border: "none", cursor: "pointer", fontFamily: BODY, fontWeight: 700, borderRadius: 14 };
const EDGE = { [C.signal]: "#c29300", [C.chalk]: "#8e9cc2", [C.panelHi]: "#0f2147", [C.mint]: "#2b9e66", "#e62117": "#9b120c" };
function applyTheme(id) {
  const t = THEMES[id] || THEMES.navy;
  Object.keys(t).forEach(k => { if (k !== "edge") C[k] = t[k]; });
  EDGE[C.panelHi] = t.edge;
  EDGE[C.chalk] = "#8e9cc2";
  try {
    document.body.style.background = C.ink;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", C.ink);
  } catch (_) {}
  // These shared styles are built from C, so rebuild them when the theme changes.
  ghostBtn = { ...btnBase, background: "transparent", color: C.dim, border: `1.5px solid ${C.line}`, padding: "10px 14px", fontSize: 13 };
  sectionTitle = { fontFamily: DISPLAY, fontSize: 28, fontWeight: 900, color: C.chalk, margin: "26px 0 10px" };
  card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18 };
}
// Copies the current language's texts into the data objects (like applyTheme does for colours).
function applyLang(code) {
  if (!setLang(code) && EX.k1.name) return;
  Object.keys(EX).forEach(id => Object.assign(EX[id], L.ex[id]));
  WARMUP.forEach(w => Object.assign(w, L.warm[w.id]));
  COOL.forEach(c => Object.assign(c, L.cool[c.id]));
  Object.keys(FIGS).forEach(id => FIGS[id].forEach((p, i) => { p.label = (L.fig[id] || [])[i] || ""; }));
  RANKS.forEach((r, i) => { r.name = L.ranks[i]; });
}
const bigBtn = (bg, fg) => ({ ...btnBase, width: "100%", padding: "17px 16px", fontSize: 16, background: bg, color: fg, "--e": EDGE[bg] || "transparent" });
let ghostBtn = { ...btnBase, background: "transparent", color: C.dim, border: `1.5px solid ${C.line}`, padding: "10px 14px", fontSize: 13 };

// Big display text: shrink when the language's words are long, so nothing gets cut off.
function fitSize(text, base, maxChars = 10) {
  // Cyrillic falls back to Oswald, which runs about 20 % wider than Big Shoulders.
  const k = /[\u0400-\u04FF]/.test(text) ? 1.2 : 1;
  const longest = k * Math.max(...String(text).split(/\s+/).map(w => w.length));
  return longest <= maxChars ? base : Math.max(Math.round(base * 0.6), Math.round((base * maxChars) / longest));
}
// HW App mark: a house roof over a dumbbell (same drawing as icon.svg).
function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <rect width="512" height="512" rx="116" fill={C.panelHi} />
      <path d="M120 248 L256 130 L392 248" fill="none" stroke={C.signal} strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" />
      <g fill={C.chalk}>
        <rect x="172" y="324" width="168" height="30" rx="15" />
        <rect x="130" y="276" width="40" height="126" rx="16" />
        <rect x="342" y="276" width="40" height="126" rx="16" />
        <rect x="96" y="302" width="30" height="74" rx="13" />
        <rect x="386" y="302" width="30" height="74" rx="13" />
      </g>
    </svg>
  );
}
function openYT(url) { try { window.open(url, "_blank"); } catch (_) {} }

// Rendered straight into <body> through a portal. Inside a screen, the .scr slide-in animation
// makes the screen the containing block for position:fixed, so the sheet used to be placed
// relative to the (long, scrolled) page instead of the phone screen and ended up off-screen.
function Sheet({ title, onClose, children }) {
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(5,10,24,0.82)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
      <div onClick={e => e.stopPropagation()} className="sheetBox" style={{ background: C.panel, borderRadius: 22, padding: "22px 20px 26px", width: "100%", maxWidth: 460, border: `1px solid ${C.line}`, overflowY: "auto", overscrollBehavior: "contain", fontFamily: BODY }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, lineHeight: 1, color: C.chalk }}>{title}</div>
          <button onClick={onClose} aria-label={T("close")} style={{ ...btnBase, background: C.panelHi, color: C.dim, padding: "7px 12px", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ fontSize: 15, color: "#cdd6f0", lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

function HowTo({ id, history, onClose }) {
  const ex = EX[id];
  const best = bestFor(history, id);
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div style={{ color: C.dim, fontSize: 13, marginBottom: 10 }}>{ex.muscles}</div>
      <ExFigure id={id} />
      {ex.tempo && <div style={{ background: C.panelHi, borderRadius: 12, padding: "10px 13px", marginBottom: 14, fontSize: 14 }}><b style={{ color: C.signal }}>{T("tempo")}:</b> {ex.tempo}</div>}
      <div>{ex.how}</div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, color: C.chalk }}>💡 {ex.tip}</div>
      <button onClick={() => openYT(ex.yt)} className="b3d" style={{ ...bigBtn("#e62117", "#fff"), marginTop: 16, fontSize: 14, padding: 14 }}>{T("videoYT")}</button>
      <RankLadder id={id} best={best} />
    </Sheet>
  );
}

function Ring({ value, total, size, color, children }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const pct = total ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.panelHi} strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset .25s linear" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function Confetti({ count = 70 }) {
  const [pieces] = useState(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    dx: `${Math.round((Math.random() * 2 - 1) * 120)}px`,
    rot: `${Math.round(Math.random() * 720 - 360)}deg`,
    dur: `${(1.8 + Math.random() * 1.6).toFixed(2)}s`,
    delay: `${(Math.random() * 0.5).toFixed(2)}s`,
    color: [C.signal, C.mint, C.sky, "#ff7ab6", C.chalk][i % 5],
    round: i % 3 === 0,
  })));
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 4200); return () => clearTimeout(t); }, []);
  if (!show) return null;
  // Portal into <body> for the same reason as Sheet: inside an animated screen, "fixed" would be
  // relative to that screen, so on a short screen (workout ended early) the confetti got cut off.
  return createPortal(
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 90 }}>
      {pieces.map((p, i) => (
        <span key={i} className="conf" style={{ left: `${p.left}%`, background: p.color, borderRadius: p.round ? 99 : 2, "--dx": p.dx, "--rot": p.rot, "--dur": p.dur, "--delay": p.delay }} />
      ))}
    </div>,
    document.body
  );
}

const chip = color => ({ display: "flex", alignItems: "center", gap: 4, fontFamily: DISPLAY, fontWeight: 800, fontSize: 20, color, padding: "2px 10px", border: `1.5px solid ${C.line}`, borderRadius: 99 });

// ─── PROFILE / STATS HELPERS ────────────────────────────────────────────────
const PROFILE_KEY = "domaci-trening-v1-profile";
const SETTINGS_KEY = "domaci-trening-v1-settings";
// Backups made before the rename say "domaci-trening"; both are accepted.
const BACKUP_ID = "hw-app";
const BACKUP_IDS = [BACKUP_ID, "domaci-trening"];
const DEFAULT_SETTINGS = { theme: "navy", sndTap: true, sndFx: true, sndTimer: true, volume: "mid", vibrate: true, keepAwake: true, aiCopy: false, exOff: [] };
async function loadSettings() { try { const v = await store.get(SETTINGS_KEY); if (v) return JSON.parse(v); } catch (_) {} return null; }
async function saveSettings(st) { await store.set(SETTINGS_KEY, JSON.stringify(st)); }
async function loadProfile() { try { const v = await store.get(PROFILE_KEY); if (v) return JSON.parse(v); } catch (_) {} return null; }
async function saveProfile(p) { await store.set(PROFILE_KEY, JSON.stringify(p)); }
// Small UI memory: closed cards and which daily line was shown. Not part of backups.
const UI_KEY = "domaci-trening-v1-ui";
async function loadUi() { try { const v = await store.get(UI_KEY); if (v) return JSON.parse(v); } catch (_) {} return null; }
async function saveUi(u) { await store.set(UI_KEY, JSON.stringify(u)); }
// Square-crop + shrink the picked photo to 256 px so it stores small.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 256, c = document.createElement("canvas");
        c.width = S; c.height = S;
        const m = Math.min(img.width, img.height);
        c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
// Best set for an exercise up to and including session index i (rank "at that time").
function bestUntil(history, id, i) { return bestFor(history.slice(0, i + 1), id); }
function bestStreak(history) {
  const dates = [...new Set(history.map(h => h.date))].sort();
  let best = dates.length ? 1 : 0, run = 1;
  for (let i = 1; i < dates.length; i++) { run = daysBetween(dates[i - 1], dates[i]) <= 2 ? run + 1 : 1; best = Math.max(best, run); }
  return best;
}
function totalReps(history) {
  return history.reduce((a, e) => a + e.items.reduce((b, it) => b + it.res.reduce((c, v) => c + (typeof v === "number" ? v : 0), 0), 0), 0);
}
function achievements(history) {
  const n = history.length;
  const bs = bestStreak(history);
  const prs = history.reduce((a, e) => a + ((e.prs && e.prs.length) || 0), 0);
  const maxRank = Math.max(0, ...Object.keys(RANK_AT).map(id => rankIdx(id, bestFor(history, id))));
  const lvl = levelInfo(totalXP(history)).lvl;
  const push = bestFor(history, "k1") || 0;
  return [
    { icon: "🎯", k: "first", ok: n >= 1 },
    { icon: "🖐️", k: "w5", ok: n >= 5 },
    { icon: "🔟", k: "w10", ok: n >= 10 },
    { icon: "🏅", k: "w25", ok: n >= 25 },
    { icon: "🏆", k: "w50", ok: n >= 50 },
    { icon: "🔥", k: "s3", ok: bs >= 3 },
    { icon: "⚡", k: "s7", ok: bs >= 7 },
    { icon: "🌋", k: "s15", ok: bs >= 15 },
    { icon: "📈", k: "pr", ok: prs >= 1 },
    { icon: "🥇", k: "gold", ok: maxRank >= 4 },
    { icon: "💎", k: "diamond", ok: maxRank >= 6 },
    { icon: "✅", k: "week", ok: [...new Set(history.map(e => weekKey(e.date)))].some(wk => challengeStatus(history, wk).every(c => c.done)) },
    { icon: "⭐", k: "lvl5", ok: lvl >= 5 },
    { icon: "💪", k: "r3", ok: history.some(e => e.rounds === 3) },
    { icon: "🦾", k: "push30", ok: push >= 30 },
  ].map(a => ({ ...a, name: L.ach[a.k][0], desc: L.ach[a.k][1] }));
}

function Avatar({ profile, size = 38 }) {
  const initial = (profile.name || "?").trim().charAt(0).toUpperCase() || "?";
  return profile.pfp ? (
    <img src={profile.pfp} alt={T("photoAlt")} style={{ width: size, height: size, borderRadius: 99, objectFit: "cover", display: "block", border: `2px solid ${C.signal}` }} />
  ) : (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: 99, background: C.signal, color: C.signalInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: size * 0.55 }}>{initial}</div>
  );
}

let sectionTitle = { fontFamily: DISPLAY, fontSize: 28, fontWeight: 900, color: C.chalk, margin: "26px 0 10px" };
let card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18 };

// ─── TOP BAR + TAB BAR ──────────────────────────────────────────────────────
function TopBar({ tab, history, profile, onProfile }) {
  const today = dateKey();
  const st = streakInfo(history, today);
  const lv = levelInfo(totalXP(history));
  const title = T(tab === "train" ? "tabTrain" : tab === "history" ? "tabHistory" : tab === "settings" ? "tabSettings" : "tabProfile");
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, background: `${C.ink}ee`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, lineHeight: 1, color: C.chalk }}>{title}</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{capFirst(fmtDate(today, true))}</div>
        </div>
        <div style={chip(st.n ? "#ffa94d" : C.dim)} aria-label={T("streakAria", { n: st.n })}><span className={st.n ? "wiggle" : ""}>🔥</span>{st.n}</div>
        <div style={chip(C.sky)} aria-label={T("levelAria", { n: lv.lvl })}>⚡{lv.lvl}</div>
        <button onClick={onProfile} aria-label={T("openProfile")} style={{ ...btnBase, background: "transparent", padding: 0, borderRadius: 99 }}>
          <Avatar profile={profile} size={38} />
        </button>
      </div>
    </div>
  );
}

function TabIcon({ name, active }) {
  const c = active ? C.signal : C.dim;
  const s = { fill: "none", stroke: c, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "train") return <svg width="26" height="26" viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" {...s} /></svg>;
  if (name === "history") return <svg width="26" height="26" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3" {...s} /><path d="M3.5 10h17M8 3v4M16 3v4" {...s} /><circle cx="12" cy="15" r="1.6" fill={c} stroke="none" /></svg>;
  return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" {...s} /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" {...s} /><circle cx="12" cy="12" r="6.6" {...s} /></svg>;
}

function TabBar({ tab, setTab }) {
  const tabs = [["train", T("tabTrain")], ["history", T("tabHistory")], ["settings", T("tabSettings")]];
  return (
    <nav aria-label={T("mainMenu")} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, background: `${C.panel}f2`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", display: "flex" }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => { if (tab !== id) sfxTap(); setTab(id); }} aria-current={tab === id ? "page" : undefined}
            style={{ ...btnBase, flex: 1, background: "transparent", padding: "8px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: tab === id ? C.signal : C.dim, fontSize: 12, borderRadius: 0 }}>
            <span className={tab === id ? "pop" : ""} key={tab === id ? "on" : "off"} style={{ display: "inline-flex" }}><TabIcon name={id} active={tab === id} /></span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function ChallengesCard({ history }) {
  const wk = weekKey(dateKey());
  const list = challengeStatus(history, wk);
  const doneN = list.filter(c => c.done).length;
  const end = addDays(wk, 6);
  const left = daysBetween(dateKey(), end) + 1;
  return (
    <div style={{ ...card, padding: "14px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: C.chalk }}>{T("weeklyChallenges")}</div>
        <div style={{ fontSize: 12, color: C.dim }}>{T("chLeft", { done: doneN, left: TP("days", left) })}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {list.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={c.done ? "pop" : ""} style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: c.done ? C.mint : C.panelHi }}>{c.done ? "✓" : c.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: c.done ? C.mint : C.chalk }}>{L.ch[c.id]}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.done ? C.mint : C.sky, whiteSpace: "nowrap" }}>+{c.xp} XP</span>
              </div>
              <div style={{ height: 7, background: C.panelHi, borderRadius: 99, marginTop: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(c.v / c.goal) * 100}%`, background: c.done ? C.mint : C.sky, borderRadius: 99, transition: "width .6s ease-out" }} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{c.v} / {c.goal}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 10 }}>{T("chFooter")}</div>
    </div>
  );
}

// ─── TAB 1: WORKOUT ─────────────────────────────────────────────────────────
// Small ✕ in the top-right corner of a card that can be hidden.
function CloseX({ onClick, color }) {
  return (
    <button onClick={e => { e.stopPropagation(); sfxTap(); onClick(); }} aria-label={T("hide")}
      style={{ ...btnBase, position: "absolute", top: 6, right: 6, width: 34, height: 34, padding: 0, borderRadius: 99, background: "transparent", color: color || C.dim, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
  );
}

function TrainTab({ history, onStart, onFreeze, ui, setUi }) {
  const today = dateKey();
  // Make sure today's daily line and the "done" card texts are picked (and saved) before painting.
  useLayoutEffect(() => { const n = uiForToday(ui, history, today); if (n !== ui) setUi(n); });
  const auto = nextDayIdx(history);
  const [dayIdx, setDayIdx] = useState(auto);
  const [rounds, setRounds] = useState(2);
  const [howEx, setHowEx] = useState(null);
  const last = history[history.length - 1];
  const gap = last ? daysBetween(last.date, today) : null;
  const day = DAYS[dayIdx];
  const st = streakInfo(history, today);

  const doneToday = !!last && gap <= 0;
  const lastTs = last ? entryTs(last) : 0;
  const showDone = doneToday && ui.doneHiddenTs !== lastTs;
  const dv = ui.doneVar && ui.doneVar.ts === lastTs ? ui.doneVar : { t: 0, s: 0 };
  const dailyText = ui.daily && ui.daily.date === today && ui.dailyHidden !== today ? (() => { const pool = dailyPool(ui.daily.kind); return pool[ui.daily.i % pool.length]; })() : null;
  const nextIdeal = last ? addDays(last.date, 2) : today;
  let status = T("firstWorkout");
  if (last) {
    if (doneToday) status = nextIdeal <= today ? T("anytime") : T("idealOn", { date: fmtDate(nextIdeal) });
    else if (gap === 1) status = T("trainedYesterday", { day: last.day });
    else if (gap === 2) status = T("streakAtRisk", { n: st.n });
    else status = T("trainingDay", { date: fmtDate(last.date), ago: TP("daysAgo", gap) });
  }

  const week = (() => {
    const t = parseKey(today);
    const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    const done = new Set(history.map(x => x.date));
    return weekdaysShort().map((lb, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const k = dateKey(d);
      return { lb, k, on: done.has(k), isToday: k === today };
    });
  })();
  const weekCount = week.filter(w => w.on).length;

  return (
    <div className="scr" style={{ padding: "16px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
      {howEx && <HowTo id={howEx} history={history} onClose={() => setHowEx(null)} />}

      {showDone && (
        <div style={{ position: "relative", background: "#173f3a", border: `1.5px solid ${C.mint}`, borderRadius: 18, padding: "14px 40px 14px 16px", display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <CloseX color="#bfe9d4" onClick={() => setUi({ ...ui, doneHiddenTs: lastTs })} />
          <div className="pop" style={{ width: 46, height: 46, borderRadius: 99, background: C.mint, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, flexShrink: 0 }}>✓</div>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 900, lineHeight: 0.95, color: C.mint }}>{L.doneTitles[dv.t % L.doneTitles.length]}</div>
            <div style={{ fontSize: 14, color: C.chalk, marginTop: 4, fontWeight: 600 }}>{fmt(L.doneSubs[dv.s % L.doneSubs.length], { day: last.day })}</div>
            <div style={{ fontSize: 12, color: "#bfe9d4", marginTop: 4, lineHeight: 1.5 }}>{last.items.map(it => `${exName(it)} ${it.res.map(r => fmtRes(r, "")).join("/")}`).join(", ")}</div>
          </div>
        </div>
      )}

      {history.length === 0 && !ui.welcomeHidden && (
        <div style={{ ...card, position: "relative", padding: "15px 16px", marginBottom: 16, borderColor: C.signal }}>
          <CloseX onClick={() => setUi({ ...ui, welcomeHidden: true })} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo size={46} />
            <div>
              <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 900, color: C.signal, lineHeight: 1 }}>{T("welcomeTitle")}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 800, color: C.dim, letterSpacing: 1, marginTop: 2 }}>HW APP</div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: C.chalk, lineHeight: 1.55, marginTop: 8 }}>
            {T("welcome1")}
          </div>
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.55, marginTop: 8 }}>
            {T("welcome2")}
          </div>
        </div>
      )}

      {dailyText && (
        <div style={{ position: "relative", padding: "4px 40px 4px 14px", borderLeft: `4px solid ${C.signal}` }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 27, fontWeight: 800, lineHeight: 1.1, color: C.chalk }}>{dailyText}</div>
          <CloseX onClick={() => setUi({ ...ui, dailyHidden: today })} />
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 16 }} aria-label={T("weekLine", { count: TP("workouts", weekCount) })}>
        {week.map(w => (
          <div key={w.k} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: w.isToday ? C.chalk : C.dim, fontWeight: w.isToday ? 700 : 500, marginBottom: 4 }}>{w.lb}</div>
            <div style={{ height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900,
              background: w.on ? C.mint : "transparent", color: C.ink, border: `1.5px solid ${w.on ? C.mint : w.isToday ? C.chalk : C.line}` }}>{w.on ? "✓" : ""}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{T("weekLine", { count: TP("workouts", weekCount) })}</div>

      <div style={{ fontSize: 14, color: C.dim, marginTop: 22 }}>{doneToday ? T("nextWorkout") : T("todayWorkout")}</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: fitSize(T("dayN", { d: day.id }).replace(/\s/g, "_"), doneToday ? 72 : 96, 6), lineHeight: 0.85, letterSpacing: -1, color: C.chalk, marginTop: 4 }}>
        {T("dayN", { d: day.id })}
      </div>
      <div style={{ fontSize: 14, color: !doneToday && gap !== null && gap >= 2 ? C.signal : C.dim, marginTop: 10, lineHeight: 1.5 }}>{status}</div>
      {!doneToday && st.gap === 2 && st.n > 0 && !st.frozenToday && freezesAvailable(history) > 0 && (
        <button onClick={onFreeze} style={{ ...ghostBtn, marginTop: 10, color: C.sky, borderColor: C.sky }}>{T("freezeOffer", { n: freezesAvailable(history) })}</button>
      )}
      {st.frozenToday && <div style={{ fontSize: 13, color: C.sky, marginTop: 8 }}>{T("frozenToday")}</div>}

      <div role="radiogroup" aria-label={T("pickDay")} style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {DAYS.map((d, i) => (
          <button key={d.id} role="radio" aria-checked={i === dayIdx} onClick={() => { sfxTap(); setDayIdx(i); }}
            style={{ ...btnBase, flex: 1, padding: "10px 0", fontFamily: DISPLAY, fontSize: 22, fontWeight: 800,
              background: i === dayIdx ? C.chalk : "transparent", color: i === dayIdx ? C.ink : C.dim,
              border: `1.5px solid ${i === dayIdx ? C.chalk : C.line}` }}>
            {d.id}{i === auto && <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 600, marginLeft: 5, verticalAlign: "middle" }}>{T("upNext")}</span>}
          </button>
        ))}
      </div>

      <div style={{ ...card, marginTop: 18 }}>
        {day.ids.map((slot, i) => {
          const id = effId(slot);
          const ex = EX[id];
          const l = lastFor(history, id);
          const b = bestFor(history, id);
          const n = rankNext(id, b);
          return (
            <button key={id} onClick={() => setHowEx(id)}
              style={{ ...btnBase, display: "flex", width: "100%", alignItems: "center", gap: 12, textAlign: "left", background: "transparent", color: C.chalk, padding: "14px 16px", borderRadius: 0, borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{ex.muscles}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                  <RankBadge id={id} best={b} small />
                  {n && <span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>{n.rank.icon} {T("toNext", { n: n.need })}</span>}
                </div>
                {levelUpFor(history, id) && <div style={{ fontSize: 12, color: C.signal, fontWeight: 700, marginTop: 3 }}>{T("harderShort")}</div>}
                {id !== slot && <div style={{ fontSize: 12, color: C.sky, fontWeight: 600, marginTop: 3 }}>{T("replacing", { name: EX[slot].name })}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: l ? C.chalk : C.dim }}>
                  {l ? l.res.map(r => fmtRes(r, "")).join(" / ") : T("newEx")}
                </div>
                <div style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>{l ? `${T("lastTime")}${ex.unit ? ` (${perUnit(ex.unit)})` : ""}` : T("tapInfo")}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>{T("tapHint")}</div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {[2, 3].map(n => (
          <button key={n} onClick={() => { sfxTap(); setRounds(n); }}
            style={{ ...btnBase, flex: 1, padding: "11px 8px", fontSize: 13, background: rounds === n ? C.panelHi : "transparent", color: rounds === n ? C.chalk : C.dim, border: `1.5px solid ${rounds === n ? C.chalk : C.line}` }}>
            {T("roundsBtn", { n, m: n === 2 ? 13 : 19 })}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>{T("roundsHint")}</div>

      <button onClick={() => { unlockAudio(); onStart(day.id, rounds); }} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 14, fontSize: 18, padding: 19 }}>
        {T("startDay", { d: day.id })}
      </button>

      <div style={{ marginTop: 22 }}><ChallengesCard history={history} /></div>
    </div>
  );
}

// ─── TAB 2: HISTORY ────────────────────────────────────────────────────────
function MonthCalendar({ history }) {
  const today = dateKey();
  const t = parseKey(today);
  const [ym, setYm] = useState([t.getFullYear(), t.getMonth()]);
  const [y, m] = ym;
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const byDate = {};
  history.forEach(e => { byDate[e.date] = e.day; });
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const count = Object.keys(byDate).filter(k => k.startsWith(`${y}-${pad(m + 1)}`)).length;
  const shift = n => { sfxTap(); const d = new Date(y, m + n, 1); setYm([d.getFullYear(), d.getMonth()]); };
  return (
    <div style={{ ...card, padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => shift(-1)} aria-label={T("prevMonth")} style={{ ...ghostBtn, padding: "4px 12px", fontSize: 16 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, color: C.chalk }}>{capFirst(fmtMonthYear(first))}</div>
          <div style={{ fontSize: 12, color: C.dim }}>{TP("workouts", count)}</div>
        </div>
        <button onClick={() => shift(1)} aria-label={T("nextMonth")} style={{ ...ghostBtn, padding: "4px 12px", fontSize: 16 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
        {weekdaysShort().map(d => <div key={d} style={{ fontSize: 11, color: C.dim, textAlign: "center", fontWeight: 600 }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = `${y}-${pad(m + 1)}-${pad(d)}`;
          const on = byDate[k];
          const isToday = k === today;
          return (
            <div key={i} title={on ? T("dayN", { d: on }) : undefined} style={{ aspectRatio: "1", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: on ? C.mint : "transparent", color: on ? C.ink : k > today ? "#4d5f8a" : C.dim, border: `1.5px solid ${on ? C.mint : isToday ? C.chalk : "transparent"}`, fontSize: 13, fontWeight: on ? 800 : 500 }}>
              {d}
              {on && <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>{on}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressChart({ history }) {
  const withData = Object.keys(RANK_AT).filter(id => history.some(e => e.items.some(it => it.id === id)));
  const [sel, setSel] = useState(withData.includes("k1") ? "k1" : withData[0]);
  const [tip, setTip] = useState(null);
  if (!withData.length) return null;
  const pts = history.map(e => {
    const it = e.items.find(x => x.id === sel);
    if (!it) return null;
    const nums = it.res.map(numVal).filter(n => !isNaN(n));
    return nums.length ? { date: e.date, v: Math.max(...nums) } : null;
  }).filter(Boolean);
  const W = 320, H = 150, P = { l: 30, r: 14, t: 16, b: 26 };
  const vals = pts.map(p => p.v);
  const at = RANK_AT[sel];
  const maxV = Math.max(...vals, 5);
  const top = Math.ceil((maxV * 1.15) / 5) * 5;
  const x = i => P.l + (pts.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (pts.length - 1));
  const yv = v => P.t + (1 - v / top) * (H - P.t - P.b);
  const unit = EX[sel].type === "time" ? " s" : "";
  const nextAt = at.find(v => v > Math.max(...vals));
  return (
    <div style={{ ...card, padding: "14px 14px 10px" }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 6 }}>
        {withData.map(id => (
          <button key={id} onClick={() => { sfxTap(); setSel(id); setTip(null); }} style={{ ...btnBase, flexShrink: 0, padding: "6px 11px", fontSize: 12, background: sel === id ? C.chalk : "transparent", color: sel === id ? C.ink : C.dim, border: `1.5px solid ${sel === id ? C.chalk : C.line}` }}>{EX[id].name}</button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: C.chalk, fontWeight: 700 }}>{T("chartTitle", { name: EX[sel].name })}{unit ? T("chartSeconds") : ""}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 6 }} onClick={() => setTip(null)}>
        {[0, top / 2, top].map(g => (
          <g key={g}>
            <line x1={P.l} x2={W - P.r} y1={yv(g)} y2={yv(g)} stroke={C.line} strokeWidth="1" />
            <text x={P.l - 6} y={yv(g) + 4} textAnchor="end" fontSize="10" fill={C.dim}>{Math.round(g)}</text>
          </g>
        ))}
        {nextAt && nextAt <= top && (
          <g>
            <line x1={P.l} x2={W - P.r} y1={yv(nextAt)} y2={yv(nextAt)} stroke={RANKS[at.indexOf(nextAt) + 1].color} strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={W - P.r} y={yv(nextAt) - 4} textAnchor="end" fontSize="10" fill={C.dim}>{RANKS[at.indexOf(nextAt) + 1].icon} {RANKS[at.indexOf(nextAt) + 1].name} {nextAt}{unit}</text>
          </g>
        )}
        {pts.length > 1 && <polyline points={pts.map((p, i) => `${x(i)},${yv(p.v)}`).join(" ")} fill="none" stroke={C.sky} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p, i) => (
          <g key={i} onClick={ev => { ev.stopPropagation(); sfxTap(); setTip(i); }} style={{ cursor: "pointer" }}>
            <circle cx={x(i)} cy={yv(p.v)} r="14" fill="transparent" />
            <circle cx={x(i)} cy={yv(p.v)} r="5" fill={C.sky} stroke={C.panel} strokeWidth="2" />
            {(i === pts.length - 1 || tip === i) && <text x={x(i)} y={yv(p.v) - 10} textAnchor="middle" fontSize="12" fontWeight="800" fill={C.chalk}>{p.v}{unit}</text>}
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={tip === i ? C.chalk : C.dim}>{fmtShortDM(parseKey(p.date))}</text>
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 12, color: C.dim }}>{T("chartHint")}</div>
    </div>
  );
}

// ─── HISTORY: EDIT / ADD A WORKOUT ──────────────────────────────────────────
// Values are edited as text so a box can be empty ("didn't do that round").
const toField = v => { const n = numVal(v); return isNaN(n) ? "" : String(n); };
function fromField(s, type) {
  const n = parseInt(String(s).trim(), 10);
  if (isNaN(n) || n < 0) return null;
  return type === "time" ? `${Math.min(n, 3600)}s` : Math.min(n, 999);
}
const exType = id => (EX[id] ? EX[id].type : "reps");
function EntryEditor({ entry, nextDay, onSave, onDelete, onClose }) {
  const today = dateKey();
  const isNew = !entry;
  const rowsFor = (dayId, rounds) => DAYS.find(d => d.id === dayId).ids.map(slot => ({ id: effId(slot), vals: Array(rounds).fill("") }));
  const [date, setDate] = useState(entry ? entry.date : today);
  const [day, setDay] = useState(entry ? entry.day : nextDay);
  const [rounds, setRounds] = useState(entry ? Math.max(1, entry.rounds || 2) : 2);
  const [rows, setRows] = useState(() => entry
    ? entry.items.map(it => ({ id: it.id, name: it.name, unit: it.unit, vals: Array.from({ length: Math.max(1, entry.rounds || it.res.length) }, (_, r) => toField(it.res[r])) }))
    : rowsFor(nextDay, 2));
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const untouched = rows.every(r => r.vals.every(v => v === ""));

  const setRoundsN = n => { sfxTap(); setRounds(n); setRows(rs => rs.map(r => ({ ...r, vals: Array.from({ length: n }, (_, i) => r.vals[i] ?? "") }))); };
  // For a new, still empty workout, picking another day loads that day's exercises.
  const setDayId = id => { sfxTap(); setDay(id); if (isNew && untouched) setRows(rowsFor(id, rounds)); };
  const setVal = (ri, k, v) => setRows(rs => rs.map((r, i) => (i === ri ? { ...r, vals: r.vals.map((x, j) => (j === k ? v.replace(/[^0-9]/g, "").slice(0, 4) : x)) } : r)));
  const removeRow = ri => { sfxTap(); setRows(rs => rs.filter((_, i) => i !== ri)); };
  const addRow = id => { if (!id) return; sfxTap(); setRows(rs => [...rs, { id, vals: Array(rounds).fill("") }]); };
  const used = new Set(rows.map(r => r.id));

  const save = () => {
    const items = rows.map(r => {
      const ex = EX[r.id];
      return { id: r.id, name: ex ? ex.name : r.name, unit: ex ? ex.unit : r.unit, res: r.vals.slice(0, rounds).map(v => fromField(v, exType(r.id))) };
    }).filter(it => it.res.some(v => v !== null));
    if (!items.length) { setErr(T("editEmpty")); return; }
    if (!date || date > today) { setErr(T("editBadDate")); return; }
    // Keep the time of day when only the date changes; a new workout for today gets "now".
    const tod = entry ? (entryTs(entry) - parseKey(entry.date).getTime()) : 12 * 3600000;
    const ts = entry && entry.date === date ? entryTs(entry) : isNew && date === today ? Date.now() : parseKey(date).getTime() + tod;
    const base = entry || { warm: false, cool: false, manual: true };
    sfxCheck();
    onSave({ ...base, date, ts, day, rounds, items });
  };

  const field = { fontFamily: BODY, fontSize: 16, fontWeight: 700, padding: "9px 10px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: C.ink, color: C.chalk, outline: "none", boxSizing: "border-box" };
  const label = { fontSize: 12, color: C.dim, fontWeight: 600, marginBottom: 6 };
  const pill = on => ({ ...btnBase, flex: 1, padding: "9px 0", fontSize: 15, background: on ? C.chalk : "transparent", color: on ? C.ink : C.dim, border: `1.5px solid ${on ? C.chalk : C.line}` });

  return (
    <Sheet title={isNew ? T("addTitle") : T("editTitle")} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        <div>
          <div style={label}>{T("fDate")}</div>
          <input type="date" value={date} max={today} onChange={e => { setDate(e.target.value); setErr(""); }} aria-label={T("fDate")} style={{ ...field, width: "100%", colorScheme: "dark" }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 3 }}>
            <div style={label}>{T("fDay")}</div>
            <div style={{ display: "flex", gap: 6 }}>{DAYS.map(d => <button key={d.id} onClick={() => setDayId(d.id)} aria-pressed={day === d.id} style={{ ...pill(day === d.id), fontFamily: DISPLAY, fontSize: 20 }}>{d.id}</button>)}</div>
          </div>
          <div style={{ flex: 2 }}>
            <div style={label}>{T("fRounds")}</div>
            <div style={{ display: "flex", gap: 6 }}>{[2, 3].map(n => <button key={n} onClick={() => setRoundsN(n)} aria-pressed={rounds === n} style={pill(rounds === n)}>{n}</button>)}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>{T("editHint")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r, ri) => {
            const ex = EX[r.id];
            const time = exType(r.id) === "time";
            return (
              <div key={r.id} style={{ background: C.panelHi, borderRadius: 14, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, color: C.chalk }}>
                    {ex ? ex.name : r.name}
                    <span style={{ fontSize: 12, color: C.dim, fontWeight: 500 }}>{time ? ` (${T("secondsUnit")})` : ex && ex.unit ? ` (${perUnit(ex.unit)})` : ""}</span>
                  </div>
                  <button onClick={() => removeRow(ri)} aria-label={T("removeEx", { name: ex ? ex.name : r.name })} style={{ ...btnBase, background: "transparent", color: "#ff8a80", fontSize: 15, padding: "4px 8px" }}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {r.vals.map((v, k) => (
                    <label key={k} style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: C.dim, marginBottom: 3 }}>{T("roundN", { r: k + 1 })}</div>
                      <input inputMode="numeric" pattern="[0-9]*" value={v} placeholder="–" onChange={e => { setVal(ri, k, e.target.value); setErr(""); }}
                        aria-label={`${ex ? ex.name : r.name}, ${T("roundN", { r: k + 1 })}`} style={{ ...field, width: "100%", textAlign: "center" }} />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <select value="" onChange={e => addRow(e.target.value)} aria-label={T("addEx")} style={{ ...field, width: "100%", fontWeight: 600, color: C.dim }}>
          <option value="">{T("addEx")}</option>
          {ALT_GROUPS.map((g, gi) => (
            <optgroup key={gi} label={T("grp_" + GROUP_KEYS[gi])}>
              {g.filter(id => !used.has(id)).map(id => <option key={id} value={id}>{EX[id].name}</option>)}
            </optgroup>
          ))}
        </select>
        {err && <div role="alert" style={{ fontSize: 13, color: "#ff8a80", fontWeight: 600 }}>{err}</div>}
        <button onClick={save} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk) }}>{T("save")}</button>
        {!isNew && (
          <button onClick={() => { if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 4000); return; } onDelete(); }}
            style={{ ...ghostBtn, width: "100%", padding: 12, color: confirmDel ? "#ff8a80" : C.dim, borderColor: confirmDel ? "#ff8a80" : C.line }}>
            {confirmDel ? T("confirmDelete") : T("deleteWorkout")}
          </button>
        )}
      </div>
    </Sheet>
  );
}

function HistoryTab({ history, onDelete, onSaveEntry }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // index, "new" or null
  const sets = history.reduce((a, e) => a + setsIn(e), 0);
  const prs = history.reduce((a, e) => a + ((e.prs && e.prs.length) || 0), 0);
  const tiles = [[T("tileTrainings"), history.length], [T("tileSets"), sets], [T("tilePRs"), prs]];
  return (
    <div className="scr" style={{ padding: "16px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {tiles.map(([l, v]) => (
          <div key={l} style={{ ...card, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1, color: C.chalk }}>{v}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      {editing !== null && (
        <EntryEditor key={String(editing)} entry={editing === "new" ? null : history[editing]} nextDay={DAYS[nextDayIdx(history)].id}
          onClose={() => setEditing(null)}
          onSave={e => { onSaveEntry(editing === "new" ? null : editing, e); setEditing(null); setOpen(null); }}
          onDelete={() => { onDelete(editing); setEditing(null); setOpen(null); }} />
      )}
      <MonthCalendar history={history} />
      <div style={sectionTitle}>{T("progress")}</div>
      <ProgressChart history={history} />
      <div style={sectionTitle}>{T("workoutsTitle")}</div>
      <button onClick={() => { sfxTap(); setEditing("new"); }} style={{ ...ghostBtn, width: "100%", padding: "12px 14px", fontSize: 14, color: C.chalk, marginBottom: 10, textAlign: "left" }}>
        {T("addWorkout")}
        <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{T("addWorkoutD")}</div>
      </button>
      {history.length === 0 && <div style={{ color: C.dim, fontSize: 14 }}>{T("noHistory")}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {history.slice().reverse().map((s, ri) => {
          const idx = history.length - 1 - ri;
          const isOpen = open === idx || ri === 0;
          return (
            <div key={`${s.date}-${idx}`} style={{ ...card, padding: "13px 15px" }}>
              <button onClick={() => { sfxTap(); setOpen(open === idx ? null : idx); }} aria-expanded={isOpen}
                style={{ ...btnBase, width: "100%", background: "transparent", color: C.chalk, padding: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.panelHi, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, flexShrink: 0 }}>{s.day}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{capFirst(fmtDate(s.date, true))}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>{TP("rounds", s.rounds || 2)}, {TP("sets", setsIn(s))}{s.prs && s.prs.length ? `, 🏆 ${s.prs.length}` : ""}</div>
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: C.sky }}>+{xpFor(s)} XP</div>
              </button>
              {isOpen && (
                <div style={{ marginTop: 10 }}>
                  {s.items.map(it => {
                    const b = EX[it.id] ? bestUntil(history, it.id, idx) : null;
                    const r = RANKS[EX[it.id] ? rankIdx(it.id, b) : 0];
                    return (
                      <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.line}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.chalk }}>{s.prs && s.prs.includes(it.id) ? "🏆 " : ""}{exName(it)}</div>
                          {RANK_AT[it.id] && <div style={{ fontSize: 12, color: r.color, fontWeight: 700 }}>{r.icon} {T("rankThen", { rank: r.name })}</div>}
                        </div>
                        <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: C.chalk, whiteSpace: "nowrap" }}>{it.res.map(v => fmtRes(v, "")).join(" / ")}<span style={{ fontFamily: BODY, fontSize: 11, color: C.dim, marginLeft: 3 }}>{unitStr(it.unit)}</span></div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                    <button onClick={() => { sfxTap(); setConfirmDel(null); setEditing(idx); }} style={{ ...btnBase, background: "transparent", color: C.sky, fontSize: 13, padding: "4px 6px", fontWeight: 700 }}>{T("editWorkout")}</button>
                    <button onClick={() => { if (confirmDel === idx) { onDelete(idx); setConfirmDel(null); } else setConfirmDel(idx); }}
                      style={{ ...btnBase, background: "transparent", color: confirmDel === idx ? "#ff8a80" : C.dim, fontSize: 12, padding: "4px 6px", fontWeight: 600 }}>
                      {confirmDel === idx ? T("confirmDelete") : T("deleteWorkout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB 3: PROFILE ──────────────────────────────────────────────────────────
function ProfileTab({ history, profile, setProfile, onFreeze }) {
  const fz = freezesAvailable(history);
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name || "");
  const [howEx, setHowEx] = useState(null);
  const [err, setErr] = useState("");
  const today = dateKey();
  const xp = totalXP(history);
  const lv = levelInfo(xp);
  const st = streakInfo(history, today);
  const ach = achievements(history);
  const since = history.length ? history.map(e => e.date).sort()[0] : null;

  const pick = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try { const url = await fileToAvatar(f); setProfile({ ...profile, pfp: url }); setErr(""); sfxCheck(); }
    catch (_) { setErr(T("photoErr")); }
  };
  const stats = [[T("statTrainings"), history.length], [T("statSets"), history.reduce((a, e) => a + setsIn(e), 0)], [T("statReps"), totalReps(history)], [T("statBestStreak"), `🔥 ${bestStreak(history)}`]];

  return (
    <div className="scr" style={{ padding: "16px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
      {howEx && <HowTo id={howEx} history={history} onClose={() => setHowEx(null)} />}
      <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 6 }}>
        <button onClick={() => fileRef.current && fileRef.current.click()} aria-label={T("changePhoto")} style={{ ...btnBase, position: "relative", background: "transparent", padding: 0, borderRadius: 99 }}>
          <Avatar profile={profile} size={104} />
          <span style={{ position: "absolute", right: -2, bottom: -2, width: 34, height: 34, borderRadius: 99, background: C.panelHi, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📷</span>
        </button>
        {err && <div style={{ fontSize: 13, color: "#ff8a80", marginTop: 8 }}>{err}</div>}
        {editing ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={name} onChange={e => setName(e.target.value.slice(0, 24))} autoFocus aria-label={T("nameLabel")}
              style={{ fontFamily: BODY, fontSize: 18, fontWeight: 700, padding: "8px 12px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.panel, color: C.chalk, width: 180, outline: "none" }} />
            <button onClick={() => { setProfile({ ...profile, name: name.trim() || T("defaultName") }); setEditing(false); sfxCheck(); }} className="b3d" style={{ ...btnBase, background: C.signal, color: C.signalInk, padding: "8px 14px", "--e": EDGE[C.signal] }}>{T("save")}</button>
          </div>
        ) : (
          <button onClick={() => { setName(profile.name || ""); setEditing(true); }} style={{ ...btnBase, background: "transparent", color: C.chalk, marginTop: 10, padding: "2px 6px" }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 900 }}>{profile.name || T("defaultName")}</span>
            <span style={{ fontSize: 13, color: C.dim, marginLeft: 6 }}>✏️</span>
          </button>
        )}
        <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>{since ? T("since", { date: fmtDate(since, true) }) : T("newMember")}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 18 }}>
        <div style={{ ...card, padding: "14px" }}>
          <div style={{ fontSize: 12, color: C.dim }}>{T("streak")}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, color: "#ffa94d", lineHeight: 1 }}><span className={st.n ? "wiggle" : ""}>🔥</span> {st.n}</div>
          <div style={{ fontSize: 12, color: st.gap === 2 ? C.signal : C.dim, marginTop: 4 }}>{st.gap === 2 ? T("streakRisk") : T("streakHold")}</div>
        </div>
        <div style={{ ...card, padding: "14px" }}>
          <div style={{ fontSize: 12, color: C.dim }}>{T("level")}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, color: C.sky, lineHeight: 1 }}>⚡ {lv.lvl}</div>
          <div style={{ height: 8, background: C.panelHi, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(lv.into / lv.need) * 100}%`, background: C.sky, borderRadius: 99, transition: "width .6s ease-out" }} />
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{T("xpLine", { into: lv.into, need: lv.need, total: xp })}</div>
        </div>
      </div>

      <div style={{ ...card, padding: "13px 15px", marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 30 }}>🧊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.chalk }}>{T("freezeTitle", { n: fz })}</div>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45 }}>{T("freezeDesc")}</div>
        </div>
        <button disabled={!fz || st.frozenToday || (history.length && history[history.length - 1].date === today)} onClick={onFreeze}
          style={{ ...btnBase, background: fz && !st.frozenToday ? C.sky : C.panelHi, color: fz && !st.frozenToday ? C.ink : C.dim, padding: "9px 12px", fontSize: 13, opacity: !fz || st.frozenToday ? 0.6 : 1 }}>
          {st.frozenToday ? T("freezeToday") : T("freezeUse")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        {stats.map(([l, v]) => (
          <div key={l} style={{ ...card, padding: "12px 14px" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 900, color: C.chalk, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={sectionTitle}>{T("ranksTitle")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {Object.keys(RANK_AT).map(id => {
          const b = bestFor(history, id);
          const r = RANKS[rankIdx(id, b)];
          return (
            <button key={id} onClick={() => setHowEx(id)} style={{ ...btnBase, textAlign: "left", background: C.panel, border: `1.5px solid ${r.color}66`, padding: "10px 12px", color: C.chalk }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{EX[id].name}</div>
              <div style={{ fontSize: 13, color: r.color, fontWeight: 700, marginTop: 4 }}>{r.icon} {r.name}<span style={{ color: C.dim, fontWeight: 500 }}>{b !== null ? T("maxBest", { v: `${b}${EX[id].type === "time" ? " s" : ""}` }) : ""}</span></div>
            </button>
          );
        })}
      </div>

      <div style={sectionTitle}>{T("badgesTitle")} <span style={{ fontFamily: BODY, fontSize: 14, color: C.dim, fontWeight: 600 }}>{ach.filter(a => a.ok).length}/{ach.length}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {ach.map(a => (
          <div key={a.k} style={{ ...card, padding: "12px 6px", textAlign: "center", opacity: a.ok ? 1 : 0.45, borderColor: a.ok ? C.signal : C.line }}>
            <div style={{ fontSize: 28, filter: a.ok ? "none" : "grayscale(1)" }}>{a.ok ? a.icon : "🔒"}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.chalk, marginTop: 4 }}>{a.name}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{a.desc}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

// ─── TAB 3: SETTINGS ──────────────────────────────────────────────────────
function Toggle({ on }) {
  return (
    <span aria-hidden="true" style={{ width: 50, height: 28, borderRadius: 99, background: on ? C.mint : C.panelHi, position: "relative", transition: "background .2s", flexShrink: 0, border: `1px solid ${C.line}` }}>
      <span style={{ position: "absolute", top: 2, left: on ? 24 : 2, width: 22, height: 22, borderRadius: 99, background: C.chalk, transition: "left .2s" }} />
    </span>
  );
}
function SettingRow({ title, desc, on, onClick, first }) {
  return (
    <button role="switch" aria-checked={!!on} onClick={onClick}
      style={{ ...btnBase, width: "100%", background: "transparent", color: C.chalk, padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", borderRadius: 0, borderTop: first ? "none" : `1px solid ${C.line}` }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{title}</span>
        {desc && <span style={{ display: "block", fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2, lineHeight: 1.4 }}>{desc}</span>}
      </span>
      <Toggle on={on} />
    </button>
  );
}

// ─── SETTINGS → EXERCISES ───────────────────────────────────────────────────
// Every exercise by type, with its how-to, and a switch for "I can do this one". At least one
// exercise of each type stays on, otherwise that muscle group would drop out of the plan.
function ExercisesPage({ settings, set, history, onBack }) {
  const [howEx, setHowEx] = useState(null);
  const [warn, setWarn] = useState(null); // group index whose last exercise you tried to turn off
  const off = new Set(settings.exOff || []);
  const toggle = id => {
    const g = groupOf(id);
    const n = new Set(off);
    if (n.has(id)) n.delete(id);
    else {
      if (ALT_GROUPS[g].filter(x => !n.has(x)).length <= 1) { setWarn(g); vibrate([60, 40, 60]); return; }
      n.add(id);
    }
    setWarn(null); sfxTap(); set("exOff", [...n]);
  };
  return (
    <div>
      {howEx && <HowTo id={howEx} history={history} onClose={() => setHowEx(null)} />}
      <button onClick={() => { sfxTap(); onBack(); }} style={{ ...ghostBtn, marginTop: 10, padding: "8px 12px" }}>‹ {T("tabSettings")}</button>
      <div style={{ ...sectionTitle, marginTop: 14 }}>{T("exTitle")}</div>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.55 }}>{T("exIntro")}</div>
      {ALT_GROUPS.map((g, gi) => {
        const onN = g.filter(x => !off.has(x)).length;
        return (
          <div key={gi} style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, color: C.chalk }}>{T("grp_" + GROUP_KEYS[gi])}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: onN >= 2 ? C.mint : C.signal, whiteSpace: "nowrap" }}>{T("grpOn", { on: onN, n: g.length })}</div>
            </div>
            {warn === gi && <div role="alert" style={{ fontSize: 13, color: "#ff8a80", fontWeight: 600, marginBottom: 8, lineHeight: 1.45 }}>{T("grpLastLock")}</div>}
            {warn !== gi && onN === 1 && <div style={{ fontSize: 12, color: C.signal, marginBottom: 8, lineHeight: 1.45 }}>{T("grpLast")}</div>}
            <div style={card}>
              {g.map((id, i) => {
                const ex = EX[id];
                const on = !off.has(id);
                const d = dayOfMain(id);
                const sub = d && !on ? effId(id, off) : null;
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", borderTop: i ? `1px solid ${C.line}` : "none", opacity: on ? 1 : 0.72 }}>
                    <button onClick={() => setHowEx(id)} style={{ ...btnBase, flex: 1, minWidth: 0, textAlign: "left", background: "transparent", color: C.chalk, padding: "12px 8px 12px 16px", borderRadius: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{ex.name}</div>
                      <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{ex.muscles}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                        {d && <span style={{ fontSize: 11, fontWeight: 700, color: C.signal, border: `1.5px solid ${C.signal}55`, borderRadius: 99, padding: "1px 8px" }}>{T("dayN", { d })}</span>}
                        {!d && <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, border: `1.5px solid ${C.line}`, borderRadius: 99, padding: "1px 8px" }}>{T("exAlt")}</span>}
                        {ex.tag && <span style={{ fontSize: 11, fontWeight: 700, color: C.sky, border: `1.5px solid ${C.sky}55`, borderRadius: 99, padding: "1px 8px" }}>{T("tag_" + ex.tag)}</span>}
                        <span style={{ fontSize: 11, color: C.dim, padding: "2px 0" }}>{T("exInfo")}</span>
                      </div>
                      {sub && sub !== id && <div style={{ fontSize: 12, color: C.sky, fontWeight: 600, marginTop: 5 }}>{T("exReplacedBy", { d, name: EX[sub].name })}</div>}
                    </button>
                    <button role="switch" aria-checked={on} aria-label={T("exCanDo", { name: ex.name })} onClick={() => toggle(id)}
                      style={{ ...btnBase, background: "transparent", padding: "12px 16px 12px 8px", borderRadius: 0, alignSelf: "stretch", display: "flex", alignItems: "center" }}>
                      <Toggle on={on} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingsTab({ settings, setSettings, history, profile, setProfile, onImport, onResetAll }) {
  const [page, setPage] = useState(null); // null | "exercises"
  const [langOpen, setLangOpen] = useState(false);
  const [resetAll, setResetAll] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);
  const set = (k, v) => { const n = { ...settings, [k]: v }; window._wset = n; setSettings(n); };
  const curLang = settings.lang || detectLang();
  const flip = k => { unlockAudio(); const v = !settings[k]; set(k, v); if (v) { if (k === "sndTap") sfxTap(); else if (k === "sndTimer") soundExercise(); else sfxCheck(); } };

  const exportBackup = () => {
    const data = { app: BACKUP_ID, version: 1, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), history, profile, settings };
    try {
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hw-app-backup-${dateKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setMsg(T("msgBackupSaved")); sfxCheck();
    } catch (_) { setMsg(T("msgBackupFail")); }
  };
  const readBackup = e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (!BACKUP_IDS.includes(d.app) || !Array.isArray(d.history)) throw new Error("bad");
        setPending(d); setMsg("");
      } catch (_) { setMsg(T("msgNotBackup")); }
    };
    fr.readAsText(f);
  };
  const copyAll = async () => {
    const text = history.map(logText).join("\n\n");
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (__) {} document.body.removeChild(t); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const rowBtn = (first) => ({ ...btnBase, width: "100%", background: "transparent", color: C.chalk, padding: "13px 16px", textAlign: "left", borderRadius: 0, borderTop: first ? "none" : `1px solid ${C.line}`, fontSize: 15 });
  const openPage = pg => { sfxTap(); setPage(pg); try { window.scrollTo(0, 0); } catch (_) {} };

  if (page === "exercises") {
    return (
      <div className="scr" key="ex" style={{ padding: "6px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
        <ExercisesPage settings={settings} set={set} history={history} onBack={() => openPage(null)} />
      </div>
    );
  }

  return (
    <div className="scr" key="main" style={{ padding: "6px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
      {resetAll && (
        <Sheet title={T("resetAllTitle")} onClose={() => setResetAll(false)}>
          <div>{T("resetAllBody", { count: TP("workouts", history.length) })}</div>
          <button onClick={exportBackup} className="b3d" style={{ ...bigBtn(C.panelHi, C.chalk), marginTop: 16, fontSize: 15, padding: 14 }}>{T("resetAllBackup")}</button>
          <button onClick={() => { onResetAll(); setResetAll(false); setMsg(T("msgResetAll")); sfxCheck(); }} className="b3d"
            style={{ ...bigBtn("#c62828", "#fff"), marginTop: 10, fontSize: 15, padding: 14, "--e": "#7f1414" }}>{T("resetAllYes")}</button>
          <button onClick={() => setResetAll(false)} style={{ ...ghostBtn, width: "100%", marginTop: 10, padding: 12 }}>{T("cancel")}</button>
          {msg && <div role="status" style={{ fontSize: 13, color: msg.startsWith("✓") ? C.mint : C.dim, marginTop: 10 }}>{msg}</div>}
        </Sheet>
      )}
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={readBackup} style={{ display: "none" }} />

      <div style={sectionTitle}>{T("language")}</div>
      {/* One row with the current language; the full list opens in a scrollable sheet, so more languages fit later. */}
      {(() => { const cur = LANGS.find(l => l.code === curLang) || LANGS[0]; return (
        <button onClick={() => { sfxTap(); setLangOpen(true); }} aria-haspopup="dialog" aria-label={`${T("language")}: ${cur.name}`}
          style={{ ...btnBase, ...card, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", textAlign: "left", fontSize: 16, color: C.chalk }}>
          <span aria-hidden="true" style={{ fontSize: 22 }}>{cur.flag}</span>
          <span style={{ flex: 1 }}>{cur.name}</span>
          <span aria-hidden="true" style={{ color: C.dim, fontSize: 20 }}>›</span>
        </button>
      ); })()}
      {langOpen && (
        <Sheet title={T("language")} onClose={() => setLangOpen(false)}>
          <div role="listbox" aria-label={T("language")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LANGS.map(l => {
              const on = curLang === l.code;
              return (
                <button key={l.code} lang={l.code} role="option" aria-selected={on} onClick={() => { sfxTap(); set("lang", l.code); setLangOpen(false); }}
                  style={{ ...btnBase, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textAlign: "left", fontSize: 16, background: on ? C.panelHi : "transparent", color: on ? C.chalk : "#cdd6f0", border: `1.5px solid ${on ? C.signal : C.line}` }}>
                  <span aria-hidden="true" style={{ fontSize: 22 }}>{l.flag}</span>
                  <span style={{ flex: 1 }}>{l.name}</span>
                  {on && <span style={{ color: C.signal }}>✓</span>}
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      <div style={sectionTitle}>{T("appearance")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {Object.entries(THEMES).map(([id, t]) => (
          <button key={id} onClick={() => { sfxTap(); set("theme", id); }} aria-pressed={settings.theme === id}
            style={{ ...btnBase, background: t.ink, border: `2px solid ${settings.theme === id ? C.signal : t.line}`, padding: 10, textAlign: "left", color: t.chalk }}>
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: t.panel, border: `1px solid ${t.line}` }} />
              <span style={{ width: 22, height: 22, borderRadius: 7, background: C.signal }} />
              <span style={{ width: 22, height: 22, borderRadius: 7, background: C.mint }} />
              <span style={{ width: 22, height: 22, borderRadius: 7, background: C.sky }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{L.themes[id]}{settings.theme === id ? " ✓" : ""}</div>
          </button>
        ))}
      </div>

      <div style={sectionTitle}>{T("sounds")}</div>
      <div style={card}>
        <SettingRow first title={T("sndTap")} desc={T("sndTapD")} on={settings.sndTap} onClick={() => flip("sndTap")} />
        <SettingRow title={T("sndFx")} desc={T("sndFxD")} on={settings.sndFx} onClick={() => flip("sndFx")} />
        <SettingRow title={T("sndTimer")} desc={T("sndTimerD")} on={settings.sndTimer} onClick={() => flip("sndTimer")} />
        <div style={{ padding: "13px 16px", borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.chalk }}>{T("volume")}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[["low", T("volLow")], ["mid", T("volMid")], ["high", T("volHigh")]].map(([id, l]) => (
              <button key={id} onClick={() => { unlockAudio(); set("volume", id); sfxCheck(); }} aria-pressed={settings.volume === id}
                style={{ ...btnBase, flex: 1, padding: "9px 4px", fontSize: 13, background: settings.volume === id ? C.chalk : "transparent", color: settings.volume === id ? C.ink : C.dim, border: `1.5px solid ${settings.volume === id ? C.chalk : C.line}` }}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{T("volHint")}</div>
        </div>
      </div>

      <div style={sectionTitle}>{T("trainingSettings")}</div>
      <div style={card}>
        <button onClick={() => openPage("exercises")} style={{ ...rowBtn(true), display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1 }}>
            {T("exMenu")}
            <span style={{ display: "block", fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{T("exMenuD")}</span>
          </span>
          <span aria-hidden="true" style={{ color: C.dim, fontSize: 20 }}>›</span>
        </button>
        <SettingRow title={T("vibrate")} desc={`${T("vibrateD")} ${T("vibrateHint")}`} on={settings.vibrate} onClick={() => { set("vibrate", !settings.vibrate); if (!settings.vibrate) { try { navigator.vibrate?.(120); } catch (_) {} } }} />
        <SettingRow title={T("keepAwake")} desc={T("keepAwakeD")} on={settings.keepAwake} onClick={() => set("keepAwake", !settings.keepAwake)} />
        <SettingRow title={T("aiCopy")} desc={T("aiCopyD")} on={settings.aiCopy} onClick={() => set("aiCopy", !settings.aiCopy)} />
      </div>

      <div style={sectionTitle}>{T("dataBackup")}</div>
      <div style={card}>
        <button onClick={exportBackup} style={rowBtn(true)}>
          {T("backupSave")}
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{T("backupSaveD")}</div>
        </button>
        <button onClick={() => fileRef.current && fileRef.current.click()} style={rowBtn(false)}>
          {T("backupLoad")}
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{T("backupLoadD")}</div>
        </button>
        {pending && (
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.line}`, background: `${C.signal}14` }}>
            <div style={{ fontSize: 14, color: C.chalk, fontWeight: 600 }}>{T("backupFrom", { date: pending.exportedAt ? fmtDate(dateKey(new Date(pending.exportedAt)), true) : T("unknownDate"), count: TP("workouts", pending.history.length) })}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { onImport(pending); setPending(null); setMsg(T("msgRestored")); sfxCheck(); }} className="b3d" style={{ ...btnBase, background: C.signal, color: C.signalInk, padding: "9px 14px", "--e": EDGE[C.signal] }}>{T("yesRestore")}</button>
              <button onClick={() => setPending(null)} style={{ ...ghostBtn, padding: "9px 14px" }}>{T("cancel")}</button>
            </div>
          </div>
        )}
        {settings.aiCopy && (
          <button onClick={copyAll} style={rowBtn(false)}>{copied ? T("copied") : T("copyAllAI")}</button>
        )}
        <button onClick={() => {
            if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
            setProfile({ ...profile, streakResetTs: Date.now(), freezeDays: profile.freezeDays || [] }); setConfirmReset(false); setMsg(T("msgStreakReset"));
          }}
          style={{ ...rowBtn(false), color: confirmReset ? "#ff8a80" : C.chalk }}>
          {confirmReset ? T("resetStreakConfirm") : T("resetStreak")}
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{T("resetStreakD")}</div>
        </button>
        <button onClick={() => { sfxTap(); setMsg(""); setResetAll(true); }} style={{ ...rowBtn(false), color: "#ff8a80" }}>
          {T("resetAll")}
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{T("resetAllD")}</div>
        </button>
      </div>
      {msg && <div role="status" style={{ fontSize: 13, color: msg.startsWith("✓") ? C.mint : C.dim, marginTop: 8 }}>{msg}</div>}

      <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginTop: 26, lineHeight: 1.6, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Logo size={44} />
        <div>{T("about", { v: APP_VERSION })}<br />{T("privacy")}</div>
      </div>
    </div>
  );
}

// ─── SESSION: WARM-UP ───────────────────────────────────────────────────────
function Warmup({ done, setDone, onNext }) {
  const count = done.filter(Boolean).length;
  return (
    <div>
      <div style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 900, lineHeight: 0.95, color: C.chalk }}>{T("warmup")}</div>
      <div style={{ fontSize: 14, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>{T("warmupHint")}</div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {WARMUP.map((w, i) => (
          <div key={w.id} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
            <button onClick={() => { const n = [...done]; n[i] = !n[i]; if (n[i]) sfxCheck(); setDone(n); }} aria-pressed={!!done[i]}
              style={{ ...btnBase, flex: 1, textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: "14px 15px",
                background: done[i] ? "#173f3a" : C.panel, border: `1.5px solid ${done[i] ? C.mint : C.line}`, color: C.chalk }}>
              <div key={done[i] ? "on" : "off"} className={done[i] ? "pop" : ""} style={{ width: 30, height: 30, borderRadius: 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${done[i] ? C.mint : C.dim}`, background: done[i] ? C.mint : "transparent", color: C.ink, fontSize: 16, fontWeight: 900 }}>{done[i] ? "✓" : ""}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{w.name}</div>
                <div style={{ fontSize: 13, color: C.signal, fontWeight: 600, marginTop: 1 }}>{w.dose}</div>
                <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{w.why}</div>
              </div>
            </button>
            <button onClick={() => openYT(w.yt)} aria-label={T("videoOf", { name: w.name })} style={{ ...btnBase, background: C.panel, border: `1.5px solid ${C.line}`, color: C.dim, padding: "0 13px", fontSize: 14 }}>▶</button>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="b3d" style={{ ...bigBtn(count === WARMUP.length ? C.signal : C.panelHi, count === WARMUP.length ? C.signalInk : C.chalk), marginTop: 18 }}>
        {count === WARMUP.length ? T("letsGo") : T("skipWarmup")}
      </button>
    </div>
  );
}

// ─── SESSION: WORK ──────────────────────────────────────────────────────────
function SwapSheet({ item, exclude, history, onPick, onClose }) {
  const opts = altsFor(item.slot, exclude).filter(id => id !== item.base);
  return (
    <Sheet title={T("swapTitle")} onClose={onClose}>
      <div style={{ fontSize: 14, color: C.dim, marginBottom: 12 }}>{T("swapHint", { name: EX[item.id].name })}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {item.base !== item.id && (
          <button onClick={() => onPick(item.base)} style={{ ...btnBase, textAlign: "left", background: C.panelHi, color: C.chalk, padding: "12px 14px", border: `1.5px solid ${C.line}` }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{T("swapBack", { name: EX[item.base].name })}</div>
          </button>
        )}
        {opts.map(id => {
          const ex = EX[id]; const l = lastFor(history, id);
          return (
            <button key={id} onClick={() => onPick(id)} style={{ ...btnBase, textAlign: "left", background: C.panelHi, color: C.chalk, padding: "12px 14px", border: `1.5px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{ex.muscles}{l ? T("lastShort", { v: l.res.map(r => fmtRes(r, "")).join("/") }) : ""}</div>
              </div>
              {ex.tag && <span style={{ fontSize: 11, fontWeight: 700, color: C.sky, border: `1.5px solid ${C.sky}55`, borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap" }}>{T("tag_" + ex.tag)}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function Work({ item, rounds, history, sessionResults, onRecord, onSwap, exclude }) {
  const [swap, setSwap] = useState(false);
  const ex = EX[item.id];
  const last = lastFor(history, item.id);
  const isLastRound = item.r === rounds - 1;
  const [how, setHow] = useState(false);

  const thisSession = (sessionResults && sessionResults[item.id]) || [];
  const initReps = () => {
    const v0 = last ? last.res[item.r] : undefined;
    if (typeof v0 === "number") return v0;
    // No number for this round from last time: use what you did in the previous round today.
    const prev = thisSession[item.r - 1];
    if (typeof prev === "number") return prev;
    if (!last) return ex.start;
    const v = last.res[item.r];
    if (typeof v === "number") return v;
    const first = last.res.find(x => typeof x === "number");
    return typeof first === "number" ? first : ex.start;
  };
  const [reps, setReps] = useState(initReps);

  const initDur = () => {
    if (ex.type !== "time") return 0;
    const v = last ? parseInt(last.res[item.r] ?? last.res[0], 10) : NaN;
    return ex.durs.includes(v) ? v : ex.dur;
  };
  const [dur, setDur] = useState(initDur);
  const [ph, setPh] = useState("ready"); // ready | prep | hold
  const [endAt, setEndAt] = useState(null);

  const left = useCountdown(endAt,
    () => {
      if (ph === "prep") { soundExercise(); setPh("hold"); setEndAt(Date.now() + dur * 1000); }
      else if (ph === "hold") { soundExercise(); vibrate([250]); setEndAt(null); onRecord(`${dur}s`); }
    },
    () => { if (ph === "prep") soundPrepEnd(); }
  );

  const startHold = () => { unlockAudio(); setPh("prep"); setEndAt(Date.now() + 5000); };
  const stopHold = () => {
    unlockAudio();
    if (ph === "prep") { setPh("ready"); setEndAt(null); return; }
    const held = Math.max(1, dur - left);
    setEndAt(null);
    onRecord(`${held}s`);
  };

  const best = bestFor(history, item.id);
  const lvl = levelUpFor(history, item.id);
  const lastLine = last ? T("lastLine", { date: fmtDate(last.date), res: last.res.map(r => fmtRes(r, ex.unit)).join(" / ") }) : T("newExHint");

  return (
    <div>
      {how && <HowTo id={item.id} history={history} onClose={() => setHow(false)} />}
      {swap && <SwapSheet item={item} exclude={exclude || []} history={history} onClose={() => setSwap(false)} onPick={id => { setSwap(false); sfxCheck(); onSwap(item.slot, id); }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: fitSize(ex.name, 46), fontWeight: 900, lineHeight: 0.95, color: C.chalk, flex: 1, minWidth: 0, hyphens: "auto", overflowWrap: "break-word" }}>{ex.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setHow(true)} style={{ ...ghostBtn, padding: "8px 12px", whiteSpace: "nowrap" }}>{T("howTo")}</button>
          {onSwap && ph === "ready" && <button onClick={() => { sfxTap(); setSwap(true); }} style={{ ...ghostBtn, padding: "8px 12px", color: C.sky, borderColor: `${C.sky}88`, whiteSpace: "nowrap" }}>{T("swap")}</button>}
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>{ex.muscles}{ex.tempo ? `. ${T("tempo")}: ${ex.tempo}` : ""}</div>
      <div style={{ fontSize: 13, color: C.chalk, marginTop: 6 }}>{lastLine}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <RankBadge id={item.id} best={best} />
        {RANK_AT[item.id] && (() => { const n = rankNext(item.id, best); return n ? <span style={{ fontSize: 12, color: C.dim }}>{n.rank.icon} {T("rankFrom", { rank: n.rank.name, v: `${n.at}${ex.type === "time" ? " s" : ""}` })}</span> : <span style={{ fontSize: 12, color: C.dim }}>{T("topRank")}</span>; })()}
        {item.slot !== item.id && <span style={{ fontSize: 12, color: C.sky }}>{T("replacing", { name: EX[item.slot].name })}</span>}
      </div>
      {lvl && item.r === 0 && (
        <div style={{ marginTop: 12, border: `1.5px solid ${C.signal}`, borderRadius: 14, padding: "10px 13px", fontSize: 13, color: C.chalk, lineHeight: 1.5 }}>
          <b style={{ color: C.signal }}>{T("lvlTitle")}</b> {T("lvlBody")} {lvl}
        </div>
      )}
      {isLastRound && (
        <div style={{ marginTop: 10, fontSize: 13, color: C.signal, fontWeight: 600 }}>{T("lastRound")}</div>
      )}

      {ex.type === "reps" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 26 }}>
            <button className="b3d" onClick={() => { sfxTap(); setReps(Math.max(0, reps - 1)); }} aria-label={T("less")} style={{ ...btnBase, width: 64, height: 64, borderRadius: 99, background: C.panelHi, color: C.chalk, fontSize: 32, "--e": "#0a1734" }}>−</button>
            <div style={{ textAlign: "center", minWidth: 120 }}>
              <div key={reps} className="bump" style={{ fontFamily: DISPLAY, fontSize: 132, fontWeight: 900, lineHeight: 0.85, color: best !== null && reps > best ? C.signal : C.chalk }}>{reps}</div>
              <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{T("reps")}{ex.unit ? ` ${perUnit(ex.unit)}` : ""}</div>
              <div style={{ height: 22, marginTop: 4, fontSize: 14, fontWeight: 800, color: C.signal }}>{best !== null && reps > best ? <span className="pop" style={{ display: "inline-block" }}>{rankIdx(item.id, reps) > rankIdx(item.id, best) ? `${RANKS[rankIdx(item.id, reps)].icon} ${T("newRank", { rank: RANKS[rankIdx(item.id, reps)].name })}` : T("pr")}</span> : ""}</div>
            </div>
            <button className="b3d" onClick={() => { const n = reps + 1; if (best !== null && n === best + 1) sfxRecord(); else sfxTap(); setReps(n); }} aria-label={T("more")} style={{ ...btnBase, width: 64, height: 64, borderRadius: 99, background: C.panelHi, color: C.chalk, fontSize: 32, "--e": "#0a1734" }}>+</button>
          </div>
          <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginTop: 10 }}>{last ? T("numFromLast") : T("numGuess")} {T("adjust")}</div>
          <button onClick={() => { unlockAudio(); onRecord(reps); }} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 22, fontSize: 18, padding: 19 }}>
            {T("doneBtn", { v: `${reps}${unitStr(ex.unit)}` })}
          </button>
        </>
      )}

      {ex.type === "time" && (
        <>
          {ph === "ready" && (
            <>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
                {ex.durs.map(d => (
                  <button key={d} onClick={() => setDur(d)} style={{ ...btnBase, padding: "10px 14px", fontSize: 15, background: dur === d ? C.chalk : "transparent", color: dur === d ? C.ink : C.dim, border: `1.5px solid ${dur === d ? C.chalk : C.line}` }}>{d} s</button>
                ))}
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 132, fontWeight: 900, lineHeight: 0.85, color: C.chalk, textAlign: "center", marginTop: 20 }}>{dur}</div>
              <div style={{ fontSize: 13, color: C.dim, textAlign: "center", marginTop: 4 }}>{T("secondsHint")}</div>
              <button onClick={startHold} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 22, fontSize: 18, padding: 19 }}>{T("start")}</button>
            </>
          )}
          {ph === "prep" && (
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Ring value={left} total={5} size={230} color={C.signal}>
                <div style={{ fontFamily: DISPLAY, fontSize: 110, fontWeight: 900, lineHeight: 0.85, color: C.signal }}>{left}</div>
                <div style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>{T("getReady")}</div>
              </Ring>
              <button onClick={stopHold} style={{ ...ghostBtn, marginTop: 18 }}>{T("cancel")}</button>
            </div>
          )}
          {ph === "hold" && (
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Ring value={left} total={dur} size={230} color={C.chalk}>
                <div style={{ fontFamily: DISPLAY, fontSize: 110, fontWeight: 900, lineHeight: 0.85, color: C.chalk }}>{left}</div>
                <div style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>{T("hold")}</div>
              </Ring>
              <button onClick={stopHold} style={{ ...ghostBtn, marginTop: 18 }}>{T("giveUp")}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SESSION: REST ──────────────────────────────────────────────────────────
function Rest({ rest, nextItem, rounds, onEnd, onAdd }) {
  const left = useCountdown(rest.endAt, () => { soundRest(); vibrate([250]); onEnd(); }, s => { if (s <= 3) soundPrepEnd(); });
  const ex = EX[nextItem.id];
  const newRound = !!rest.newRound;
  return (
    <div style={{ textAlign: "center", paddingTop: 10 }}>
      {rest.pr && <Confetti count={55} />}
      <div className="pop" style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1, color: rest.pr ? C.signal : C.chalk }}>{rest.cheer || T("cheerDefault")}</div>
      <div style={{ fontSize: 14, color: C.sky, fontWeight: 700, marginTop: 6 }}>{newRound ? T("roundDone", { r: nextItem.r + 1, n: rounds }) : T("rest")}</div>
      <div style={{ marginTop: 18 }}>
        <Ring value={left} total={rest.total} size={250} color={C.sky}>
          <div className={left <= 3 && left > 0 ? "pulse" : ""} style={{ fontFamily: DISPLAY, fontSize: 124, fontWeight: 900, lineHeight: 0.85, color: left <= 3 ? C.signal : C.chalk }}>{left}</div>
        </Ring>
      </div>
      <div style={{ marginTop: 22, fontSize: 13, color: C.dim }}>{T("next")}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 800, color: C.chalk, lineHeight: 1.05 }}>{ex.name}</div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{T("prepare")}</div>
      {(rest.tip || rest.moti) && (
        <div style={{ marginTop: 18, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "12px 14px", textAlign: "left" }}>
          {rest.tip && <div style={{ fontSize: 14, color: C.sky, fontWeight: 600, lineHeight: 1.45 }}>💡 {rest.tip}</div>}
          {rest.moti && <div style={{ fontSize: 16, color: C.chalk, fontWeight: 800, marginTop: 6 }}>{rest.moti}</div>}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button onClick={onAdd} style={{ ...ghostBtn, flex: 1, padding: 14, fontSize: 14 }}>+15 s</button>
        <button onClick={() => { unlockAudio(); onEnd(); }} style={{ ...btnBase, flex: 2, padding: 14, fontSize: 15, background: C.panelHi, color: C.chalk }}>{T("ready")}</button>
      </div>
    </div>
  );
}

// ─── SESSION: COOL-DOWN (optional) ──────────────────────────────────────────
function CoolItem({ def, done, onDone }) {
  const [ph, setPh] = useState("idle"); // idle | prep | hold
  const [endAt, setEndAt] = useState(null);
  const [open, setOpen] = useState(false);
  const left = useCountdown(endAt,
    () => {
      if (ph === "prep") { soundExercise(); setPh("hold"); setEndAt(Date.now() + def.dur * 1000); }
      else if (ph === "hold") { soundExercise(); vibrate([250]); setPh("idle"); setEndAt(null); onDone(); }
    },
    () => { if (ph === "prep") soundPrepEnd(); }
  );
  const start = () => { unlockAudio(); setPh("prep"); setEndAt(Date.now() + 3000); };
  const stop = () => { setPh("idle"); setEndAt(null); if (ph === "hold") onDone(); };

  return (
    <div style={{ background: done ? "#173f3a" : C.panel, border: `1.5px solid ${done ? C.mint : ph !== "idle" ? C.sky : C.line}`, borderRadius: 16, padding: "14px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.chalk }}>{def.name}</div>
          <div style={{ fontSize: 13, color: ph === "prep" ? C.signal : C.dim, marginTop: 2 }}>
            {done ? T("coolDone") : ph === "prep" ? T("coolPrep", { n: left }) : ph === "hold" ? T("coolHold", { n: left }) : `${def.dur} s`}
          </div>
        </div>
        {ph === "idle" && !done && <button onClick={start} style={{ ...btnBase, background: C.sky, color: C.ink, padding: "10px 16px", fontSize: 14 }}>{T("start")}</button>}
        {ph !== "idle" && <button onClick={stop} style={{ ...ghostBtn, padding: "8px 12px" }}>{T("stop")}</button>}
        {done && ph === "idle" && <span style={{ color: C.mint, fontSize: 22, fontWeight: 900 }}>✓</span>}
      </div>
      <div style={{ fontSize: 13, color: "#cdd6f0", marginTop: 8, lineHeight: 1.55 }}>{def.why}</div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ ...btnBase, background: "transparent", color: C.dim, fontSize: 12, padding: "8px 0 0", fontWeight: 600 }}>{open ? T("hideHowTo") : T("showHowTo")}</button>
      {open && (
        <div style={{ fontSize: 13, color: "#cdd6f0", lineHeight: 1.55, marginTop: 6 }}>
          {def.fig && <ExFigure id={def.fig} />}
          {def.how}
          <button onClick={() => openYT(def.yt)} style={{ ...btnBase, display: "block", marginTop: 8, background: "transparent", color: C.sky, fontSize: 13, padding: 0 }}>{T("video")}</button>
        </div>
      )}
    </div>
  );
}

function Cool({ onFinish }) {
  const [done, setDone] = useState(COOL.map(() => false));
  return (
    <div>
      <div style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 900, lineHeight: 0.95, color: C.chalk }}>{T("coolTitle")}</div>
      <div style={{ fontSize: 14, color: C.dim, marginTop: 10, lineHeight: 1.55 }}>
        {T("coolIntro")}
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {COOL.map((c, i) => <CoolItem key={c.id} def={c} done={done[i]} onDone={() => setDone(d => d.map((v, j) => (j === i ? true : v)))} />)}
      </div>
      <button onClick={() => onFinish(done.some(Boolean))} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 18 }}>
        {done.some(Boolean) ? T("saveWorkout") : T("skipSave")}
      </button>
    </div>
  );
}

// ─── SESSION: SUMMARY ───────────────────────────────────────────────────────
function Summary({ entry, xpBefore = 0, xpGained, newCh = [], history, onClose }) {
  const [copied, setCopied] = useState(false);
  const gained = entry ? (xpGained ?? xpFor(entry)) : 0;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!gained) return;
    let raf;
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 1300);
      setShown(Math.round(gained * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gained]);
  const lvNow = levelInfo(xpBefore + shown);
  const leveledUp = levelInfo(xpBefore + gained).lvl > levelInfo(xpBefore).lvl;
  const st = entry ? streakInfo(history, entry.date) : { n: 0 };
  const [finishLine] = useState(() => pick(L.finish));
  const text = entry ? logText(entry) : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (__) {} document.body.removeChild(t); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };
  if (!entry) {
    return (
      <div>
        <div style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 900, color: C.chalk }}>{T("nothingSaved")}</div>
        <div style={{ fontSize: 14, color: C.dim, marginTop: 8 }}>{T("nothingSavedD")}</div>
        <button onClick={onClose} className="b3d" style={{ ...bigBtn(C.panelHi, C.chalk), marginTop: 18 }}>{T("home")}</button>
      </div>
    );
  }
  return (
    <div>
      <Confetti />
      <div className="pop" style={{ fontFamily: DISPLAY, fontSize: 60, fontWeight: 900, lineHeight: 0.95, color: C.mint }}>{T("great")}</div>
      <div style={{ fontSize: 16, color: C.chalk, marginTop: 8, fontWeight: 600, lineHeight: 1.4 }}>{finishLine}</div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{T("dayDate", { d: entry.day, date: fmtDate(entry.date, true) })}</div>
      <div style={{ marginTop: 16, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 900, lineHeight: 1, color: C.sky }}>+{shown} XP</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 800, color: "#ffa94d" }}>🔥 {st.n}</div>
        </div>
        <div style={{ height: 14, background: C.panelHi, borderRadius: 99, marginTop: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(lvNow.into / lvNow.need) * 100}%`, background: C.sky, borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>{T("levelLine", { lvl: lvNow.lvl, into: lvNow.into, need: lvNow.need, streak: TP("workouts", st.n) })}</div>
        {leveledUp && shown === gained && (
          <div className="pop" style={{ marginTop: 10, fontFamily: DISPLAY, fontSize: 28, fontWeight: 900, color: C.signal, transformOrigin: "left center" }}>{T("levelUp", { lvl: lvNow.lvl })}</div>
        )}
      </div>
      {newCh.length > 0 && (
        <div className="pop" style={{ marginTop: 14, background: "#173f3a", border: `2px solid ${C.mint}`, borderRadius: 16, padding: "12px 16px" }}>
          {newCh.map(c => (
            <div key={c.id} style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: C.mint, lineHeight: 1.2 }}>{T("challengeDone", { text: L.ch[c.id] })} <span style={{ color: C.sky }}>+{c.xp} XP</span></div>
          ))}
        </div>
      )}
      {entry.rankUps && entry.rankUps.length > 0 && (
        <div className="pop" style={{ marginTop: 14, border: `2px solid ${C.signal}`, borderRadius: 16, padding: "12px 16px" }}>
          {entry.rankUps.map(ru => (
            <div key={ru.id} style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 900, color: RANKS[ru.to].color, lineHeight: 1.15 }}>{RANKS[ru.to].icon} {EX[ru.id] ? EX[ru.id].name : ru.id}: {RANKS[ru.to].name}</div>
          ))}
        </div>
      )}
      {entry.prs && entry.prs.length > 0 && (
        <div className="pop" style={{ marginTop: 14, background: C.signal, color: C.signalInk, borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 900, lineHeight: 1 }}>🏆 {TP("prs", entry.prs.length)}</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{entry.items.filter(it => entry.prs.includes(it.id)).map(exName).join(", ")}</div>
        </div>
      )}
      <div style={{ marginTop: 16, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18 }}>
        {entry.items.map((it, i) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "13px 16px", borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.chalk }}>{entry.prs && entry.prs.includes(it.id) ? "🏆 " : ""}{exName(it)}</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 800, color: C.chalk, whiteSpace: "nowrap" }}>{it.res.map(r => fmtRes(r, "")).join(" / ")}<span style={{ fontFamily: BODY, fontSize: 11, color: C.dim, marginLeft: 4 }}>{unitStr(it.unit)}</span></div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: C.dim, marginTop: 14, lineHeight: 1.5 }}>{T("nextLine", { d: DAYS[(DAYS.findIndex(d => d.id === entry.day) + 1) % DAYS.length].id, date: fmtDate(addDays(entry.date, 2)) })}</div>
      {setting("aiCopy") && <button onClick={copy} className="b3d" style={{ ...bigBtn(copied ? C.mint : C.chalk, C.ink), marginTop: 16 }}>{copied ? T("copied") : T("copyAI")}</button>}
      <button onClick={onClose} className="b3d" style={{ ...bigBtn("transparent", C.dim), marginTop: 8, border: `1.5px solid ${C.line}` }}>{T("home")}</button>
    </div>
  );
}

// ─── SESSION SHELL ──────────────────────────────────────────────────────────
function Session({ session, setSession, history, onSave, onClose }) {
  useWakeLock();
  const [confirmQuit, setConfirmQuit] = useState(false);
  const swaps = session.swaps || {};
  const day = DAYS.find(d => d.id === session.day);
  // Exercises fixed at the start (older saved sessions don't have them: work them out now).
  const base = session.base || Object.fromEntries(day.ids.map(slot => [slot, effId(slot)]));
  const seq = buildSeq(session.day, session.rounds, swaps, base);
  const doSwap = (slot, id) => setSession({ ...session, swaps: { ...swaps, [slot]: id === base[slot] ? undefined : id } });
  const usedIds = day.ids.map(slot => swaps[slot] || base[slot]);
  const hasResults = Object.values(session.results).some(a => a && a.some(v => v !== null && v !== undefined));

  const finish = (coolDone = false) => {
    const ids = [...new Set(day.ids.flatMap(slot => [slot, base[slot], swaps[slot]].filter(Boolean)))];
    const items = ids
      .map(id => ({ id, name: EX[id].name, unit: EX[id].unit, res: Array.from({ length: session.rounds }, (_, r) => { const v = (session.results[id] || [])[r]; return v === undefined ? null : v; }) }))
      .filter(it => it.res.some(v => v !== null));
    const prs = items.filter(it => {
      const b = bestFor(history, it.id);
      const top = Math.max(...it.res.map(numVal).filter(n => !isNaN(n)));
      return b !== null && top > b;
    }).map(it => it.id);
    const rankUps = items.map(it => {
      const from = rankIdx(it.id, bestFor(history, it.id));
      const to = rankIdx(it.id, Math.max(...it.res.map(numVal).filter(n => !isNaN(n))));
      return to > from ? { id: it.id, to } : null;
    }).filter(Boolean);
    const entry = items.length ? { date: dateKey(), ts: Date.now(), day: session.day, rounds: session.rounds, items, prs, rankUps, warm: session.warm.every(Boolean), cool: !!coolDone } : null;
    const xpBefore = totalXP(history);
    let xpGained = 0, newCh = [];
    if (entry) {
      const after = [...history, entry];
      xpGained = totalXP(after) - xpBefore;
      const wk = weekKey(entry.date);
      const beforeDone = new Set(challengeStatus(history, wk).filter(c => c.done).map(c => c.id));
      newCh = challengeStatus(after, wk).filter(c => c.done && !beforeDone.has(c.id));
    }
    if (entry) {
      onSave(entry);
      const up = levelInfo(xpBefore + xpGained).lvl > levelInfo(xpBefore).lvl;
      if (up) sfxLevel(); else sfxFinish();
      vibrate(prs.length || up ? [120, 60, 120, 60, 260] : [200]);
    }
    setSession({ ...session, phase: "summary", entry, xpBefore, xpGained, newCh, rest: null });
  };

  const record = (val) => {
    const it = seq[session.pos];
    const arr = [...(session.results[it.id] || [])];
    arr[it.r] = val;
    const results = { ...session.results, [it.id]: arr };
    if (session.pos >= seq.length - 1) {
      sfxSet();
      setSession({ ...session, results, phase: "cool", rest: null });
      return;
    }
    const next = seq[session.pos + 1];
    const secs = next.r !== it.r ? REST_ROUND : REST_BETWEEN;
    const prevBest = Math.max(bestFor(history, it.id) ?? -Infinity, ...(session.results[it.id] || []).map(numVal).filter(n => !isNaN(n)));
    const pr = bestFor(history, it.id) !== null && numVal(val) > prevBest;
    const oldBest = isFinite(prevBest) ? prevBest : null;
    const newRank = rankIdx(it.id, numVal(val));
    const rankUp = (pr || oldBest === null) && newRank > rankIdx(it.id, oldBest);
    const cheer = rankUp ? `${RANKS[newRank].icon} ${T("newRank", { rank: RANKS[newRank].name })}` : pr ? T("newPR") : pick(L.cheers);
    if (rankUp) { sfxLevel(); vibrate([120, 60, 120, 60, 260]); } else if (pr) { sfxRecord(); vibrate([80, 40, 80]); } else sfxSet();
    setSession({ ...session, results, phase: "rest", rest: { endAt: Date.now() + secs * 1000, total: secs, nextPos: session.pos + 1, newRound: next.r !== it.r, pr, cheer, tip: pick(L.facts), moti: pick(L.moti) } });
  };

  const goBack = () => {
    if (session.phase === "rest") setSession({ ...session, phase: "work", rest: null });
    else if (session.phase === "work" && session.pos > 0) setSession({ ...session, pos: session.pos - 1 });
    else if (session.phase === "work" && session.pos === 0) setSession({ ...session, phase: "warmup" });
  };

  const inFlow = session.phase === "work" || session.phase === "rest";
  const cur = seq[Math.min(session.pos, seq.length - 1)];
  const doneCount = session.phase === "cool" || session.phase === "summary" ? seq.length : session.phase === "rest" ? session.pos + 1 : session.phase === "work" ? session.pos : 0;

  return (
    <div style={{ padding: "16px 18px 40px", maxWidth: 460, margin: "0 auto" }}>
      {session.phase !== "summary" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 14, color: C.dim, fontWeight: 600 }}>
              {inFlow ? T("dayRound", { d: session.day, r: cur.r + 1, n: session.rounds }) : T("dayN", { d: session.day })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {inFlow && <button onClick={goBack} style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12 }}>{T("back")}</button>}
              <button onClick={() => { if (!confirmQuit) { setConfirmQuit(true); setTimeout(() => setConfirmQuit(false), 3000); return; } if (hasResults) finish(); else onClose(); }}
                style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12, color: confirmQuit ? "#ff8a80" : C.dim, borderColor: confirmQuit ? "#ff8a80" : C.line }}>
                {confirmQuit ? (hasResults ? T("quitSave") : T("quitConfirm")) : T("quit")}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 12, marginBottom: 22 }} aria-label={T("progressAria", { done: doneCount, total: seq.length })}>
            {seq.map((s, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i < doneCount ? C.mint : inFlow && i === session.pos ? C.signal : C.panelHi, marginLeft: i > 0 && s.r !== seq[i - 1].r ? 6 : 0 }} />
            ))}
          </div>
        </>
      )}

      <div key={`${session.phase}-${session.pos}`} className="scr">
      {session.phase === "warmup" && (
        <Warmup done={session.warm} setDone={w => setSession({ ...session, warm: w })} onNext={() => { unlockAudio(); setSession({ ...session, phase: "work", pos: 0 }); }} />
      )}
      {session.phase === "work" && (
        <Work key={`${session.pos}-${seq[session.pos].id}`} item={seq[session.pos]} rounds={session.rounds} history={history} sessionResults={session.results} onRecord={record} onSwap={doSwap} exclude={usedIds} />
      )}
      {session.phase === "rest" && session.rest && (
        <Rest key={session.rest.nextPos} rest={session.rest} nextItem={seq[session.rest.nextPos]} rounds={session.rounds}
          onEnd={() => setSession(s => (s.phase === "rest" && s.rest ? { ...s, phase: "work", pos: s.rest.nextPos, rest: null } : s))}
          onAdd={() => setSession(s => (s.rest ? { ...s, rest: { ...s.rest, endAt: s.rest.endAt + 15000, total: s.rest.total + 15 } } : s))} />
      )}
      {session.phase === "cool" && <Cool onFinish={finish} />}
      {session.phase === "summary" && <Summary entry={session.entry} xpBefore={session.xpBefore || 0} xpGained={session.xpGained} newCh={session.newCh || []} history={history} onClose={onClose} />}
      </div>
    </div>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  useFonts();
  const [history, setHistory] = useState(SEED_HISTORY);
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [tab, setTab] = useState("train");
  const [profile, setProfileState] = useState({ name: "User", pfp: null, freezeDays: [], streakResetTs: 0 });
  const [ui, setUiState] = useState({});
  const setUi = u => { setUiState(u); saveUi(u); };
  // Every change to past workouts keeps the history sorted and records/rank-ups correct.
  const editHistory = fn => setHistory(h => recomputeFlags(sortHistory(fn(h))));
  META = { freezeDays: profile.freezeDays || [], streakResetTs: profile.streakResetTs || 0 };
  window._wset = settings;
  applyTheme(settings.theme);
  applyLang(settings.lang || detectLang());
  const setSettings = n => { setSettingsState(n); saveSettings(n); };
  useEffect(() => { loadProfile().then(p => { if (p) setProfileState(prev => ({ ...prev, ...p })); }); }, []);
  const setProfile = p => { setProfileState(p); saveProfile(p); };
  const applyFreeze = () => {
    unlockAudio();
    const t = dateKey();
    if ((profile.freezeDays || []).includes(t) || freezesAvailable(history) < 1) return;
    sfxCheck();
    setProfile({ ...profile, freezeDays: [...(profile.freezeDays || []), t] });
  };

  useEffect(() => {
    Promise.all([loadAll(), loadUi()]).then(([s, u]) => {
      if (u) setUiState(u);
      if (s && Array.isArray(s.history)) setHistory(s.history);
      loadSettings().then(st => {
        if (st) setSettingsState({ ...DEFAULT_SETTINGS, ...st });
        else if (s && s.muted === true) setSettingsState({ ...DEFAULT_SETTINGS, sndTap: false, sndFx: false, sndTimer: false });
      });
      if (s && s.session && s.session.phase !== "summary") {
        const ss = s.session;
        // A rest timer can't survive a reload, so resume at the next exercise.
        if (ss.phase === "rest" && ss.rest) setSession({ ...ss, phase: "work", pos: ss.rest.nextPos, rest: null });
        else setSession(ss);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveAll({ history, session: session && session.phase !== "summary" ? session : null });
  }, [history, session, loaded]);

  useEffect(() => { window.scrollTo?.(0, 0); }, [session?.phase, session?.pos, tab]);

  const start = (dayId, rounds) => {
    const day = DAYS.find(d => d.id === dayId);
    setSession({ day: dayId, rounds, base: Object.fromEntries(day.ids.map(slot => [slot, effId(slot)])), phase: "warmup", pos: 0, warm: WARMUP.map(() => false), results: {}, rest: null });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.ink, color: C.chalk, fontFamily: BODY }}>
      <style>{`
        button:focus-visible{outline:3px solid ${C.signal};outline-offset:2px}
        .b3d{transition:transform .08s ease, box-shadow .08s ease; box-shadow:0 5px 0 var(--e, transparent)}
        .b3d:active{transform:translateY(4px); box-shadow:0 1px 0 var(--e, transparent)}
        @keyframes scrIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .scr{animation:scrIn .28s ease-out both}
        .sheetBox{box-sizing:border-box;max-height:86vh;max-height:calc(100dvh - 24px)}
        @keyframes bump{0%{transform:scale(.82)}55%{transform:scale(1.12)}100%{transform:scale(1)}}
        .bump{animation:bump .22s ease-out}
        @keyframes pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}
        .pop{animation:pop .4s cubic-bezier(.2,1.4,.4,1) both}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        .pulse{animation:pulse .5s ease-in-out infinite}
        @keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}75%{transform:rotate(14deg)}}
        .wiggle{display:inline-block;animation:wiggle .5s ease-in-out 2}
        @keyframes fall{0%{transform:translate3d(0,-10vh,0) rotate(0)}100%{transform:translate3d(var(--dx),110vh,0) rotate(var(--rot))}}
        .conf{position:absolute;top:0;width:9px;height:14px;animation:fall var(--dur) cubic-bezier(.25,.6,.4,1) var(--delay) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.conf{display:none}}
      `}</style>
      {!loaded ? (
        <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: C.dim }}><Logo size={64} />{T("loading")}</div>
      ) : session ? (
        <Session session={session} setSession={setSession} history={history}
          onSave={entry => setHistory(h => [...h, entry])}
          onClose={() => setSession(null)} />
      ) : (
        <>
          <TopBar tab={tab} history={history} profile={profile} onProfile={() => { sfxTap(); setTab("profile"); }} />
          {tab === "train" && <TrainTab history={history} onStart={start} onFreeze={applyFreeze} ui={ui} setUi={setUi} />}
          {tab === "history" && <HistoryTab history={history}
            onDelete={idx => editHistory(h => h.filter((_, i) => i !== idx))}
            onSaveEntry={(idx, entry) => editHistory(h => (idx === null ? [...h, entry] : h.map((e, i) => (i === idx ? entry : e))))} />}
          {tab === "profile" && <ProfileTab history={history} profile={profile} setProfile={setProfile} onFreeze={applyFreeze} />}
          {tab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} history={history} profile={profile} setProfile={setProfile}
            onResetAll={() => { setHistory([]); setProfile({ ...profile, freezeDays: [], streakResetTs: 0 }); setUi({}); }}
            onImport={d => { setHistory(d.history); if (d.profile) setProfile({ ...profile, ...d.profile }); if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings }); }} />}
          <TabBar tab={tab} setTab={setTab} />
        </>
      )}
    </div>
  );
}
