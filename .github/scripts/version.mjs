// Prints the app version from src/App.jsx for GitHub Actions ($GITHUB_OUTPUT format):
//   version=1.0.0
//   code=1000000   (Android versionCode: major*1000000 + minor*10000 + patch*100 + 4th number)
import { readFileSync } from "node:fs";
const v = readFileSync("src/App.jsx", "utf8").match(/const APP_VERSION = "([\d.]+)"/)[1];
const p = v.split(".").map(Number);
if (p.length < 3 || p.length > 4 || p.some(n => !Number.isInteger(n) || n > 99)) throw new Error("bad version " + v);
const code = p[0] * 1000000 + p[1] * 10000 + p[2] * 100 + (p[3] || 0);
console.log(`version=${v}\ncode=${code}`);
