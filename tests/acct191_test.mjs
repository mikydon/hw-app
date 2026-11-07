// 1.9.1 (Michael, Nov 7): after recording a video on a phone that was never signed in, signing in with his account
// joined the video's workout into it without a word, and his name and photo became "User" / none.
//  1) a phone with workouts that belong to no account asks before joining them into an account that has its own;
//  2) a phone without a name or photo takes them from the account's friends profile and never uploads "no photo";
//  3) the cloud keeps 4 restore points (one per day) and the app can go back to one.
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const PFP = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD";
const DAY = 86400000;
const iso = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const now = Date.now(), today = iso(now), yday = iso(now - DAY), d3 = iso(now - 3 * DAY);
const mine = [entry(iso(now - 5 * DAY), "A", [it("k1", [20, 18])]), entry(d3, "B", [it("k1", [21, 18])])];
const backup = (h, prof, ts) => ({ json: JSON.stringify({ app: "hw-app", history: h, profile: prof, settings: { theme: "navy" }, kcal: null, sync: { del: {}, kdel: {}, mod: { profile: ts } } }), n: h.length, ts });
const video = [entry(today, "A", [it("k1", [12, 10])])];
const histOf = p => p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history);
const profOf = p => p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")));
const signIn = async p => {
  await p.click("[data-menu-btn]"); await p.click('[data-screen="settings"]'); await p.waitForTimeout(500);
  await p.locator("[data-acct-signin]").click(); await p.waitForTimeout(600);
  await p.click("[data-fr-age]"); await p.click("[data-fr-signin]"); await p.waitForTimeout(1200);
};

console.log("1) the video phone: workouts of no account + an account with its own");
for (const pick of ["fresh", "keep", "cancel"]) {
  const h = await start({ cloud: { out: true, backup: backup(mine, { name: "Michael", pfp: PFP, freezeDays: [] }, now - DAY), prof: { nick: "Michael", code: "HWABCDEF", pfp: PFP } },
    seed: { history: video, profile: { name: "User" } } });
  const p = h.page;
  await signIn(p);
  T.eq(await p.getAttribute("[data-sw-kind]", "data-sw-kind").catch(() => null), "new", `${pick}: the phone asks first (no owner, both have workouts)`);
  if (pick === "fresh") await shot(p, "acct191_ask");
  T.eq((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "saveBackup").length)), 0, `${pick}: nothing uploaded while it asks`);
  await p.click(`[data-sw-${pick}]`); await p.waitForTimeout(6000);
  const hist = await histOf(p), prof = await profOf(p);
  if (pick === "fresh") { T.eq(hist.length, 2, "fresh: only the account's workouts"); T.ok(prof.name === "Michael" && prof.pfp === PFP, "fresh: the account's name and photo"); }
  if (pick === "keep") { T.eq(hist.length, 3, "keep: the phone's workout is added"); T.ok(prof.name === "Michael" && prof.pfp === PFP, "keep: the account's name and photo stay (not \"User\")"); }
  if (pick === "cancel") {
    T.eq(hist.length, 1, "cancel: the phone keeps only its own workout");
    T.ok(await p.evaluate(() => window.__fake.out), "cancel: signed out again");
    T.eq(await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "saveBackup").length), 0, "cancel: nothing uploaded");
  } else {
    const up = await p.evaluate(() => JSON.parse(window.__fake.backup.json));
    T.ok(up.profile.name === "Michael" && up.profile.pfp, `${pick}: the upload carries the real name and photo`);
  }
  T.eq(h.errors, [], `${pick}: no page errors`); await h.close();
}

console.log("1b) an empty account simply takes the phone's workouts (no question)");
{
  const h = await start({ cloud: { out: true, prof: { nick: "Michael", code: "HWABCDEF" } }, seed: { history: video, profile: { name: "Michael" } } });
  const p = h.page; await signIn(p); await p.waitForTimeout(5000);
  T.eq(await p.locator("[data-sw-kind]").count(), 0, "no question");
  T.ok(await p.evaluate(() => !!window.__fake.backup && JSON.parse(window.__fake.backup.json).history.length === 1), "the phone's workout went up");
  T.eq(h.errors, [], "no page errors"); await h.close();
}

console.log("2) a backup that already says \"User\" with no photo heals from the friends profile");
{
  const h = await start({ cloud: { backup: backup(mine, { name: "User", pfp: null, freezeDays: [] }, now - DAY), prof: { nick: "Michael", code: "HWABCDEF", pfp: PFP } },
    seed: { profile: { name: "User" } } });
  const p = h.page; await p.waitForTimeout(7000);
  const prof = await profOf(p);
  T.ok(prof.name === "Michael" && prof.pfp === PFP, `name and photo from the friends profile (${prof.name}, ${!!prof.pfp})`);
  const up = await p.evaluate(() => JSON.parse(window.__fake.backup.json));
  T.ok(up.profile.name === "Michael" && up.profile.pfp === PFP, "the healed name and photo go up to the backup");
  const ups = await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "saveProfile").map(x => !!x[1].pfp));
  T.ok(ups.length > 0 && ups.every(Boolean), "the friends profile is never sent without its photo");
  T.eq(h.errors, [], "no page errors"); await h.close();
}

console.log("3) restore points");
{
  const later = [...mine, entry(yday, "A", [it("k1", [22, 19])])];
  const h = await start({ cloud: { backup: backup(mine, { name: "Michael", pfp: PFP, freezeDays: [] }, now - 2 * DAY), prof: { nick: "Michael", code: "HWABCDEF", pfp: PFP },
    points: { [iso(now - 9 * DAY)]: backup(mine.slice(0, 1), { name: "Michael", pfp: PFP }, now - 9 * DAY) } },
    seed: { history: later, profile: { name: "Michael", pfp: PFP } } });
  const p = h.page; await p.waitForTimeout(6500);
  const pts = await p.evaluate(() => Object.keys(window.__fake.points).sort());
  T.ok(pts.includes(iso(now - 2 * DAY)), "the first upload of the day kept the last day's backup as a point");
  T.ok(JSON.parse(await p.evaluate(() => window.__fake.backup.json)).history.length === 3, "then uploaded today's data");
  const snaps = await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "snapshotBackup").length);
  await p.click("[data-menu-btn]"); await p.click('[data-screen="settings"]'); await p.waitForTimeout(500);
  await p.locator("[data-acct-points]").click(); await p.waitForTimeout(700);
  T.eq(await p.locator("[data-rp]").count(), 2, "two points listed");
  T.eq(await p.getAttribute("[data-rp] >> nth=0", "data-rp"), iso(now - 2 * DAY), "newest first");
  await shot(p, "acct191_points");
  await p.click(`[data-rp-go="${iso(now - 9 * DAY)}"]`); await p.waitForTimeout(500);
  T.ok(await p.locator("[data-rp-yes]").isVisible(), "going back asks first");
  await shot(p, "acct191_points_ask");
  await p.click("[data-rp-yes]"); await p.waitForTimeout(700);
  T.ok(/^✓/.test(await p.textContent("[data-rp-msg]")), "done line");
  T.eq((await histOf(p)).length, 1, "the history is the point's");
  await p.waitForTimeout(5500);
  const up = await p.evaluate(() => JSON.parse(window.__fake.backup.json));
  T.eq(up.history.length, 1, "the restored data went up (other devices follow)");
  T.ok(Object.keys(up.sync.del || {}).length >= 2, "the later workouts travel as deletions");
  T.eq(await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "snapshotBackup").length), snaps, "only one point per day from this device");
  T.eq(h.errors, [], "no page errors"); await h.close();
}
T.done();
