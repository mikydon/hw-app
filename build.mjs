// Builds the app.
//   index.html  React bundle inlined into template.html, plus the @font-face rules (website, GitHub Pages)
//   fonts/      the font files (woff2 from @fontsource, OFL licence), served next to index.html
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

const out = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  write: false,
  jsx: "automatic",
  loader: { ".jsx": "jsx" },
  target: "es2018",
  define: { "process.env.NODE_ENV": '"production"' },
});
const js = out.outputFiles[0].text;
if (js.includes("</script")) throw new Error("bundle contains </script");
const html = readFileSync("template.html", "utf8").replace("/*FONTS*/", () => fontCss).replace("/*APP*/", () => js);
writeFileSync("index.html", html);

// Android app / live-update bundle
rmSync("www", { recursive: true, force: true });
mkdirSync("www/fonts", { recursive: true });
writeFileSync("www/index.html", html);
for (const f of readdirSync("fonts")) copyFileSync(path.join("fonts", f), path.join("www/fonts", f));

console.log(`index.html written (${(html.length / 1024).toFixed(0)} KB), ${fontFiles.length} font files, www/ ready`);
