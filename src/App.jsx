import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { isNative, pushBack, setRootBack, vibratePattern, keepScreenOn, openExternal, saveBackupFile, checkForUpdate, lastUpdate, lastGh, applyUpdateNow, latestApk, isTestBuild, apkState, onApk, apkSupported, apkRestore, apkDownload, apkCanInstall, apkAllow, apkInstall, onAppResume, healthState, healthConnect, healthSettings, healthSteps, healthFoodItems } from "./native.js";
import { L, LANG, t as T, tp as TP, fmt, setLang, detectLang, LANGS, fmtLong, fmtShortDM, fmtMonthYear, weekdaysShort, capFirst } from "./i18n/index.js";

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
const APP_VERSION = "1.2.0";
// Big Shoulders has no Cyrillic, so Oswald (also condensed) covers Ukrainian. The browser only
// downloads the Oswald unicode ranges a page actually uses.
const DISPLAY = "'Big Shoulders Display', 'Oswald', 'Arial Narrow', Impact, sans-serif";
const BODY = "'Figtree', -apple-system, 'Segoe UI', sans-serif";
// Chinese, Japanese and Korean glyphs are full width (the display font is condensed Latin), so a few big titles get smaller.
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

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
function vibrate(pat) { if (setting("vibrate") === false) return; vibratePattern(pat); }
if (typeof document !== "undefined") {
  document.addEventListener("click", unlockAudio, { once: true });
}

// ─── EXERCISES ──────────────────────────────────────────────────────────────
// type "reps": number logged per round. type "time": hold timer.
// unit is a code ("arm", "leg", "side"); its text comes from the locale. Names and
// instructions for every exercise live in src/i18n/<lang>.js and are filled in by applyLang().
const EX = {
  k1: {
    diff: "mid", type: "reps", start: 15, unit: "",
    yt: "https://www.youtube.com/watch?v=es_Tz8Si75o",
  },
  row1: {
    diff: "mid", type: "reps", start: 12, unit: "arm",
    yt: "https://www.youtube.com/watch?v=ytEalkENNiQ",
  },
  n1: {
    diff: "mid", swapTip: true, type: "reps", start: 15, unit: "",
    yt: "https://www.youtube.com/watch?v=zJBLDJMJiDE",
  },
  b5: {
    diff: "mid", swapTip: true, type: "time", durs: [15, 30, 45, 60, 75], dur: 45, unit: "",
    yt: "https://www.youtube.com/watch?v=ASdvN_XEl_c",
  },
  r1: {
    diff: "mid", swapTip: true, type: "reps", start: 12, unit: "",
    yt: "https://www.youtube.com/watch?v=pHR5yG6xBps",
  },
  row2: {
    diff: "mid", type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=g8wWFlr2gQU",
  },
  n2: {
    diff: "mid", type: "reps", start: 12, unit: "leg",
    yt: "https://www.youtube.com/watch?v=DeCnHqrN22U",
  },
  b2: {
    diff: "mid", type: "reps", start: 10, unit: "side",
    yt: "https://www.youtube.com/watch?v=4XLEnwUr1d8",
  },
  k3: {
    diff: "mid", swapTip: true, type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=_6AvEX9-k8E",
  },
  row3: {
    diff: "mid", type: "reps", start: 12, unit: "arm",
    yt: "https://www.youtube.com/watch?v=ytEalkENNiQ",
  },
  n7: {
    diff: "mid", type: "reps", start: 10, unit: "", swapTip: true, // the tip suggests swapping: HowTo shows a swap button in a workout
    yt: "https://www.youtube.com/watch?v=cWSsWpuxmYM",
  },
  b4: {
    diff: "mid", type: "reps", start: 15, unit: "side",
    yt: "https://www.youtube.com/watch?v=9FGilxCbdz8",
  },
};

