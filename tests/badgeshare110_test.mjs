// 1.10.0 (Michael's idea 8, Nov 15): an earned badge of your own can be shared as a picture (1080 × 1350: the badge in
// its level's colour, name, level, what it took). Not for badges not earned yet, not on someone else's profile.
import { start, T, shot, entry } from "./harness.mjs";
import fs from "fs";
const it = [{ id: "k1", name: "Push-up", unit: "", res: [20, 18] }];
const h = await start({ viewport: { width: 380, height: 820 }, seed: { history: [entry("2026-11-02", "A", it), entry("2026-11-04", "B", it)], profile: { name: "Michael" } } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="profile"]'); await p.waitForTimeout(900);
await p.click('[data-pf-tab="1"]'); await p.waitForTimeout(900);
await p.click('[data-ach-row="workouts"]'); await p.waitForSelector('[data-badge-sheet="workouts"]');
T.ok(await p.locator("[data-badge-share]").isVisible(), "an earned badge: Share");
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 10000 }), p.click("[data-badge-share]")]);
const file = "tests/out/badge_share.png"; await dl.saveAs(file);
const b = fs.readFileSync(file);
T.ok(b.slice(1, 4).toString() === "PNG" && b.readUInt32BE(16) === 1080 && b.readUInt32BE(20) === 1350, "a 1080 × 1350 PNG");
T.eq(dl.suggestedFilename(), "hw-app-badge-workouts.png", "named by the badge");
T.eq(await p.getAttribute("[data-badge-share]", "data-state"), "saved", "saved on the website");
await p.mouse.click(190, 40); await p.waitForTimeout(600);
const locked = await p.$$eval("[data-ach-row]", e => e.filter(x => x.getAttribute("data-tier") === "0").map(x => x.getAttribute("data-ach-row"))[0]);
if (locked) { await p.click(`[data-ach-row="${locked}"]`); await p.waitForTimeout(500); T.eq(await p.locator("[data-badge-share]").count(), 0, "not earned yet: no Share (" + locked + ")"); }
T.eq(h.errors, [], "no page errors");
await h.close();
T.done();
