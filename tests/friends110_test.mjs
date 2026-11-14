// 1.10.0 (Michael, Nov 14): the leaderboard is friends only: no locked "World top 50" chip, no join switch, no
// "your place waits for a check, send a video" line. Friends are ranked by XP with you among them.
import { start, T } from "./harness.mjs";
const fr = [
  { uid: "f1", nick: "Zuzka", xp: 900, lvl: 3, streak: 2, n: 8 },
  { uid: "f2", nick: "Peter", xp: 5000, lvl: 9, streak: 5, n: 40 },
];
const h = await start({ viewport: { width: 380, height: 780 }, cloud: { friends: fr } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="friends"]'); await p.waitForTimeout(900);
await p.click('[data-seg="board"]');
await p.waitForTimeout(800);
const html = await p.evaluate(() => document.querySelector("[data-fr-view=board]").closest(".scr").innerHTML);
T.ok(!/scope-world|data-locked|data-fr-fair|World top 50|hwapp\.support/.test(html), "no world list, lock, check line or support e-mail");
const names = await p.$$eval('[data-fr-view="board"] [data-person]', e => e.map(x => x.textContent));
T.ok(names.length >= 3, `you + two friends on the board (${names.length})`);
T.ok(names[0].includes("Peter"), "the friend with the most XP is first");
T.eq(await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "world" || x[0] === "checkBoard").length), 0, "the app never asks for the world list");
T.eq(h.errors, [], "no page errors");
await h.close();
T.done();
