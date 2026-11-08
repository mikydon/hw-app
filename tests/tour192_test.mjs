// 1.9.2 guide chapter 1 (Home) with own plans: with My week the day/picker/Start bubbles talk about the week's plan
// and the Start choice; with plans but no week only the Start bubble changes; without plans everything is as before.
import { start, T, shot } from "./harness.mjs";
const clock = new Date(2026, 10, 4, 10, 0).getTime(); // Wednesday
const plan = (id, n, name) => ({ id, n, name, grp: null, ts: n, mts: n, items: [{ id: "k1", sets: 3 }], days: {}, ds: "{}" });
const plans = week => ({ v: 2, list: [plan("pA", 1, "Push day"), plan("pB", 2, "Legs")], groups: [], seq: 2, del: {}, week, wmts: week ? 1 : 0, sort: "date", dir: "desc" });

async function run(seedProfile, tag) {
  const h = await start({ clock, seed: { tour: true, profile: { tourDone: [2, 4, 5, 6, 7, 8, 9, 10], ...seedProfile } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
  await p.click("[data-tour-open]"); await p.waitForTimeout(400);
  await p.click('[data-tour-ch="1"]');
  const texts = [];
  for (let i = 0; i < 12; i++) {
    await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(600);
    const t = await p.locator("[data-tour-bubble]").innerText();
    texts.push(t);
    if (t.includes("Tap here to see today's exercises")) { await p.click('[data-home-tab="1"]', { force: true }); continue; }
    if (t.includes("Everything else is in the menu")) break;
    if (/(Start begins|Choose the length)/.test(t)) await shot(p, "tour192_" + tag);
    await p.click("[data-tour-next]");
  }
  T.eq(h.errors, [], `no page errors (${tag})`);
  await h.close();
  return texts.join("\n---\n");
}

const week = await run({ plans: plans({ 1: "pA", 3: "pB", 5: "pA" }) }, "week");
T.ok(week.includes("This is today's workout from My week"), "week: hero bubble talks about My week");
T.ok(week.includes("Pick another day of the week"), "week: weekday picker bubble");
T.ok(week.includes("Start begins today's plan") && week.includes("\"Train something else\""), "week: Start bubble with the picker");
T.ok(!week.includes("3 workout days") && !week.includes("Choose the length"), "week: no A/B/C or rounds texts");

const own = await run({ plans: plans({}) }, "own");
T.ok(own.includes("3 workout days: A, B and C"), "plans without a week: Home shows A/B/C, so does the guide");
T.ok(own.includes("Start begins today's plan") && !own.includes("Choose the length"), "plans without a week: Start opens the picker, the guide says so");

const none = await run({}, "none");
T.ok(none.includes("3 workout days") && none.includes("Choose the length") && !none.includes("Start begins"), "no plans: as before");
T.done();
