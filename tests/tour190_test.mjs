// 1.9.0 guide chapter 10 (Workout plans): starts from the guide list, taps through Recommended → My plans (1.9.2:
// lights My week), ends.
import { start, T, shot } from "./harness.mjs";
const h = await start({ seed: { tour: true, profile: { tourDone: [1] } } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
await p.click("[data-tour-open]"); await p.waitForTimeout(400);
T.ok(await p.locator('[data-tour-ch="10"]').count() === 1, "chapter 10 in the guide list");
await p.click('[data-tour-ch="10"]');
const bubble = async () => { await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(500); return p.locator("[data-tour-bubble]").innerText(); };
T.ok((await bubble()).includes("Tap Recommended"), "step 1: tap Recommended");
await p.click('[data-plans-seg="rec"]', { force: true });
T.ok((await bubble()).includes("recommended plan"), "step 2: the recommended plan");
await p.click("[data-tour-next]");
T.ok((await bubble()).includes("Tap My plans"), "step 3: tap My plans");
await p.click('[data-plans-seg="mine"]', { force: true });
T.ok((await bubble()).includes("Build a workout"), "step 4: plans + My week (1.9.2)");
T.ok(await p.locator("[data-plan-week]").isVisible(), "My week is on screen");
await shot(p, "tour10");
await p.click("[data-tour-next]");
T.ok((await bubble()).includes("No week set"), "last bubble");
await p.click("[data-tour-next]"); await p.waitForTimeout(600);
const done = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).tourDone);
T.ok(done.includes(10), "chapter 10 saved as done");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
