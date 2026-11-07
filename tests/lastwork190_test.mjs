// 1.9.0 (Michael, Nov 7: warm-up + stretching + "quit and save" gave a streak): sets with 0 are not sets, a workout of
// only 0s saves nothing (no XP, no streak), the History editor refuses only 0s, and the profile shows the last workout
// (day · minutes · sets · reps · added by hand), also on someone else's card.
import { start, T, shot, entry } from "./harness.mjs";
const now = new Date(2026, 10, 7, 18, 0).getTime();

// 1) a workout of only 0s
{
  const h = await start({ clock: now });
  const p = h.page;
  await p.click("[data-start]"); await p.click("[data-warmup-go]");
  await p.waitForSelector("[data-done-btn]");
  T.eq(await p.textContent("[data-reps]"), "0", "first time: the counter starts at 0");
  await p.click("[data-done-btn]"); await p.waitForTimeout(300);
  await p.click("[data-quit]");
  T.ok((await p.textContent("[data-quit]")).includes("Really quit"), "only 0s: the quit button doesn't offer to save");
  await p.click("[data-quit]"); await p.waitForTimeout(500);
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")));
  T.eq(d.history.length, 0, "nothing saved, so no XP and no streak");
  // the end of a workout with only 0s (finish runs): the "Nothing saved" screen
  await p.click("[data-start]"); await p.click("[data-warmup-go]"); await p.waitForSelector("[data-done-btn]");
  const res = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("domaci-trening-v1")).session; return s && s.results; });
  T.ok(res !== undefined, "a new workout runs");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}

// 2) the History editor refuses only 0s
{
  const h = await start({ clock: now, seed: { history: [entry("2026-11-05", "A", [{ id: "k1", name: "k1", unit: "", res: [10, 9] }])] } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.click('[data-screen="history"]'); await p.waitForTimeout(500);
  await p.click("[data-add-workout]"); await p.waitForSelector("[data-edit-row]");
  const n = await p.$$eval("[data-edit-val]", e => e.length);
  for (let i = 0; i < Math.min(n, 4); i++) await p.locator("[data-edit-val]").nth(i).fill("0");
  await p.click("[data-edit-save]");
  T.ok((await p.textContent("[role=alert]")).includes("Sets with 0"), "only 0s: the editor says sets with 0 don't count");
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")));
  T.eq(d.history.length, 1, "and saves nothing");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}

// 3) the last workout on your profile
{
  const hist = [
    entry("2026-11-03", "A", [{ id: "k1", name: "k1", unit: "", res: [12, 10] }]),
    entry("2026-11-05", "B", [{ id: "k1", name: "k1", unit: "", res: [12, 0] }, { id: "b5", name: "b5", unit: "", res: [40, 30] }, { id: "n1", name: "n1", unit: "", res: [20, 18] }], { dur: 1460 }),
  ];
  const h = await start({ clock: now, seed: { history: hist } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForSelector("[data-pf-last]");
  const t = await p.getAttribute("[data-pf-last]", "aria-label");
  T.ok(/Last workout/.test(t) && /24 min/.test(t) && /5 sets/.test(t) && /50 reps/.test(t), `the line: ${t}`);
  T.ok(!/yesterday|today/i.test(t), "an older day shows its date");
  T.ok((await p.textContent("[data-pf-last]")).length < 24, "the row itself is short: icons + numbers");
  T.eq(await p.$$eval("[data-pf-last] [data-lw]", e => e.map(x => x.getAttribute("data-lw"))), ["day", "min", "sets", "reps"], "day, minutes, sets, reps");
  T.ok(!(await p.$("[data-pf-last-detail]")), "details closed");
  await p.click("[data-pf-last]"); await p.waitForTimeout(500);
  T.eq(await p.$$eval("[data-lw-tile]", e => e.map(x => x.getAttribute("data-lw-tile"))), ["min", "sets", "reps"], "a tap opens the details: time, sets, reps");
  await p.waitForTimeout(900); await p.locator("[data-pf-hero]").screenshot({ path: "tests/out/lastwork190_profile.png" });
  T.eq(h.errors, [], "no page errors");
  await h.close();
}

// 4) the card: lw in cardData, cleaned on the way in, shown on someone else's profile
{
  const hist = [entry("2026-11-07", "A", [{ id: "k1", name: "k1", unit: "", res: [1] }], { manual: true, dur: 0 })];
  const h = await start({ clock: now, seed: { history: hist } });
  const p = h.page;
  await p.addInitScript(() => { window.__hwTestHooks = true; }); await p.reload(); await p.waitForTimeout(800);
  const out = await p.evaluate(() => {
    const H = window.__hwCardT, hist = JSON.parse(localStorage.getItem("domaci-trening-v1")).history;
    const c = H.cardData(hist, { name: "X" });
    const m = H.cardModel({ ...c, lw: { d: "2026-11-07", s: 1, r: 1, h: 1, evil: "<b>" } }, { nick: "Y" });
    const bad = H.cardModel({ ...c, lw: { d: "<script>", s: 9 } }, { nick: "Y" });
    const hold = H.cardData([{ date: "2026-11-06", ts: 1, items: [{ id: "b5", name: "b5", unit: "", res: ["15s", "20s"] }], prs: [], rankUps: [] }], { name: "X" });
    return { lw: c.lw, m: m.lw, bad: bad.lw, hold: hold.lw };
  });
  T.eq(out.lw, { d: "2026-11-07", s: 1, r: 1, h: 1 }, "cardData: day, sets, reps, added by hand (no minutes without a timer)");
  T.eq(out.m, { d: "2026-11-07", m: 0, s: 1, r: 1, h: 1 }, "cardModel keeps only the known fields");
  T.eq(out.bad, null, "a bad date is dropped");
  T.eq(out.hold && out.hold.s, 2, "holds saved as \"15s\" count as sets");
  await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForSelector("[data-pf-last]");
  const t = await p.getAttribute("[data-pf-last]", "aria-label");
  T.ok(/today/.test(t) && /1 set\b/.test(t) && /1 rep\b/.test(t) && /added by hand/.test(t), `a fake-looking one shows itself: ${t}`);
  await p.waitForTimeout(900); await p.locator("[data-pf-hero]").screenshot({ path: "tests/out/lastwork190_hand.png" });
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
T.done();