// ─── ALTERNATIVES (for "Swap exercise") ──────────────────────────────────────
Object.assign(EX, {
  kKnee: {
    diff: "easy", type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=z8nUnCdZXQI",
  },
  kIncl: {
    diff: "easy", type: "reps", start: 12, unit: "",
    yt: "https://www.youtube.com/watch?v=-9S9gdRwwak",
  },
  superman: {
    diff: "easy", tag: "noDoor", type: "reps", start: 12, unit: "",
    yt: "https://www.youtube.com/watch?v=cZxtPxeR2H8",
  },
  ytw: {
    diff: "easy", tag: "noDoor", type: "reps", start: 6, unit: "",
    yt: "https://www.youtube.com/watch?v=OmgJCA_lzrs",
  },
  lunge: {
    diff: "mid", tag: "noChair", type: "reps", start: 10, unit: "leg",
    yt: "https://www.youtube.com/watch?v=ALl174GTuoY",
  },
  bridge: {
    diff: "easy", type: "reps", start: 15, unit: "", swapTip: true,
    yt: "https://www.youtube.com/watch?v=Q_Bpj91Yiis",
  },
  r1e: {
    diff: "hard", type: "reps", start: 8, unit: "",
    yt: "https://www.youtube.com/watch?v=8URA3YSur2M",
  },
  k3e: {
    diff: "hard", type: "reps", start: 8, unit: "",
    yt: "https://www.youtube.com/watch?v=pbF3MJpDhbw",
  },
  n1q: {
    diff: "hard", type: "reps", start: 8, unit: "",
    yt: "https://www.youtube.com/watch?v=1aacJiFpOSg",
  },
  b5l: {
    diff: "hard", type: "time", durs: [20, 30, 45, 60], dur: 30, unit: "",
    yt: "https://www.youtube.com/watch?v=UMq7bnHrBSY",
  },
  sbridge: {
    diff: "hard", type: "reps", start: 8, unit: "leg",
    yt: "https://www.youtube.com/watch?v=E9a7o0Ae418",
  },
  wallsit: {
    diff: "mid", tag: "hold", type: "time", durs: [30, 45, 60, 90], dur: 45, unit: "",
    yt: "https://www.youtube.com/watch?v=6caT9GsL4TA",
  },
  birddog: {
    diff: "easy", type: "reps", start: 10, unit: "side",
    yt: "https://www.youtube.com/watch?v=DkPT1fR_B9A",
  },
  hollow: {
    diff: "mid", tag: "hold", type: "time", durs: [20, 30, 45], dur: 30, unit: "",
    yt: "https://www.youtube.com/watch?v=LlDNef_Ztsc",
  },
  legraise: {
    diff: "mid", tag: "similar", type: "reps", start: 10, unit: "",
    yt: "https://www.youtube.com/watch?v=JB2oyawG9KI",
  },
});
const ALT_GROUPS = [
  ["k1", "k3", "r1", "kIncl", "kKnee", "r1e", "k3e"],
  ["row1", "row2", "row3", "superman", "ytw"],
  ["n1", "n2", "n7", "lunge", "bridge", "wallsit", "sbridge", "n1q"],
  ["b5", "b2", "b4", "birddog", "hollow", "legraise", "b5l"],
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
  { id: "c4", fig: "cobra", dur: 30, yt: "https://www.youtube.com/watch?v=JDcdhTuycOI" },
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
let META = { freezeDays: [], streakResetTs: 0, bonusFreezes: 0, birth: null };
// Birthday: day and month from the profile (Feb 29 is celebrated on Feb 28 in other years).
function isBirthday(birth, today = dateKey()) {
  if (!birth || !birth.m || !birth.d) return false;
  const t = parseKey(today), y = t.getFullYear();
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const d = birth.m === 2 && birth.d === 29 && !leap ? 28 : birth.d;
  return t.getMonth() + 1 === birth.m && t.getDate() === d;
}
const bdayToday = () => isBirthday(META.birth);
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
  { id: "push100", icon: "🦾", goal: 100, xp: 50, val: w => sumReps(w, ["k1", "k3", "r1", "kKnee", "kIncl", "r1e", "k3e"]) },
  { id: "rank", icon: "🎖️", goal: 1, xp: 60, val: w => w.reduce((a, e) => a + ((e.rankUps && e.rankUps.length) || 0), 0) },
  { id: "reps300", icon: "📈", goal: 300, xp: 40, val: w => sumReps(w, null) },
  { id: "legs100", icon: "🦵", goal: 100, xp: 40, val: w => sumReps(w, ["n1", "n2", "n7", "lunge", "bridge", "sbridge", "n1q"]) },
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
  const bonus = META.bonusFreezes || 0; // birthday gifts (one per year)
  const earned = wks.filter(wk => challengeStatus(history, wk).every(c => c.done)).length + 1 + bonus; // 1 free to start
  // The limit is 2; in a year with a birthday gift it is 3, so the present is never lost to the limit.
  const cap = 2 + (META.giftThisYear ? 1 : 0);
  return Math.max(0, Math.min(cap, earned - (META.freezeDays || []).length));
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
function uiForToday(ui, history, today, profile) {
  let n = ui;
  // Helper hint (every other day): picked once per day and marked as seen right away.
  const dayNo = Math.round(parseKey(today).getTime() / 86400000);
  if (dayNo % 2 === 0 && history.length > 0 && !(ui.hint && ui.hint.date === today)) {
    const avail = HINTS.filter(h => !(h.k === "birthday" && profile && profile.birth && profile.birth.m));
    const seen0 = ui.hintsSeen || [];
    const seen = avail.every(h => seen0.includes(h.k)) ? [] : seen0;
    const h = avail.find(x => !seen.includes(x.k)) || avail[0];
    if (h) n = { ...n, hint: { date: today, k: h.k }, hintsSeen: [...seen, h.k] };
  }
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
    let release = null;
    const get = async () => { if (setting("keepAwake") === false) return; const rel = await keepScreenOn(); if (release) release(); release = rel; };
    const onVis = () => { if (document.visibilityState === "visible") get(); };
    get();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); if (release) release(); };
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
    { hip: [52.8, 84.9], torso: -13.2, hands: [[93, GROUND], [93, GROUND]], elbows: [[78.1, GROUND], [78.1, GROUND]], feet: [[13.7, GROUND], [13.7, GROUND]], legBend: [1, 1], hide: ["farArm", "farLeg"] },
    { hip: [54.4, 90], torso: -25, hands: [[93, GROUND], [93, GROUND]], elbows: [[78, GROUND], [78, GROUND]], feet: [[14.8, GROUND], [14.8, GROUND]], legBend: [1, 1], hide: ["farArm", "farLeg"], bad: true },
  ],
  n1: [
    { hip: [60, 54], torso: -90, hands: [[88.6, 30], [88.6, 30]], armBend: [1, 1], feet: [[60, GROUND], [60, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
    { hip: [53, 83], torso: -62, hands: [[95.4, 58], [95.4, 58]], armBend: [1, 1], feet: [[62, GROUND], [62, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
  ],
  r1: [
    { hip: [58.8, 44.6], torso: 68.8, head: 85, fl: { th: 27, sh: 27, torso: 24 }, hands: [[78, GROUND], [79, GROUND]], armBend: [1, 1], feet: [[37, GROUND], [38, GROUND]], legBend: [1, 1], hide: ["farLeg"] },
    { hip: [79.2, 60.3], torso: 55, head: 39.5, fl: { th: 27, sh: 27, torso: 24 }, hands: [[78, GROUND], [79, GROUND]], elbows: [[78, 80], [79, 80]], feet: [[37, GROUND], [38, GROUND]], legBend: [1, 1], hide: ["farLeg"] },
  ],
  row1: [
    { ...fromFeet([88, GROUND], 17), hands: [[97, 37.2], [70.5, 59.7]], armBend: [-1, 1], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm", "farLeg"] },
    { ...fromFeet([88, GROUND], 2), hands: [[97, 37.2], [86.5, 56.8]], elbows: [[83.4, 38.5], [84.3, 43]], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm", "farLeg"] },
  ],
  row3: [
    { ...fromFeet([88, GROUND], 18), hands: [[97.4, 31], [70.5, 59.7]], armBend: [-1, 1], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm", "farLeg"] },
    { ...fromFeet([88, GROUND], 2), hands: [[97.4, 31], [86.8, 56.8]], elbows: [[83.5, 30.5], [86.2, 42.8]], feet: [[88, GROUND], [90, GROUND]], legBend: [1, 1], props: [{ t: "frame" }], grip: true, hide: ["farArm", "farLeg"] },
  ],
  row2: [
    { hip: [79.5, 64], torso: -110, head: -100, hands: [[95, 55.6], [95.4, 55.2]], armBend: [-1, -1], feet: [[103, GROUND], [104.5, GROUND]], legBend: [-1, -1], props: [{ t: "door", mid: true }, { t: "towel", from: [104, 56], to: [95.2, 55.4], mid: true }] },
    { hip: [86, 64], torso: -95, head: -90, hands: [[96, 55], [96.5, 55.4]], armBend: [1, 1], feet: [[103, GROUND], [104.5, GROUND]], legBend: [-1, -1], props: [{ t: "door", mid: true }, { t: "towel", from: [104, 56], to: [96.3, 55.2], mid: true }] },
  ],
  n2: [
    { hip: [54, 57], torso: -86, hands: [[53, 57], [53, 57]], armBend: [1, 1], feet: [[69, GROUND], [30, 70]], legBend: [-1, -1], hide: ["farArm"], props: [{ t: "chair" }] },
    { hip: [48, 70], torso: -80, hands: [[47, 70], [47, 70]], armBend: [1, 1], feet: [[70, GROUND], [30, 70]], legBend: [-1, -1], hide: ["farArm"], props: [{ t: "chair" }] },
  ],
  b2: [
    { hip: [42, 88], torso: 0, head: 0, hands: [[68, 59], [68, 59]], armBend: [1, 1], feet: [[22, 68], [22, 68]], legBend: [1, 1], supine: true, hide: ["farArm", "farLeg"] },
    { hip: [42, 88], torso: 0, head: 0, hands: [[96.1, 80.4], [68, 59]], armBend: [1, 1], feet: [[22, 68], [2.1, 84]], legBend: [1, 1], supine: true },
  ],
  n7: [
    { hip: [54, 72], torso: 30, head: 10, hands: [[48, 92.5], [50, 92.5]], armBend: [1, 1], feet: [[34, GROUND - 2], [36, GROUND - 2]], legBend: [1, 1], props: [{ t: "towelFloor", x: 28 }], supine: true, hide: ["farArm", "farLeg"] },
    { hip: [50, 80], torso: 22, head: 10, hands: [[45.2, 93], [47.2, 93]], armBend: [1, 1], feet: [[12, GROUND - 2], [12.5, GROUND - 1.5]], legBend: [1, 1], props: [{ t: "towelFloor", x: 6 }], supine: true, hide: ["farArm", "farLeg"] },
  ],
  b4: [
    { hip: [44, 88], torso: -22, head: -40, hands: [[71.5, 75.5], [72.5, 76.5]], elbows: [[55.5, 67.5], [69.5, 61.5]], feet: [[5, 79], [33, 64]], legBend: [1, 1], supine: true },
    { hip: [44, 88], torso: -22, head: -40, hands: [[71.5, 75.5], [72.5, 76.5]], elbows: [[69.5, 61.5], [55.5, 67.5]], feet: [[33, 64], [5, 79]], legBend: [1, 1], supine: true },
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
    { hip: [46, 89], torso: 0, head: -8, hands: [[101, 90], [102, 90]], armBend: [1, 1], feet: [[6, 91], [8, 91]], legBend: [1, 1], hide: ["farArm", "farLeg"] },
    { hip: [46, 89], torso: -12, head: -22, hands: [[98, 74], [100, 74]], armBend: [1, 1], feet: [[7, 80], [7.5, 79]], legBend: [1, 1], hide: ["farArm", "farLeg"] },
  ],
  ytw: [{ top: "Y" }, { top: "T" }, { top: "W" }],
  lunge: [
    { hip: [58, 54], torso: -90, hands: [[57, 54], [57, 54]], armBend: [1, 1], feet: [[58, GROUND], [58, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
    { hip: [40, 72], torso: -88, hands: [[39, 72], [39, 72]], armBend: [1, 1], feet: [[60, GROUND], [16, GROUND - 1]], legBend: [-1, -1], hide: ["farArm"] },
  ],
  bridge: [
    { hip: [46, 89], torso: 0, head: 0, hands: [[43.1, 92.4], [43.1, 92.4]], armBend: [1, 1], feet: [[28, GROUND], [30, GROUND]], legBend: [1, 1], supine: true, hide: ["farArm", "farLeg"] },
    { hip: [51.1, 80.3], torso: 17.2, head: 0, hands: [[46, 93], [48, 93]], armBend: [1, 1], feet: [[28, GROUND], [30, GROUND]], legBend: [1, 1], supine: true, hide: ["farArm", "farLeg"] },
  ],
  sbridge: [
    { hip: [46, 89], torso: 0, head: 0, hands: [[43.1, 92.4], [43.1, 92.4]], armBend: [1, 1], feet: [[18.6, 60], [28, GROUND]], legBend: [1, 1], supine: true, hide: ["farArm"] },
    { hip: [51.1, 80.3], torso: 17.2, head: 0, hands: [[46, 93], [48, 93]], armBend: [1, 1], feet: [[12.95, 68.55], [28, GROUND]], legBend: [1, 1], supine: true, hide: ["farArm"] },
  ],
  wallsit: [
    { hip: [28, 74], torso: -90, hands: [[28.5, 77], [28.5, 77]], armBend: [1, 1], feet: [[48, GROUND], [48, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"], props: [{ t: "wall" }] },
  ],
  birddog: [
    { hip: [46, 70], torso: -2.2, fl: { th: 24, ua: 13, fa: 12 }, hands: [[72, GROUND], [72, GROUND]], armBend: [1, 1], feet: [[26, GROUND], [26, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
    { hip: [46, 70], torso: -2.2, fl: { th: 24, ua: 13, fa: 12 }, hands: [[97.1, 68.3], [72, GROUND]], armBend: [1, 1], feet: [[26, GROUND], [2, 72.2]], legBend: [-1, -1] },
  ],
  hollow: [
    { hip: [50, 89], torso: -14, head: -24, hands: [[104, 72], [104, 72]], armBend: [1, 1], feet: [[11, 80], [11, 80]], legBend: [1, 1], supine: true, hide: ["farArm", "farLeg"] },
  ],
  legraise: [
    { hip: [50, 89], torso: 0, head: 0, hands: [[47.1, 92.4], [47.1, 92.4]], armBend: [1, 1], feet: [[50, 49], [50, 49]], legBend: [1, 1], supine: true, hide: ["farArm", "farLeg"] },
    { hip: [50, 89], torso: 0, head: 0, hands: [[47.1, 92.4], [47.1, 92.4]], armBend: [1, 1], feet: [[10.3, 84], [10.3, 84]], legBend: [1, 1], supine: true, hide: ["farArm", "farLeg"] },
  ],
  hf: [
    { hip: [56, 76], torso: -92, hands: [[55, 76], [55, 76]], armBend: [1, 1], feet: [[84, GROUND], [24, GROUND]], legBend: [-1, -1], hide: ["farArm"] },
  ],
  cobra: [
    { hip: [48, 90], torso: -40, head: -32, fl: { ua: 12, fa: 11 }, hands: [[70, GROUND], [70, GROUND]], armBend: [1, 1], feet: [[8.1, 92.5], [8.1, 92.5]], legBend: [1, 1], hide: ["farArm", "farLeg"] },
  ],
  r1e: [
    { hip: [70, 42], torso: 78, head: 85, fl: { th: 25, sh: 25, torso: 24 }, hands: [[77, GROUND], [77, GROUND]], armBend: [1, 1], feet: [[28.5, 70], [28.5, 70]], legBend: [1, 1], hide: ["farArm", "farLeg"], props: [{ t: "chair" }] },
    { hip: [84, 57.75], torso: 68, head: 39.5, fl: { th: 25, sh: 25, torso: 24 }, hands: [[78, GROUND], [78, GROUND]], elbows: [[78, 80], [78, 80]], feet: [[33, 71], [33, 71]], legBend: [1, 1], hide: ["farArm", "farLeg"], props: [{ t: "chair" }] },
  ],
  k3e: [
    { hip: [62.1, 67.2], torso: -4, hands: [[88, GROUND], [88, GROUND]], armBend: [1, 1], feet: [[22, 70], [22, 70]], legBend: [1, 1], hide: ["farArm", "farLeg"], props: [{ t: "chair" }, { t: "diamondTop" }] },
    { hip: [61, 79.1], torso: 13.1, hands: [[88, GROUND], [88, GROUND]], armBend: [1, 1], feet: [[22, 70], [22, 70]], legBend: [1, 1], hide: ["farArm", "farLeg"], props: [{ t: "chair" }] },
  ],
  n1q: [
    { hip: [53, 83], torso: -62, hands: [[95.4, 58], [95.4, 58]], armBend: [1, 1], feet: [[62, GROUND], [62, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
    { hip: [55, 75], torso: -68, hands: [[94, 50], [94, 50]], armBend: [1, 1], feet: [[62, GROUND], [62, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
    { hip: [53, 83], torso: -62, hands: [[95.4, 58], [95.4, 58]], armBend: [1, 1], feet: [[62, GROUND], [62, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
    { hip: [60, 54], torso: -90, hands: [[88.6, 30], [88.6, 30]], armBend: [1, 1], feet: [[60, GROUND], [60, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
  ],
  b5l: [
    { hip: [52.8, 84.9], torso: -13.2, hands: [[93, GROUND], [93, GROUND]], elbows: [[78.1, GROUND], [78.1, GROUND]], feet: [[12.8, 83.6], [13.7, GROUND]], legBend: [1, 1], hide: ["farArm"] },
    { hip: [52.8, 84.9], torso: -13.2, hands: [[93, GROUND], [93, GROUND]], elbows: [[78.1, GROUND], [78.1, GROUND]], feet: [[13.7, GROUND], [12.8, 83.6]], legBend: [1, 1], hide: ["farArm"] },
  ],
  child: [
    { hip: [32, 83], torso: 0, head: 18, hands: [[87, 92.5], [87, 92.5]], armBend: [1, 1], feet: [[30, GROUND], [30, GROUND]], legBend: [-1, -1], hide: ["farArm", "farLeg"] },
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
  // Yellow belly marker: the front half of the torso line is yellow, at the same place on every figure.
  // It is drawn inside the torso (not next to it) and on top, so a limb lying along the body never hides it.
  // Front = torso direction turned 90° clockwise (faces right when standing); flipped when lying on the back.
  const tv = [shoulder[0] - p.hip[0], shoulder[1] - p.hip[1]];
  const tl = Math.hypot(tv[0], tv[1]) || 1;
  const nrm = [(-tv[1] / tl) * (p.supine ? -1 : 1), (tv[0] / tl) * (p.supine ? -1 : 1)];
  const at = (t, off) => [p.hip[0] + tv[0] * t + nrm[0] * off, p.hip[1] + tv[1] * t + nrm[1] * off];
  const belly = [at(0.12, 1.5), at(0.88, 1.5)];
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {parts.filter(x => x.i === 1).map((x, k) => <polyline key={`f${k}`} points={line(x.pts)} stroke={x.col} strokeWidth="5" />)}
      {(p.props || []).filter(pr => pr.mid).map((pr, k) => <Prop key={`m${k}`} pr={pr} />)}
      <polyline points={line([p.hip, shoulder])} stroke={near} strokeWidth="6" />
      <circle cx={headC[0]} cy={headC[1]} r={FL.head} fill={near} stroke="none" />
      {parts.filter(x => x.i === 0).map((x, k) => <polyline key={`n${k}`} points={line(x.pts)} stroke={x.col} strokeWidth="5" />)}
      {p.grip && (() => { const h = parts.find(x => x.i === 0 && x.pts[0] === shoulder).pts[2]; return <circle cx={h[0]} cy={h[1]} r="3" fill={near} />; })()}
      <polyline points={line(belly)} stroke={C.signal} strokeWidth="2.4" />
    </g>
  );
}

// Towels are orange, so they are never mistaken for the yellow belly marker.
const TOWEL = "#ff9f5a";
function Prop({ pr }) {
  const s = { stroke: C.sky, strokeWidth: 3, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  // Door frame (jamb) seen from the side as one solid post; the hand grips its front edge.
  if (pr.t === "frame") return <g><rect x="95.5" y="6" width="4.6" height="90" rx="1" fill={C.sky} fillOpacity="0.28" stroke={C.sky} strokeWidth="3" /><line x1="100.1" y1="6" x2="118" y2="6" {...s} /></g>;
  if (pr.t === "door") return <g><rect x="102" y="10" width="5" height="86" rx="1" fill={C.sky} fillOpacity="0.28" stroke={C.sky} strokeWidth="3" /><circle cx="104.5" cy="56" r="2.5" fill={C.sky} /></g>;
  if (pr.t === "towel") return <line x1={pr.from[0]} y1={pr.from[1]} x2={pr.to[0]} y2={pr.to[1]} stroke={TOWEL} strokeWidth="3" strokeLinecap="round" />;
  if (pr.t === "chair") return <g {...s}><line x1="8" y1="72" x2="36" y2="72" /><line x1="10" y1="72" x2="10" y2="96" /><line x1="34" y1="72" x2="34" y2="96" /><line x1="10" y1="72" x2="10" y2="44" /></g>;
  if (pr.t === "table") return <g {...s}><line x1="80" y1="74" x2="118" y2="74" /><line x1="84" y1="74" x2="84" y2="96" /><line x1="114" y1="74" x2="114" y2="96" /></g>;
  if (pr.t === "wall") return <line x1="20" y1="4" x2="20" y2="96" {...s} strokeWidth="4" />;
  if (pr.t === "towelFloor") return <rect x={pr.x} y={GROUND} width="14" height="3" rx="1" fill={TOWEL} />;
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

// Lying face down, seen from above (back view): arms in the shape of the letter Y, T or W.
function TopFig({ arms }) {
  const sh = [60, 31];
  const A = {
    Y: [[[36, 10]], [[84, 10]]],
    T: [[[30, 31]], [[90, 31]]],
    W: [[[44, 44], [40, 24]], [[76, 44], [80, 24]]],
  }[arms] || [[], []];
  const pts = rest => [sh, ...rest].map(q => q.join(",")).join(" ");
  return (
    <g fill="none" stroke={C.chalk} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="54,93 60,60 66,93" />
      <polyline points="60,27 60,60" strokeWidth="6" />
      <polyline points={pts(A[0])} /><polyline points={pts(A[1])} />
      <circle cx="60" cy="17" r="7" fill={C.chalk} stroke="none" />
    </g>
  );
}

function ExFigure({ id }) {
  const poses = FIGS[id];
  if (!poses) return null;
  return (
    <div style={{ margin: "4px 0 14px" }} role="img" aria-label={T("figureAria", { labels: poses.map(p => p.label).join(", ") })}>
      <div style={poses.length === 4 ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } : { display: "flex", gap: 8, justifyContent: "center" }}>
      {poses.map((p, i) => (
        <div key={i} style={{ flex: poses.length > 1 ? 1 : "0 1 62%", background: C.ink, border: `1.5px solid ${p.bad ? "#ff8a80" : C.line}`, borderRadius: 14, padding: "6px 4px 8px", textAlign: "center" }}>
          <svg viewBox="0 0 120 100" style={{ width: "100%", height: "auto", display: "block" }}>
            {p.top ? <TopFig arms={p.top} /> : (
              <>
                <line x1="0" y1={GROUND + 3} x2="120" y2={GROUND + 3} stroke={C.line} strokeWidth="2" />
                {(p.props || []).filter(pr => !pr.mid).map((pr, k) => <Prop key={k} pr={pr} />)}
                <Stick p={p} />
              </>
            )}
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: p.bad ? "#ff8a80" : C.dim, marginTop: 4, lineHeight: 1.3 }}>{poses.length > 1 ? `${i + 1}. ` : ""}{p.label}</div>
        </div>
      ))}
      </div>
      <div style={{ fontSize: 11, color: C.dim, textAlign: "center", marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 14, rowGap: 4 }}>
        {poses.some(p => !p.top) && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 16, height: 3, borderRadius: 2, background: C.signal, display: "inline-block" }} />{T("figBelly")}</span>}
        {["towel", "towelFloor"].filter(k => poses.some(p => (p.props || []).some(pr => pr.t === k))).map(k => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 16, height: 3, borderRadius: 2, background: TOWEL, display: "inline-block" }} />{T(k === "towel" ? "figTowel" : "figTowelSlide")}</span>
        ))}
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
function openYT(url) { openExternal(url); }

// Rendered straight into <body> through a portal. Inside a screen, the .scr slide-in animation
// makes the screen the containing block for position:fixed, so the sheet used to be placed
// relative to the (long, scrolled) page instead of the phone screen and ended up off-screen.
// Android back button closes the newest open sheet.
function useBack(fn, on = true) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => (on ? pushBack(() => ref.current && ref.current()) : undefined), [on]);
}
function Sheet({ title, onClose, children, short }) {
  useBack(onClose);
  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(5,10,24,0.82)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "calc(12px + var(--sat)) 12px calc(12px + var(--sab))" }}>
      <div onClick={e => e.stopPropagation()} className="sheetBox" style={{ ...(short ? { maxHeight: "70dvh" } : {}), background: C.panel, borderRadius: 22, padding: "22px 20px 26px", width: "100%", maxWidth: 460, border: `1px solid ${C.line}`, overflowY: "auto", overscrollBehavior: "contain", fontFamily: BODY }}>
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

// Difficulty compared with the program: easy / mid / hard ("diff" in EX). Shown as a small chip.
function DiffChip({ id, pad = "1px 8px" }) {
  const d = EX[id] && EX[id].diff;
  if (!d) return null;
  const col = { easy: C.mint, mid: C.sky, hard: "#ff8a6b" }[d];
  return <span style={{ fontSize: 11, fontWeight: 700, color: col, border: `1.5px solid ${col}55`, borderRadius: 99, padding: pad, whiteSpace: "nowrap" }}>{T("diff_" + d)}</span>;
}

// "?" next to an exercise name anywhere: opens its description sheet (one host in App).
const SUPPORT_URL = "https://www.patreon.com/c/mikydon";
const PRIVACY_URL = "https://mikydon.github.io/hw-app/privacy.html";
const TRANSLATE_URL = "https://github.com/mikydon/hw-app/blob/main/TRANSLATING.md";
let openHowToGlobal = null;
function ExQ({ id, onOpen, style }) {
  const go = e => { e.stopPropagation(); e.preventDefault(); sfxTap(); if (onOpen) onOpen(); else if (openHowToGlobal) openHowToGlobal(id); };
  return (
    <span role="button" tabIndex={0} data-exq={id} className="exq" aria-label={`${T("howTo")}: ${EX[id] ? EX[id].name : ""}`} onClick={go} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") go(e); }}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 99, border: `1.5px solid ${C.sky}`, color: C.sky, fontFamily: BODY, fontSize: 12, fontWeight: 800, marginLeft: 7, verticalAlign: "middle", cursor: "pointer", flexShrink: 0, lineHeight: 1, ...style }} />
  );
}
function HowTo({ id, history, onClose, onSwap }) {
  const ex = EX[id];
  const best = bestFor(history, id);
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div style={{ color: C.dim, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{ex.muscles}<DiffChip id={id} /></div>
      <ExFigure id={id} />
      {ex.tempo && <div style={{ background: C.panelHi, borderRadius: 12, padding: "10px 13px", marginBottom: 14, fontSize: 14 }}><b style={{ color: C.signal }}>{T("tempo")}:</b> {ex.tempo}</div>}
      <div>{ex.how}</div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, color: C.chalk }}>💡 {ex.tip}</div>
      {onSwap && ex.swapTip && <button onClick={onSwap} style={{ ...ghostBtn, marginTop: 10, padding: "10px 14px", color: C.sky, borderColor: `${C.sky}88` }}>{T("swap")}</button>}
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
// Achievements have 7 tiers named like the exercise ranks (Wood … Diamond). Everything is derived
// from history (+ birthdays and calorie days from `extra`), so badges earned before v1.4 stay earned.
const ACH = [
  { k: "workouts", icon: "🎯", at: [1, 5, 10, 25, 50, 100, 200], pl: "workouts", v: c => c.n },
  { k: "streak", icon: "🔥", at: [3, 7, 15, 30, 60, 100, 180], pl: "days", v: c => c.bs },
  { k: "records", icon: "📈", at: [1, 5, 10, 25, 50, 100, 200], pl: "prs", v: c => c.prs },
  { k: "ranks", icon: "🥇", at: [1, 4, 8, 15, 25, 40, 60], v: c => c.rankSum },
  { k: "weeks", icon: "✅", at: [1, 2, 4, 8, 12, 26, 52], pl: "weeks", v: c => c.weeks },
  { k: "level", icon: "⭐", at: [2, 5, 10, 15, 20, 30, 50], v: c => c.lvl },
  { k: "rounds3", icon: "💪", at: [1, 5, 10, 25, 50, 100, 200], pl: "workouts", v: c => c.r3 },
  { k: "pushups", icon: "🦾", at: [10, 20, 30, 40, 50, 60, 75], pl: "pushups", v: c => c.push },
  { k: "reps", icon: "📊", at: [100, 500, 1000, 2500, 5000, 10000, 25000], pl: "reps", v: c => c.reps },
  { k: "birthday", icon: "🎂", at: [1, 2, 3, 4, 5, 7, 10], pl: "birthdays", v: c => c.bdays },
  { k: "calories", icon: "🍽️", at: [1, 7, 14, 30, 60, 100, 200], pl: "days", v: c => c.kcalDays },
];
function achCounts(history, extra = {}) {
  const pushIds = ["k1", "k3", "r1", "kKnee", "kIncl", "r1e", "k3e"];
  return {
    n: history.length,
    bs: bestStreak(history),
    prs: history.reduce((a, e) => a + ((e.prs && e.prs.length) || 0), 0),
    rankSum: Object.keys(RANK_AT).reduce((a, id) => a + rankIdx(id, bestFor(history, id)), 0),
    weeks: [...new Set(history.map(e => weekKey(e.date)))].filter(wk => challengeStatus(history, wk).every(c => c.done)).length,
    lvl: levelInfo(totalXP(history)).lvl,
    r3: history.filter(e => e.rounds === 3).length,
    push: Math.max(0, ...pushIds.map(id => bestFor(history, id) || 0)),
    reps: totalReps(history),
    bdays: extra.bdays || 0,
    kcalDays: extra.kcalDays || 0,
  };
}
function achievements(history, extra) {
  const c = achCounts(history, extra);
  return ACH.map(a => {
    const v = a.v(c);
    const tier = a.at.filter(x => v >= x).length; // 0 = locked, 1..7 = Wood..Diamond
    const next = tier < a.at.length ? a.at[tier] : null;
    const goal = next ?? a.at[a.at.length - 1];
    const [name, desc] = L.ach[a.k];
    return { ...a, v, tier, next, name, desc: fmt(desc, { n: goal, x: a.pl ? TP(a.pl, goal) : goal }) };
  });
}
function achExtra(profile, kcal) {
  const log = (kcal && kcal.log) || {};
  return { bdays: ((profile && profile.bdays) || []).length, kcalDays: Object.keys(log).filter(d => log[d] && log[d].length).length };
}
// Tiers that went up between two histories, for the end-of-workout summary.
function achUps(before, after, extra) {
  const a = achievements(before, extra), b = achievements(after, extra);
  return b.filter((x, i) => x.tier > a[i].tier).map(x => ({ k: x.k, icon: x.icon, name: x.name, tier: x.tier }));
}

// On the user's birthday: little confetti pieces and emojis floating around the avatar.
function BdayHalo({ size, children }) {
  if (!bdayToday()) return children;
  const bits = ["🎉", "🎈", "✨", "🎂", "🎊", "✨"];
  const cols = [C.signal, C.mint, C.sky, "#ff7ab6", C.signal, C.mint, C.sky, "#ff7ab6"];
  return (
    <span data-bday-halo style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      {children}
      {bits.map((b, i) => {
        const a = (i / bits.length) * Math.PI * 2 - Math.PI / 2, r = size * 0.62;
        return <span key={"e" + i} aria-hidden="true" className="haloBit" style={{ position: "absolute", left: size / 2 + Math.cos(a) * r - size * 0.11, top: size / 2 + Math.sin(a) * r - size * 0.11, fontSize: size * 0.2, "--d": `${i * 0.35}s`, pointerEvents: "none" }}>{b}</span>;
      })}
      {cols.map((c, i) => {
        const a = ((i + 0.5) / cols.length) * Math.PI * 2, r = size * 0.56;
        return <span key={"c" + i} aria-hidden="true" className="haloBit" style={{ position: "absolute", left: size / 2 + Math.cos(a) * r - 3, top: size / 2 + Math.sin(a) * r - 4, width: 6, height: 9, borderRadius: i % 2 ? 99 : 2, background: c, "--d": `${0.2 + i * 0.27}s`, pointerEvents: "none" }} />;
      })}
    </span>
  );
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
// Look of the main screen (Michael, Oct 10: try a few and compare): "cards" (boxes, default), "tiles" (lighter, tighter boxes),
// "flat" (the old open layout). Set from settings.look in App.
let LOOK = "cards";
// A soft inner tile inside a box (badges, ranks): visible but quiet, on any look.
const SOFT = () => (LOOK === "tiles" ? `${C.ink}55` : `${C.chalk}0d`);
function Sect({ title, children, style, titlePad, accent, ...rest }) {
  if (LOOK === "flat") return <div {...rest} style={{ marginTop: 18, ...style }}>{children}</div>;
  if (LOOK === "glass") return (
    <section {...rest} data-sect style={{ background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel} 60%)`, border: `1px solid ${C.chalk}14`, borderRadius: 24, padding: "15px 16px", marginTop: 12, boxShadow: "0 10px 30px rgba(0,0,0,.28)", ...style }}>
      {title && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: "uppercase", color: C.dim, marginBottom: 10, padding: titlePad || 0 }}>{title}</div>}
      {children}
    </section>
  );
  if (LOOK === "accent") {
    const a = accent || C.signal;
    return (
      <section {...rest} data-sect style={{ background: C.panel, borderRadius: 16, borderLeft: `4px solid ${a}`, padding: "13px 15px", marginTop: 12, ...style }}>
        {title && <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", color: a, marginBottom: 10, padding: titlePad || 0 }}>{title}</div>}
        {children}
      </section>
    );
  }
  const tiles = LOOK === "tiles";
  return (
    <section {...rest} data-sect style={{ background: tiles ? C.panelHi : C.panel, border: `1px solid ${tiles ? C.panelHi : C.line}`, borderRadius: tiles ? 16 : 20, padding: tiles ? "12px 13px" : "14px 15px", marginTop: tiles ? 8 : 12, ...style }}>
      {title && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.9, textTransform: "uppercase", color: tiles ? C.chalk : C.dim, opacity: tiles ? 0.8 : 1, marginBottom: 10, padding: titlePad || 0 }}>{title}</div>}
      {children}
    </section>
  );
}

// ─── TOP BAR + MENU ─────────────────────────────────────────────────────────
// Screens: train (home), calories, history, profile, settings. One menu button (☰) top right
// opens a drawer with all of them; there is no bottom tab bar any more (v1.4.0).
const SCREENS = ["train", "calories", "history", "profile", "settings"];
const SCREEN_TITLE = { train: "tabTrain", calories: "tabCalories", history: "tabHistory", profile: "tabProfile", settings: "tabSettings" };

function MenuButton({ open, onClick, btnRef, label }) {
  const bar = (y, rot) => ({ position: "absolute", left: 11, width: 20, height: 2.6, borderRadius: 2, background: C.chalk, top: open ? 20 : y, transform: open ? `rotate(${rot}deg)` : "none", transition: "top .22s ease, transform .22s ease, opacity .18s" });
  return (
    <button ref={btnRef} onClick={onClick} aria-label={label || (open ? T("menuClose") : T("menuOpen"))} aria-expanded={open} data-menu-btn
      style={{ ...btnBase, position: "relative", width: 42, height: 42, padding: 0, borderRadius: 13, background: open ? C.panelHi : C.panel, border: `1.5px solid ${C.line}`, flexShrink: 0 }}>
      <span style={bar(13, 45)} />
      <span style={{ ...bar(20, 0), opacity: open ? 0 : 1 }} />
      <span style={bar(27, -45)} />
    </button>
  );
}

// Current time (minutes), re-rendered every 20 s for the clock in the top bar.
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(iv); }, []);
  return now;
}
// App only: one small line in the menu with the result of the last update check.
// Menu: one box about the app: version + What's new, newest on GitHub (tap = releases), update state, Android link.
function AboutBox({ gh, dl, onNews }) {
  const u = isNative ? lastUpdate() : null;
  const newer = gh && verCmp(gh, APP_VERSION) > 0;
  const row = { ...btnBase, width: "100%", display: "flex", alignItems: "center", gap: 8, background: "transparent", padding: "11px 0", textAlign: "left", borderRadius: 0, borderTop: `1px solid ${C.line}` };
  let status = null;
  if (isNative && dl && dl.kind === "downloading") status = <div data-upd-status="downloading" style={{ fontSize: 12, color: C.sky }}>{T("updDownloading", { v: dl.v })} {Math.round(dl.pct || 0)} %</div>;
  else if (u && u.kind) {
    const time = new Date(u.ts).toLocaleTimeString(LANG, { hour: "2-digit", minute: "2-digit" });
    status = (
      <div data-upd-status={u.kind} style={{ fontSize: 12, lineHeight: 1.45, color: u.kind === "error" || u.kind === "net" ? C.signal : C.dim }}>
        {T("upd_" + u.kind, { v: u.v || "", e: u.err || "", time })}
        {u.failed ? <span style={{ display: "block", color: C.signal }}>{T("updFailedV", { v: u.failed })}</span> : null}
      </div>
    );
  }
  return (
    <div data-about style={{ margin: "auto 14px 14px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: "4px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size={30} /><span style={{ fontSize: 14, fontWeight: 800, color: C.chalk }}>HW App {APP_VERSION}</span></div>
        {onNews && <button onClick={onNews} data-news-btn style={{ ...btnBase, background: "transparent", color: C.sky, fontSize: 13, padding: "4px 0" }}>{T("newsLink")} ›</button>}
      </div>
      {gh && (
        <button data-gh={gh} onClick={() => { sfxTap(); openExternal("https://github.com/mikydon/hw-app/releases/latest"); }} style={{ ...row, color: newer ? C.mint : C.dim, fontSize: 13, fontWeight: 700 }}>
          <span style={{ flex: 1, minWidth: 0 }}>{T("ghLatest", { v: gh })}</span>
          {newer && <span style={{ fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 99, background: C.mint, color: C.ink, letterSpacing: 0.3 }}>{T("ghNew")}</span>}
          <span aria-hidden="true">›</span>
        </button>
      )}
      {status && <div style={{ padding: "10px 0", borderTop: `1px solid ${C.line}` }}>{status}</div>}
      {!isNative && (
        <button onClick={() => { sfxTap(); openExternal("https://github.com/mikydon/hw-app/releases/latest"); }} data-get-android style={{ ...row, color: C.mint, fontSize: 13, fontWeight: 800 }}>
          <span style={{ flex: 1 }}>{T("getAndroid")}</span><span aria-hidden="true">›</span>
        </button>
      )}
    </div>
  );
}

function TopBar({ screen, history, menuOpen, onMenu, onGo, dlPct }) {
  const now = useClock();
  const ap = useApk();
  const prog = ap.kind === "downloading" ? ap.pct || 0 : dlPct; // a download in progress: a thin line under the bar on every screen
  const today = dateKey();
  const st = streakInfo(history, today);
  const lv = levelInfo(totalXP(history));
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, background: `${C.ink}ee`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "calc(10px + var(--sat)) 18px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div key={screen} className="titleIn" style={{ fontFamily: DISPLAY, fontSize: CJK.test(T(SCREEN_TITLE[screen])) ? 21 : 24, fontWeight: 900, lineHeight: 1.05, color: C.chalk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{T(SCREEN_TITLE[screen])}</div>
          <div style={{ display: "flex", gap: 5, fontSize: 12, color: bdayToday() ? C.signal : C.dim, fontWeight: bdayToday() ? 800 : 400, marginTop: 2, whiteSpace: "nowrap" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{bdayToday() ? T("bdayTop") : capFirst(fmtDate(today, true))}</span>
            <span data-clock style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>· {now.toLocaleTimeString(LANG, { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
        <button onClick={() => onGo && onGo("profile")} data-chip="streak" style={{ ...btnBase, ...chip(st.n ? "#ffa94d" : C.dim), background: "transparent" }} aria-label={T("streakAria", { n: st.n })}><span className={st.n ? "wiggle" : ""}>🔥</span>{st.n}</button>
        <button onClick={() => onGo && onGo("profile")} data-chip="level" style={{ ...btnBase, ...chip(C.sky), background: "transparent" }} aria-label={T("levelAria", { n: lv.lvl })}>⚡{lv.lvl}</button>
        <MenuButton open={menuOpen} onClick={onMenu} />
      </div>
      {typeof prog === "number" && <div data-top-prog={Math.round(prog)} role="progressbar" aria-valuenow={Math.round(prog)} aria-valuemin={0} aria-valuemax={100} style={{ position: "absolute", left: 0, bottom: -1, height: 3, width: `${Math.max(2, Math.min(100, prog))}%`, background: C.sky, borderRadius: "0 3px 3px 0", transition: "width .3s", boxShadow: `0 0 8px ${C.sky}` }} />}
    </div>
  );
}

function TabIcon({ name, active }) {
  const c = active ? C.signal : C.dim;
  const s = { fill: "none", stroke: c, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "train") return <svg width="26" height="26" viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" {...s} /></svg>;
  if (name === "history") return <svg width="26" height="26" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3" {...s} /><path d="M3.5 10h17M8 3v4M16 3v4" {...s} /><circle cx="12" cy="15" r="1.6" fill={c} stroke="none" /></svg>;
  if (name === "calories") return <svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 21c-4 0-6.5-2.7-6.5-6.3 0-3.2 2.2-5.4 3.6-7.6.6 1.6 1.4 2.6 2.5 3.1C12 7 13 4.7 14.6 3c.6 2.9 3.9 5.6 3.9 10.2 0 4.4-2.6 7.8-6.5 7.8z" {...s} /></svg>;
  if (name === "profile") return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4" {...s} /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" {...s} /></svg>;
  return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" {...s} /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" {...s} /><circle cx="12" cy="12" r="6.6" {...s} /></svg>;
}

// Slide-in drawer from the right with everything in the app. Rendered into <body> (like Sheet).
function MenuDrawer({ open, screen, history, profile, session, onGo, onResume, onClose, onNews, gh, dl }) {
  const [shown, setShown] = useState(open);
  useEffect(() => { if (open) setShown(true); else { const t = setTimeout(() => setShown(false), 260); return () => clearTimeout(t); } }, [open]);
  const closeRef = useRef(null);
  useBack(onClose, open);
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement;
    const f = setTimeout(() => { try { closeRef.current && closeRef.current.focus(); } catch (_) {} }, 30);
    const k = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { clearTimeout(f); window.removeEventListener("keydown", k); document.body.style.overflow = prev; try { const b = [...document.querySelectorAll("[data-menu-btn]")].find(el => el.offsetParent); (b || back) && (b || back).focus({ preventScroll: true }); } catch (_) {} };
  }, [open]);
  if (!shown) return null;
  const lv = levelInfo(totalXP(history));
  const st = streakInfo(history, dateKey());
  const kcs = kcalNow(history);
  const items = SCREENS.map(id => ({ id, label: T(SCREEN_TITLE[id]), desc: id === "calories" && kcs ? T("kcMenu", { e: nf(kcs.eaten), t: nf(kcs.target) }) : T("menuD_" + id) }));
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={T("mainMenu")} className={open ? "drawerOn" : "drawerOff"} style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} className="drawerBg" style={{ position: "absolute", inset: 0, background: "rgba(3,8,20,.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }} />
      <nav aria-label={T("mainMenu")} className="drawerPanel" style={{ fontFamily: BODY, position: "absolute", top: 0, right: 0, bottom: 0, width: "min(86vw, 340px)", background: C.ink, borderLeft: `1px solid ${C.line}`, boxShadow: "-20px 0 50px rgba(0,0,0,.35)", display: "flex", flexDirection: "column", paddingTop: "var(--sat)", paddingBottom: "var(--sab)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 4px 18px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 800, color: C.dim, letterSpacing: 1 }}>HW APP</div>
          <MenuButton open={true} onClick={onClose} btnRef={closeRef} />
        </div>
        <button onClick={() => onGo("profile")} className="drawerItem" style={{ ...btnBase, "--i": 0, display: "flex", alignItems: "center", gap: 12, margin: "8px 14px 6px", padding: "12px", borderRadius: 18, background: C.panel, border: `1px solid ${C.line}`, color: C.chalk, textAlign: "left" }}>
          <BdayHalo size={52}><Avatar profile={profile} size={52} /></BdayHalo>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name || T("defaultName")}</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}><span style={{ color: C.sky, fontWeight: 800 }}>⚡ {lv.lvl}</span> · <span style={{ color: "#ffa94d", fontWeight: 800 }}>🔥 {st.n}</span></div>
          </div>
        </button>
        {session && (
          <button onClick={onResume} className="drawerItem" data-resume style={{ ...btnBase, "--i": 1, margin: "6px 14px", padding: "13px 14px", borderRadius: 16, background: C.signal, color: C.signalInk, display: "flex", alignItems: "center", gap: 10, fontSize: 15, textAlign: "left" }}>
            <span style={{ fontSize: 18 }}>▶</span>{T("resumeWorkout", { d: session.day })}
          </button>
        )}
        <div data-nav-box style={{ margin: "6px 14px 12px", padding: "4px", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18 }}>
          {items.map((it, i) => {
            const on = it.id === screen;
            return (
              <button key={it.id} onClick={() => onGo(it.id)} aria-current={on ? "page" : undefined} className="drawerItem" data-screen={it.id}
                style={{ ...btnBase, "--i": i + 2, width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "10px 10px", margin: "2px 0", borderRadius: 14, background: on ? `${C.signal}1a` : "transparent", color: on ? C.signal : C.chalk, textAlign: "left" }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: on ? `${C.signal}26` : C.panelHi, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><TabIcon name={it.id} active={on} /></span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{it.label}</span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.dim, marginTop: 1 }}>{it.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        <AboutBox gh={gh} dl={dl} onNews={onNews} />
      </nav>
    </div>,
    document.body
  );
}

// Floating card while a workout runs in the background (like a minimized video). Tap = back to the workout.
function MiniPlayer({ session, live, onOpen }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 250); return () => clearInterval(t); }, []);
  const day = DAYS.find(d => d.id === session.day);
  const base = session.base || {};
  const seq = buildSeq(session.day, session.rounds, session.swaps || {}, base);
  const cur = seq[Math.min(session.pos, seq.length - 1)];
  const secsLeft = endAt => Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  let label, big = null, total = null, color = C.signal;
  if (session.phase === "rest" && session.rest) {
    const nxt = seq[session.rest.nextPos];
    big = secsLeft(session.rest.endAt); total = session.rest.total; color = C.sky;
    label = T("miniRest", { name: EX[nxt.id].name });
  } else if (session.phase === "work" && live && (live.kind === "hold" || live.kind === "prep") && live.endAt) {
    big = secsLeft(live.endAt); total = live.total; color = live.kind === "hold" ? C.chalk : C.signal;
    label = live.kind === "hold" ? T("miniHold", { name: EX[cur.id].name }) : T("miniPrep", { name: EX[cur.id].name });
  } else if (session.phase === "work") label = T("miniNext", { name: EX[cur.id].name });
  else if (session.phase === "warmup") label = T("miniWarmup");
  else if (session.phase === "cool") label = T("miniCool");
  else label = T("miniDone");
  const pct = big !== null && total ? big / total : 0;
  return createPortal(
    <button onClick={onOpen} className="miniIn" data-mini aria-label={T("miniOpen")}
      style={{ ...btnBase, position: "fixed", left: "50%", bottom: "calc(14px + var(--sab))", transform: "translateX(-50%)", zIndex: 40, width: "min(calc(100vw - 24px), 436px)", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 20, background: C.panelHi, border: `1.5px solid ${color}88`, boxShadow: "0 12px 34px rgba(0,0,0,.45)", color: C.chalk, textAlign: "left" }}>
      <span style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
        <svg width="48" height="48" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke={C.line} strokeWidth="4" />
          {big !== null && <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={125.7} strokeDashoffset={125.7 * (1 - pct)} style={{ transition: "stroke-dashoffset .25s linear" }} />}
        </svg>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: big !== null ? 20 : 18, color }}>{big !== null ? big : "▶"}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 12, color: C.dim, fontWeight: 600 }}>{T("dayRound", { d: day.id, r: cur.r + 1, n: session.rounds })}</span>
        <span style={{ display: "block", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </span>
      <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 800, color: C.signal, flexShrink: 0 }}>{T("miniBack")}</span>
    </button>,
    document.body
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

// "What's new": page 1 = the big update (each change next to how it was before), then one page per
// small update of the same big version (1.4.1, 1.4.2, … 1.4.9, 1.4.9.1 …), reached by swiping left.
// Texts: news<big> (e.g. news14: [title, before, now]) and news<small> (e.g. news141: [line, …]).
const bigVer = v => String(v || "0.0").split(".").slice(0, 2).join(".");
const verCmp = (a, b) => {
  const x = String(a || "0").split(".").map(Number), y = String(b || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
};
const newsKey = v => "news" + v.replace(/\./g, "");
// Small-update lines that make no sense any more once the next big update is out (index in that version's list).
const NEWS_OBSOLETE = { "1.0.3": [0] }; // "if you have 1.0.0, install the 1.0.3 APK"
function newsPages() {
  const big = bigVer(APP_VERSION);
  // Lines starting with 📱 are about the Android app only (updates…); the website hides them (Michael, Oct 10).
  const forHere = arr => arr.filter(l => isNative || !String(Array.isArray(l) ? l[0] : l).startsWith("📱"));
  // A big update also lists the small updates of the previous big version (Michael, Oct 10: they belong to it).
  const [bx, by] = big.split(".").map(Number), prevBig = by > 0 ? `${bx}.${by - 1}` : null, also = [];
  if (prevBig) {
    const pc = [];
    for (let i = 1; i <= 9; i++) pc.push(`${prevBig}.${i}`);
    for (let i = 1; i <= 9; i++) pc.push(`${prevBig}.9.${i}`);
    for (const v of pc) {
      const lines = Array.isArray(L[newsKey(v)]) ? forHere(L[newsKey(v)].filter((_, i) => !(NEWS_OBSOLETE[v] || []).includes(i))) : [];
      if (lines.length) also.push({ v, lines });
    }
  }
  const pages = [{ v: big + ".0", big: true, items: forHere(L[newsKey(big)] || []), also }];
  const cands = [];
  for (let i = 1; i <= 9; i++) cands.push(`${big}.${i}`);
  for (let i = 1; i <= 9; i++) cands.push(`${big}.9.${i}`);
  for (const v of cands) if (verCmp(v, APP_VERSION) <= 0 && Array.isArray(L[newsKey(v)]) && forHere(L[newsKey(v)]).length) pages.push({ v, items: forHere(L[newsKey(v)]) });
  return pages;
}
// A small update (same big version) with "What's new" lines the user hasn't seen yet.
const newsUnseen = seen => !!seen && bigVer(seen) === bigVer(APP_VERSION) && newsPages().some(p => !p.big && verCmp(p.v, seen) > 0);
// at = a version to open on (the card after a small update opens the current version's page)
function WhatsNew({ onClose, at }) {
  const pages = newsPages();
  const start = at ? Math.max(0, pages.findIndex(x => x.v === at)) : 0;
  const [pg, setPg] = useState(start);
  const [h, setH] = useState(null);
  const [prog, setProg] = useState(start); // scroll position in pages (1.5 = halfway from page 2 to 3), drives the dots
  const track = useRef(null);
  const refs = useRef([]);
  useLayoutEffect(() => { const el = refs.current[pg]; if (el) setH(el.offsetHeight); }, [pg]);
  useLayoutEffect(() => { const t = track.current; if (t && start) t.scrollLeft = start * t.clientWidth; }, []);
  const goTo = i => { const t = track.current; if (t) t.scrollTo({ left: i * t.clientWidth, behavior: "smooth" }); };
  const onScroll = () => {
    const t = track.current; if (!t || !t.clientWidth) return;
    const f = Math.max(0, Math.min(pages.length - 1, t.scrollLeft / t.clientWidth));
    setProg(f);
    const i = Math.round(f);
    if (i !== pg) { setPg(i); try { const b = t.closest(".sheetBox"); b && b.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {} }
  };
  const p = pages[pg] || pages[0];
  const arrow = (dis, on, label, ch) => (
    <button onClick={on} disabled={dis} aria-label={label} style={{ ...btnBase, width: 34, height: 34, padding: 0, borderRadius: 10, background: C.panelHi, color: dis ? C.line : C.chalk, fontSize: 18, flexShrink: 0 }}>{ch}</button>
  );
  return (
    <Sheet title={T("newsTitle", { v: p.v })} onClose={onClose}>
      {pages.length > 1 && (
        <div data-news-nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {arrow(pg === 0, () => goTo(pg - 1), T("newsPrev"), "‹")}
          <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {pages.map((x, i) => (
              <button key={x.v} onClick={() => goTo(i)} aria-current={i === pg ? "page" : undefined} data-news-pill={x.v}
                style={{ ...btnBase, padding: "4px 9px", borderRadius: 99, fontSize: 12, background: i === pg ? C.chalk : "transparent", color: i === pg ? C.ink : C.dim, border: `1.5px solid ${i === pg ? C.chalk : C.line}` }}>{x.v}</button>
            ))}
          </div>
          {arrow(pg === pages.length - 1, () => goTo(pg + 1), T("newsNext"), "›")}
        </div>
      )}
      <div ref={track} onScroll={onScroll} data-news-track className="noBar"
        style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", overscrollBehaviorX: "contain", height: h || "auto", transition: "height .25s ease" }}>
        {pages.map((x, i) => (
          <section key={x.v} ref={el => (refs.current[i] = el)} data-news-page={x.v} aria-hidden={i !== pg}
            style={{ flex: "0 0 100%", minWidth: 0, scrollSnapAlign: "start", scrollSnapStop: "always", boxSizing: "border-box", padding: "0 1px" }}>
            {x.big ? (<>
              <div data-whatsnew style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, marginBottom: 12 }}>{T("newsIntro")}</div>
              {pages.length > 1 && <button onClick={() => goTo(1)} data-news-swipe style={{ ...btnBase, background: "transparent", color: C.sky, fontSize: 13, padding: "0 0 12px", textAlign: "left" }}>{T("newsSwipe")}</button>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {x.items.map(([title, before, now], j) => (
                  <div key={j} style={{ ...card, padding: "12px 14px" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.chalk }}>{title}</div>
                    <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.45, marginTop: 4 }}><b>{T("newsBefore")}</b> {before}</div>
                    <div style={{ fontSize: 13, color: C.mint, lineHeight: 1.45, marginTop: 3 }}><b>{T("newsNow")}</b> {now}</div>
                  </div>
                ))}
              </div>
              {x.also && x.also.length > 0 && (
                <div data-news-also style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.chalk }}>{T("newsAlso", { a: x.also[0].v, b: x.also[x.also.length - 1].v })}</div>
                  <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.45, margin: "3px 0 10px" }}>{T("newsAlsoD")}</div>
                  <div style={{ ...card, padding: "4px 14px" }}>
                    {x.also.map((g, gi) => (
                      <div key={g.v} data-news-also-v={g.v} style={{ padding: "10px 0", borderTop: gi ? `1px solid ${C.line}` : "none" }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: C.sky, marginBottom: 6 }}>{g.v}</div>
                        {g.lines.map((line, j) => (
                          <div key={j} style={{ display: "flex", gap: 8, fontSize: 13, color: C.chalk, lineHeight: 1.45, marginTop: j ? 5 : 0 }}><span style={{ color: C.mint, fontWeight: 900 }}>•</span><span>{line}</span></div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>) : (<>
              <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, marginBottom: 12 }}>{T("newsSmall")}</div>
              <div style={{ ...card, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {x.items.map((line, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, fontSize: 14, color: C.chalk, lineHeight: 1.45 }}><span style={{ color: C.mint, fontWeight: 900 }}>•</span><span>{line}</span></div>
                ))}
              </div>
            </>)}
          </section>
        ))}
      </div>
      {/* dots + button stay pinned to the bottom of the sheet, also while page 1 is scrolled */}
      <div data-news-foot style={{ position: "sticky", bottom: -26, margin: "0 -20px -26px", padding: "2px 20px 22px", background: `linear-gradient(${C.panel}00, ${C.panel} 14px)`, zIndex: 1 }}>
        {pages.length > 1 && <PageDots n={pages.length} prog={prog} />}
        <button onClick={onClose} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 12 }}>{T("newsOk")}</button>
      </div>
    </Sheet>
  );
}
// Page dots: the active dot follows the swipe. Halfway between two pages it stretches over both
// (they "merge"), then it lets go of the old one and ends as one dot on the new page.
function PageDots({ n, prog }) {
  const D = 8, GAP = 10, step = D + GAP;
  const i = Math.min(n - 1, Math.floor(prog)), t = prog - i;
  const lead = Math.min(1, t * 2), tail = Math.max(0, t * 2 - 1); // front edge moves first, back edge catches up
  return (
    <div data-news-dots aria-hidden="true" style={{ position: "relative", width: n * D + (n - 1) * GAP, height: D, margin: "14px auto 0" }}>
      {Array.from({ length: n }, (_, k) => <span key={k} style={{ position: "absolute", left: k * step, top: 0, width: D, height: D, borderRadius: D, background: C.line }} />)}
      <span data-news-dot-active style={{ position: "absolute", top: 0, left: i * step + tail * step, width: D + (lead - tail) * step, height: D, borderRadius: D, background: C.chalk }} />
    </div>
  );
}

// After a small update, on the first start only: "The app has been updated to x, see what's new".
// ✕ hides it; the button opens What's new on the page of this version. Not shown again later.
function UpdateCard({ onOpen, onClose }) {
  return (
    <div data-update-card className="titleIn" style={{ ...card, position: "relative", padding: "14px 40px 14px 16px", marginBottom: 14, borderColor: `${C.signal}88`, display: "flex", gap: 12, alignItems: "center" }}>
      <span style={{ fontSize: 26 }}>🎉</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.chalk }}>{T("updTitle", { v: APP_VERSION })}</div>
        <button onClick={() => { sfxTap(); onOpen(); }} data-update-open style={{ ...btnBase, background: "transparent", color: C.signal, fontSize: 14, padding: "4px 0 0", textAlign: "left" }}>{T("updBtn")} ›</button>
      </div>
      <CloseX onClick={onClose} />
    </div>
  );
}

// A newer big version needs a new APK: a card on Home (app only). Since 1.2.0 the APK is downloaded inside the
// app with a progress bar (Michael, Oct 10: never leave the app for the browser) and installed only when the user
// taps "Install", never during a workout. Android then shows its own install confirmation.
function useApk() { const [s, setS] = useState(apkState()); useEffect(() => { const off = onApk(setS); setS(apkState()); return off; }, []); return s; } // re-read: it may have changed before subscribing
function ApkUpdateCard({ info, busy, onClose }) {
  const st = useApk();
  const [perm, setPerm] = useState(false); // "install unknown apps" not allowed yet: explain + open Settings
  useEffect(() => onAppResume(async () => { if (await apkCanInstall()) setPerm(false); }), []);
  const s = st.v === info.version ? st : { kind: "idle" };
  const inApp = apkSupported();
  const download = () => { sfxTap(); if (inApp && info.url) apkDownload(info); else openExternal(info.url || "https://github.com/mikydon/hw-app/releases/latest"); };
  const install = async () => { sfxTap(); if (!(await apkCanInstall())) { setPerm(true); return; } setPerm(false); apkInstall(); };
  const pct = Math.max(0, Math.min(100, Math.round(s.pct || 0)));
  const col = s.kind === "error" ? "#ff8a80" : s.kind === "ready" ? C.mint : s.kind === "downloading" ? C.sky : C.mint;
  const link = { ...btnBase, background: "transparent", color: col, fontSize: 14, padding: "6px 0 0", textAlign: "left" };
  const solid = { ...btnBase, background: col, color: C.ink, padding: "9px 14px", fontSize: 14, marginTop: 10 };
  return (
    <div data-apk-update={s.kind} className="titleIn" style={{ ...card, position: "relative", padding: "14px 40px 14px 16px", marginBottom: 14, borderColor: `${col}99` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 26, lineHeight: 1.1 }}>{s.kind === "ready" ? "✅" : s.kind === "downloading" ? "⬇️" : s.kind === "error" ? "⚠️" : "📲"}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.chalk }}>
            {s.kind === "downloading" ? T("apkDl", { v: info.version }) : s.kind === "ready" ? T("apkReady", { v: info.version }) : s.kind === "error" ? T("apkErr") : T("apkUpdTitle", { v: info.version })}
            {info.test && <span data-apk-test style={{ marginLeft: 6, fontSize: 10, fontWeight: 900, padding: "2px 6px", borderRadius: 6, background: C.signal, color: C.signalInk, verticalAlign: "middle" }}>{T("apkTestTag")}</span>}
          </div>
          {s.kind === "idle" && <>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45, marginTop: 2 }}>{T(inApp ? "apkUpdBody" : "apkUpdBodyWeb")}</div>
            <button onClick={download} data-apk-download style={link}>{T("apkUpdBtn")} ›</button>
          </>}
          {s.kind === "downloading" && <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 99, background: C.panelHi, overflow: "hidden" }}><div data-apk-pct={pct} style={{ width: `${Math.max(3, pct)}%`, height: "100%", background: C.sky, borderRadius: 99, transition: "width .3s" }} /></div>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.sky, fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>{pct} %</span>
            </div>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45, marginTop: 6 }}>{T("apkDlD")}</div>
          </>}
          {s.kind === "ready" && (busy ? <div data-apk-busy style={{ fontSize: 12, color: C.signal, lineHeight: 1.45, marginTop: 4 }}>{T("apkBusy")}</div> : <>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45, marginTop: 2 }}>{T("apkReadyD")}</div>
            {perm ? <>
              <div data-apk-perm style={{ fontSize: 12, color: C.chalk, lineHeight: 1.5, marginTop: 8, background: C.panelHi, borderRadius: 12, padding: "9px 11px" }}>{T("apkPermD")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button data-apk-allow onClick={() => { sfxTap(); apkAllow(); }} style={solid}>{T("apkPermBtn")}</button>
                <button data-apk-install onClick={install} style={{ ...solid, background: "transparent", color: C.mint, border: `1.5px solid ${C.line}` }}>{T("apkInstall")}</button>
              </div>
            </> : <button data-apk-install onClick={install} style={solid}>{T("apkInstall")}</button>}
            {s.err && <div style={{ fontSize: 11, color: "#ff8a80", marginTop: 6 }}>{s.err}</div>}
          </>)}
          {s.kind === "error" && <>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45, marginTop: 2 }}>{T("apkErrD")}</div>
            <button data-apk-retry onClick={download} style={link}>{T("apkRetry")} ›</button>
          </>}
        </div>
      </div>
      {s.kind !== "downloading" && <CloseX onClick={onClose} />}
    </div>
  );
}

// Helper hints: now and then (every other day) one short "did you know" card on Home, each pointing
// to a feature, with a button that opens it. Seen hints are skipped until all were shown.
const HINTS = [
  { k: "themes", go: "settings" }, { k: "exercises", go: "settings" }, { k: "calories", go: "calories" },
  { k: "minimize", go: null }, { k: "backup", go: "settings" }, { k: "history", go: "history" },
  { k: "howto", go: null }, { k: "freeze", go: "profile" }, { k: "language", go: "settings" }, { k: "birthday", go: "calories" },
];
function HintCard({ ui, setUi, onGo }) {
  const today = dateKey();
  if (!ui.hint || ui.hint.date !== today || ui.hintHidden === today) return null;
  const h = HINTS.find(x => x.k === ui.hint.k);
  if (!h) return null;
  return (
    <div data-hint={h.k} style={{ ...card, position: "relative", padding: "12px 40px 12px 14px", marginTop: 14, display: "flex", gap: 10, alignItems: "flex-start", borderColor: `${C.sky}66` }}>
      <CloseX onClick={() => setUi({ ...ui, hintHidden: today })} />
      <div style={{ fontSize: 20, lineHeight: 1.2 }}>💡</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.sky }}>{T("hintTitle")}</div>
        <div style={{ fontSize: 14, color: C.chalk, lineHeight: 1.45, marginTop: 2 }}>{T("hint_" + h.k)}</div>
        {h.go && <button onClick={() => { setUi({ ...ui, hintHidden: today }); onGo(h.go); }} style={{ ...btnBase, background: "transparent", color: C.sky, padding: "6px 0 0", fontSize: 13 }}>{T("hintGo")} ›</button>}
      </div>
    </div>
  );
}

// Confetti once per app start on the birthday (kept in memory, so no write races with the daily line).
let BDAY_BURST = null;
function BirthdayCard({ profile, ui, setUi }) {
  const today = dateKey();
  const show = bdayToday() && ui.bdayHidden !== today;
  const [burst] = useState(() => show && BDAY_BURST !== today);
  useEffect(() => { if (burst) BDAY_BURST = today; }, []);
  if (!show) return null;
  const age = ageOn(profile.birth, today);
  return (
    <div data-bday className="pop" style={{ position: "relative", marginBottom: 16, borderRadius: 20, padding: "16px 44px 16px 16px", background: `linear-gradient(135deg, ${C.signal}33, #ff7ab633 55%, ${C.sky}33)`, border: `2px solid ${C.signal}` }}>
      {burst && <Confetti count={90} />}
      <CloseX onClick={() => setUi({ ...ui, bdayHidden: today })} />
      <div style={{ fontSize: 34, lineHeight: 1 }}>🎂🎉</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 0.95, color: C.signal, marginTop: 6 }}>{T("bdayTitle", { name: profile.name || T("defaultName") })}</div>
      {age !== null && <div style={{ fontSize: 15, fontWeight: 800, color: C.chalk, marginTop: 6 }}>{T("bdayAge", { n: age })}</div>}
      <div style={{ fontSize: 14, color: C.chalk, lineHeight: 1.5, marginTop: 6 }}>{T("bdayBody")}</div>
    </div>
  );
}

// "I can't train today" (Michael, Oct 9): a reason, saved with the day (profile.skips[date] = {r, note}),
// plus a freeze if one is left. Later a free AI may judge the reason; for now it is only recorded.
const SKIP_REASONS = [["sick", "🤒"], ["pain", "🤕"], ["work", "💼"], ["travel", "✈️"], ["other", "🙂"]];
const skipIcon = r => (SKIP_REASONS.find(x => x[0] === r) || ["", "🧊"])[1];
function SkipSheet({ freezes, onSave, onClose }) {
  const [r, setR] = useState(null);
  const [note, setNote] = useState("");
  return (
    <Sheet title={T("skipTitle")} onClose={onClose}>
      <div data-skip-sheet>
        <div style={{ fontSize: 14, color: C.dim, marginBottom: 10 }}>{T("skipWhy")}</div>
        <div role="radiogroup" aria-label={T("skipWhy")} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SKIP_REASONS.map(([k, ic]) => (
            <button key={k} role="radio" aria-checked={r === k} data-skip-r={k} onClick={() => { sfxTap(); setR(k); }}
              style={{ ...btnBase, padding: "9px 13px", fontSize: 14, background: r === k ? C.sky : "transparent", color: r === k ? C.ink : C.chalk, border: `1.5px solid ${r === k ? C.sky : C.line}` }}>{ic} {T("skip_" + k)}</button>
          ))}
        </div>
        <label style={{ display: "block", fontSize: 13, color: C.dim, marginTop: 14 }}>{T("skipNote")}
          <textarea data-skip-note value={note} maxLength={200} rows={2} onChange={e => setNote(e.target.value)}
            style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, background: C.ink, color: C.chalk, border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 15, fontFamily: BODY, resize: "vertical" }} />
        </label>
        {(r === "sick" || r === "pain") && <div data-skip-rest style={{ marginTop: 12, fontSize: 13, color: C.chalk, lineHeight: 1.5, background: C.panelHi, borderRadius: 12, padding: "10px 12px" }}>{T("skipRestHint")}</div>}
        {freezes > 0 ? (
          <button data-skip-freeze disabled={!r} onClick={() => onSave({ r, note: note.trim() }, true)} className="b3d" style={{ ...bigBtn(C.sky, C.ink), marginTop: 16, opacity: r ? 1 : 0.5 }}>{T("skipUse", { n: freezes })}</button>
        ) : (
          <>
            <div style={{ marginTop: 14, fontSize: 13, color: C.signal, lineHeight: 1.5 }}>{T("skipNoFreeze")}</div>
            <button data-skip-save disabled={!r} onClick={() => onSave({ r, note: note.trim() }, false)} className="b3d" style={{ ...bigBtn(C.panelHi, C.chalk), marginTop: 12, opacity: r ? 1 : 0.5 }}>{T("skipSave")}</button>
          </>
        )}
        {!r && <div style={{ fontSize: 12, color: C.dim, marginTop: 8, textAlign: "center" }}>{T("skipPick")}</div>}
      </div>
    </Sheet>
  );
}

// App only: a small update downloading / ready, shown at the top of Home (Michael, Oct 10: so nobody closes the app halfway).
function UpdateBanner({ dl, busy, onClose }) {
  if (!dl) return null;
  if (dl.kind === "downloading") {
    const pct = Math.max(0, Math.min(100, Math.round(dl.pct || 0)));
    return (
      <div data-dl="downloading" role="status" style={{ ...card, padding: "11px 14px", marginBottom: 12, borderColor: `${C.sky}88` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.chalk }}>⬇️ {T("updDownloading", { v: dl.v })}</div>
        <div style={{ height: 6, borderRadius: 99, background: C.panelHi, marginTop: 8, overflow: "hidden" }}><div data-dl-pct={pct} style={{ width: `${Math.max(4, pct)}%`, height: "100%", background: C.sky, borderRadius: 99, transition: "width .3s" }} /></div>
      </div>
    );
  }
  return (
    <div data-dl="ready" role="status" style={{ ...card, padding: "11px 14px", marginBottom: 12, borderColor: `${C.mint}88`, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.mint }}>✓ {T("updReady", { v: dl.v })}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{T("updReadyLater")}</div>
      </div>
      {!busy && <button data-dl-now onClick={() => { sfxTap(); applyUpdateNow(dl.id); }} style={{ ...btnBase, background: C.mint, color: C.ink, padding: "8px 12px", fontSize: 13, flexShrink: 0 }}>{T("updReadyNow")}</button>}
      <button onClick={onClose} aria-label={T("close")} style={{ ...btnBase, background: "transparent", color: C.dim, padding: "4px 6px", fontSize: 16, flexShrink: 0 }}>✕</button>
    </div>
  );
}

// Floating start bar: two small squares (19 / 13 min) and a wide "Start day X". It slides up when the rounds
// buttons on Home are off screen and slides away when they are visible (then the normal button is right there).
function FloatStart({ show, day, rounds, setRounds, onStart }) {
  return createPortal(
    <div data-fstart={show ? "on" : "off"} aria-hidden={!show} className={"fstart" + (show ? " on" : "")}
      style={{ position: "fixed", left: 0, right: 0, bottom: "calc(var(--sab, 0px) + 12px)", zIndex: 40, display: "flex", justifyContent: "center", padding: "0 12px", pointerEvents: show ? "auto" : "none" }}>
      <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 436, padding: 8, borderRadius: 22, background: `${C.ink}e6`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `1px solid ${C.line}`, boxShadow: "0 12px 34px rgba(0,0,0,.5)" }}>
        {[3, 2].map((n, i) => (
          <button key={n} tabIndex={show ? 0 : -1} data-fround={n} aria-pressed={rounds === n} aria-label={T("roundsBtn", { n, m: n === 2 ? 13 : 19 })} onClick={() => { sfxTap(); setRounds(n); }} className="fsq" style={{ ...btnBase, "--d": `${60 + i * 50}ms`, width: 58, flexShrink: 0, borderRadius: 14, padding: "6px 0", background: rounds === n ? C.chalk : C.panel, color: rounds === n ? C.ink : C.dim, border: `1.5px solid ${rounds === n ? C.chalk : C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900 }}>{n === 2 ? 13 : 19}</span>
            <span style={{ fontSize: 10, fontWeight: 800, marginTop: 2 }}>min</span>
          </button>
        ))}
        <button tabIndex={show ? 0 : -1} data-fstart-go onClick={onStart} className="b3d fsq" style={{ ...bigBtn(C.signal, C.signalInk), "--d": "160ms", flex: 1, minWidth: 0, padding: "10px 12px", fontSize: 17, borderRadius: 14 }}>{T("startDay", { d: day })}</button>
      </div>
    </div>,
    document.body
  );
}

// First start (Michael, Oct 9–10): nick, then the calorie details (gender, birth date, height, weight, activity),
// then the calorie goal. Every step can be skipped; whatever is missing is listed at the top of Home (SetupCard).
function missingSetup(profile, kcal) {
  const k = kcal || {}, out = [];
  if (!profile.name || profile.name === "User") out.push("name");
  const kc = ["sex", "birth", "height", "weight", "activity"].filter(f => f === "birth" ? !(profile.birth && profile.birth.y) : !k[f]);
  return { name: out.length > 0, kcal: kc, goal: !kc.length && !k.goal };
}
// One question per screen (Michael, Oct 10: "meno, Ďalej, dátum, Ďalej…", not everything at once).
// Each answer is saved on "Ďalej", so skipping later keeps what was filled in.
// Grey example in the empty weight field: a healthy weight for the height entered (BMI 22, the middle of the WHO
// normal range 18.5–24.9), never a fixed number that could put someone off (Michael, Oct 10).
const idealKg = h => (h >= 100 && h <= 250 ? Math.round(22 * (h / 100) ** 2) : 0);
const OB_STEPS = ["name", "sex", "birth", "height", "weight", "activity", "goal"];
function obStepFor(profile, kcal) {
  const m = missingSetup(profile, kcal);
  return m.name ? 0 : m.kcal.length ? OB_STEPS.indexOf(m.kcal[0]) : OB_STEPS.length - 1;
}
// Month and day pickers in the app's colours (Michael, Oct 10: the phone's grey dropdowns looked ugly).
const monthNames = style => Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString(LANG, { month: style }));
const pickBtn = on => ({ ...btnBase, padding: "11px 0", fontSize: 14, minWidth: 0, background: on ? C.signal : C.panel, color: on ? C.signalInk : C.chalk, border: `1.5px solid ${on ? C.signal : C.line}`, "--e": on ? EDGE[C.signal] || "transparent" : "transparent" });
function MonthGrid({ value, onChange }) {
  return (
    <div data-month-grid role="radiogroup" aria-label={T("kcMonth")} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
      {monthNames("short").map((m, i) => {
        const on = value === i + 1;
        return <button key={i} role="radio" aria-checked={on} aria-label={monthNames("long")[i]} data-month={i + 1} onClick={() => { sfxTap(); onChange(on ? 0 : i + 1); }}
          style={{ ...pickBtn(on), textTransform: "capitalize", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.replace(/\.$/, "")}</button>;
      })}
    </div>
  );
}
function DayGrid({ value, max, onChange }) {
  return (
    <div data-day-grid role="radiogroup" aria-label={T("kcDay")} style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
      {Array.from({ length: max }, (_, i) => {
        const d = i + 1, on = value === d;
        return <button key={d} role="radio" aria-checked={on} data-day={d} onClick={() => { sfxTap(); onChange(on ? 0 : d); }} style={{ ...pickBtn(on), padding: "9px 0", fontVariantNumeric: "tabular-nums" }}>{d}</button>;
      })}
    </div>
  );
}
function Onboarding({ start = 0, profile, setProfile, kcal, setKcal, onDone }) {
  const thisYear = parseKey(dateKey()).getFullYear();
  const k0 = kcal || {}, b0 = profile.birth || {};
  const [step, setStep] = useState(start);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState(profile.name && profile.name !== "User" ? profile.name : "");
  const [sex, setSex] = useState(k0.sex || "");
  const [year, setYear] = useState(b0.y ? String(b0.y) : "");
  const [month, setMonth] = useState(b0.m || 0);
  const [day, setDay] = useState(b0.d || 0);
  const [height, setHeight] = useState(k0.height ? String(k0.height) : "");
  const [weight, setWeight] = useState(k0.weight ? String(k0.weight) : "");
  const [activity, setActivity] = useState(k0.activity || "");
  const [err, setErr] = useState("");
  const [askDate, setAskDate] = useState(false);
  const id = OB_STEPS[step], last = OB_STEPS.length - 1;
  const goTo = n => { setErr(""); setDir(n >= step ? 1 : -1); if (n > last) onDone(); else { setStep(n); window.scrollTo(0, 0); } };
  const saveK = patch => setKcal({ ...(kcal || {}), ...patch, log: (kcal && kcal.log) || {} });
  const daysIn = month ? new Date(Number(year) || 2000, month, 0).getDate() : 31;
  const num = (v, max) => v.replace(/[^0-9]/g, "").slice(0, max);
  const filled = { name: !!name.trim(), sex: !!sex, birth: year.length === 4, height: !!height, weight: !!weight, activity: !!activity, goal: true }[id];
  const next = confirmed => {
    if (id === "name") setProfile({ ...profile, name: name.trim() });
    else if (id === "sex") saveK({ sex });
    else if (id === "birth") {
      const y = Number(year);
      if (!y || y < thisYear - 100 || y > thisYear - 10) { setErr(T("kcErrYear")); return; }
      if (month && !day) { setErr(T("kcErrDate")); return; }
      if (!month && confirmed !== true) { setAskDate(true); return; }
      setProfile({ ...profile, birth: { y, m: month || null, d: month ? Math.min(day, daysIn) : null } });
    } else if (id === "height") { const h = Number(height); if (h < 100 || h > 250) { setErr(T("kcErrHeight")); return; } saveK({ height: h }); }
    else if (id === "weight") { const w = Number(weight); if (w < 30 || w > 300) { setErr(T("kcErrWeight")); return; } saveK({ weight: w }); }
    else if (id === "activity") saveK({ activity });
    sfxCheck(); goTo(step + 1);
  };
  const age = ageOn(profile.birth, dateKey());
  const miss = missingSetup(profile, kcal).kcal;
  const wrapS = { padding: "calc(14px + var(--sat)) 18px calc(30px + var(--sab))", maxWidth: 460, margin: "0 auto" };
  const title = txt => <div style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 900, lineHeight: 1, color: C.chalk }}>{txt}</div>;
  const desc = txt => <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, margin: "8px 0 18px" }}>{txt}</div>;
  const bigField = { display: "block", width: "100%", boxSizing: "border-box", fontFamily: BODY, fontSize: 22, fontWeight: 800, padding: "14px 16px", borderRadius: 16, border: `1.5px solid ${C.line}`, background: C.panel, color: C.chalk, outline: "none" };
  const numField = (val, set, max, ph, unit, label) => (
    <div style={{ position: "relative" }}>
      <input className="obf" data-ob-input={id} value={val} autoFocus inputMode="numeric" placeholder={ph} aria-label={label}
        onChange={e => { set(num(e.target.value, max)); setErr(""); }} onKeyDown={e => { if (e.key === "Enter" && filled) next(); }}
        style={{ ...bigField, fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, padding: unit ? "10px 64px 10px 18px" : "10px 18px" }} />
      {unit && <span aria-hidden="true" style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 800, color: C.dim }}>{unit}</span>}
    </div>
  );
  const sub = { fontSize: 12, color: C.dim, fontWeight: 800, margin: "16px 0 7px", textTransform: "uppercase", letterSpacing: ".04em" };
  return (
    <div data-onboard={step} data-ob-step={id} style={wrapS}>
      {askDate && (
        <Sheet title={T("kcNoDateTitle")} onClose={() => setAskDate(false)}>
          <div style={{ fontSize: 15, color: C.chalk, lineHeight: 1.55 }}>{T("kcNoDateBody")}</div>
          <button onClick={() => setAskDate(false)} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 16 }}>{T("kcNoDateAdd")}</button>
          <button data-ob-yearonly onClick={() => { setAskDate(false); next(true); }} style={{ ...bigBtn("transparent", C.dim), marginTop: 8, border: `1.5px solid ${C.line}` }}>{T("kcNoDateSkip")}</button>
        </Sheet>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, minHeight: 34 }}>
        {step > 0 ? <button data-ob-back onClick={() => { sfxTap(); goTo(step - 1); }} aria-label={T("back")} style={{ ...btnBase, background: "transparent", color: C.chalk, fontSize: 14, padding: "6px 2px", flexShrink: 0 }}>‹ {T("back")}</button> : <span />}
        <span style={{ flex: 1 }} />
        <button data-ob-skipall onClick={() => { sfxTap(); onDone(); }} style={{ ...btnBase, background: "transparent", color: C.dim, fontSize: 13, padding: "6px 2px", flexShrink: 0 }}>{T("obSkipAll")}</button>
      </div>
      <div aria-label={T("obStep", { n: step + 1, m: OB_STEPS.length })} role="img" style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        {OB_STEPS.map((_, i) => <span key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i < step ? C.signal : i === step ? `${C.signal}aa` : C.panelHi, transition: "background .3s" }} />)}
      </div>
      <div style={{ fontSize: 12, color: C.dim, fontWeight: 700, marginBottom: 18 }}>{T("obStep", { n: step + 1, m: OB_STEPS.length })}</div>
      <div key={step} className={dir > 0 ? "obIn" : "obBack"}>
        {id === "name" && <>
          <Logo size={56} />
          <div style={{ marginTop: 14 }}>{title(T("obHello"))}</div>
          {desc(T("obName"))}
          <input className="obf" data-ob-name value={name} maxLength={24} autoFocus onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && name.trim()) next(); }} placeholder={T("obNamePh")} aria-label={T("obNamePh")} style={bigField} />
        </>}
        {id === "sex" && <>
          {title(T("kcSex"))}
          {desc(T("obSexD"))}
          <div role="radiogroup" aria-label={T("kcSex")} style={{ display: "flex", gap: 10 }}>
            {[["m", "kcMale", "♂"], ["f", "kcFemale", "♀"]].map(([v, k, ic]) => (
              <button key={v} role="radio" aria-checked={sex === v} data-ob-sex={v} onClick={() => { sfxTap(); setSex(v); }}
                style={{ ...btnBase, flex: 1, padding: "22px 0 18px", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: sex === v ? C.signal : C.panel, border: `2px solid ${sex === v ? C.signal : C.line}`, color: sex === v ? C.signalInk : C.chalk, transition: "background .2s, color .2s" }}>
                <span aria-hidden="true" style={{ fontSize: 34, lineHeight: 1 }}>{ic}</span>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{T(k)}</span>
              </button>
            ))}
          </div>
        </>}
        {id === "birth" && <>
          {title(T("obBirthT"))}
          {desc(T("obBirthD"))}
          <div style={{ ...sub, marginTop: 0 }}>{T("kcYear")} <span style={{ color: "#ff8a80" }}>*</span></div>
          {numField(year, v => setYear(v), 4, "2000", "", T("kcYear"))}
          <div style={sub}>{T("kcMonth")}</div>
          <MonthGrid value={month} onChange={v => { setMonth(v); if (!v) setDay(0); setErr(""); }} />
          {month > 0 && <>
            <div style={sub}>{T("kcDay")}</div>
            <DayGrid value={day} max={daysIn} onChange={v => { setDay(v); setErr(""); }} />
          </>}
        </>}
        {id === "height" && <>{title(T("obHeightT"))}{desc(T("obHeightD"))}{numField(height, setHeight, 3, "0", "cm", T("kcHeight"))}</>}
        {id === "weight" && <>{title(T("obWeightT"))}{desc(T("obWeightD"))}{numField(weight, setWeight, 3, String(idealKg(Number(height)) || 0), "kg", T("kcWeight"))}</>}
        {id === "activity" && <>
          {title(T("obActT"))}
          {desc(T("kcActivityHint"))}
          <div role="radiogroup" aria-label={T("kcActivity")} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {ACTIVITY.map(([a]) => (
              <button key={a} role="radio" aria-checked={activity === a} data-ob-act={a} onClick={() => { sfxTap(); setActivity(a); }}
                style={{ ...btnBase, textAlign: "left", padding: "11px 13px", background: activity === a ? `${C.signal}1f` : C.panel, border: `1.5px solid ${activity === a ? C.signal : C.line}`, color: C.chalk }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: activity === a ? C.signal : C.chalk }}>{T("kcAct_" + a)}</span>
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.dim, marginTop: 1 }}>{T("kcActD_" + a)}</span>
              </button>
            ))}
          </div>
        </>}
        {id === "goal" && <>
          {title(T("obGoalTitle"))}
          {desc(T("kcPickBody"))}
          {!miss.length && age !== null
            ? <KcalGoals kcal={kcal} age={age} onPick={goal => { sfxCheck(); setKcal({ ...kcal, goal }); onDone(); }} />
            : <div data-ob-nodata style={{ fontSize: 14, color: C.signal, lineHeight: 1.5 }}>{T("setupNoKcal", { what: miss.map(f => T("setup_" + f)).join(", ") })}</div>}
        </>}
        {err && <div role="alert" style={{ fontSize: 14, color: "#ff8a80", fontWeight: 700, marginTop: 12 }}>{err}</div>}
        {id !== "goal" && <button data-ob-next disabled={!filled} onClick={() => next()} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 22, opacity: filled ? 1 : 0.45 }}>{T("obNext")}</button>}
        <button data-ob-skip onClick={() => { sfxTap(); goTo(step + 1); }} style={{ ...ghostBtn, display: "block", margin: "12px auto 0" }}>{T("obSkip")}</button>
      </div>
    </div>
  );
}
// Top of Home: what the first-start setup is still missing, with a button that opens it at the right step.
function SetupCard({ profile, kcal, onFix, onClose }) {
  const m = missingSetup(profile, kcal);
  if (!m.name && !m.kcal.length && !m.goal) return null;
  const lines = [];
  if (m.name) lines.push(T("setupNoName"));
  if (m.kcal.length) lines.push(T("setupNoKcal", { what: m.kcal.map(f => T("setup_" + f)).join(", ") }));
  else if (m.goal) lines.push(T("setupNoGoal"));
  const step = obStepFor(profile, kcal);
  return (
    <div data-setup-card style={{ ...card, padding: "12px 14px", marginBottom: 12, borderColor: `${C.signal}88`, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.signal }}>⚙️ {T("setupTitle")}</div>
        {lines.map((l, i) => <div key={i} style={{ fontSize: 12, color: C.chalk, lineHeight: 1.45, marginTop: 3 }}>{l}</div>)}
      </div>
      <button data-setup-fix onClick={() => { sfxTap(); onFix(step); }} style={{ ...btnBase, background: C.signal, color: C.signalInk, padding: "8px 12px", fontSize: 13, flexShrink: 0 }}>{T("setupFix")}</button>
      <button onClick={onClose} aria-label={T("close")} style={{ ...btnBase, background: "transparent", color: C.dim, padding: "4px 6px", fontSize: 16, flexShrink: 0 }}>✕</button>
    </div>
  );
}

function TrainTab({ history, onStart, onFreeze, ui, setUi, active, onResume, profile, onGo, upd, apk, kcal, setKcal, dl, onDlClose, onSetup }) {
  const today = dateKey();
  // Make sure today's daily line and the "done" card texts are picked (and saved) before painting.
  useLayoutEffect(() => { const n = uiForToday(ui, history, today, profile); if (n !== ui) setUi(n); });
  const auto = nextDayIdx(history);
  const [dayIdx, setDayIdx] = useState(auto);
  const [rounds, setRounds] = useState(3); // 3 rounds recommended (more weekly sets); 2 when short on time
  // While the rounds buttons are off screen, a floating bar offers 19 / 13 min + Start (Michael, Oct 10).
  const roundsRow = useRef(null);
  const [rowSeen, setRowSeen] = useState(true);
  useEffect(() => {
    const el = roundsRow.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setRowSeen(e.isIntersecting), { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, [active]);
  const [howEx, setHowEx] = useState(null);
  const last = history[history.length - 1];
  const gap = last ? daysBetween(last.date, today) : null;
  const day = DAYS[dayIdx];
  const st = streakInfo(history, today);

  const doneToday = !!last && gap <= 0;
  const lastTs = last ? entryTs(last) : 0;
  const showDone = doneToday && ui.doneHiddenTs !== lastTs;
  const dv = ui.doneVar && ui.doneVar.ts === lastTs ? ui.doneVar : { t: 0, s: 0 };
  const dailyText = ui.daily && ui.daily.date === today && ui.dailyHidden !== today ? (bdayToday() ? T("bdayDaily") : (() => { const pool = dailyPool(ui.daily.kind); return pool[ui.daily.i % pool.length]; })()) : null;
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

      <UpdateBanner dl={dl} busy={!!active} onClose={onDlClose} />
      {apk && <ApkUpdateCard info={apk.info} busy={!!active} onClose={apk.close} />}
      {profile && !(ui && ui.setupHidden) && <SetupCard profile={profile} kcal={kcal} onFix={onSetup} onClose={() => setUi({ ...ui, setupHidden: true })} />}
      {upd && <UpdateCard onOpen={upd.open} onClose={upd.close} />}
      {profile && <BirthdayCard profile={profile} ui={ui} setUi={setUi} />}
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
          {isNative && onGo && (
            <div data-move style={{ fontSize: 13, color: C.sky, lineHeight: 1.55, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
              {T("welcomeMove")}
              <button onClick={() => { sfxTap(); onGo("settings"); }} style={{ ...btnBase, display: "block", background: "transparent", color: C.signal, fontSize: 14, padding: "6px 0 0" }}>{T("welcomeMoveBtn")} ›</button>
            </div>
          )}
        </div>
      )}

      {dailyText && (
        <div style={{ position: "relative", padding: "4px 40px 4px 14px", borderLeft: `4px solid ${C.signal}` }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 27, fontWeight: 800, lineHeight: 1.1, color: C.chalk }}>{dailyText}</div>
          <CloseX onClick={() => setUi({ ...ui, dailyHidden: today })} />
        </div>
      )}

      {onGo && <HintCard ui={ui} setUi={setUi} onGo={onGo} />}
      <Sect title={T("secWeek")} accent={C.mint} style={LOOK === "flat" ? { marginTop: 16 } : {}}>
      <div style={{ display: "flex", gap: 6 }} aria-label={T("weekLine", { count: TP("workouts", weekCount) })}>
        {week.map(w => (
          <button key={w.k} data-week-day={w.k} onClick={() => onGo && onGo("history", w.on ? { edit: w.k } : null)} aria-label={`${w.lb} ${fmtDate(w.k)}${w.on ? " ✓" : ""}`}
            style={{ ...btnBase, flex: 1, textAlign: "center", background: "transparent", padding: 0, color: "inherit" }}>
            <div style={{ fontSize: 11, color: w.isToday ? C.chalk : C.dim, fontWeight: w.isToday ? 700 : 500, marginBottom: 4 }}>{w.lb}</div>
            <div style={{ height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900,
              background: w.on ? C.mint : "transparent", color: C.ink, border: `1.5px solid ${w.on ? C.mint : w.isToday ? C.chalk : C.line}` }}>{w.on ? "✓" : ""}</div>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>{T("weekLine", { count: TP("workouts", weekCount) })}</div>
      </Sect>

      <Sect style={LOOK === "flat" ? { marginTop: 22 } : {}}>
      <div style={{ fontSize: 14, color: C.dim }}>{doneToday ? T("nextWorkout") : T("todayWorkout")}</div>
      <div data-day-title style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: fitSize(T("dayN", { d: day.id }).replace(/\s/g, "_"), doneToday ? 72 : 96, 6), lineHeight: 0.85, paddingBottom: "0.16em", letterSpacing: -1, color: C.chalk, marginTop: 4 }}>
        {T("dayN", { d: day.id })}
      </div>
      <div data-day-status style={{ fontSize: 14, color: !doneToday && gap !== null && gap >= 2 ? C.signal : C.dim, marginTop: 6, lineHeight: 1.5 }}>{status}</div>
      {!doneToday && st.gap === 2 && st.n > 0 && !st.frozenToday && !(META.skips || {})[dateKey()] && (
        <button data-skip-btn onClick={onFreeze} style={{ ...ghostBtn, marginTop: 10, color: C.sky, borderColor: C.sky }}>{T("skipBtn")}</button>
      )}
      {st.frozenToday && <div style={{ fontSize: 13, color: C.sky, marginTop: 8 }}>{T("frozenToday")}</div>}
      {(META.skips || {})[dateKey()] && <div data-skip-today style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{T("skipSaved", { r: `${skipIcon(META.skips[dateKey()].r)} ${T("skip_" + META.skips[dateKey()].r)}${META.skips[dateKey()].note ? ` (${META.skips[dateKey()].note})` : ""}` })}</div>}

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
      </Sect>

      <Sect title={T("secExercises")} accent={C.sky} titlePad="0 15px" style={LOOK === "flat" ? {} : { padding: "12px 0 4px" }}>
      <div style={LOOK === "flat" ? { ...card } : { borderTop: `1px solid ${LOOK === "tiles" ? C.line : C.line}` }}>
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
                <div style={{ fontSize: 16, fontWeight: 700 }}>{ex.name}<ExQ id={id} onOpen={() => setHowEx(id)} /></div>
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
      <div style={{ fontSize: 12, color: C.dim, marginTop: 8, padding: LOOK === "flat" ? 0 : "0 15px 8px" }}>{T("tapHint")}</div>
      </Sect>

      <Sect title={T("secLength")} accent={C.signal} style={LOOK === "flat" ? { marginTop: 14 } : {}}>
      {/* Same shape as the floating bar (Michael, Oct 10): two squares 19 / 13 min and a wide Start */}
      <div ref={roundsRow} data-rounds-row style={{ display: "flex", gap: 8, alignItems: "stretch", marginTop: 10 }}>
        {[3, 2].map(n => (
          <button key={n} onClick={() => { sfxTap(); setRounds(n); }} aria-pressed={rounds === n} data-rounds={n} aria-label={T("roundsBtn", { n, m: n === 2 ? 13 : 19 })}
            style={{ ...btnBase, position: "relative", width: 64, flexShrink: 0, padding: "8px 0", borderRadius: 14, background: rounds === n ? C.chalk : "transparent", color: rounds === n ? C.ink : C.dim, border: `1.5px solid ${rounds === n ? C.chalk : C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            {n === 3 && <span data-rec style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 9, fontWeight: 900, letterSpacing: 0.3, padding: "2px 6px", borderRadius: 99, background: C.mint, color: C.ink }}>{T("roundsRec")}</span>}
            <span style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 900 }}>{n === 2 ? 13 : 19}</span>
            <span style={{ fontSize: 10, fontWeight: 800, marginTop: 2 }}>min</span>
          </button>
        ))}
        {active ? (
          <button onClick={() => { unlockAudio(); onResume(); }} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), flex: 1, minWidth: 0, fontSize: 16, padding: "12px 10px", borderRadius: 14 }}>
            ▶ {T("resumeWorkout", { d: active.day })}
          </button>
        ) : (
          <div data-start-wrap style={{ flex: 1, minWidth: 0, display: "flex" }}>
            <button onClick={() => { unlockAudio(); onStart(day.id, rounds); }} className="b3d" data-start style={{ ...bigBtn(C.signal, C.signalInk), fontSize: 17, padding: "10px 10px", borderRadius: 14 }}>
              {T("startDay", { d: day.id })}
              <span data-start-rounds style={{ display: "block", fontSize: 11, fontWeight: 700, opacity: 0.75, marginTop: 2 }}>{T("roundsBtn", { n: rounds, m: rounds === 2 ? 13 : 19 })}</span>
            </button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 10, lineHeight: 1.5 }}>{T("roundsHint")}</div>
      </Sect>
      {!active && <FloatStart show={!rowSeen} day={day.id} rounds={rounds} setRounds={setRounds} onStart={() => { unlockAudio(); onStart(day.id, rounds); }} />}

      <HomeKcal history={history} kcal={kcal} setKcal={setKcal} onOpen={() => onGo("calories")} />
      <div style={{ marginTop: LOOK === "flat" ? 22 : LOOK === "tiles" ? 8 : 12 }}><ChallengesCard history={history} /></div>
    </div>
  );
}

// ─── CALORIES ───────────────────────────────────────────────────────────────
// Like calculator.net (default formula): Mifflin-St Jeor BMR × activity factor = maintenance (TDEE).
// The activity levels describe activity OUTSIDE the app; the app's own workouts are added on top, per day.
// Lose/gain rates: 0.25 / 0.5 / 1 kg a week, 1 kg of body fat ≈ 7700 kcal, so 275 / 550 / 1100 kcal a day.
const KCAL_KEY = "domaci-trening-v1-kcal";
const ACTIVITY = [["none", 1.2], ["light", 1.375], ["moderate", 1.465], ["active", 1.55], ["very", 1.725], ["extra", 1.9]];
const KCAL_PER_KG = 7700;
const RATES = [0.25, 0.5, 1];
const WORKOUT_MET = 6.0; // 2024 Compendium 02032: circuit training, body weight exercises
async function loadKcal() { try { const v = await store.get(KCAL_KEY); if (v) return JSON.parse(v); } catch (_) {} return null; }
async function saveKcal(k) { await store.set(KCAL_KEY, JSON.stringify(k)); }
function ageOn(birth, today = dateKey()) {
  if (!birth || !birth.y) return null;
  const t = parseKey(today);
  const y = t.getFullYear();
  let a = y - birth.y;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const bd = birth.m === 2 && birth.d === 29 && !leap ? 28 : birth.d; // same rule as isBirthday
  if (birth.m && birth.d && (t.getMonth() + 1 < birth.m || (t.getMonth() + 1 === birth.m && t.getDate() < bd))) a -= 1;
  return a;
}
function bmrOf(k, age) { return 10 * k.weight + 6.25 * k.height - 5 * age + (k.sex === "f" ? -161 : 5); }
function tdeeOf(k, age) { return bmrOf(k, age) * (ACTIVITY.find(a => a[0] === k.activity) || ACTIVITY[0])[1]; }
// Extra kcal burned by workouts done in the app that day (net, above resting: (MET − 1) × kg × hours).
function workoutKcal(history, day, kg) {
  return Math.round(history.filter(e => e.date === day).reduce((a, e) => a + (WORKOUT_MET - 1) * kg * ((e.rounds === 3 ? 19 : 13) / 60), 0));
}
function goalDelta(goal) { if (!goal || goal.type === "maintain") return 0; const d = Math.round((goal.rate * KCAL_PER_KG) / 7); return goal.type === "lose" ? -d : d; }
// Steps from Health Connect (app 1.1.0): only the steps above what the chosen activity level already assumes add calories,
// so nothing is counted twice. Assumed steps follow Tudor-Locke & Bassett 2004 (sedentary < 5,000, low active 5,000–7,499,
// somewhat active 7,500–9,999, active 10,000–12,499, highly active ≥ 12,500); the two highest levels go on in steps of 2,500.
const LEVEL_STEPS = { none: 5000, light: 7500, moderate: 10000, active: 12500, very: 15000, extra: 17500 };
// Net cost of walking ≈ 0.5 kcal per kg per km above rest (ACSM walking equation: 0.1 ml O2/kg/m, ~5 kcal per litre of O2);
// step length ≈ 0.415 × height (men) or 0.413 × height (women).
function stepsKcal(k, day) {
  const st = k.healthOn && (k.steps || {})[day];
  if (!st || !k.weight || !k.height) return 0;
  const extra = Math.max(0, st - (LEVEL_STEPS[k.activity] || 5000));
  const stepM = (k.sex === "f" ? 0.413 : 0.415) * (k.height / 100);
  return Math.round(0.5 * k.weight * (extra * stepM) / 1000);
}
function kcalTarget(k, age, history, day) { return Math.round(tdeeOf(k, age) + goalDelta(k.goal)) + workoutKcal(history, day, k.weight) + stepsKcal(k, day); }
// Eaten kcal for a day: what was logged here + food logged in other apps that reached Health Connect (app 1.1.0).
// Since 1.2.0 food from Health Connect is opt-in (healthFood === true). foodMode "hc": on a day where Health Connect
// has food, only that counts and the user's own entries are ignored (not deleted: they count again when food is
// disconnected; Michael, Oct 10). foodMode "both": added together.
function hcFood(k, day) { return k && k.healthOn && k.healthFood === true ? Math.round((k.food || {})[day] || 0) : 0; }
const ownFood = (k, day) => (((k || {}).log || {})[day] || []).reduce((a, x) => a + x.kcal, 0);
const ownIgnored = (k, day) => k && k.foodMode === "hc" && hcFood(k, day) > 0;
function dayTotal(k, day) { return (ownIgnored(k, day) ? 0 : ownFood(k, day)) + hcFood(k, day); }
const nf = n => Math.round(n).toLocaleString(LANG);

function KcalSetup({ kcal, profile, onSave, onCancel }) {
  const today = dateKey();
  const thisYear = parseKey(today).getFullYear();
  const b = profile.birth || {};
  const [sex, setSex] = useState(kcal.sex || "");
  const [year, setYear] = useState(b.y ? String(b.y) : "");
  const [month, setMonth] = useState(b.m || 0);
  const [day, setDay] = useState(b.d || 0);
  const [height, setHeight] = useState(kcal.height ? String(kcal.height) : "");
  const [weight, setWeight] = useState(kcal.weight ? String(kcal.weight) : "");
  const [activity, setActivity] = useState(kcal.activity || "");
  const [err, setErr] = useState("");
  const [askDate, setAskDate] = useState(false);
  const [pick, setPick] = useState(null); // "m" | "d": themed month / day sheet instead of the phone's dropdown
  const field = { fontFamily: BODY, fontSize: 16, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.ink, color: C.chalk, outline: "none", boxSizing: "border-box", width: "100%" };
  const label = { fontSize: 13, color: C.chalk, fontWeight: 800, marginBottom: 6 };
  const hint = { fontSize: 12, color: C.dim, lineHeight: 1.45, marginTop: 5 };
  const star = <span aria-hidden="true" data-req style={{ color: "#ff8a80", marginLeft: 3 }}>*</span>;
  const sub = { fontSize: 11, color: C.dim, fontWeight: 700, marginBottom: 4 };
  const pill = on => ({ ...btnBase, flex: 1, padding: "11px 0", fontSize: 15, background: on ? C.chalk : "transparent", color: on ? C.ink : C.dim, border: `1.5px solid ${on ? C.chalk : C.line}` });
  const num = (v, max) => v.replace(/[^0-9]/g, "").slice(0, max);
  const months = monthNames("long");
  const pickField = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, textAlign: "left", whiteSpace: "nowrap", fontSize: 16, fontWeight: 700, borderRadius: 12 };
  const daysIn = month ? new Date(Number(year) || 2000, month, 0).getDate() : 31;
  const check = () => {
    const y = Number(year), h = Number(height), w = Number(weight);
    if (!sex) return T("kcErrSex");
    if (!y || y < thisYear - 100 || y > thisYear - 10) return T("kcErrYear");
    if ((month && !day) || (!month && day)) return T("kcErrDate");
    if (!h || h < 100 || h > 250) return T("kcErrHeight");
    if (!w || w < 30 || w > 300) return T("kcErrWeight");
    if (!activity) return T("kcErrActivity");
    return "";
  };
  const save = (confirmed) => {
    const e = check();
    if (e) { setErr(e); return; }
    if (!month && !confirmed) { setAskDate(true); return; }
    sfxCheck();
    onSave({ sex, height: Number(height), weight: Number(weight), activity }, { y: Number(year), m: month || null, d: month ? Math.min(day, daysIn) : null });
  };
  return (
    <div data-kcsetup>
      {askDate && (
        <Sheet title={T("kcNoDateTitle")} onClose={() => setAskDate(false)}>
          <div style={{ fontSize: 15, color: C.chalk, lineHeight: 1.55 }}>{T("kcNoDateBody")}</div>
          <button onClick={() => setAskDate(false)} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 16 }}>{T("kcNoDateAdd")}</button>
          <button onClick={() => { setAskDate(false); save(true); }} style={{ ...bigBtn("transparent", C.dim), marginTop: 8, border: `1.5px solid ${C.line}` }}>{T("kcNoDateSkip")}</button>
        </Sheet>
      )}
      {pick && (
        <Sheet short title={T(pick === "m" ? "kcMonth" : "kcDay")} onClose={() => setPick(null)}>
          <div data-pick-sheet={pick}>
            {pick === "m"
              ? <MonthGrid value={month} onChange={v => { setMonth(v); setErr(""); if (!v) { setDay(0); setPick(null); } else setPick("d"); }} />
              : <DayGrid value={day} max={daysIn} onChange={v => { setDay(v); setErr(""); setPick(null); }} />}
            {(month > 0 || day > 0) && <button data-pick-clear onClick={() => { sfxTap(); setMonth(0); setDay(0); setPick(null); }} style={{ ...ghostBtn, display: "block", margin: "14px auto 0" }}>{T("kcClear")}</button>}
          </div>
        </Sheet>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div data-req-note style={{ fontSize: 12, color: C.dim, lineHeight: 1.45, marginBottom: -6 }}><span style={{ color: "#ff8a80", fontWeight: 800 }}>*</span>{T("kcReq").replace(/^\*/, "")}</div>
        <div>
          <div style={label}>{T("kcSex")}{star}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { sfxTap(); setSex("m"); setErr(""); }} aria-pressed={sex === "m"} style={pill(sex === "m")}>{T("kcMale")}</button>
            <button onClick={() => { sfxTap(); setSex("f"); setErr(""); }} aria-pressed={sex === "f"} style={pill(sex === "f")}>{T("kcFemale")}</button>
          </div>
        </div>
        <div>
          <div style={label}>{T("kcBirth")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1.1, minWidth: 0 }}>
              <div style={sub}>{T("kcYear")}{star}</div>
              <input value={year} onChange={e => { setYear(num(e.target.value, 4)); setErr(""); }} inputMode="numeric" placeholder="2000" aria-label={T("kcYear")} aria-required="true" style={field} />
            </div>
            <div style={{ flex: 1.5, minWidth: 0 }}>
              <div style={sub}>{T("kcMonth")}</div>
              <button data-pick-month={month} onClick={() => { sfxTap(); setPick("m"); }} aria-label={T("kcMonth")} style={{ ...btnBase, ...field, ...pickField }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", textTransform: "capitalize" }}>{month ? months[month - 1] : "–"}</span><span aria-hidden="true" style={{ color: C.dim, fontSize: 12 }}>▾</span>
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={sub}>{T("kcDay")}</div>
              <button data-pick-day={day} onClick={() => { sfxTap(); setPick(month ? "d" : "m"); }} aria-label={T("kcDay")} style={{ ...btnBase, ...field, ...pickField }}>
                <span>{day ? day + "." : "–"}</span><span aria-hidden="true" style={{ color: C.dim, fontSize: 12 }}>▾</span>
              </button>
            </div>
          </div>
          <div style={hint}>{T("kcBirthHint")}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={label}>{T("kcHeight")}{star}</div>
            <input value={height} onChange={e => { setHeight(num(e.target.value, 3)); setErr(""); }} inputMode="numeric" placeholder="0" aria-label={T("kcHeight")} aria-required="true" style={field} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={label}>{T("kcWeight")}{star}</div>
            <input value={weight} onChange={e => { setWeight(num(e.target.value, 3)); setErr(""); }} inputMode="numeric" placeholder={String(idealKg(Number(height)) || 0)} aria-label={T("kcWeight")} aria-required="true" style={field} />
          </div>
        </div>
        <div>
          <div style={label}>{T("kcActivity")}{star}</div>
          <div style={{ ...hint, marginTop: 0, marginBottom: 8, color: C.sky }}>{T("kcActivityHint")}</div>
          <div role="radiogroup" aria-label={T("kcActivity")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ACTIVITY.map(([id]) => (
              <button key={id} role="radio" aria-checked={activity === id} onClick={() => { sfxTap(); setActivity(id); setErr(""); }}
                style={{ ...btnBase, textAlign: "left", padding: "10px 12px", background: activity === id ? `${C.signal}1f` : "transparent", border: `1.5px solid ${activity === id ? C.signal : C.line}`, color: C.chalk }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: activity === id ? C.signal : C.chalk }}>{T("kcAct_" + id)}</span>
                <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.dim, marginTop: 1 }}>{T("kcActD_" + id)}</span>
              </button>
            ))}
          </div>
        </div>
        {err && <div role="alert" style={{ fontSize: 14, color: "#ff8a80", fontWeight: 700 }}>{err}</div>}
        <button onClick={() => save(false)} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk) }}>{T("kcCalc")}</button>
        {onCancel && <button onClick={onCancel} style={{ ...bigBtn("transparent", C.dim), marginTop: -8, border: `1.5px solid ${C.line}` }}>{T("cancel")}</button>}
      </div>
    </div>
  );
}

// Calories right now (Home card, menu, workout summary). null until the calculator and a goal are set.
// A day "hits" the target when it is within ±10 % of it (Michael, Oct 9: logged = green, hit = turquoise).
function kcalNow(history, day = dateKey()) {
  const k = META.kcal, age = ageOn(META.birth, day);
  if (!k || !k.sex || !k.height || !k.weight || !k.activity || !k.goal || age === null) return null;
  const target = kcalTarget(k, age, history, day), eaten = dayTotal(k, day);
  return { target, eaten, left: target - eaten, logged: eaten > 0, hit: eaten > 0 && Math.abs(eaten - target) <= target * 0.1 };
}
// Calories are amber everywhere (Michael, Oct 10: workouts green, calories a different colour):
// logged = soft amber, target hit = solid amber with ✓.
const KC_HIT = "#ff8c1a", KC_LOG = "#ffd98a";
// Days in a row with calories logged, up to today (today counts once something is logged; until then the streak
// from yesterday still stands). hits = how many of them hit the target.
function kcalStreak(history) {
  const k = META.kcal;
  if (!k || !k.log) return { n: 0, hits: 0 };
  let d = dateKey(); if (!dayTotal(k, d)) d = addDays(d, -1);
  let n = 0, hits = 0;
  while (dayTotal(k, d) > 0 && n < 3660) { n++; const s = kcalNow(history, d); if (s && s.hit) hits++; d = addDays(d, -1); }
  return { n, hits };
}
// The last 7 days for the little dots: "hit" | "log" | null
function kcalWeek(history) {
  const out = []; let d = addDays(dateKey(), -6);
  for (let i = 0; i < 7; i++) { const s = kcalNow(history, d); out.push({ k: d, kind: s && s.hit ? "hit" : s && s.logged ? "log" : null }); d = addDays(d, 1); }
  return out;
}
// One short line for the day: changes with the time of day and how far along you are.
function kcalLine(s) {
  if (!s) return "";
  const h = new Date().getHours();
  if (s.hit) return T("kcMsgHit");
  if (s.left < 0) return T("kcMsgOver", { n: nf(-s.left) });
  if (!s.logged) return T(h < 11 ? "kcMsgMorning" : h < 17 ? "kcMsgNoon" : "kcMsgEvening");
  if (s.left <= s.target * 0.25) return T("kcMsgClose", { n: nf(s.left) });
  return T("kcMsgLeft", { n: nf(s.left) });
}
function KcalStreakChip({ history, small }) {
  const st = kcalStreak(history);
  if (!st.n) return null;
  const allHit = st.hits === st.n;
  return <span data-kc-streak={st.n} data-all-hit={allHit ? 1 : 0} title={T("kcStreakTip")} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: small ? 12 : 13, fontWeight: 800, padding: small ? "3px 8px" : "4px 10px", borderRadius: 99, background: allHit ? `${KC_HIT}33` : `${KC_HIT}18`, color: KC_HIT, border: `1.5px solid ${KC_HIT}${allHit ? "" : "77"}`, whiteSpace: "nowrap" }}>🥗 {TP("kcStreakDays", st.n)}</span>;
}
// The last 7 days: a dot per day with its weekday under it; today also shows its date (Michael, Oct 10: plain dots made no sense).
function KcalWeekDots({ history }) {
  const today = dateKey(), wd = weekdaysShort(); // Monday first
  return (
    <div data-kc-week style={{ display: "flex", gap: 6, alignItems: "flex-start" }} aria-label={T("kcWeekAria")}>
      {kcalWeek(history).map(w => {
        const d = parseKey(w.k), isT = w.k === today;
        return (
          <span key={w.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 18 }}>
            <span data-kc-day={w.kind || "none"} title={fmtDate(w.k)} style={{ width: 14, height: 14, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: C.ink, background: w.kind === "hit" ? KC_HIT : w.kind === "log" ? KC_LOG : "transparent", border: `1.5px solid ${w.kind ? KC_HIT : isT ? C.chalk : C.line}` }}>{w.kind === "hit" ? "✓" : ""}</span>
            <span style={{ fontSize: 9, lineHeight: 1, fontWeight: isT ? 900 : 600, color: isT ? C.chalk : C.dim }}>{wd[(d.getDay() + 6) % 7]}</span>
            {isT && <span data-kc-today style={{ fontSize: 9, lineHeight: 1, fontWeight: 700, color: C.chalk, whiteSpace: "nowrap" }}>{fmtShortDM(d)}</span>}
          </span>
        );
      })}
    </div>
  );
}
// Home: eaten / target, quick add, the streak; the Calories screen keeps history and settings.
function HomeKcal({ history, kcal, setKcal, onOpen }) {
  const [amount, setAmount] = useState("");
  const s = kcalNow(history);
  if (!s) {
    return (
      <button data-home-kcal="setup" onClick={() => { sfxTap(); onOpen(); }} style={{ ...btnBase, ...card, width: "100%", marginTop: LOOK === "flat" ? 22 : LOOK === "tiles" ? 8 : 12, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, color: C.chalk, textAlign: "left" }}>
        <span style={{ fontSize: 24 }} aria-hidden="true">🥗</span>
        <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{T("kcHomeSetup")}</span><span style={{ display: "block", fontSize: 12, color: C.dim, marginTop: 2 }}>{T("kcHomeSetupD")}</span></span>
        <span style={{ color: C.dim, fontSize: 18 }}>›</span>
      </button>
    );
  }
  const add = () => {
    const n = Number(amount);
    if (!n || n < 1 || n > 9999) return;
    sfxCheck();
    const today = dateKey(), log = { ...(kcal.log || {}) };
    log[today] = [...(log[today] || []), { ts: Date.now(), kcal: n, note: "" }];
    setKcal({ ...kcal, log });
    setAmount("");
  };
  const pct = Math.min(1, s.eaten / Math.max(1, s.target)), over = s.left < 0;
  const col = s.hit ? KC_HIT : over ? "#ff8a80" : C.mint;
  return (
    <div data-home-kcal="on" style={{ ...card, marginTop: LOOK === "flat" ? 22 : LOOK === "tiles" ? 8 : 12, padding: "14px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.chalk }}>🥗 {T("kcHomeTitle")}</div>
        <KcalStreakChip history={history} small />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span data-home-kcal-eaten style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1, color: C.chalk }}>{nf(s.eaten)}</span>
        <span style={{ fontSize: 13, color: C.dim }}>{T("kcOf", { n: nf(s.target) })}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: C.panelHi, marginTop: 8, overflow: "hidden" }}><div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 99, background: col, transition: "width .5s ease-out" }} /></div>
      <div data-home-kcal-line style={{ fontSize: 13, color: s.hit ? KC_HIT : C.dim, marginTop: 8, lineHeight: 1.45 }}>{kcalLine(s)}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} onKeyDown={e => { if (e.key === "Enter") add(); }} inputMode="numeric" placeholder="kcal" aria-label={T("kcAmount")}
          style={{ fontFamily: BODY, fontSize: 16, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.ink, color: C.chalk, outline: "none", boxSizing: "border-box", minWidth: 0, flex: 1 }} />
        <button data-home-kcal-add onClick={add} disabled={!Number(amount)} style={{ ...btnBase, padding: "10px 14px", fontSize: 14, background: Number(amount) ? C.signal : C.panelHi, color: Number(amount) ? C.signalInk : C.dim, flexShrink: 0 }}>{T("kcHomeAdd")}</button>
      </div>
      {ownIgnored(kcal, dateKey()) && <div data-own-ignored style={{ fontSize: 11, color: KC_HIT, lineHeight: 1.4, marginTop: 6 }}>{T("kcOwnIgnored")}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
        <KcalWeekDots history={history} />
        <button data-home-kcal-open onClick={() => { sfxTap(); onOpen(); }} style={{ ...btnBase, background: "transparent", color: C.sky, fontSize: 13, padding: "4px 0" }}>{T("kcHomeOpen")} ›</button>
      </div>
    </div>
  );
}

