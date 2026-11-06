// Browser test harness (1.9.0). Lives in the repo since Nov 6, 2026: the old scripts in /tmp were lost when the
// sandbox container was replaced. Usage in a test:
//   import { start, T } from "./harness.mjs";
//   const h = await start({ seed: { history: [...] }, lang: "en" });  // h.page is a Playwright page
//   ... T.ok(cond, "what"), T.eq(a, b, "what") ...; await h.close(); T.done();
// Serves the repo root (the built index.html, fonts) on a free port, seeds localStorage once per context
// (sessionStorage guard, so reloads keep what the app saved) and switches off the pop-ups older tests didn't expect
// (reward cards, guide, streak celebration, automatic freezes, rep speed check) unless the seed asks for them.
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
// Playwright is installed globally in the sandbox (require finds it, ESM import does not).
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
export const APP_VERSION = (fs.readFileSync(path.join(ROOT, "src/App.jsx"), "utf8").match(/const APP_VERSION = "([^"]+)"/) || [])[1];

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

// seed: { history, profile, settings, ui, kcal, extra: {key: value}, onboard, reveal, tour, celeb, autofz, repcheck, fresh }
export async function start(o = {}) {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch(o.gl ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } : {});
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 412, height: 860 }, deviceScaleFactor: o.dpr || 1, locale: o.locale || "en-US", hasTouch: !!o.touch });
  const s = o.seed || {};
  const store = {};
  if (!s.fresh) {
    store["domaci-trening-v1"] = JSON.stringify({ history: s.history || [], session: s.session || null });
    store["domaci-trening-v1-profile"] = JSON.stringify({ name: "Tester", ...(s.profile || {}) });
    store["domaci-trening-v1-settings"] = JSON.stringify({ lang: o.lang || "en", onboarded: !s.onboard, seenVersion: APP_VERSION, seenApp: true, ...(s.settings || {}) });
    store["domaci-trening-v1-ui"] = JSON.stringify({ welcomeHidden: true, ...(s.ui || {}) });
    if (s.kcal) store["domaci-trening-v1-kcal"] = JSON.stringify(s.kcal);
    Object.entries(s.extra || {}).forEach(([k, v]) => { store[k] = typeof v === "string" ? v : JSON.stringify(v); });
  }
  const flags = { __hwNoReveal: !s.reveal, __hwTourOff: !s.tour, __hwNoCeleb: !s.celeb, __hwNoAutoFz: !s.autofz, __hwNoRepCheck: !s.repcheck };
  await ctx.addInitScript(([store, flags]) => {
    Object.entries(flags).forEach(([k, v]) => { if (v) window[k] = true; });
    try {
      if (!sessionStorage.getItem("__seeded")) {
        Object.entries(store).forEach(([k, v]) => localStorage.setItem(k, v));
        sessionStorage.setItem("__seeded", "1");
      }
    } catch (e) {}
  }, [store, flags]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (o.clock) await page.clock.install({ time: o.clock });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForSelector("[data-topbar], [data-onboarding], [data-ob-step]", { timeout: 15000 }).catch(() => {});
  const close = async () => { await browser.close(); srv.close(); };
  return { page, ctx, browser, port, errors, close, url: `http://127.0.0.1:${port}/index.html` };
}

// Tiny assertion helpers that print one line per check and a summary.
let pass = 0, fail = 0;
export const T = {
  ok(c, what) { if (c) { pass++; console.log("  ✓", what); } else { fail++; console.log("  ✗", what); } return c; },
  eq(a, b, what) { const c = JSON.stringify(a) === JSON.stringify(b); return T.ok(c, c ? what : `${what} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); },
  done() { console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); },
};

// A history entry like the app saves at the end of a workout.
export function entry(date, day, items, extra = {}) {
  const [y, m, d] = date.split("-").map(Number);
  const ts = new Date(y, m - 1, d, 18, 0).getTime();
  return { date, ts, day, rounds: items[0] ? items[0].res.length : 2, items, prs: [], rankUps: [], warm: true, cool: false, dur: 1100, ...extra };
}
export const shot = (page, name) => page.screenshot({ path: path.join(ROOT, "tests", "out", name + ".png") });
fs.mkdirSync(path.join(ROOT, "tests", "out"), { recursive: true });
