// One text file with the store listing in every language, in the layout Play Console's
// "Import prekladov" takes (Michael uploads this one file):
//   === <Language> – <Play code> ===
//   App name: / Short description: / Full description:
// Source: store/listing/<lang>.txt (line 1 name ≤ 30, line 2 short ≤ 80, rest full ≤ 4000).
// node tools/store/onefile.mjs [out file]   (default store/out/listing-all.txt)
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const HEAD = [
  ["en", "English (United States) – en-US"], ["sk", "Slovak – sk"], ["cs", "Czech – cs-CZ"], ["pl", "Polish – pl-PL"],
  ["hu", "Hungarian – hu-HU"], ["uk", "Ukrainian – uk"], ["de", "German – de-DE"], ["es", "Spanish (Spain) – es-ES"],
  ["fr", "French (France) – fr-FR"], ["it", "Italian – it-IT"], ["pt", "Portuguese (Brazil) – pt-BR"],
  ["zh", "Chinese (Simplified) – zh-CN"], ["ja", "Japanese – ja-JP"], ["ko", "Korean – ko-KR"], ["id", "Indonesian – id"],
];
const have = fs.readdirSync(path.join(root, "store/listing")).filter(f => f.endsWith(".txt")).map(f => f.slice(0, -4));
const miss = have.filter(l => !HEAD.some(h => h[0] === l));
if (miss.length || have.length !== HEAD.length) { console.error("languages do not match store/listing:", miss, have.length, HEAD.length); process.exit(1); }
let bad = 0;
const parts = HEAD.map(([l, head]) => {
  const t = fs.readFileSync(path.join(root, "store/listing", l + ".txt"), "utf8").replace(/\r/g, "").replace(/\s+$/, "");
  const [name, short, ...rest] = t.split("\n"); const full = rest.join("\n").trim();
  // Play counts UTF-16 units, so an emoji is 2
  for (const [what, v, max] of [["name", name, 30], ["short", short, 80], ["full", full, 4000]]) if (v.length > max || !v.trim()) { console.error(`${l}: ${what} is ${v.length} (max ${max})`); bad++; }
  return `=== ${head} ===\nApp name:\n${name}\n\nShort description:\n${short}\n\nFull description:\n${full}\n`;
});
if (bad) process.exit(1);
const out = process.argv[2] || path.join(root, "store/out/listing-all.txt");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, parts.join("\n\n"));
console.log(out, HEAD.length, "languages", fs.statSync(out).size, "bytes");
