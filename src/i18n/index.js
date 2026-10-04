// Tiny i18n layer. English is the base; every other locale falls back to it key by key.
// The current language is a module-level variable (like the theme colours), set by
// setLang() before each render, so plain helper functions can translate too.
import en from "./en.js";
import sk from "./sk.js";
import cs from "./cs.js";
import pl from "./pl.js";
import hu from "./hu.js";
import uk from "./uk.js";
import de from "./de.js";
import es from "./es.js";
import fr from "./fr.js";
import it from "./it.js";
import pt from "./pt.js";

// Native names, so people find their language even if the UI is in another one.
export const LANGS = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "sk", name: "Slovenčina", flag: "🇸🇰" },
  { code: "cs", name: "Čeština", flag: "🇨🇿" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
];
const SOURCES = { en, sk, cs, pl, hu, uk, de, es, fr, it, pt };

// Objects merge key by key; strings and arrays are taken whole from the locale.
function merge(base, over) {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base) || typeof base !== "object") return over;
  const out = {};
  for (const k of Object.keys(base)) out[k] = merge(base[k], over[k]);
  for (const k of Object.keys(over)) if (!(k in out)) out[k] = over[k];
  return out;
}
const cache = {};
export function locale(code) {
  if (!SOURCES[code]) code = "en";
  if (!cache[code]) cache[code] = code === "en" ? en : merge(en, SOURCES[code]);
  return cache[code];
}

// Picks a supported language from the browser/phone settings, English otherwise.
export function detectLang() {
  try {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]) || [];
    for (const l of list) { const c = String(l || "").slice(0, 2).toLowerCase(); if (SOURCES[c]) return c; }
  } catch (_) {}
  return "en";
}

export let LANG = "en";
export let L = en;
let plural = new Intl.PluralRules("en");
export function setLang(code) {
  if (!SOURCES[code]) code = "en";
  try { document.documentElement.lang = code; } catch (_) {}
  if (code === LANG && L === locale(code)) return false;
  LANG = code;
  L = locale(code);
  plural = new Intl.PluralRules(code);
  return true;
}

const fill = (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined && p[k] !== null ? p[k] : m)) : s);
// t("startDay", { d: "A" }) -> "Start day A"
export function t(key, params) { const s = L.ui[key] ?? en.ui[key] ?? key; return fill(s, params); }
// tp("workouts", 3) -> "3 workouts" (correct plural form for the language)
export function tp(key, n, params) {
  const forms = L.pl[key] || en.pl[key];
  let cat = plural.select(n);
  if (n === 0 && LANG === "pt") cat = "other"; // "0 treinos" reads more natural than "0 treino"
  const s = forms[cat] || forms.other || forms.many || forms.one;
  return fill(s, { ...params, n });
}

// Dates use the language's own format and names via Intl.
const fmtCache = {};
function dtf(opts) {
  const k = LANG + JSON.stringify(opts);
  if (!fmtCache[k]) fmtCache[k] = new Intl.DateTimeFormat(LANG, opts);
  return fmtCache[k];
}
// Weekday + date in the language's own order. The weekday is swapped for its standalone
// form, because some languages inflect it inside a date (Ukrainian gives "неділю").
export function fmtLong(d, withYear) {
  const parts = dtf(withYear ? { weekday: "long", day: "numeric", month: "numeric", year: "numeric" } : { weekday: "long", day: "numeric", month: "numeric" }).formatToParts(d);
  const wd = dtf({ weekday: "long" }).format(d);
  return parts.map(p => (p.type === "weekday" ? wd : p.value)).join("");
}
export const fmtShortDM = d => dtf({ day: "numeric", month: "numeric" }).format(d);
export const fmtMonthYear = d => dtf({ month: "long", year: "numeric" }).format(d);
const cap = s => s.charAt(0).toLocaleUpperCase(LANG) + s.slice(1);
// Monday-first short weekday labels: ["Mon", "Tue", …] in the current language.
export function weekdaysShort() {
  const mon = new Date(2024, 0, 1); // a Monday
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(1 + i); return cap(dtf({ weekday: "short" }).format(d).replace(/\.$/, "")); });
}
export const capFirst = cap;