function KcalGoals({ kcal, age, onPick }) {
  const tdee = tdeeOf(kcal, age);
  const min = kcal.sex === "f" ? 1200 : 1500;
  const row = (goal, title, sub) => {
    const v = Math.round(tdee + goalDelta(goal));
    const on = kcal.goal && kcal.goal.type === goal.type && (goal.type === "maintain" || kcal.goal.rate === goal.rate);
    return (
      <button key={goal.type + (goal.rate || "")} onClick={() => onPick(goal)} aria-pressed={!!on} data-goal-opt={goal.type + (goal.rate || "")}
        style={{ ...btnBase, width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "11px 13px", marginTop: 6, background: on ? `${C.signal}1f` : C.ink, border: `1.5px solid ${on ? C.signal : C.line}`, color: C.chalk }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{title}</span>
          <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: v < min ? "#ff8a80" : C.dim }}>{v < min ? T("kcTooLow", { n: nf(min) }) : sub}</span>
        </span>
        <span style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: on ? C.signal : C.chalk, whiteSpace: "nowrap" }}>{nf(v)}<span style={{ fontFamily: BODY, fontSize: 11, color: C.dim, marginLeft: 3 }}>kcal</span></span>
      </button>
    );
  };
  const kg = r => r.toLocaleString(LANG);
  return (
    <div>
      <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>{T("kcBmrLine", { bmr: nf(bmrOf(kcal, age)), tdee: nf(tdee), age })}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.chalk, marginTop: 14 }}>{T("kcLose")}</div>
      {RATES.map(r => row({ type: "lose", rate: r }, T("kcRateLose", { kg: kg(r) }), T("kcPerDayLess", { n: nf((r * KCAL_PER_KG) / 7) })))}
      <div style={{ fontSize: 13, fontWeight: 800, color: C.chalk, marginTop: 14 }}>{T("kcMaintain")}</div>
      {row({ type: "maintain" }, T("kcMaintainT"), T("kcMaintainD"))}
      <div style={{ fontSize: 13, fontWeight: 800, color: C.chalk, marginTop: 14 }}>{T("kcGain")}</div>
      {RATES.map(r => row({ type: "gain", rate: r }, T("kcRateGain", { kg: kg(r) }), T("kcPerDayMore", { n: nf((r * KCAL_PER_KG) / 7) })))}
      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginTop: 10 }}>{T("kcWorkoutNote")}</div>
      {age < 18 && <div style={{ fontSize: 13, color: C.signal, lineHeight: 1.5, marginTop: 8, fontWeight: 700 }}>{T("kcUnder18")}</div>}
    </div>
  );
}

