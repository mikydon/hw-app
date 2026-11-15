// 1.10.0 (idea 9, "Only 5 minutes" for lazy days): Home offers one round of today's day without the warm-up; it is a
// normal workout (history with rounds 1, streak). Not shown once you trained today.
import { start, T, shot } from "./harness.mjs";
const setReps = async p => { if (await p.locator("[data-reps]").count()) { await p.click("[data-reps]"); await p.fill("[data-reps-input]", "10"); await p.keyboard.press("Enter"); await p.waitForTimeout(150); } };
const h = await start({ viewport: { width: 380, height: 820 }, seed: { profile: { name: "Michael" } } });
const p = h.page;
await p.waitForSelector("[data-quick5]");
T.ok((await p.textContent("[data-quick5]")).includes("Only 5 minutes"), "Home offers Only 5 minutes");
await shot(p, "quick5_home");
await p.click("[data-quick5]");
await p.waitForSelector("[data-done-btn]", { timeout: 6000 });
T.eq(await p.locator("[data-warmup-go]").count(), 0, "no warm-up: straight to the first exercise");
const ses = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).session);
T.eq([ses && ses.rounds, ses && ses.quick, ses && ses.phase], [1, true, "work"], "a one-round session, marked quick");
await setReps(p);
if (await p.locator("[data-side-next]").count()) { await p.click("[data-side-next]"); await setReps(p); }
await p.click("[data-done-btn]"); await p.waitForTimeout(400);
await p.click("[data-quit]"); await p.waitForTimeout(200); await p.click("[data-quit]");
await p.waitForSelector("[data-sum-home]", { timeout: 8000 });
const e = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history.pop());
T.eq(e.rounds, 1, "saved as one round");
T.ok(e.items.every(it => it.res.length <= 1), "at most one set per exercise: " + e.items.map(it => it.res.length).join(","));
await p.click("[data-sum-home]"); await p.waitForTimeout(700);
T.eq((await p.textContent('[data-chip="streak"]')).replace(/\D/g, ""), "1", "counts for the streak");
T.eq(await p.locator("[data-quick5]").count(), 0, "trained today: no quick offer");
T.eq(h.errors, [], "no page errors");
await h.close();
T.done();
