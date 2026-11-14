// 1.10.0 Friends together (Michael, Nov 14): the second Friends page. Invite card (100 diamonds each), duos (a streak
// kept with a friend: workouts or calories), this week's goal of both together, a sets duel, a nudge, duo invitations,
// starting a duo and changing one, and the friends leaderboard under it.
import { start, T, shot, entry } from "./harness.mjs";
const now = new Date(2026, 10, 14, 17, 0); // Saturday
const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = n => { const d = new Date(now); d.setDate(d.getDate() - n); return dk(d); };
const it = res => [{ id: "k1", name: "Push-up", unit: "", res }];
const history = [entry(day(9), "A", it([10, 10])), entry(day(7), "B", it([10, 10])), entry(day(5), "C", it([10, 10])), entry(day(3), "A", it([10, 10, 10])), entry(day(1), "B", it([12, 12])),
  entry(day(0), "C", it([12]), { manual: true })]; // added by hand: does not count for a duo
const cloud = {
  friends: [{ uid: "f1", nick: "Zuzka", xp: 900, lvl: 3 }, { uid: "f2", nick: "Peter", xp: 5000, lvl: 9 }, { uid: "f3", nick: "Ivan", xp: 100, lvl: 1 }],
  fstreaks: [
    { id: "f2_me", other: "f2", by: "me", ok: true, start: day(12), k: "w", g: 6 },
    { id: "f1_me", other: "f1", by: "f1", ok: false, start: null, k: "k", g: null },
  ],
  vdays: { f2: { d: [day(8), day(6), day(4), day(2)], s: { [day(4)]: 9, [day(2)]: 12 }, k: [], f: [] } },
  rew: { by: { u: "f2", ts: "x" }, i: { someone: "y" } },
};
const h = await start({ viewport: { width: 380, height: 800 }, clock: now.getTime(), cloud, seed: { history, profile: { name: "Michael" } } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="friends"]'); await p.waitForTimeout(900);
T.eq(await p.getAttribute('[data-seg="together"] [data-badge]', "data-badge").catch(() => null), "1", "the Together tab shows one invitation to answer");
await p.click('[data-seg="together"]'); await p.waitForTimeout(900);
T.ok(await p.locator("[data-tg-invite]").isVisible(), "invite card");
T.ok((await p.textContent("[data-tg-invite]")).includes("100"), "it says 100 diamonds");
T.eq(await p.getAttribute("[data-tg-invite-n]", "data-tg-invite-n"), "2", "two invite rewards paid (invited + one friend)");
const duo = p.locator('[data-tg-duo="f2"]');
T.ok(await duo.isVisible(), "the duo with Peter");
const n = +(await duo.getAttribute("data-tg-n"));
T.ok(n >= 9, `shared streak counts back to the start day (${n})`);
// week Mon 9 .. Sat 14: me 9th, 11th, 13th (the manual 14th doesn't count) = 3, Peter 10th + 12th = 2
T.eq(await p.getAttribute('[data-tg-duo="f2"] [data-tg-week]', "data-tg-week"), "5", "this week: both together");
T.eq(await p.getAttribute('[data-tg-duo="f2"] [data-tg-week]', "data-tg-goal"), "6", "goal 6");
T.eq(await p.getAttribute('[data-tg-duo="f2"] [data-tg-duel]', "data-tg-duel"), "7:21", "sets this week: me 2 + 3 + 2, Peter 9 + 12");
T.ok(await p.locator('[data-fs-row="f1"] [data-duo-kind="k"]').isVisible(), "Zuzka's invitation is a calorie duo");
T.ok(await p.locator('[data-fs-accept="f1"]').isVisible(), "with an Accept button");
await shot(p, "together");
// nudge
await p.click('[data-tg-nudge="f2"]'); await p.waitForTimeout(400);
T.ok(await p.locator('[data-tg-duo="f2"] [data-tg-nudged]').isVisible(), "nudged: the button turns into a line");
T.ok((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "nudge").map(x => x[1]))).includes("f2"), "the server was asked to nudge Peter");
// start a duo with Ivan (the only friend without one)
await p.click("[data-tg-new]"); await p.waitForTimeout(500);
T.ok(await p.locator('[data-tg-sheet="new"]').isVisible(), "the new-duo sheet");
T.eq(await p.getAttribute('[data-tg-pick="f3"]', "data-on"), "1", "Ivan is picked (the only one free)");
await p.click('[data-tg-kind="k"]'); await p.click("[data-tg-goal-plus]"); await p.click("[data-tg-goal-plus]");
T.eq(await p.getAttribute("[data-tg-sheet] [data-tg-goal-v]", "data-tg-goal-v"), "2", "goal 2");
await p.click("[data-tg-save]"); await p.waitForTimeout(500);
const inv = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "fsInvite"));
T.eq(inv && inv.slice(1), ["f3", "wk", 2], "invitation sent: Ivan, workouts and calories, goal 2");
T.eq(await p.locator('[data-tg-sheet]').count(), 0, "sheet closed");
// change the duo with Peter
await p.click('[data-tg-duo="f2"] [data-tg-duo-open]'); await p.waitForTimeout(500);
T.ok(await p.locator('[data-tg-sheet="set"]').isVisible(), "the duo's settings");
T.eq(await p.locator('[data-tg-sheet="set"] [data-tg-pick]').count(), 0, "no friend list when changing one");
await p.click('[data-tg-kind="k"]');
T.ok((await p.textContent("[data-tg-kind-d]")).includes("starts today"), "adding a streak says it starts today");
await p.click("[data-tg-goal-minus]"); await p.click("[data-tg-save]"); await p.waitForTimeout(500);
const set = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "fsSet"));
T.ok(set && set[1] === "f2" && set[2].k === "wk" && set[2].g === 5 && set[2].ks === day(0) && !set[2].start, "saved: both streaks, the calorie one from today, the workout one kept, goal 5 " + JSON.stringify(set));
// the leaderboard is on this page now
T.ok(await p.locator('[data-fr-view="board"] [data-person]').first().isVisible(), "leaderboard under the duos");
// duo badge: the best shared streak is kept in the profile
const best = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).duoBest);
T.eq(best, n, "the longest duo streak is saved for the badge");
T.eq(h.errors, [], "no page errors");
await h.close();

