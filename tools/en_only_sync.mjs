// Keeps src/i18n/en-only.json in step with the English-first files (ex-en.js, ui190-en.js): a key stays listed while
// at least one locale doesn't have it yet (1.9.0: translations live in src/i18n/t190/<lang>.js), so check.mjs lets
// it be missing there. Run after adding texts or translations: node tools/en_only_sync.mjs
import fs from "fs";
import EXN from "../src/i18n/ex-en.js";
import { UI, PL, ACH } from "../src/i18n/ui190-en.js";
const dir = new URL("../src/i18n/", import.meta.url);
const p = new URL("en-only.json", dir);
const d = JSON.parse(fs.readFileSync(p, "utf8"));
const en = (await import(new URL("en.js", dir))).default;
const codes = fs.readdirSync(dir).filter(f => /^[a-z]{2}\.js$/.test(f) && f !== "en.js").map(f => f.slice(0, 2));
const locs = await Promise.all(codes.map(async c => (await import(new URL(c + ".js", dir))).default));
const get = (o, k) => k.split(".").reduce((a, x) => (a == null ? a : a[x]), o);
const cand = new Set(d.keys);
Object.keys(EXN).forEach(k => cand.add("ex." + k));
Object.keys(UI).forEach(k => cand.add("ui." + k));
Object.keys(PL).forEach(k => cand.add("pl." + k));
Object.keys(ACH).forEach(k => cand.add("ach." + k));
const missing = k => { const e = get(en, k); return locs.some(L => { const v = get(L, k); return v === undefined || (Array.isArray(e) && (!Array.isArray(v) || v.length !== e.length)); }); };
d.keys = [...cand].filter(missing).sort();
fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
console.log(d.keys.length, "English-only keys");
