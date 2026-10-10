// Prints update.json for the release of version $1 (read by the app: src/native.js checkForUpdate).
//   version        the newest app version
//   bundle.url     the live-update zip (www/), used when only the third/fourth number changed
//   bundle.sha256  checksum of that zip; the updater refuses a file that doesn't match
//   apk.url        the APK, offered when the second number (a big update) changed
//   apk.size       its size in bytes (1.2.0: the app downloads the APK itself, shows progress and checks the size)
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
const v = process.argv[2];
const repo = process.env.GITHUB_REPOSITORY || "mikydon/hw-app";
const base = `https://github.com/${repo}/releases/download/v${v}`;
const zip = readFileSync(`dist/hw-app-web-${v}.zip`);
console.log(JSON.stringify({
  version: v,
  bundle: { url: `${base}/hw-app-web-${v}.zip`, sha256: createHash("sha256").update(zip).digest("hex") },
  apk: { url: `${base}/HW-App-${v}.apk`, ...(existsSync(`dist/HW-App-${v}.apk`) ? { size: statSync(`dist/HW-App-${v}.apk`).size } : {}) },
}, null, 2));