// App only: steps from Health Connect (Samsung Health, Google Fit, Fitbit… all write there).
function HealthCard({ kcal, setKcal }) {
  const [st, setSt] = useState(null); // {available, granted, reason}
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const refresh = () => healthState().then(setSt);
  useEffect(() => { refresh(); }, []);
  const today = dateKey();
  const sync = async (k = kcal) => {
    const m = await healthSteps(7), f = await healthSteps(7, "dietaryEnergyConsumed");
    const it = k.healthFood === true ? await healthFoodItems(7) : null;
    if (m || f) setKcal({ ...k, healthOn: true, steps: { ...(k.steps || {}), ...(m || {}) }, food: { ...(k.food || {}), ...(f || {}) }, foodItems: { ...(k.foodItems || {}), ...(it || {}) } });
    return m;
  };
  const connect = async () => {
    unlockAudio(); sfxTap(); setBusy(true); setDenied(false);
    const ok = await healthConnect(false);
    if (ok.steps) { sfxCheck(); await sync(); } else setDenied(true);
    await refresh(); setBusy(false);
  };
  // Food is optional: permission for nutrition, then the user picks how it counts (and confirms).
  const [modeSheet, setModeSheet] = useState(false);
  const [mode, setMode] = useState(kcal.foodMode || "hc");
  const [foodDenied, setFoodDenied] = useState(false);
  const connectFood = async () => {
    sfxTap(); setFoodDenied(false);
    let ok = st && st.food;
    if (!ok) { setBusy(true); ok = (await healthConnect(true)).food; await refresh(); setBusy(false); }
    if (ok) { setMode(kcal.foodMode || "hc"); setModeSheet(true); } else setFoodDenied(true);
  };
  const saveMode = async () => {
    sfxCheck(); setModeSheet(false);
    const f = await healthSteps(7, "dietaryEnergyConsumed"), it = await healthFoodItems(7);
    setKcal({ ...kcal, healthFood: true, foodMode: mode, food: { ...(kcal.food || {}), ...(f || {}) }, foodItems: { ...(kcal.foodItems || {}), ...(it || {}) } });
  };
  const food = (kcal.food || {})[today];
  const steps = (kcal.steps || {})[today];
  const assumed = LEVEL_STEPS[kcal.activity] || 5000;
  const btn = { ...btnBase, padding: "9px 13px", fontSize: 13, flexShrink: 0 };
  let body;
  if (!st) body = <div style={{ fontSize: 13, color: C.dim }}>…</div>;
  else if (!st.available) body = (
    <>
      <div data-hc="unavailable" style={{ fontSize: 13, color: C.chalk, lineHeight: 1.5 }}>{T("hcUnavailable")}</div>
      <button onClick={() => { sfxTap(); refresh(); }} style={{ ...ghostBtn, marginTop: 10 }}>{T("hcRetry")}</button>
    </>
  );
  else if (kcal.healthOn && st.granted) body = (
    <>
      <div data-hc="on" style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span data-hc-steps style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 900, color: C.chalk, lineHeight: 1 }}>{nf(steps || 0)}</span>
        <span style={{ fontSize: 13, color: C.dim }}>{T("hcStepsToday")}</span>
      </div>
      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginTop: 6 }}>{T("hcHow", { n: nf(assumed) })}</div>
      <div data-hc-food-box={kcal.healthFood === true && st.food ? "on" : "off"} style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.chalk }}>🍽️ {T("hcFood")}{kcal.healthFood === true && food ? ` · ${nf(food)} kcal` : ""}</div>
        {kcal.healthFood === true && st.food ? <>
          <div data-hc-mode={kcal.foodMode || "both"} style={{ fontSize: 12, color: C.dim, lineHeight: 1.45, marginTop: 3 }}>{T(kcal.foodMode === "hc" ? "hcFoodOnHc" : "hcFoodOnBoth")}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button data-hc-food-mode onClick={() => { sfxTap(); setMode(kcal.foodMode || "both"); setModeSheet(true); }} style={{ ...btn, background: C.panelHi, color: C.chalk }}>{T("hcFoodChange")}</button>
            <button data-hc-food-off onClick={() => { sfxTap(); setKcal({ ...kcal, healthFood: false }); }} style={{ ...btn, background: "transparent", color: C.dim, border: `1.5px solid ${C.line}` }}>{T("hcFoodDisconnect")}</button>
          </div>
        </> : <>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45, marginTop: 3 }}>{T("hcFoodOffD")}</div>
          {foodDenied && <div data-hc-food-denied style={{ fontSize: 12, color: C.signal, lineHeight: 1.5, marginTop: 6 }}>{T("hcFoodOff")}</div>}
          <button data-hc-food-connect onClick={connectFood} disabled={busy} style={{ ...btn, marginTop: 8, background: "transparent", color: KC_HIT, border: `1.5px solid ${KC_HIT}88` }}>{T("hcFoodConnect")}</button>
        </>}
      </div>
      {modeSheet && (
        <Sheet short title={T("hcFoodModeT")} onClose={() => setModeSheet(false)}>
          <div data-hc-mode-sheet>
            <div style={{ fontSize: 14, color: C.chalk, lineHeight: 1.5 }}>{T("hcFoodModeD")}</div>
            <div role="radiogroup" aria-label={T("hcFoodModeT")} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {[["hc", "hcModeHc"], ["both", "hcModeBoth"]].map(([m, k]) => (
                <button key={m} role="radio" aria-checked={mode === m} data-hc-mode-opt={m} onClick={() => { sfxTap(); setMode(m); }}
                  style={{ ...btnBase, textAlign: "left", padding: "11px 13px", background: mode === m ? `${C.signal}1f` : C.ink, border: `1.5px solid ${mode === m ? C.signal : C.line}`, color: C.chalk }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: mode === m ? C.signal : C.chalk }}>{T(k)}</span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.dim, marginTop: 2, lineHeight: 1.45 }}>{T(k + "D")}</span>
                </button>
              ))}
            </div>
            <button data-hc-mode-ok onClick={saveMode} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 14 }}>{T("hcModeOk")}</button>
          </div>
        </Sheet>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button data-hc-sync onClick={async () => { sfxTap(); setBusy(true); await sync(); setBusy(false); }} disabled={busy} style={{ ...btn, background: C.panelHi, color: C.chalk }}>{T("hcSync")}</button>
        <button onClick={() => { sfxTap(); healthSettings(); }} style={{ ...btn, background: "transparent", color: C.sky, border: `1.5px solid ${C.sky}88` }}>{T("hcSettings")}</button>
        <button data-hc-off onClick={() => { sfxTap(); setKcal({ ...kcal, healthOn: false }); }} style={{ ...btn, background: "transparent", color: C.dim, border: `1.5px solid ${C.line}` }}>{T("hcOff")}</button>
      </div>
    </>
  );
  else body = (
    <>
      <div data-hc="off" style={{ fontSize: 13, color: C.chalk, lineHeight: 1.5 }}>{T("hcIntro", { n: nf(assumed) })}</div>
      {denied && <div data-hc-denied style={{ fontSize: 12, color: C.signal, lineHeight: 1.5, marginTop: 8 }}>{T("hcDenied")}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button data-hc-connect onClick={connect} disabled={busy} className="b3d" style={{ ...btn, background: C.mint, color: C.ink, "--e": "#2c8a5c" }}>{T("hcConnect")}</button>
        {denied && <button onClick={() => { sfxTap(); healthSettings(); }} style={{ ...btn, background: "transparent", color: C.sky, border: `1.5px solid ${C.sky}88` }}>{T("hcSettings")}</button>}
      </div>
    </>
  );
  return (
    <div data-health-card style={{ ...card, padding: "14px 15px", marginTop: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.chalk, marginBottom: 8 }}>👟 {T("hcTitle")}</div>
      {body}
    </div>
  );
}

