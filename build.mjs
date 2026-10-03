// Builds index.html: bundles src/ (React) into one minified script and inlines it into template.html.
// Usage: npm install && npm run build
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

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
const html = readFileSync("template.html", "utf8").replace("/*APP*/", () => js);
writeFileSync("index.html", html);
console.log(`index.html written (${(html.length / 1024).toFixed(0)} KB)`);
