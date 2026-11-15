// 1.10.0 (Michael's idea 10): offline = one quiet cloud icon in the top bar (tap = what still works), gone again online.
import { start, T, shot } from "./harness.mjs";
const h = await start({ viewport: { width: 380, height: 820 }, seed: { profile: { name: "Michael" } } });
const p = h.page;
await p.waitForTimeout(800);
T.eq(await p.locator("[data-offline]").count(), 0, "online: no icon");
await p.context().setOffline(true); await p.waitForTimeout(400);
T.ok(await p.locator("[data-offline]").isVisible(), "offline: the icon");
const bb = await p.locator("[data-offline]").boundingBox(), tb = await p.locator('[data-chip="streak"]').boundingBox();
T.ok(bb.x + bb.width <= tb.x + 1 && Math.abs((bb.y + bb.height / 2) - (tb.y + tb.height / 2)) < 6, "beside the streak chip, in line");
await shot(p, "offline_bar");
await p.click("[data-offline]"); await p.waitForSelector("[data-info-sheet]");
T.ok((await p.textContent("[data-info-sheet]")).includes("saved on this phone"), "tap: what happens offline");
await p.mouse.click(190, 40); await p.waitForTimeout(500);
await p.context().setOffline(false); await p.waitForTimeout(400);
T.eq(await p.locator("[data-offline]").count(), 0, "online again: gone");
T.eq(h.errors, [], "no page errors");
await h.close();
T.done();