// ─── both streaks at once and a duo freeze ───
{
  const hist2 = [9, 7, 5, 3, 1].map(n => entry(day(n), "ABC"[n % 3], it([10, 10])));
  const log = Object.fromEntries([5, 4, 3, 2, 1].map(n => [day(n), [{ ts: 1, kcal: 500, note: "" }]]));
  const cl = { friends: [{ uid: "f4", nick: "Ema", xp: 10, lvl: 1 }], fstreaks: [{ id: "f4_me", other: "f4", by: "me", ok: true, start: day(20), k: "wk", ks: day(5), g: null }],
    vdays: { f4: { d: [day(12), day(10), day(8), day(6), day(4)], s: {}, k: [5, 4, 3, 2, 1].map(day), f: [] } } };
  const h = await start({ viewport: { width: 380, height: 800 }, clock: now.getTime(), cloud: cl, seed: { history: hist2, profile: { name: "Michael" }, kcal: { sex: "m", height: 180, weight: 78, activity: 1.375, goal: { type: "maintain", rate: 0 }, log } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="friends"]'); await p.waitForTimeout(900);
  await p.click('[data-seg="together"]'); await p.waitForTimeout(900);
  const runs = await p.$$eval('[data-tg-duo="f4"] [data-tg-run]', e => e.map(x => [x.getAttribute("data-tg-run"), +x.getAttribute("data-tg-run-n"), +x.getAttribute("data-tg-fz")]));
  // workouts: kept from the 9th day back to the 2nd (8 days, a freeze earned at 7), Ema's gap on yesterday used it
  T.eq(runs, [["w", 8, 0], ["k", 5, 0]], "two streaks on one duo: workouts 8 (a duo freeze used), calories 5");
  T.ok(await p.locator('[data-tg-duo="f4"] [data-tg-fz-used]').isVisible(), "the card says a duo freeze saved yesterday");
  await shot(p, "together_two");
  T.eq(h.errors, [], "no page errors (two streaks)");
  await h.close();
}

// ─── the Friends guide (chapter 7) walks into Together: invite, duos, leaderboard ───
{
  const bubble = async p => { await p.waitForSelector("[data-tour-bubble]", { timeout: 9000 }); await p.waitForTimeout(600); return p.locator("[data-tour-bubble]").innerText(); };
  const h = await start({ viewport: { width: 380, height: 800 }, clock: now.getTime(), cloud, seed: { tour: true, history, profile: { name: "Michael", tourDone: [1, 2, 4, 5, 6, 8, 9, 10] } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
  await p.click("[data-tour-open]"); await p.waitForTimeout(400);
  await p.click('[data-tour-ch="7"]');
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const t = await bubble(p); seen.push(t);
    if (t.startsWith("Tap Friends")) { await p.click('[data-seg="friends"]', { force: true }); continue; }
    if (t.startsWith("Now Together")) { await p.click('[data-seg="together"]', { force: true }); continue; }
    if (t.includes("Duos: a streak")) { T.ok(await p.locator("[data-tg-duos]").isVisible(), "duos box on screen with its bubble"); await shot(p, "together_tour"); }
    if (await p.locator("[data-tour-done='1']").count()) break;
    await p.click("[data-tour-next]");
  }
  const all = seen.join("\n");
  T.ok(all.includes("you both get 100"), "invite bubble");
  T.ok(all.includes("Duos: a streak"), "duos bubble");
  T.ok(all.includes("leaderboard of you and your friends"), "leaderboard bubble");
  T.ok(!/whole world/.test(all), "no world leaderboard in the guide");
  T.eq(h.errors, [], "no page errors (guide)");
  await h.close();
}
T.done();
