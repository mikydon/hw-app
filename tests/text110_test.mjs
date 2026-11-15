// 1.10.0 text size (Michael approved, Nov 15): Settings → Appearance → Text size 100 / 115 / 130 % in the app (the
// WebView's text zoom through HwBuild.setTextZoom; the phone's own font size still never applies). Website: no row.
import { start, T, shot } from "./harness.mjs";
const open = async p => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(700); await p.click("[data-set-look-open]"); await p.waitForTimeout(600); };
{
  const h = await start({ viewport: { width: 380, height: 820 }, seed: { profile: { name: "Michael" } } });
  await open(h.page);
  T.eq(await h.page.locator("[data-text-size]").count(), 0, "website: no text size row (the browser zooms)");
  await h.close();
}
{
  const h = await start({ viewport: { width: 380, height: 820 }, seed: { profile: { name: "Michael" } }, init: () => { window.__tz = []; window.__hwTextZoom = { setTextZoom: o => { window.__tz.push(o.z); return Promise.resolve({ zoom: o.z }); } }; } });
  const p = h.page;
  await open(p);
  T.eq(await p.getAttribute("[data-text-size]", "data-text-size"), "100", "app: the row, 100 % at first");
  await p.click('[data-text-opt="130"]'); await p.waitForTimeout(300);
  T.eq(await p.evaluate(() => window.__tz), [130], "130 % goes to the native side");
  T.eq(await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-settings")).textSize), 130, "and is saved");
  await shot(p, "text_size");
  await p.reload(); await p.waitForTimeout(1200);
  T.eq(await p.evaluate(() => window.__tz), [130], "after a restart the app sends it again");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
T.done();
