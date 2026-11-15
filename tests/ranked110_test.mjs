// 1.10.0 Ranked (Michael's approved design, Nov 12): open on the Muscle Deck screen; a sheet explains it (equal decks,
// 6 blinds, a player near your rating, 2 games on a day with a workout, leaving = a loss); results of games that waited
// for the next player show on the screen; the top 50 lists players who have played. The server side is
// tools/worker_ranked_test.mjs.
import { start, T, shot, entry } from "./harness.mjs";
const now = new Date(2026, 10, 15, 18, 0);
const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const it = [{ id: "k1", name: "Push-up", unit: "", res: [10, 10] }];
const go = async p => { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="game"]'); await p.waitForTimeout(900); };
// ─── no workout today: Ranked explains and waits ───
{
  const cloud = { ranked: { r: 1000, w: 0, l: 0, d: 0 }, rankedTop: [{ uid: "x1", nick: "Pro", r: 1320, w: 9, l: 2 }, { uid: "x2", nick: "Newbie", r: 1000, w: 0, l: 0, d: 0 }] };
  const h = await start({ clock: now.getTime(), viewport: { width: 380, height: 820 }, cloud, seed: { history: [entry("2026-11-13", "A", it)], profile: { name: "Michael", game: { tut: 1 } } } });
  const p = h.page;
  await go(p);
  const tile = p.locator('[data-gm-mode="ranked"]');
  T.ok(await tile.isVisible(), "Ranked is open (no lock)");
  T.ok((await tile.textContent()).includes("Iron") && (await tile.textContent()).includes("2 left today"), "the tile: rank, rating, games left: " + (await tile.textContent()));
  T.eq(await p.locator("[data-gm-top-row]").count(), 1, "the top list shows only players who have played");
  T.eq(await p.locator('[data-gm-top-row="x1"] [data-rank-icon]').getAttribute("data-rank-icon"), "4", "with their rank (1320 = Platinum)");
  await tile.click(); await p.waitForSelector("[data-gm-rk-sheet]");
  T.ok((await p.textContent("[data-gm-rk-sheet]")).includes("same deck"), "the sheet explains equal decks");
  T.ok(await p.locator("[data-gm-rk-go]").isDisabled(), "Start waits for a workout today");
  T.ok((await p.textContent("[data-gm-rk-left]")).includes("Train today"), "and says so");
  await p.waitForTimeout(700); await shot(p, "ranked_sheet");
  T.eq(await p.locator("[data-gm-rk-sheet] [data-rk-how]").count(), 4, "the sheet lists the 4 Ranked rules");
  T.eq(h.errors, [], "no page errors (no workout)");
  await h.close();
}
// ─── How to play explains Ranked too (Michael, Nov 15: the guides must not miss it), in a long language ───
for (const lang of ["en", "de", "hu"]) {
  const h = await start({ clock: now.getTime(), viewport: { width: 360, height: 760 }, seed: { settings: { lang }, profile: { name: "Michael", game: { tut: 1 } } } });
  const p = h.page;
  await go(p);
  await p.click("[data-gm-rules]"); await p.waitForSelector("[data-gm-guide-sect=\"5\"]");
  T.eq(await p.locator("[data-gm-guide-ranked] [data-rk-how]").count(), 4, lang + ": How to play has a Ranked section with the 4 rules");
  const txt = await p.textContent("[data-gm-rules-text]");
  T.ok(!/Duel|Duell|Párbaj|coming soon|bald\)|hamarosan/.test(txt), lang + ": no Duel or 'coming soon' in How to play");
  const over = await p.evaluate(() => [...document.querySelectorAll("[data-gm-guide-sect=\"5\"] *")].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").length);
  T.eq(over, 0, lang + ": nothing cut off at 360 px");
  await p.locator("[data-gm-guide-sect=\"5\"]").scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await shot(p, "ranked_howto_" + lang);
  T.eq(h.errors, [], lang + ": no page errors (How to play)");
  await h.close();
}
// ─── trained today: start, then leave (a loss) ───
{
  const cloud = { ranked: { r: 1000, w: 0, l: 0, d: 0 } };
  const h = await start({ clock: now.getTime(), viewport: { width: 380, height: 820 }, cloud, seed: { history: [entry(dk(now), "A", it)], profile: { name: "Michael", game: { tut: 1 } } } });
  const p = h.page;
  await go(p);
  await p.click('[data-gm-mode="ranked"]'); await p.waitForSelector("[data-gm-rk-sheet]");
  T.ok(!(await p.locator("[data-gm-rk-go]").isDisabled()), "trained today: Start is on");
  await p.click("[data-gm-rk-go]"); await p.waitForSelector("[data-gm-hud]", { timeout: 6000 });
  const call = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "rkStart"));
  T.eq(call && call[1], "2026-11-15", "the server gets today's date (tickets)");
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-game") || "null"));
  T.ok(!st || !st.opts || (st.opts.antes === 2 && st.opts.suit === null), "equal deck, 2 antes");
  await p.click("[data-gm-quit]"); await p.waitForTimeout(300);
  T.ok((await p.textContent("[data-confirm]")).includes("counts as a loss"), "leaving says it is a loss");
  await p.click("[data-gm-quit-yes]"); await p.waitForTimeout(400);
  const end = await p.evaluate(() => window.__fakeLog.find(x => x[0] === "rkEnd"));
  T.eq(end && end[2], true, "the server is told (a loss)");
  T.eq(h.errors, [], "no page errors (play)");
  await h.close();
}
// ─── a waiting game was settled: a card on the screen, closed once seen ───
{
  const cloud = { ranked: { r: 1016, w: 1, l: 0, d: 0, res: [{ sc: 1, dr: 16, nick: "Ben", at: 5 }] } };
  const h = await start({ clock: now.getTime(), viewport: { width: 380, height: 820 }, cloud, seed: { profile: { name: "Michael", game: { tut: 1 } } } });
  const p = h.page;
  await go(p);
  T.ok((await p.textContent("[data-gm-rk-res]")).includes("Ben played your deal: you won"), "the result of my waiting game");
  await p.click("[data-gm-rk-res-ok]"); await p.waitForTimeout(300);
  T.eq(await p.locator("[data-gm-rk-res]").count(), 0, "closed");
  await p.reload(); await p.waitForTimeout(1000); await go(p);
  T.eq(await p.locator("[data-gm-rk-res]").count(), 0, "and stays closed");
  T.eq(h.errors, [], "no page errors (results)");
  await h.close();
}
// ─── the guide (chapter 8) shows Ranked ───
{
  const h = await start({ clock: now.getTime(), viewport: { width: 380, height: 820 }, cloud: { ranked: { r: 1000 } }, seed: { tour: true, profile: { name: "Michael", tourDone: [1], game: { tut: 1 } } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400); await p.click("[data-tour-open]"); await p.waitForTimeout(400); await p.click('[data-tour-ch="8"]');
  let seen = false;
  for (let i = 0; i < 6 && !seen; i++) { await p.waitForSelector("[data-tour-bubble]"); await p.waitForTimeout(700); const t = await p.textContent("[data-tour-bubble]"); if (t.includes("Ranked:")) seen = true; else await p.click("[data-tour-next]"); }
  T.ok(seen, "chapter 8 has a Ranked bubble");
  T.eq(h.errors, [], "no page errors (guide)");
  await h.close();
}
T.done();
