// 1.9.0 What's new opens once after updating from 1.8.2, lists the big update and the 1.8.x small updates; the
// app-only line (📱) is hidden on the website.
import { start, T, shot, entry } from "./harness.mjs";
const h = await start({ seed: { history: [entry("2026-11-01", "A", [{ id: "k1", name: "Push-up", unit: "", res: [10, 10] }])], settings: { seenVersion: "1.8.2" } } });
const p = h.page; await p.waitForTimeout(1200);
const txt = await p.locator(".sheetBox").first().innerText().catch(() => "");
T.ok(txt.includes("Workout plans") && txt.includes("134 exercises"), "What's new 1.9.0 opened");
T.ok(!txt.includes("Rest with the screen off"), "app-only line hidden on the website");
T.ok(/1\.8\.1|1\.8\.2/.test(txt), "also lists the 1.8.x small updates");
await shot(p, "news190");
await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(500);
await p.reload(); await p.waitForTimeout(1000);
const again = await p.locator(".sheetBox").first().innerText().catch(() => ""); T.ok(!again.includes("134 exercises"), "closed once = not shown again");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
