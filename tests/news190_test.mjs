// What's new opens once after a big update (here 1.9.4 → 1.10.0), lists the big update and the 1.9.x small updates;
// app-only lines (📱) are hidden on the website. (Written for 1.9.0; follows the current big version since 1.10.0.)
import { start, T, shot, entry } from "./harness.mjs";
const h = await start({ seed: { history: [entry("2026-11-01", "A", [{ id: "k1", name: "Push-up", unit: "", res: [10, 10] }])], settings: { seenVersion: "1.9.4" } } });
const p = h.page; await p.waitForTimeout(1200);
const txt = await p.locator(".sheetBox").first().innerText().catch(() => "");
T.ok(txt.includes("History") && txt.includes("Faster start"), "What's new 1.10.0 opened");
T.ok(!txt.includes("📱"), "app-only lines hidden on the website");
T.ok(/1\.9\.[1-4]/.test(txt), "also lists the 1.9.x small updates");
await shot(p, "news110");
await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(500);
await p.reload(); await p.waitForTimeout(1000);
const again = await p.locator(".sheetBox").first().innerText().catch(() => ""); T.ok(!again.includes("Faster start"), "closed once = not shown again");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