// One day's food, oldest first: own entries (✕ to delete) and, when food is connected, every entry from Health Connect
// with its time and the app it came from (Michael, Oct 10). Own entries are dimmed when only Health Connect counts that day.
function DayEntries({ kcal, day, onRemove, pad = "8px 0" }) {
  const hc = hcFood(kcal, day), items = hc > 0 ? ((kcal.foodItems || {})[day] || []) : [], ign = ownIgnored(kcal, day);
  const own = ((kcal.log || {})[day] || []).map(x => ({ ...x, own: true }));
  const rows = [...own, ...items.map(x => ({ ...x, hc: true }))].sort((a, b) => a.ts - b.ts);
  const time = ts => new Date(ts).toLocaleTimeString(LANG, { hour: "2-digit", minute: "2-digit" });
  return (
    <div data-day-entries={day}>
      {ign && own.length > 0 && <div data-own-ignored style={{ fontSize: 12, color: KC_HIT, lineHeight: 1.45, padding: "4px 0 2px" }}>{T("kcOwnIgnored")}</div>}
      {rows.map((x, i) => (
        <div key={(x.hc ? "h" : "o") + x.ts + "-" + i} data-entry={x.hc ? "hc" : "own"} style={{ display: "flex", alignItems: "center", gap: 8, padding: pad, borderTop: `1px solid ${C.line}`, opacity: x.own && ign ? 0.5 : 1 }}>
          <span style={{ fontSize: 12, color: C.dim, width: 44, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{time(x.ts)}</span>
          <span style={{ flex: 1, fontSize: 14, color: C.chalk, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.hc ? <><span aria-hidden="true">🍽️ </span><span style={{ color: C.dim }}>{x.src || T("hcFoodRow")}</span></> : (x.note || "—")}</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: x.hc ? KC_HIT : C.chalk, textDecoration: x.own && ign ? "line-through" : "none" }}>{nf(x.kcal)}</span>
          {x.own ? <button onClick={() => onRemove(day, x.ts)} aria-label={T("kcDelete")} style={{ ...btnBase, background: "transparent", color: C.dim, padding: "4px 8px", fontSize: 15 }}>✕</button> : <span style={{ width: 31, flexShrink: 0 }} />}
        </div>
      ))}
      {hc > 0 && !items.length && (
        <div data-hc-food-row style={{ display: "flex", alignItems: "center", gap: 8, padding: pad, borderTop: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 15, width: 44 }} aria-hidden="true">🍽️</span>
          <span style={{ flex: 1, fontSize: 14, color: C.chalk, minWidth: 0 }}>{T("hcFoodRow")}</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: KC_HIT }}>{nf(hc)}</span>
          <span style={{ width: 31, flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}

// "How is today's target calculated?" (Michael, Oct 10): every part of the number, added up.
function TargetBreakdown({ kcal, age, history, day, target }) {
  const goal = Math.round(goalDelta(kcal.goal)), base = Math.round(tdeeOf(kcal, age) + goalDelta(kcal.goal)) - goal; // adds up to kcalTarget exactly
  const wk = workoutKcal(history, day, kcal.weight), stp = stepsKcal(kcal, day);
  const steps = (kcal.steps || {})[day] || 0, lvl = LEVEL_STEPS[kcal.activity] || 5000;
  const goalName = kcal.goal.type === "maintain" ? T("kcMaintainT") : T(kcal.goal.type === "lose" ? "kcRateLose" : "kcRateGain", { kg: kcal.goal.rate.toLocaleString(LANG) });
  const sign = n => (n > 0 ? "+" : n < 0 ? "−" : "±") + nf(Math.abs(n));
  const rows = [
    ["base", T("kcB_base"), nf(base), null],
    ["goal", goalName, sign(goal), null],
    ["workout", T("kcB_workout"), sign(wk), wk ? null : T("kcB_workout0")],
    ...(kcal.healthOn ? [["steps", T("kcB_steps"), sign(stp), T("kcB_stepsD", { s: nf(steps), n: nf(lvl) })]] : []),
  ];
  return (
    <div data-kc-breakdown style={{ ...card, padding: "12px 15px", marginTop: 10 }}>
      {rows.map(([k, label, v, sub]) => (
        <div key={k} data-kc-b={k} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, color: C.chalk }}>{label}</span>
            {sub && <span style={{ display: "block", fontSize: 11, color: C.dim, lineHeight: 1.4, marginTop: 1 }}>{sub}</span>}
          </span>
          <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 800, color: k === "base" ? C.chalk : C.sky, whiteSpace: "nowrap" }}>{v}</span>
        </div>
      ))}
      <div data-kc-b="total" style={{ display: "flex", alignItems: "baseline", gap: 10, paddingTop: 8 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: C.chalk }}>{T("kcB_total")}</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, color: C.mint }}>{nf(target)} kcal</span>
      </div>
    </div>
  );
}

