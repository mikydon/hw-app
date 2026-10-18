// Builds the app.
//   index.html  React bundle inlined into template.html, plus the @font-face rules (website, GitHub Pages)
//   fonts/      the font files (woff2 from @fontsource, OFL licence; hw-emoji.ttf, MIT), served next to index.html
//   www/        what goes into the Android app (Capacitor webDir) and into the live-update zip:
//               index.html + fonts/ (no service worker, no manifest)
// Usage: npm install && npm run build
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Fonts: only the weights the app uses, only the scripts our 11 languages need.
const FONTS = {
  "big-shoulders-display": [700, 800, 900],
  figtree: [400, 500, 600, 700],
  oswald: [600, 700], // covers Ukrainian (Big Shoulders has no Cyrillic)
};
const SUBSETS = ["latin", "latin-ext", "cyrillic", "cyrillic-ext"];
let fontCss = "";
const fontFiles = [];
for (const [pkg, weights] of Object.entries(FONTS)) {
  for (const w of weights) {
    const css = readFileSync(`node_modules/@fontsource/${pkg}/${w}.css`, "utf8");
    for (const block of css.split(/(?=\/\* )/)) {
      const m = block.match(/^\/\* (\S+) \*\/\s*(@font-face\s*{[\s\S]*?})/);
      if (!m) continue;
      const subset = m[1].replace(`${pkg}-`, "").replace(/-\d+-normal$/, "");
      if (!SUBSETS.includes(subset)) continue;
      let face = m[2].replace(/src:[^;]*;/, src => {
        const f = src.match(/files\/([^)]+\.woff2)/)[1];
        fontFiles.push([pkg, f]);
        return `src:url(fonts/${f}) format('woff2');`;
      });
      fontCss += face.replace(/\s+/g, " ") + "\n";
    }
  }
}
rmSync("fonts", { recursive: true, force: true });
mkdirSync("fonts");
for (const [pkg, f] of fontFiles) copyFileSync(`node_modules/@fontsource/${pkg}/files/${f}`, `fonts/${f}`);
// 1.7.0: the app's own emoji (Microsoft Fluent Emoji 3D, MIT) as a small colour-bitmap font, made by
// tools/emoji/build_font.py. Only its characters (unicode-range) come from it; listed after the text fonts in App.jsx.
{
  const emo = JSON.parse(readFileSync("assets/hw-emoji.json", "utf8"));
  const cps = [...emo.chars].map(c => "U+" + c.codePointAt(0).toString(16).toUpperCase()).concat("U+FE0F");
  copyFileSync("assets/hw-emoji.ttf", "fonts/hw-emoji.ttf");
  copyFileSync("tools/emoji/LICENSE-fluent-emoji.txt", "fonts/hw-emoji-LICENSE.txt");
  fontCss += `@font-face { font-family: 'HW Emoji'; font-style: normal; font-display: swap; font-weight: 100 900; src:url(fonts/hw-emoji.ttf) format('truetype'); unicode-range: ${cps.join(",")}; }\n`;
}

const out = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  write: false,
  jsx: "automatic",
  loader: { ".jsx": "jsx" },
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = out.outputFiles[0].text;
if (js.includes("</script")) throw new Error("bundle contains </script");
// The cloud code (Firebase, 1.5.0) is its own bundle, kept as plain text and run only when an account is used
// (src/cloud-lazy.js). @capacitor/core comes from the app bundle (window.__hwCap), so there is one copy of it.
const capShim = { name: "cap-shim", setup(b) {
  b.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: "cap", namespace: "cap-shim" }));
  b.onLoad({ filter: /.*/, namespace: "cap-shim" }, () => ({ contents: "const c = window.__hwCap; export const Capacitor = c.Capacitor; export const registerPlugin = c.registerPlugin; export const WebPlugin = c.WebPlugin;", loader: "js" }));
} };
const cloudOut = await build({
  entryPoints: ["src/cloud.js"], bundle: true, minify: true, write: false, format: "iife", globalName: "HWCloud",
  target: "es2020", define: { "process.env.NODE_ENV": '"production"' }, plugins: [capShim],
});
const cloudJs = cloudOut.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync("template.html", "utf8").replace("/*FONTS*/", () => fontCss).replace("/*APP*/", () => js).replace("/*CLOUD*/", () => cloudJs);
writeFileSync("index.html", html);

// Android app / live-update bundle
rmSync("www", { recursive: true, force: true });
mkdirSync("www/fonts", { recursive: true });
writeFileSync("www/index.html", html);
for (const f of readdirSync("fonts")) copyFileSync(path.join("fonts", f), path.join("www/fonts", f));

console.log(`index.html written (${(html.length / 1024).toFixed(0)} KB), ${fontFiles.length} font files, www/ ready`);
