// 1.10.0 share card: the summary's Share makes a 1080 × 1350 picture of the workout (here, on the website without a
// share sheet, it downloads); the Google Play rating setting shows only in the Play build.
import { start, T, entry } from "./harness.mjs";
import fs from "node:fs";
// type the reps (or the first exercise could start at 0, and a workout with only 0s saves nothing)
const setReps = async p => { if (await p.locator("[data-reps]").count()) { await p.click("[data-reps]"); await p.fill("[data-reps-input]", "10"); await p.keyboard.press("Enter"); await p.waitForTimeout(150); } };
const now = new Date(2026, 10, 14, 18, 0);
const it = [{ id: "k1", name: "Push-up", unit: "", res: [12, 12, 10] }, { id: "b5", name: "Plank", unit: "s", res: ["45s", "60s"] }];
const history = [entry("2026-11-10", "A", it), entry("2026-11-12", "C", it)];
const h = await start({ clock: now.getTime(), seed: { history, profile: { name: "Michael" } } });
const p = h.page;
// one set, then quit and save: the summary
await p.click("[data-start]"); await p.click("[data-warmup-go]"); await p.waitForSelector("[data-done-btn]");
await setReps(p); await p.click("[data-done-btn]"); await p.waitForTimeout(300);
await p.click("[data-quit]"); await p.waitForTimeout(200); await p.click("[data-quit]");
await p.waitForSelector("[data-sum-share]", { timeout: 8000 });
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 10000 }), p.click("[data-sum-share]")]);
const file = "tests/out/share_card.png";
await dl.saveAs(file);
const buf = fs.readFileSync(file);
T.ok(buf.slice(1, 4).toString() === "PNG", "a PNG");
T.eq([buf.readUInt32BE(16), buf.readUInt32BE(20)], [1080, 1350], "1080 × 1350");
T.eq(dl.suggestedFilename(), "hw-app-2026-11-14.png", "named by the date");
T.eq(await p.getAttribute("[data-sum-share]", "data-state"), "saved", "saved on the website");
T.ok(await p.locator("[data-sum-share-msg]").isVisible(), "a line says so");
// the rating switch is only in the Play build (this is the website)
await p.click("[data-sum-home]"); await p.waitForTimeout(500);
await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(600);
T.eq(await p.locator("text=Ask me to rate the app").count(), 0, "no rating switch outside the Play build");
T.eq(h.errors, [], "no page errors");
await h.close();

// ─── Play build: the rating switch is there, and after a summary the app marks one ask (at most 3, 120 days apart) ───
{
  const days = [24, 22, 20, 18, 16, 14, 12];
  const hist = days.map(n => { const d = new Date(now); d.setDate(d.getDate() - n); return entry(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, "ABC"[n % 3], it); });
  const h = await start({ clock: now.getTime(), store: "play", seed: { history: hist, profile: { name: "Michael" } } });
  const p = h.page;
  await p.click("[data-start]"); await p.click("[data-warmup-go]"); await p.waitForSelector("[data-done-btn]");
  await setReps(p); await p.click("[data-done-btn]"); await p.waitForTimeout(300);
  await p.click("[data-quit]"); await p.waitForTimeout(200); await p.click("[data-quit]");
  await p.waitForSelector("[data-sum-home]"); await p.click("[data-sum-home]"); await p.waitForTimeout(600);
  const u = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-ui")));
  T.ok(u.revN === 1 && u.revAt > 0, "after the summary: one rating ask noted");
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(600);
  T.ok(await p.locator("text=Ask me to rate the app").isVisible(), "the Play build has the rating switch");
  T.eq(h.errors, [], "no page errors (play)");
  await h.close();
}
{
  // too new: 2 workouts only → no ask
  const h = await start({ clock: now.getTime(), store: "play", seed: { history, profile: { name: "Michael" } } });
  const p = h.page;
  await p.click("[data-start]"); await p.click("[data-warmup-go]"); await p.waitForSelector("[data-done-btn]");
  await setReps(p); await p.click("[data-done-btn]"); await p.waitForTimeout(300);
  await p.click("[data-quit]"); await p.waitForTimeout(200); await p.click("[data-quit]");
  await p.waitForSelector("[data-sum-home]"); await p.click("[data-sum-home]"); await p.waitForTimeout(600);
  const u = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-ui")));
  T.ok(!u.revN, "a new user is not asked");
  await h.close();
}
T.done();
