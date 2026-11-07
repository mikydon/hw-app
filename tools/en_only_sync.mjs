// Keeps src/i18n/en-only.json in step with the English-first files (ex-en.js, ui190-en.js): every key there that a
// locale doesn't have yet is listed, so check.mjs lets it be missing. Run after adding texts: node tools/en_only_sync.mjs
import fs from "fs";
import EXN from "../src/i18n/ex-en.js";
import { UI, PL, ACH } from "../src/i18n/ui190-en.js";
const p = new URL("../src/i18n/en-only.json", import.meta.url);
const d = JSON.parse(fs.readFileSync(p, "utf8"));
const keys = new Set(d.keys.filter(k => !/^(ex|ui|pl|ach)\./.test(k) || false));
Object.keys(EXN).forEach(k => keys.add("ex." + k));
Object.keys(UI).forEach(k => keys.add("ui." + k));
Object.keys(PL).forEach(k => keys.add("pl." + k));
Object.keys(ACH).forEach(k => keys.add("ach." + k));
// keys from older English-first rounds that are not in these files stay as they were
d.keys.forEach(k => { if (/^(ex|ui|pl|ach)\./.test(k) && !keys.has(k)) keys.add(k); });
d.keys = [...keys].sort();
fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
console.log(d.keys.length, "English-only keys");
