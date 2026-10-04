// Checks a locale file against en.js: same keys, same array lengths, same {placeholders},
// and every plural category the language needs for whole numbers.
// Usage: node src/i18n/check.mjs sk   (or no argument = all locales in this folder)
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const en = (await import(pathToFileURL(path.join(dir, "en.js")))).default;
const ph = s => (s.match(/\{\w+\}/g) || []).sort().join(",");
const codes = process.argv[2] ? [process.argv[2]] : fs.readdirSync(dir).filter(f => /^[a-z]{2}\.js$/.test(f) && f !== "en.js").map(f => f.slice(0, 2));
let bad = 0;
for (const code of codes) {
  const errs = [];
  let loc;
  try { loc = (await import(pathToFileURL(path.join(dir, code + ".js")))).default; } catch (e) { console.log(code, "LOAD ERROR", e.message); bad++; continue; }
  const walk = (a, b, p) => {
    if (b === undefined) { errs.push(`missing ${p}`); return; }
    if (p === "pl") return; // plural objects checked separately
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) { errs.push(`not array ${p}`); return; }
      // Daily lines are picked by index, so every language needs the same number of them.
      const fixedLen = /^(fig|ach|ranks|quotes|restDay|doneTitles|doneSubs|news)/.test(p);
      if (fixedLen && a.length !== b.length) errs.push(`length ${p}: ${b.length} vs ${a.length}`);
      if (!b.length) errs.push(`empty ${p}`);
      if (fixedLen) a.forEach((x, i) => walk(x, b[i], `${p}[${i}]`));
      else b.forEach((x, i) => { if (typeof x !== "string" || !x.trim()) errs.push(`bad item ${p}[${i}]`); });
      return;
    }
    if (typeof a === "object") {
      for (const k of Object.keys(a)) walk(a[k], b[k], p ? `${p}.${k}` : k);
      for (const k of Object.keys(b)) if (!(k in a)) errs.push(`extra ${p ? p + "." : ""}${k}`);
      return;
    }
    if (typeof b !== "string" || !b.trim()) { errs.push(`empty ${p}`); return; }
    if (ph(a) !== ph(b)) errs.push(`placeholders ${p}: "${ph(b)}" vs "${ph(a)}"`);
  };
  walk(en, loc, "");
  const pr = new Intl.PluralRules(code);
  const need = new Set(); for (let n = 0; n <= 200; n++) need.add(pr.select(n));
  for (const k of Object.keys(en.pl)) {
    const o = loc.pl && loc.pl[k];
    if (!o) { errs.push(`missing pl.${k}`); continue; }
    for (const c of need) if (!o[c] && !o.other) errs.push(`pl.${k} missing category ${c}`);
    for (const c of need) { const s = o[c] || o.other; if (s && !s.includes("{n}")) errs.push(`pl.${k}.${c} has no {n}`); }
  }
  console.log(code, errs.length ? `${errs.length} problem(s)` : "OK", `(needs plural forms: ${[...need].join(", ")})`);
  errs.forEach(e => console.log("   ", e));
  bad += errs.length;
}
process.exit(bad ? 1 : 0);