function Calories({ history, profile, setProfile, kcal, setKcal }) {
  const today = dateKey();
  const [editing, setEditing] = useState(false);
  const [changingGoal, setChangingGoal] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [openDay, setOpenDay] = useState(null);
  const [how, setHow] = useState(false);
  const age = ageOn(profile.birth, today);
  const ready = kcal && kcal.sex && kcal.height && kcal.weight && kcal.activity && age !== null;
  const saveSetup = (k, birth) => { setKcal({ ...(kcal || {}), ...k, log: (kcal && kcal.log) || {} }); setProfile({ ...profile, birth }); setEditing(false); };
  const wrap = children => <div className="scr" style={{ padding: "16px 18px 110px", maxWidth: 460, margin: "0 auto" }}>{children}</div>;
  useBack(() => setEditing(false), !!(ready && editing));
  useBack(() => setChangingGoal(false), !!(ready && !editing && changingGoal));

  if (!ready || editing) {
    return wrap(
      <>
        {!ready && (
          <div style={{ ...card, padding: "15px 16px", marginBottom: 18, borderColor: C.signal }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: 900, color: C.signal, lineHeight: 1 }}>{T("kcIntroTitle")}</div>
            <div style={{ fontSize: 14, color: C.chalk, lineHeight: 1.55, marginTop: 8 }}>{T("kcIntro")}</div>
          </div>
        )}
        <KcalSetup kcal={kcal || {}} profile={profile} onSave={saveSetup} onCancel={ready ? () => setEditing(false) : null} />
      </>
    );
  }

  const pickGoal = goal => { sfxCheck(); setKcal({ ...kcal, goal }); setChangingGoal(false); };
  if (!kcal.goal || changingGoal) {
    return wrap(
      <>
        <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 900, color: C.chalk, lineHeight: 1 }}>{T("kcPickTitle")}</div>
        <div style={{ fontSize: 14, color: C.dim, lineHeight: 1.5, margin: "6px 0 12px" }}>{T("kcPickBody")}</div>
        <KcalGoals kcal={kcal} age={age} onPick={pickGoal} />
        {kcal.goal && <button onClick={() => setChangingGoal(false)} style={{ ...bigBtn("transparent", C.dim), marginTop: 14, border: `1.5px solid ${C.line}` }}>{T("cancel")}</button>}
      </>
    );
  }

  const target = kcalTarget(kcal, age, history, today);
  const eaten = dayTotal(kcal, today);
  const wk = workoutKcal(history, today, kcal.weight);
  const left = target - eaten;
  const pct = Math.min(1, eaten / Math.max(1, target));
  const over = left < 0;
  const add = () => {
    const n = Number(amount);
    if (!n || n < 1 || n > 9999) return;
    sfxCheck();
    const log = { ...(kcal.log || {}) };
    log[today] = [...(log[today] || []), { ts: Date.now(), kcal: n, note: note.trim().slice(0, 40) }];
    setKcal({ ...kcal, log });
    setAmount(""); setNote("");
  };
  const remove = (day, ts) => {
    sfxTap();
    const log = { ...(kcal.log || {}) };
    log[day] = (log[day] || []).filter(x => x.ts !== ts);
    if (!log[day].length) delete log[day];
    setKcal({ ...kcal, log });
  };
  const days = [...new Set([...Object.keys(kcal.log || {}), ...Object.keys(kcal.food || {}).filter(d => hcFood(kcal, d) > 0)])].filter(d => d !== today && d < today).sort().reverse().slice(0, 30);
  const goalName = kcal.goal.type === "maintain" ? T("kcMaintainT") : T(kcal.goal.type === "lose" ? "kcRateLose" : "kcRateGain", { kg: kcal.goal.rate.toLocaleString(LANG) });
  const field = { fontFamily: BODY, fontSize: 16, fontWeight: 700, padding: "11px 12px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.ink, color: C.chalk, outline: "none", boxSizing: "border-box", minWidth: 0 };
  const R = 64, CIRC = 2 * Math.PI * R;
  return wrap(
    <>
      <div style={{ ...card, padding: "16px", display: "flex", alignItems: "center", gap: 16 }} data-kctoday>
        <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
          <svg width="150" height="150" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="75" cy="75" r={R} fill="none" stroke={C.panelHi} strokeWidth="12" />
            <circle cx="75" cy="75" r={R} fill="none" stroke={over ? "#ff8a80" : C.mint} strokeWidth="12" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease-out" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div key={eaten} className="bump" style={{ fontFamily: DISPLAY, fontSize: 38, fontWeight: 900, lineHeight: 0.9, color: C.chalk }}>{nf(eaten)}</div>
            <div style={{ fontSize: 12, color: C.dim }}>{T("kcOf", { n: nf(target) })}</div>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.dim }}>{T("kcToday")}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 900, lineHeight: 1, color: over ? "#ff8a80" : C.mint, marginTop: 2 }}>{over ? T("kcOver", { n: nf(-left) }) : T("kcLeft", { n: nf(left) })}</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.45 }}>{goalName}</div>
          {wk > 0 && <div style={{ fontSize: 12, color: C.sky, marginTop: 3, fontWeight: 700 }}>{T("kcWorkoutToday", { n: nf(wk) })}</div>}
          {stepsKcal(kcal, today) > 0 && <div data-steps-kcal style={{ fontSize: 12, color: C.sky, marginTop: 3, fontWeight: 700 }}>{T("hcStepsKcal", { n: nf(stepsKcal(kcal, today)) })}</div>}
          <button data-kc-how onClick={() => { sfxTap(); setHow(h => !h); }} aria-expanded={how} style={{ ...btnBase, background: "transparent", color: C.sky, fontSize: 12, padding: "6px 0 0" }}>{T("kcHowTitle")} {how ? "▴" : "▾"}</button>
        </div>
      </div>
      {how && <TargetBreakdown kcal={kcal} age={age} history={history} day={today} target={target} />}
      {isNative && <HealthCard kcal={kcal} setKcal={setKcal} />}
      <div data-kc-streak-card style={{ ...card, padding: "12px 15px", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.chalk, fontWeight: 700 }}>{kcalLine(kcalNow(history))}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{T("kcLegend")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><KcalStreakChip history={history} /><KcalWeekDots history={history} /></div>
      </div>

      <div style={{ ...card, padding: "14px 15px", marginTop: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.chalk, marginBottom: 8 }}>{T("kcAddTitle")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} onKeyDown={e => { if (e.key === "Enter") add(); }} inputMode="numeric" placeholder="kcal" aria-label={T("kcAmount")} style={{ ...field, flex: 1 }} />
          <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} placeholder={T("kcNote")} aria-label={T("kcNote")} style={{ ...field, flex: 1.6 }} />
        </div>
        <button onClick={add} disabled={!Number(amount)} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 10, padding: 15, opacity: Number(amount) ? 1 : 0.5 }}>{Number(amount) ? T("kcAddBtn", { n: nf(Number(amount)) }) : T("kcAddBtn0")}</button>
        {(dayTotal(kcal, today) > 0 || ((kcal.log || {})[today] || []).length > 0) && <div style={{ marginTop: 12 }}><DayEntries kcal={kcal} day={today} onRemove={remove} /></div>}
      </div>

      {days.length > 0 && (
        <>
          <div style={sectionTitle}>{T("kcHistory")}</div>
          <div style={{ ...card }}>
            {days.map((d, i) => {
              const tot = dayTotal(kcal, d);
              const tg = kcalTarget(kcal, ageOn(profile.birth, d) ?? age, history, d);
              const o = openDay === d;
              return (
                <div key={d} style={{ borderTop: i ? `1px solid ${C.line}` : "none" }}>
                  <button onClick={() => { sfxTap(); setOpenDay(o ? null : d); }} aria-expanded={o} style={{ ...btnBase, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 15px", background: "transparent", color: C.chalk, textAlign: "left", borderRadius: 0 }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{capFirst(fmtDate(d))}</span>
                    <span style={{ fontSize: 13, color: tot > tg ? "#ff8a80" : C.mint, fontWeight: 800 }}>{nf(tot)}</span>
                    <span style={{ fontSize: 12, color: C.dim }}>/ {nf(tg)}</span>
                    <span style={{ color: C.dim, fontSize: 12 }}>{o ? "▾" : "▸"}</span>
                  </button>
                  {o && <div data-day-open={d} style={{ padding: "0 15px 6px" }}><DayEntries kcal={kcal} day={d} onRemove={remove} pad="6px 0" /></div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={sectionTitle}>{T("kcSettings")}</div>
      <div style={{ ...card, padding: "13px 15px" }} data-kcsettings>
        <div style={{ fontSize: 14, color: C.chalk, lineHeight: 1.6 }}>
          {T("kcSummary", { sex: T(kcal.sex === "f" ? "kcFemale" : "kcMale"), age, h: kcal.height, w: kcal.weight })}<br />
          <span style={{ color: C.dim }}>{T("kcAct_" + kcal.activity)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => { sfxTap(); setEditing(true); }} style={{ ...ghostBtn, flex: 1 }}>{T("kcEdit")}</button>
          <button onClick={() => { sfxTap(); setChangingGoal(true); }} style={{ ...ghostBtn, flex: 1, color: C.sky, borderColor: `${C.sky}88` }}>{T("kcChangeGoal")}</button>
        </div>
        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, marginTop: 10 }}>{T("kcAutoAge")}</div>
      </div>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, marginTop: 12 }}>{T("kcDisclaimer")}</div>
    </>
  );
}

// ─── TAB 2: HISTORY ────────────────────────────────────────────────────────
function CalLegend() {
  const sw = (bg, label) => <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 14, borderRadius: 4, border: `1px solid ${C.line}`, background: bg }} />{label}</span>;
  return (
    <div data-cal-legend style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 11, color: C.dim, marginTop: 10 }}>
      {sw(`linear-gradient(135deg, ${C.mint} 0 45%, transparent 45%)`, T("calLegTrain"))}
      {sw(`linear-gradient(315deg, ${KC_LOG} 0 45%, transparent 45%)`, T("calLegLog"))}
      {sw(`linear-gradient(315deg, ${KC_HIT} 0 45%, transparent 45%)`, T("calLegHit"))}
    </div>
  );
}
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
          const sk = !on && (META.skips || {})[k], fz = !on && (META.freezeDays || []).includes(k);
          if (sk || fz) return (
            <div key={i} data-cal-skip={k} title={sk ? `${T("skip_" + sk.r)}${sk.note ? `: ${sk.note}` : ""}` : "🧊"} style={{ aspectRatio: "1", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `${C.sky}22`, color: C.sky, border: `1.5px solid ${isToday ? C.chalk : `${C.sky}66`}`, fontSize: 13, fontWeight: 700 }}>
              {d}<span style={{ fontSize: 10, lineHeight: 1 }}>{sk ? skipIcon(sk.r) : "🧊"}</span>
            </div>
          );
          const kc = kcalNow(history, k);
          const kind = kc && kc.hit ? "hit" : kc && kc.logged ? "log" : null;
          const bgs = [];
          if (on) bgs.push(`linear-gradient(135deg, ${C.mint} 0 34%, transparent 34%)`);
          if (kind) bgs.push(`linear-gradient(315deg, ${kind === "hit" ? KC_HIT : KC_LOG} 0 34%, transparent 34%)`);
          return (
            <div key={i} data-cal-day={k} data-cal-train={on ? 1 : 0} data-cal-kcal={kind || "none"} title={[on ? T("dayN", { d: on }) : null, kind ? T(kind === "hit" ? "calKcalHit" : "calKcalLog") : null].filter(Boolean).join(" · ") || undefined}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                background: bgs.length ? bgs.join(", ") : "transparent", color: k > today ? "#4d5f8a" : C.chalk, border: `1.5px solid ${isToday ? C.chalk : on || kind ? C.line : "transparent"}`, fontSize: 13, fontWeight: on || kind ? 800 : 500 }}>
              {on && <span style={{ position: "absolute", top: 2, left: 4, fontSize: 9, fontWeight: 900, color: C.ink, lineHeight: 1 }}>{on}</span>}
              {d}
              {kind === "hit" && <span style={{ position: "absolute", bottom: 1, right: 3, fontSize: 9, fontWeight: 900, color: C.ink, lineHeight: 1 }}>✓</span>}
            </div>
          );
        })}
      </div>
      <CalLegend />
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
  const [rounds, setRounds] = useState(entry ? Math.max(1, entry.rounds || 2) : 3);
  const [rows, setRows] = useState(() => entry
    ? entry.items.map(it => ({ id: it.id, name: it.name, unit: it.unit, vals: Array.from({ length: Math.max(1, entry.rounds || it.res.length) }, (_, r) => toField(it.res[r])) }))
    : rowsFor(nextDay, 3));
  const [picking, setPicking] = useState(false);
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
                    {ex && <ExQ id={r.id} />}
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
        {/* app-styled picker (the phone's own dropdown was full-screen and ignored the theme) */}
        <button onClick={() => { sfxTap(); setPicking(true); }} data-add-ex style={{ ...btnBase, width: "100%", padding: "11px 12px", borderRadius: 11, border: `1.5px dashed ${C.line}`, background: "transparent", color: C.sky, fontSize: 15, fontWeight: 700, textAlign: "left" }}>{T("addEx")}</button>
        {picking && (
          <Sheet short title={T("addEx").replace(/^\S+\s/, "").replace(/…$/, "")} onClose={() => setPicking(false)}>
            <div data-add-ex-sheet style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ALT_GROUPS.map((g, gi) => {
                const left = g.filter(id => !used.has(id));
                if (!left.length) return null;
                return (
                  <div key={gi}>
                    <div style={{ fontSize: 12, color: C.dim, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{T("grp_" + GROUP_KEYS[gi])}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {left.map(id => (
                        <button key={id} data-pick-ex={id} onClick={() => { addRow(id); setPicking(false); }}
                          style={{ ...btnBase, display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: C.panelHi, color: C.chalk, padding: "11px 12px", border: `1.5px solid ${C.line}`, borderRadius: 13 }}>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{EX[id].name}<ExQ id={id} /></span>
                            <span style={{ display: "block", fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 1 }}>{EX[id].muscles}</span>
                          </span>
                          <DiffChip id={id} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Sheet>
        )}
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

function HistoryTab({ history, onDelete, onSaveEntry, editDate, onEditOpened }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null); // index, "new" or null
  // opened from a green day in the week strip on Home: straight into that day's workout
  useEffect(() => {
    if (!editDate) return;
    let idx = -1;
    history.forEach((e, i) => { if (e.date === editDate) idx = i; });
    if (idx >= 0) setEditing(idx);
    onEditOpened && onEditOpened();
  }, [editDate]);
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
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.chalk }}>{s.prs && s.prs.includes(it.id) ? "🏆 " : ""}{exName(it)}{EX[it.id] && <ExQ id={it.id} />}</div>
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
function ProfileTab({ history, profile, setProfile, onFreeze, kcal }) {
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
  const ach = achievements(history, achExtra(profile, kcal));
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
          <BdayHalo size={104}><Avatar profile={profile} size={104} /></BdayHalo>
          <span style={{ position: "absolute", right: -2, bottom: -2, width: 34, height: 34, borderRadius: 99, background: C.panelHi, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📷</span>
        </button>
        {err && <div style={{ fontSize: 13, color: "#ff8a80", marginTop: 8 }}>{err}</div>}
        {editing ? (
          <div data-name-edit style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 10 }}>
            <input value={name} onChange={e => setName(e.target.value.slice(0, 24))} autoFocus aria-label={T("nameLabel")}
              style={{ fontFamily: BODY, fontSize: 18, fontWeight: 700, padding: "8px 12px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.panel, color: C.chalk, width: 180, outline: "none" }} />
            <button onClick={() => { setProfile({ ...profile, name: name.trim() || T("defaultName") }); setEditing(false); sfxCheck(); }} className="b3d" style={{ ...btnBase, background: C.signal, color: C.signalInk, padding: "8px 14px", "--e": EDGE[C.signal] }}>{T("save")}</button>
          </div>
        ) : (
          <button onClick={() => { setName(profile.name || ""); setEditing(true); }} aria-label={`${T("nameLabel")}: ${profile.name || T("defaultName")}`} data-profile-name style={{ ...btnBase, background: "transparent", color: C.chalk, marginTop: 10, padding: "2px 0" }}>
            {/* the pencil hangs outside the name, so the name itself stays centred under the photo */}
            <span style={{ position: "relative", display: "inline-block", fontFamily: DISPLAY, fontSize: 36, fontWeight: 900 }}>
              {profile.name || T("defaultName")}
              <span aria-hidden="true" data-pencil style={{ position: "absolute", left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 8, width: 26, height: 26, borderRadius: 99, background: C.panelHi, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BODY, fontSize: 12 }}>✏️</span>
            </span>
          </button>
        )}
        <div style={{ fontSize: 13, color: bdayToday() ? C.signal : C.dim, fontWeight: bdayToday() ? 800 : 400, marginTop: 2 }}>{bdayToday() ? T("bdayHero") : since ? T("since", { date: fmtDate(since, true) }) : T("newMember")}</div>
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
          <div style={{ fontSize: 15, fontWeight: 700, color: C.chalk }}>{T("freezeTitle", { n: fz, max: META.giftThisYear ? 3 : 2 })}</div>
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
      <div data-ranks-box style={{ ...card, padding: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {Object.keys(RANK_AT).map(id => {
          const b = bestFor(history, id);
          const r = RANKS[rankIdx(id, b)];
          return (
            <button key={id} onClick={() => setHowEx(id)} style={{ ...btnBase, textAlign: "left", background: SOFT(), border: "none", borderRadius: 12, padding: "10px 11px", color: C.chalk }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{EX[id].name}<ExQ id={id} onOpen={() => setHowEx(id)} style={{ width: 17, height: 17, fontSize: 10, marginLeft: 5 }} /></div>
              <div style={{ fontSize: 13, color: r.color, fontWeight: 700, marginTop: 4 }}>{r.icon} {r.name}<span style={{ color: C.dim, fontWeight: 500 }}>{b !== null ? T("maxBest", { v: `${b}${EX[id].type === "time" ? " s" : ""}` }) : ""}</span></div>
            </button>
          );
        })}
      </div>

      <div style={sectionTitle}>{T("badgesTitle")} <span style={{ fontFamily: BODY, fontSize: 14, color: C.dim, fontWeight: 600 }}>{T("achTiers", { n: ach.reduce((x, a) => x + a.tier, 0), max: ach.reduce((x, a) => x + a.at.length, 0) })}</span></div>
      <div data-badges-box style={{ ...card, padding: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {ach.map(a => {
          const r = a.tier ? RANKS[a.tier - 1] : null;
          const prev = a.tier ? a.at[a.tier - 1] : 0;
          const pct = a.next === null ? 100 : Math.max(0, Math.min(100, ((a.v - prev) / (a.next - prev)) * 100));
          return (
            <div key={a.k} data-ach={a.k} data-tier={a.tier} style={{ background: SOFT(), borderRadius: 12, padding: "10px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 26, filter: r ? "none" : "grayscale(1)", opacity: r ? 1 : 0.5 }}>{a.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.chalk, lineHeight: 1.2 }}>{a.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: r ? r.color : C.dim }}>{r ? `${r.icon} ${r.name}` : `🔒 ${T("achLocked")}`}</div>
                </div>
              </div>
              <div style={{ height: 5, background: `${C.chalk}14`, borderRadius: 99, marginTop: 9, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: r ? r.color : C.dim, borderRadius: 99, transition: "width .6s ease-out" }} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 5, lineHeight: 1.35 }}>{a.next === null ? T("achMax") : `${T("achNext", { rank: RANKS[a.tier].name })} ${a.desc}`}</div>
            </div>
          );
        })}
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
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{ex.name}<ExQ id={id} onOpen={() => setHowEx(id)} /></div>
                      <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{ex.muscles}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                        {d && <span style={{ fontSize: 11, fontWeight: 700, color: C.signal, border: `1.5px solid ${C.signal}55`, borderRadius: 99, padding: "1px 8px" }}>{T("dayN", { d })}</span>}
                        {!d && <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, border: `1.5px solid ${C.line}`, borderRadius: 99, padding: "1px 8px" }}>{T("exAlt")}</span>}
                        <DiffChip id={id} />
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

function SettingsTab({ settings, setSettings, history, profile, setProfile, onImport, onResetAll, kcal }) {
  const [page, setPage] = useState(null); // null | "exercises"
  useBack(() => setPage(null), page === "exercises");
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
    const data = { app: BACKUP_ID, version: 1, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), history, profile, settings, kcal: kcal || null };
    saveBackupFile(`hw-app-backup-${dateKey()}.json`, JSON.stringify(data))
      .then(how => { if (how === "cancelled") return; setMsg(T(how === "shared" ? "msgBackupShared" : "msgBackupSaved")); sfxCheck(); })
      .catch(() => setMsg(T("msgBackupFail")));
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
          <button data-translate-help onClick={() => { sfxTap(); openExternal(TRANSLATE_URL); }} style={{ ...btnBase, background: "transparent", color: C.sky, fontSize: 13, padding: "14px 2px 2px", textAlign: "left", lineHeight: 1.45 }}>{T("translateHelp")}</button>
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
      <div style={{ fontSize: 13, color: C.chalk, fontWeight: 800, margin: "14px 0 8px" }}>{T("lookTitle")}</div>
      <div role="radiogroup" aria-label={T("lookTitle")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {["cards", "tiles", "glass", "accent", "flat"].map(id => {
          const on = (settings.look || "cards") === id;
          const box = id === "cards" ? { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6 } : id === "tiles" ? { background: C.panelHi, borderRadius: 5 } : id === "glass" ? { background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`, borderRadius: 8, boxShadow: "0 3px 8px rgba(0,0,0,.3)" } : id === "accent" ? { background: C.panel, borderLeft: `3px solid ${C.signal}`, borderRadius: 4 } : { borderBottom: `1px solid ${C.line}` };
          return (
            <button key={id} role="radio" aria-checked={on} data-look={id} onClick={() => { sfxTap(); set("look", id); }}
              style={{ ...btnBase, background: C.ink, border: `2px solid ${on ? C.signal : C.line}`, padding: 9, color: C.chalk, textAlign: "left" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: id === "tiles" ? 3 : 5, marginBottom: 8 }}>
                {[18, 26, 14].map((h, i) => <span key={i} style={{ height: h, ...box }} />)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{T("look_" + id)}{on ? " ✓" : ""}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6, lineHeight: 1.45 }}>{T("lookHint")}</div>

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
        <SettingRow title={T("vibrate")} desc={`${T("vibrateD")} ${T("vibrateHint")}`} on={settings.vibrate} onClick={() => { set("vibrate", !settings.vibrate); if (!settings.vibrate) vibratePattern([160]); }} />
        <SettingRow title={T("keepAwake")} desc={T("keepAwakeD")} on={settings.keepAwake} onClick={() => set("keepAwake", !settings.keepAwake)} />
        <SettingRow title={T("aiCopy")} desc={T("aiCopyD")} on={settings.aiCopy} onClick={() => set("aiCopy", !settings.aiCopy)} />
      </div>

      <div style={sectionTitle}>{T("dataBackup")}</div>
      <div style={card}>
        <button onClick={exportBackup} style={rowBtn(true)}>
          {T("backupSave")}
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{T(isNative ? "backupSaveDApp" : "backupSaveD")}</div>
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

      <button onClick={() => { sfxTap(); openExternal(SUPPORT_URL); }} data-support style={{ ...btnBase, ...card, width: "100%", marginTop: 22, display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", color: C.chalk, textAlign: "left" }}>
        <span style={{ fontSize: 22 }} aria-hidden="true">💛</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{T("support")}</span>
          <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.dim, marginTop: 2 }}>{T("supportDesc")}</span>
        </span>
        <span style={{ color: C.dim, fontSize: 18 }}>›</span>
      </button>
      <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginTop: 26, lineHeight: 1.6, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Logo size={44} />
        <div>{T("about", { v: APP_VERSION })}<br />{T("privacy")}</div>
        <button data-privacy onClick={() => { sfxTap(); openExternal(PRIVACY_URL); }} style={{ ...btnBase, background: "transparent", color: C.sky, fontSize: 12, padding: "2px 0" }}>{T("privacyLink")} ›</button>
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
                <div style={{ fontSize: 15, fontWeight: 700 }}>{ex.name}<ExQ id={id} /></div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{ex.muscles}{l ? T("lastShort", { v: l.res.map(r => fmtRes(r, "")).join("/") }) : ""}</div>
              </div>
              <DiffChip id={id} pad="2px 8px" />
              {ex.tag && <span style={{ fontSize: 11, fontWeight: 700, color: C.sky, border: `1.5px solid ${C.sky}55`, borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap" }}>{T("tag_" + ex.tag)}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function Work({ item, rounds, history, sessionResults, onRecord, onSwap, exclude, onLive }) {
  const [swap, setSwap] = useState(false);
  const ex = EX[item.id];
  const last = lastFor(history, item.id);
  const isLastRound = item.r === rounds - 1;
  const [how, setHow] = useState(false);

  // Progressive overload: last time's result for this round (or the closest round), and a goal one step above it.
  // The counter starts at last time's number (Michael, Oct 9: no longer 0); the goal is +1 above it.
  const prevVal = (() => {
    if (!last) return null;
    const own = numVal(last.res[item.r]);
    if (!isNaN(own)) return own;
    const nums = last.res.map(numVal).filter(n => !isNaN(n));
    return nums.length ? nums[nums.length - 1] : null;
  })();
  const goal = prevVal === null ? null : ex.type === "time" ? (ex.durs.find(d => d > prevVal) ?? null) : prevVal + 1;
  // Coming back to a round that was already logged (Back button): start at that number.
  const already = numVal(((sessionResults || {})[item.id] || [])[item.r]);
  const startReps = !isNaN(already) ? already : prevVal !== null ? prevVal : 0;
  const [reps, setRepsRaw] = useState(startReps);
  const setReps = n => setRepsRaw(Math.max(0, Math.min(999, Math.round(n) || 0)));
  const [typing, setTyping] = useState(false);
  const [tempoOn, setTempoOn] = useState(false);
  // One arm / one leg at a time: right side first, then left (Michael, Oct 9). The weaker side is logged.
  const split = ex.type === "reps" && (ex.unit === "arm" || ex.unit === "leg");
  const [side, setSide] = useState("R");
  const [rightReps, setRightReps] = useState(null);
  const sideName = sd => T(`side${sd}_${ex.unit}`);

  const initDur = () => {
    if (ex.type !== "time") return 0;
    if (goal !== null) return goal;
    if (prevVal !== null && ex.durs.includes(prevVal)) return prevVal;
    return ex.dur;
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

  // Tell the app about a running hold/prep timer (for the mini player when the workout is minimized).
  useEffect(() => { if (onLive) onLive(ph === "ready" || !endAt ? null : { kind: ph, endAt, total: ph === "prep" ? 5 : dur }); }, [ph, endAt]);
  useEffect(() => () => { if (onLive) onLive(null); }, []);
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
      {how && <HowTo id={item.id} history={history} onClose={() => setHow(false)} onSwap={onSwap && ph === "ready" ? () => { sfxTap(); setHow(false); setSwap(true); } : null} />}
      {swap && <SwapSheet item={item} exclude={exclude || []} history={history} onClose={() => setSwap(false)} onPick={id => { setSwap(false); sfxCheck(); onSwap(item.slot, id); }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: fitSize(ex.name, 46), fontWeight: 900, lineHeight: 0.95, color: C.chalk, flex: 1, minWidth: 0, hyphens: "auto", overflowWrap: "break-word" }}>{ex.name}<ExQ id={item.id} onOpen={() => setHow(true)} style={{ width: 24, height: 24, fontSize: 14, marginLeft: 8, verticalAlign: "0.15em" }} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setHow(true)} style={{ ...ghostBtn, padding: "8px 12px", whiteSpace: "nowrap" }}>{T("howTo")}</button>
          {onSwap && ph === "ready" && <button onClick={() => { sfxTap(); setSwap(true); }} style={{ ...ghostBtn, padding: "8px 12px", color: C.sky, borderColor: `${C.sky}88`, whiteSpace: "nowrap" }}>{T("swap")}</button>}
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>{ex.muscles}{ex.tempo ? `. ${T("tempo")}: ${ex.tempo}` : ""}</div>
      <div style={{ fontSize: 13, color: C.chalk, marginTop: 6 }}>{lastLine}</div>
      {prevVal !== null && (() => {
        // Holds: the goal is preselected as the duration, so "reached" only makes sense for reps.
        const hit = ex.type === "reps" && goal !== null && reps >= goal;
        const unit = ex.type === "time" ? " s" : unitStr(ex.unit);
        return (
          <div data-goal style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, background: hit ? `${C.mint}1f` : C.panel, border: `1.5px solid ${hit ? C.mint : C.signal}66`, borderRadius: 14, padding: "9px 12px" }}>
            <span className={hit ? "pop" : ""} key={hit ? "hit" : "aim"} style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 20, lineHeight: 1, color: hit ? C.mint : C.signal, border: `2px solid ${hit ? C.mint : C.signal}`, borderRadius: 10, padding: "3px 7px", flexShrink: 0 }}>{hit ? "✓" : ex.type === "time" ? "↑" : "+1"}</span>
            <div style={{ fontSize: 13, color: C.chalk, lineHeight: 1.4 }}>
              {goal === null ? T("goalTop", { v: `${prevVal}${unit}` }) : hit ? T("goalHit", { v: `${goal}${unit}` }) : T("goalLine", { v: `${prevVal}${unit}`, g: `${goal}${unit}` })}
              <div style={{ fontSize: 12, color: C.dim }}>{T("goalOk")}</div>
            </div>
          </div>
        );
      })()}
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
          {TEMPO[item.id] && (
            <button data-tempo-btn onClick={() => { unlockAudio(); sfxTap(); setTempoOn(!tempoOn); }} aria-pressed={tempoOn} style={{ ...ghostBtn, display: "block", margin: "16px auto 0", color: tempoOn ? C.ink : C.sky, background: tempoOn ? C.sky : "transparent", borderColor: tempoOn ? C.sky : `${C.sky}88` }}>
              {tempoOn ? T("tempoOff") : T("tempoOn", { t: TEMPO[item.id].map(x => x[1]).join("-") })}
            </button>
          )}
          {tempoOn && TEMPO[item.id] && <TempoGuide seq={TEMPO[item.id]} />}
          {split && (
            <div data-side={side} style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 22 }}>
              {["R", "L"].map((sd, i) => (
                <span key={sd} style={{ fontSize: 13, fontWeight: 800, padding: "6px 12px", borderRadius: 99, background: side === sd ? C.sky : "transparent", color: side === sd ? C.ink : sd === "R" && side === "L" ? C.mint : C.dim, border: `1.5px solid ${side === sd ? C.sky : C.line}` }}>
                  {sd === "R" && side === "L" ? `✓ ${sideName(sd)} ${rightReps}` : `${i + 1}. ${sideName(sd)}`}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: split ? 14 : 26 }}>
            <button className="b3d" onClick={() => { sfxTap(); setReps(Math.max(0, reps - 1)); }} aria-label={T("less")} style={{ ...btnBase, width: 64, height: 64, borderRadius: 99, background: C.panelHi, color: C.chalk, fontSize: 32, "--e": "#0a1734" }}>−</button>
            <div style={{ textAlign: "center", minWidth: 120 }}>
              {typing ? (
                <input data-reps-input type="number" inputMode="numeric" pattern="[0-9]*" min={0} max={999} autoFocus defaultValue={reps} aria-label={T("typeReps")}
                  onFocus={e => e.target.select()}
                  onBlur={e => { setReps(+e.target.value); setTyping(false); }}
                  onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                  style={{ width: 150, fontFamily: DISPLAY, fontSize: 104, fontWeight: 900, lineHeight: 1, textAlign: "center", color: C.chalk, background: C.panel, border: `2px solid ${C.signal}`, borderRadius: 18, padding: "4px 0", outline: "none", MozAppearance: "textfield" }} />
              ) : (
                <button data-reps onClick={() => { sfxTap(); setTyping(true); }} aria-label={`${reps}. ${T("typeReps")}`} key={reps} className="bump" style={{ ...btnBase, background: "transparent", padding: 0, fontFamily: DISPLAY, fontSize: 132, fontWeight: 900, lineHeight: 0.85, color: best !== null && reps > best ? C.signal : C.chalk, borderBottom: `2px dashed ${C.line}` }}>{reps}</button>
              )}
              <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{T("reps")}{ex.unit ? ` ${perUnit(ex.unit)}` : ""}</div>
              <div style={{ height: 22, marginTop: 4, fontSize: 14, fontWeight: 800, color: C.signal }}>{best !== null && reps > best ? <span className="pop" style={{ display: "inline-block" }}>{rankIdx(item.id, reps) > rankIdx(item.id, best) ? `${RANKS[rankIdx(item.id, reps)].icon} ${T("newRank", { rank: RANKS[rankIdx(item.id, reps)].name })}` : T("pr")}</span> : ""}</div>
            </div>
            <button className="b3d" onClick={() => { const n = reps + 1; if (best !== null && n === best + 1) sfxRecord(); else sfxTap(); setReps(n); }} aria-label={T("more")} style={{ ...btnBase, width: 64, height: 64, borderRadius: 99, background: C.panelHi, color: C.chalk, fontSize: 32, "--e": "#0a1734" }}>+</button>
          </div>
          <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginTop: 10 }}>{T(prevVal !== null ? "countHint" : "countHint0")}</div>
          {split && side === "L" && rightReps !== null && rightReps !== reps && (
            <div data-side-diff style={{ marginTop: 14, border: `1.5px solid ${C.sky}88`, background: `${C.sky}14`, borderRadius: 14, padding: "10px 13px", fontSize: 13, lineHeight: 1.5, color: C.chalk }}>
              <b style={{ color: C.sky }}>{T("sideDiffTitle")}</b> {T("sideDiff", { a: sideName("R"), r: rightReps, b: sideName("L"), l: reps, v: Math.min(rightReps, reps) })}
            </div>
          )}
          {split && side === "R" ? (
            <button data-side-next onClick={() => { unlockAudio(); sfxSet(); setRightReps(reps); setSide("L"); setTyping(false); }} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 22, fontSize: 18, padding: 19 }}>
              {T("sideNext", { side: sideName("L") })}
            </button>
          ) : (
            <button onClick={() => { unlockAudio(); onRecord(split && rightReps !== null ? Math.min(rightReps, reps) : reps); }} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 22, fontSize: 18, padding: 19 }}>
              {T("doneBtn", { v: `${split && rightReps !== null ? Math.min(rightReps, reps) : reps}${unitStr(ex.unit)}` })}
            </button>
          )}
          {split && side === "L" && (
            <button data-side-back onClick={() => { sfxTap(); setSide("R"); setReps(rightReps ?? reps); setRightReps(null); }} style={{ ...ghostBtn, display: "block", margin: "12px auto 0" }}>{T("sideBack", { side: sideName("R") })}</button>
          )}
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

// Small workout clock in the header: time since the workout started (m:ss, h:mm:ss after an hour).
const fmtDur = secs => { const h = Math.floor(secs / 3600), m = Math.floor(secs / 60) % 60, x = secs % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
function Elapsed({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const secs = Math.max(0, Math.round((now - since) / 1000));
  if (secs >= 4 * 3600) return null;
  return <span data-elapsed aria-label={T("elapsedAria")} style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.dim, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>⏱ {fmtDur(secs)}</span>;
}

// Tempo guide (Michael, Oct 9): one rep as phases [shape, seconds, word]. Shape: "down" = the circle shrinks,
// "up" = it grows, "hold" = it becomes a bar that fills. Words are the texts' own (tp_*). Taken from each exercise's
// tempo text; a plain "up"/"down" without seconds = 1 s, "short pause" = 1 s. No guide where the tempo isn't a fixed
// rhythm (bicycle crunch, Y-T-W, 1¼ squat).
const TEMPO = {
  k1: [["down", 3, "down"], ["hold", 1, "pause"], ["up", 1, "up"]],
  n1: [["down", 3, "down"], ["hold", 1, "pause"], ["up", 1, "up"]],
  row1: [["up", 1, "pull"], ["hold", 1, "hold"], ["down", 3, "back"]],
  row2: [["up", 1, "pull"], ["hold", 1, "hold"], ["down", 3, "back"]],
  row3: [["up", 1, "pull"], ["hold", 1, "hold"], ["down", 3, "back"]],
  r1: [["down", 3, "down"], ["up", 1, "up"]], n2: [["down", 3, "down"], ["up", 1, "up"]], k3: [["down", 3, "down"], ["up", 1, "up"]],
  kKnee: [["down", 3, "down"], ["up", 1, "up"]], kIncl: [["down", 3, "down"], ["up", 1, "up"]],
  r1e: [["down", 3, "down"], ["up", 1, "up"]], k3e: [["down", 3, "down"], ["up", 1, "up"]],
  lunge: [["down", 2, "down"], ["up", 1, "up"]],
  b2: [["down", 2, "reach"], ["up", 2, "back"]],
  n7: [["down", 3, "out"], ["up", 1, "back"]],
  superman: [["up", 1, "up"], ["hold", 2, "hold"], ["down", 1, "down"]],
  bridge: [["up", 1, "up"], ["hold", 2, "squeeze"], ["down", 1, "down"]],
  sbridge: [["up", 1, "up"], ["hold", 2, "squeeze"], ["down", 1, "down"]],
  birddog: [["up", 1, "reach"], ["hold", 2, "hold"], ["down", 1, "back"]],
  legraise: [["up", 2, "up"], ["down", 2, "down"]],
};
function TempoGuide({ seq }) {
  const total = seq.reduce((a, x) => a + x[1], 0);
  const [t0] = useState(() => performance.now());
  const [now, setNow] = useState(t0);
  const lastPh = useRef(-1);
  useEffect(() => { let id; const loop = ts => { setNow(ts); id = requestAnimationFrame(loop); }; id = requestAnimationFrame(loop); return () => cancelAnimationFrame(id); }, []);
  const el = Math.max(0, (now - t0) / 1000), rep = Math.floor(el / total);
  let t = el - rep * total, i = 0;
  while (i < seq.length - 1 && t >= seq[i][1]) { t -= seq[i][1]; i++; }
  const [shape, secs, word] = seq[i], p = Math.min(1, t / secs);
  // a soft tick when the phase changes (one sound per change, nothing chained)
  useEffect(() => { const k = rep * seq.length + i; if (lastPh.current !== -1 && lastPh.current !== k) sfxTap(); lastPh.current = k; }, [i, rep]);
  const BIG = 74, SMALL = 30;
  // size at the start of each phase = where the previous phase ended
  const sizeBefore = j => { let r = BIG; for (let k = 0; k < j; k++) r = seq[k][0] === "down" ? SMALL : seq[k][0] === "up" ? BIG : r; return r; };
  const r0 = i === 0 ? (seq[seq.length - 1][0] === "down" ? SMALL : BIG) : sizeBefore(i);
  const r = shape === "down" ? BIG - (BIG - SMALL) * p : shape === "up" ? SMALL + (BIG - SMALL) * p : r0;
  const left = Math.max(1, Math.ceil(secs - t - 1e-6));
  return (
    <div data-tempo-guide data-phase={word} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, background: C.panel, borderRadius: 18, padding: "10px 14px" }}>
      <svg width="164" height="164" viewBox="0 0 164 164" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="82" cy="82" r={BIG} fill="none" stroke={C.line} strokeWidth="2" strokeDasharray="4 6" />
        {shape === "hold" ? (
          <g>
            <rect x={82 - r} y={73} width={2 * r} height={18} rx={9} fill={C.panelHi} />
            <rect x={82 - r} y={73} width={2 * r * p} height={18} rx={9} fill={C.signal} />
          </g>
        ) : (
          <circle cx="82" cy="82" r={r} fill={`${C.sky}33`} stroke={C.sky} strokeWidth="3" />
        )}
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1, color: shape === "hold" ? C.signal : C.sky }}>{T("tp_" + word)}</div>
        <div data-tempo-left style={{ fontFamily: DISPLAY, fontSize: 54, fontWeight: 900, lineHeight: 1, color: C.chalk, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{left}</div>
        <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{T("tempoRep", { n: rep + 1, s: total })}</div>
      </div>
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
      <div style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 800, color: C.chalk, lineHeight: 1.05 }}>{ex.name}<ExQ id={nextItem.id} style={{ width: 22, height: 22, fontSize: 13, verticalAlign: "0.2em" }} /></div>
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
function Summary({ entry, xpBefore = 0, xpGained, newCh = [], newAch = [], history, onClose }) {
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
  const [finishLine] = useState(() => (bdayToday() ? T("bdayFinish") : pick(L.finish)));
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
      {(() => { const s = kcalNow(history.concat(history.some(e => e.ts === entry.ts) ? [] : [entry])); return s ? <div data-sum-kcal style={{ fontSize: 13, color: s.hit ? KC_HIT : C.sky, marginTop: 6, fontWeight: 700 }}>🥗 {s.left > 0 ? T("kcAfterWorkout", { n: nf(s.left) }) : T("kcAfterWorkoutDone")}</div> : null; })()}
      {entry.dur > 0 && <div data-total-time style={{ fontSize: 14, color: C.chalk, fontWeight: 700, marginTop: 6 }}>⏱ {T("totalTime", { t: fmtDur(entry.dur) })}</div>}
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
      {newAch.length > 0 && (
        <div className="pop" data-newach style={{ marginTop: 14, border: `2px solid ${C.sky}`, borderRadius: 16, padding: "12px 16px" }}>
          {newAch.map(a => (
            <div key={a.k} style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: RANKS[a.tier - 1].color, lineHeight: 1.2 }}>{a.icon} {T("achUp", { name: a.name, rank: `${RANKS[a.tier - 1].icon} ${RANKS[a.tier - 1].name}` })}</div>
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
            <div style={{ fontSize: 15, fontWeight: 600, color: C.chalk }}>{entry.prs && entry.prs.includes(it.id) ? "🏆 " : ""}{exName(it)}{EX[it.id] && <ExQ id={it.id} />}</div>
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
function Session({ session, setSession, history, onSave, onClose, onMinimize, onLive }) {
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
    const secs = session.startTs ? Math.round((Date.now() - session.startTs) / 1000) : 0;
    const entry = items.length ? { date: dateKey(), ts: Date.now(), day: session.day, rounds: session.rounds, items, prs, rankUps, warm: session.warm.every(Boolean), cool: !!coolDone, ...(secs > 0 && secs < 4 * 3600 ? { dur: secs } : {}) } : null;
    const xpBefore = totalXP(history);
    let xpGained = 0, newCh = [], newAch = [];
    if (entry) {
      const after = [...history, entry];
      xpGained = totalXP(after) - xpBefore;
      newAch = achUps(history, after);
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
    setSession({ ...session, phase: "summary", entry, xpBefore, xpGained, newCh, newAch, rest: null });
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
    <div style={{ padding: "calc(16px + var(--sat)) 18px calc(40px + var(--sab))", maxWidth: 460, margin: "0 auto" }}>
      {session.phase !== "summary" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 14, color: C.dim, fontWeight: 600, minWidth: 0 }}>
              {inFlow ? T("dayRound", { d: session.day, r: cur.r + 1, n: session.rounds }) : T("dayN", { d: session.day })}
              {session.startTs && <Elapsed since={session.startTs} />}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {inFlow && <button onClick={goBack} style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12 }}>{T("back")}</button>}
              <button onClick={() => { if (!confirmQuit) { setConfirmQuit(true); setTimeout(() => setConfirmQuit(false), 3000); return; } if (hasResults) finish(); else onClose(); }}
                style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12, color: confirmQuit ? "#ff8a80" : C.dim, borderColor: confirmQuit ? "#ff8a80" : C.line }}>
                {confirmQuit ? (hasResults ? T("quitSave") : T("quitConfirm")) : T("quit")}
              </button>
              {onMinimize && <MenuButton open={false} label={T("menuMinimize")} onClick={() => { sfxTap(); onMinimize(); }} />}
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
        <Work key={`${session.pos}-${seq[session.pos].id}`} item={seq[session.pos]} rounds={session.rounds} history={history} sessionResults={session.results} onRecord={record} onSwap={doSwap} exclude={usedIds} onLive={onLive} />
      )}
      {session.phase === "rest" && session.rest && (
        <Rest key={session.rest.nextPos} rest={session.rest} nextItem={seq[session.rest.nextPos]} rounds={session.rounds}
          onEnd={() => setSession(s => (s.phase === "rest" && s.rest ? { ...s, phase: "work", pos: s.rest.nextPos, rest: null } : s))}
          onAdd={() => setSession(s => (s.rest ? { ...s, rest: { ...s.rest, endAt: s.rest.endAt + 15000, total: s.rest.total + 15 } } : s))} />
      )}
      {session.phase === "cool" && <Cool onFinish={finish} />}
      {session.phase === "summary" && <Summary entry={session.entry} xpBefore={session.xpBefore || 0} xpGained={session.xpGained} newCh={session.newCh || []} newAch={session.newAch || []} history={history} onClose={onClose} />}
      </div>
    </div>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [history, setHistory] = useState(SEED_HISTORY);
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState("train");
  const [menuOpen, setMenuOpen] = useState(false);
  // A running workout can be minimized to the mini player; it stays mounted (hidden), so timers and sounds go on.
  const [sessionOpen, setSessionOpen] = useState(true);
  const [live, setLive] = useState(null);
  const [newsOpen, setNewsOpen] = useState(false);
  const [profile, setProfileState] = useState({ name: "User", pfp: null, freezeDays: [], streakResetTs: 0 });
  const [ui, setUiState] = useState({});
  const [kcal, setKcalState] = useState(null);
  const setKcal = k => { setKcalState(k); saveKcal(k); };
  const setUi = u => { setUiState(u); saveUi(u); };
  // Every change to past workouts keeps the history sorted and records/rank-ups correct.
  const editHistory = fn => setHistory(h => recomputeFlags(sortHistory(fn(h))));
  META = { kcal, skips: profile.skips || {}, freezeDays: profile.freezeDays || [], streakResetTs: profile.streakResetTs || 0, bonusFreezes: (profile.bdayGifts || []).length, giftThisYear: (profile.bdayGifts || []).includes(parseKey(dateKey()).getFullYear()), birth: profile.birth || null };
  window._wset = settings;
  applyTheme(settings.theme);
  LOOK = settings.look || "cards";
  if (LOOK === "tiles") card = { background: C.panelHi, border: `1px solid ${C.panelHi}`, borderRadius: 16 };
  if (LOOK === "glass") card = { background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel} 60%)`, border: `1px solid ${C.chalk}14`, borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,.28)" };
  if (LOOK === "accent") card = { background: C.panel, border: `1px solid ${C.line}`, borderLeft: `4px solid ${C.chalk}40`, borderRadius: 16 };
  applyLang(settings.lang || detectLang());
  const setSettings = n => { setSettingsState(n); saveSettings(n); };
  const [profLoaded, setProfLoaded] = useState(false);
  useEffect(() => { loadProfile().then(p => { if (p) setProfileState(prev => ({ ...prev, ...p })); setProfLoaded(true); }); loadKcal().then(k => { if (k) setKcalState(k); }); }, []);
  // Birthday: count it for the achievement and give one freeze day as a present (once per year).
  useEffect(() => {
    if (!profLoaded || !isBirthday(profile.birth)) return;
    const y = parseKey(dateKey()).getFullYear();
    if ((profile.bdays || []).includes(y)) return;
    setProfile({ ...profile, bdays: [...(profile.bdays || []), y], bdayGifts: [...(profile.bdayGifts || []), y] });
  }, [profLoaded, profile.birth && profile.birth.m, profile.birth && profile.birth.d, dateKey()]);
  const setProfile = p => { setProfileState(p); saveProfile(p); };
  const [skipOpen, setSkipOpen] = useState(false);
  const applyFreeze = () => { unlockAudio(); sfxTap(); setSkipOpen(true); };
  const saveSkip = (reason, freeze) => {
    const t = dateKey();
    const canFreeze = freeze && !(profile.freezeDays || []).includes(t) && freezesAvailable(history) > 0;
    sfxCheck();
    setProfile({ ...profile, skips: { ...(profile.skips || {}), [t]: reason }, freezeDays: canFreeze ? [...(profile.freezeDays || []), t] : (profile.freezeDays || []) });
    setSkipOpen(false);
  };

  useEffect(() => {
    Promise.all([loadAll(), loadUi()]).then(([s, u]) => {
      if (u) setUiState(u);
      if (s && Array.isArray(s.history)) setHistory(s.history);
      loadSettings().then(st => {
        if (st) setSettingsState({ ...DEFAULT_SETTINGS, ...st });
        else if (s && s.muted === true) setSettingsState({ ...DEFAULT_SETTINGS, sndTap: false, sndFx: false, sndTimer: false });
        setSettingsLoaded(true);
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
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [newsChecked, setNewsChecked] = useState(false);
  const [updCard, setUpdCard] = useState(false); // "updated, see what's new" card, only on this first start after a small update
  const [newsAt, setNewsAt] = useState(null);
  const [onboard, setOnboard] = useState(null); // step to show the first-start setup at, or null
  const [obChecked, setObChecked] = useState(false);
  useEffect(() => {
    if (!loaded || !settingsLoaded || !profLoaded || obChecked) return;
    setObChecked(true);
    if (!settings.onboarded && history.length === 0 && (!profile.name || profile.name === "User")) setOnboard(0);
  }, [loaded, settingsLoaded, profLoaded]);
  useEffect(() => {
    if (!loaded || !settingsLoaded || newsChecked) return;
    setNewsChecked(true);
    if (bigVer(settings.seenVersion) === bigVer(APP_VERSION)) {
      // small update: show the card now and remember the version right away, so it's gone next time
      if (newsUnseen(settings.seenVersion)) { setUpdCard(true); setSettings({ ...settings, seenVersion: APP_VERSION }); }
      return;
    }
    if (history.length > 0) setNewsOpen(true); // someone who used an older version
    else setSettings({ ...settings, seenVersion: APP_VERSION }); // a new install has nothing to compare
  }, [loaded, settingsLoaded]);

  useEffect(() => { if (!session || sessionOpen) window.scrollTo?.(0, 0); }, [session?.phase, session?.pos]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [screen, sessionOpen]);
  const [histEdit, setHistEdit] = useState(null); // date whose workout opens in the History editor
  const go = (id, opt) => { if (id !== screen) sfxTap(); setScreen(id); setMenuOpen(false); if (session) setSessionOpen(false); setHistEdit(opt && opt.edit ? opt.edit : null); };
  const [howId, setHowId] = useState(null);
  openHowToGlobal = setHowId;
  // Android back with nothing open: minimize the workout, then go Home, then leave the app.
  useEffect(() => {
    setRootBack(() => {
      if (session && sessionOpen) { setSessionOpen(false); return true; }
      if (screen !== "train") { setScreen("train"); return true; }
      return false;
    });
  });
  // App only: look for a new version once per start (a new APK, or a small update for the next start).
  const [apkUpd, setApkUpd] = useState(null);
  const [dl, setDl] = useState(null); // small update: {kind: downloading|ready, v, pct, id}
  const [gh, setGh] = useState(() => (lastGh() || {}).v || null); // newest version on GitHub
  // App: steps from Health Connect, once per start (the last 7 days, so a missed day is filled in too).
  const [stepsSynced, setStepsSynced] = useState(false);
  useEffect(() => {
    if (!isNative || stepsSynced || !kcal || !kcal.healthOn) return;
    setStepsSynced(true);
    Promise.all([healthSteps(7), healthSteps(7, "dietaryEnergyConsumed"), kcal.healthFood === true ? healthFoodItems(7) : null]).then(([m, f, it]) => { if (m || f) setKcalState(k => { const n = { ...k, steps: { ...(k.steps || {}), ...(m || {}) }, food: { ...(k.food || {}), ...(f || {}) }, foodItems: { ...(k.foodItems || {}), ...(it || {}) } }; saveKcal(n); return n; }); });
  }, [kcal]);
  // Website: the newest Android app version on GitHub for the menu (the API allows browsers; 60 calls an hour per IP).
  useEffect(() => {
    if (isNative) return;
    fetch("https://api.github.com/repos/mikydon/hw-app/releases/latest").then(r => r.ok ? r.json() : null).then(j => { if (j && j.tag_name) setGh(String(j.tag_name).replace(/^v/, "")); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!loaded || !isNative) return;
    checkForUpdate(APP_VERSION, !!session, st => { if (st && st.kind === "gh") setGh(st.v); else setDl(st); }).then(async r => {
      // A new big version → its APK. The test APK may always fetch the newest release, to try the flow.
      let a = r && r.apk;
      if (!a && latestApk() && await isTestBuild()) a = { ...latestApk(), test: true };
      if (a) setApkUpd(a);
      apkRestore(a && a.version); // an APK downloaded earlier is ready again; old ones are deleted
    }).catch(() => {});
  }, [loaded]);
  const resume = () => { sfxTap(); setMenuOpen(false); setSessionOpen(true); };

  const start = (dayId, rounds) => {
    const day = DAYS.find(d => d.id === dayId);
    setSession({ day: dayId, rounds, base: Object.fromEntries(day.ids.map(slot => [slot, effId(slot)])), phase: "warmup", pos: 0, warm: WARMUP.map(() => false), results: {}, rest: null, startTs: Date.now() });
    setSessionOpen(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.ink, color: C.chalk, fontFamily: BODY }}>
      <style>{`
        button:focus-visible{outline:3px solid ${C.signal};outline-offset:2px}
        [data-reps-input]::-webkit-inner-spin-button,[data-reps-input]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        .fstart{transform:translateY(calc(100% + 24px));opacity:0;transition:transform .42s cubic-bezier(.2,.9,.25,1.12),opacity .25s ease}
        .fstart.on{transform:none;opacity:1}
        .fstart .fsq{transform:scale(.6);opacity:0;transition:transform .38s cubic-bezier(.2,.9,.3,1.3) var(--d,0ms),opacity .2s ease var(--d,0ms)}
        .fstart.on .fsq{transform:none;opacity:1}
        .fstart.on .fsq.b3d:active{transform:translateY(4px)}
        @media (prefers-reduced-motion: reduce){.fstart,.fstart .fsq{transition:none}}
        .obf:focus{border-color:${C.signal}!important;box-shadow:0 0 0 3px ${C.signal}2e}
        @keyframes obIn{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}
        @keyframes obBack{from{opacity:0;transform:translateX(-26px)}to{opacity:1;transform:none}}
        .obIn{animation:obIn .3s cubic-bezier(.2,.8,.3,1) both}.obBack{animation:obBack .3s cubic-bezier(.2,.8,.3,1) both}
        .b3d{transition:transform .08s ease, box-shadow .08s ease; box-shadow:0 5px 0 var(--e, transparent)}
        .b3d:active{transform:translateY(4px); box-shadow:0 1px 0 var(--e, transparent)}
        @keyframes scrIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .scr{animation:scrIn .28s ease-out both}
        :root{--sat:var(--safe-area-inset-top,env(safe-area-inset-top,0px));--sab:var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px))}
        .sheetBox{box-sizing:border-box;max-height:86vh;max-height:calc(100dvh - 24px - var(--sat) - var(--sab))}
        .exq::after{content:"?"}
        .noBar{scrollbar-width:none}.noBar::-webkit-scrollbar{display:none}
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
        @keyframes dFadeIn{from{opacity:0}to{opacity:1}} @keyframes dFadeOut{from{opacity:1}to{opacity:0}}
        @keyframes dIn{from{transform:translateX(104%)}to{transform:none}} @keyframes dOut{from{transform:none}to{transform:translateX(104%)}}
        @keyframes dItem{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:none}}
        .drawerOff{pointer-events:none} .drawerOn .drawerBg{animation:dFadeIn .25s ease-out both} .drawerOff .drawerBg{animation:dFadeOut .26s ease-in both}
        .drawerOn .drawerPanel{animation:dIn .34s cubic-bezier(.2,.9,.3,1) both} .drawerOff .drawerPanel{animation:dOut .26s cubic-bezier(.5,0,.75,.2) both}
        .drawerOn .drawerItem{animation:dItem .4s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--i) * 38ms + 70ms)}
        .drawerItem{transition:background .15s} .drawerItem:active{transform:scale(.98)}
        @keyframes miniIn{from{opacity:0;transform:translate(-50%,40px) scale(.94)}to{opacity:1;transform:translate(-50%,0)}}
        .miniIn{animation:miniIn .38s cubic-bezier(.2,1.2,.4,1) both}
        @keyframes halo{0%,100%{transform:translateY(0) rotate(0) scale(1)}50%{transform:translateY(-5px) rotate(12deg) scale(1.15)}}
        .haloBit{animation:halo 1.8s ease-in-out var(--d) infinite}
        @keyframes titleIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .titleIn{animation:titleIn .28s ease-out both}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.conf{display:none}}
      `}</style>
      {!loaded ? (
        <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: C.dim }}><Logo size={64} />{T("loading")}</div>
      ) : (
        <>
          {onboard !== null && !session ? (
            <Onboarding start={onboard} profile={profile} setProfile={setProfile} kcal={kcal} setKcal={setKcal}
              onDone={() => { setOnboard(null); setUi({ ...ui, setupHidden: false }); if (!settings.onboarded) setSettings({ ...settings, onboarded: true }); window.scrollTo(0, 0); }} />
          ) : <>
          {session && (
            <div style={{ display: sessionOpen ? "block" : "none" }} aria-hidden={!sessionOpen}>
              <Session session={session} setSession={setSession} history={history}
                onSave={entry => setHistory(h => [...h, entry])}
                onClose={() => { setSession(null); setSessionOpen(true); setLive(null); setScreen("train"); }}
                onMinimize={() => { setSessionOpen(false); setMenuOpen(true); }}
                onLive={setLive} />
            </div>
          )}
          {(!session || !sessionOpen) && (
            <>
              <TopBar dlPct={dl && dl.kind === "downloading" ? dl.pct || 0 : null} screen={screen} history={history} menuOpen={menuOpen} onGo={go} onMenu={() => { sfxTap(); setMenuOpen(o => !o); }} />
              <div key={screen}>
                {screen === "train" && <TrainTab onSetup={st => setOnboard(st)} dl={dl} onDlClose={() => setDl(null)} kcal={kcal} setKcal={setKcal} history={history} onStart={start} onFreeze={applyFreeze} ui={ui} setUi={setUi} active={session} onResume={resume} profile={profile} onGo={go} upd={updCard ? { open: () => { setUpdCard(false); setNewsAt(APP_VERSION); setNewsOpen(true); }, close: () => setUpdCard(false) } : null}
                  apk={apkUpd ? { info: apkUpd, close: () => setApkUpd(null) } : null} />}
                {screen === "history" && <HistoryTab history={history} editDate={histEdit} onEditOpened={() => setHistEdit(null)}
                  onDelete={idx => editHistory(h => h.filter((_, i) => i !== idx))}
                  onSaveEntry={(idx, entry) => editHistory(h => (idx === null ? [...h, entry] : h.map((e, i) => (i === idx ? entry : e))))} />}
                {screen === "profile" && <ProfileTab history={history} profile={profile} setProfile={setProfile} onFreeze={applyFreeze} kcal={kcal} />}
                {screen === "calories" && <Calories history={history} profile={profile} setProfile={setProfile} kcal={kcal} setKcal={setKcal} />}
                {screen === "settings" && <SettingsTab settings={settings} setSettings={setSettings} history={history} profile={profile} setProfile={setProfile}
                  kcal={kcal}
                  onResetAll={() => { setHistory([]); setProfile({ ...profile, freezeDays: [], skips: {}, streakResetTs: 0, bdays: [], bdayGifts: [] }); setUi({}); if (kcal) setKcal({ ...kcal, log: {} }); }}
                  onImport={d => { setHistory(d.history); if (d.profile) setProfile({ ...profile, ...d.profile }); if (d.settings) setSettings({ ...DEFAULT_SETTINGS, ...d.settings }); if (d.kcal) setKcal(d.kcal); }} />}
              </div>
              {session && session.phase !== "summary" && <MiniPlayer session={session} live={live} onOpen={resume} />}
            </>
          )}
          <MenuDrawer gh={gh} dl={dl} open={menuOpen} screen={screen} history={history} profile={profile} session={session && session.phase !== "summary" ? session : null}
            onGo={go} onResume={resume} onClose={() => setMenuOpen(false)} onNews={() => { setMenuOpen(false); setNewsOpen(true); }} />
          {skipOpen && <SkipSheet freezes={freezesAvailable(history)} onSave={saveSkip} onClose={() => setSkipOpen(false)} />}
      {howId && <HowTo id={howId} history={history} onClose={() => setHowId(null)} />}
          {newsOpen && <WhatsNew at={newsAt} onClose={() => { setNewsOpen(false); setNewsAt(null); if (settings.seenVersion !== APP_VERSION) setSettings({ ...settings, seenVersion: APP_VERSION }); }} />}
          </>}
        </>
      )}
    </div>
  );
}
