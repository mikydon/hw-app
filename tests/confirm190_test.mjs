// Nov 7 (Michael: "the things I delete, where it asks 'are you sure', make that a pop-up in the middle of the screen,
// so it isn't just two taps but makes you think"): every delete/sign-out/restore confirmation is a ConfirmBox.
import { start, T, shot, entry } from "./harness.mjs";
import fs from "fs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const hist = [entry("2026-11-02", "A", [it("k1", [20, 18])]), entry("2026-11-04", "B", [it("k1", [21, 19])]), entry("2026-11-06", "C", [it("k1", [22, 20])])];
const centred = async p => p.evaluate(() => { const b = document.querySelector("[data-confirm]").getBoundingClientRect(); return Math.abs((b.top + b.bottom) / 2 - innerHeight / 2) < 40 && Math.abs((b.left + b.right) / 2 - innerWidth / 2) < 4; });
let h = await start({ viewport: { width: 390, height: 844 }, seed: { history: hist, profile: { name: "Michael" } } });
let p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="history"]'); await p.waitForTimeout(600);
const n0 = await p.locator("[data-workout-row]").count();
// History list: the delete button opens the box, Cancel keeps the workout
await p.locator("[data-hist-delete]").first().click(); await p.waitForTimeout(400);
T.ok(await p.locator("[data-confirm]").isVisible(), "list: delete opens the confirmation box");
T.ok(await centred(p), "the box sits in the middle of the screen");
T.ok((await p.textContent("[data-confirm-title]")).includes("Delete this workout?"), "it asks a clear question");
await shot(p, "confirm_delete_workout");
await p.click("[data-confirm-no]"); await p.waitForTimeout(300);
T.eq(await p.locator("[data-confirm]").count(), 0, "Cancel closes it");
T.eq(await p.locator("[data-workout-row]").count(), n0, "…and nothing was deleted");
// a tap outside the box = cancel too
await p.locator("[data-hist-delete]").first().click(); await p.waitForTimeout(300);
await p.mouse.click(10, 10); await p.waitForTimeout(300);
T.eq(await p.locator("[data-workout-row]").count(), n0, "a tap outside keeps the workout");
await p.locator("[data-hist-delete]").first().click(); await p.waitForTimeout(300);
await p.click("[data-del-workout-yes]"); await p.waitForTimeout(400);
T.eq(await p.locator("[data-workout-row]").count(), n0 - 1, "Yes deletes the workout");
T.eq((await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history.length)), 2, "and it is gone from the saved data");
// the editor sheet's delete button asks the same way
{ const hd = p.locator("[data-workout-row] button[aria-expanded]").first(); if ((await hd.getAttribute("aria-expanded")) !== "true") await hd.click(); await p.waitForTimeout(300); } // 1.10.0: the newest row starts open and a tap closes it
const edit = p.locator("[data-workout-row] button:has-text('Edit')").first();
if (await edit.count()) {
  await edit.click(); await p.waitForTimeout(500);
  await p.click("[data-edit-delete]"); await p.waitForTimeout(400);
  T.ok(await p.locator("[data-confirm]").isVisible(), "editor: delete opens the box over the sheet");
  T.ok(await centred(p), "in the middle");
  await p.click("[data-confirm-no]"); await p.waitForTimeout(300);
  T.ok(await p.locator("[data-edit-save]").isVisible(), "Cancel leaves the editor open");
} else T.ok(false, "found the Edit button");
T.eq(h.errors, [], "no page errors (history)"); await h.close();
// Settings → Load a backup: the restore question is a box too
h = await start({ viewport: { width: 390, height: 844 }, seed: { history: hist, profile: { name: "Michael" } } });
p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="settings"]'); await p.waitForTimeout(600);
const file = "/tmp/claude-0/-home-claude/13cd6817-ba32-5f61-a043-b3a139dad897/scratchpad/bk.json";
fs.writeFileSync(file, JSON.stringify({ app: "hw-app", version: 1, exportedAt: "2026-11-01T10:00:00Z", history: [hist[0]], profile: { name: "Old" }, settings: {}, kcal: null }));
await p.locator('input[type="file"][accept*="json"]').setInputFiles(file); await p.waitForTimeout(500);
T.ok(await p.locator("[data-confirm]").isVisible(), "loading a backup asks in a box");
T.ok((await p.textContent("[data-confirm-text]")).includes("replaces"), "it says what restoring does");
await shot(p, "confirm_restore");
await p.click("[data-confirm-no]"); await p.waitForTimeout(300);
T.eq((await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history.length)), 3, "Cancel keeps the phone's data");
await p.locator('input[type="file"][accept*="json"]').setInputFiles(file); await p.waitForTimeout(400);
await p.click("[data-restore-yes]"); await p.waitForTimeout(500);
T.eq((await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1")).history.length)), 1, "Yes restores the backup");
T.eq(h.errors, [], "no page errors (restore)"); await h.close();
// Account: sign out and delete account ask in a box (here only Cancel: the fake server can't sign out)
h = await start({ viewport: { width: 390, height: 844 }, cloud: {}, seed: { history: hist, profile: { name: "Michael" } } });
p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="settings"]'); await p.waitForTimeout(900);
await p.locator("[data-acct-signout]").scrollIntoViewIfNeeded(); await p.click("[data-acct-signout]"); await p.waitForTimeout(400);
T.ok(await p.locator("[data-acct-signout-yes]").isVisible(), "sign out asks in a box");
T.ok(await centred(p), "in the middle");
await shot(p, "confirm_signout");
await p.click("[data-confirm-no]"); await p.waitForTimeout(300);
T.ok(await p.locator("[data-acct-signout]").isVisible(), "Cancel: still signed in");
await p.click("[data-acct-delete]"); await p.waitForTimeout(400);
T.ok(await p.locator("[data-acct-delete-yes]").isVisible(), "delete account asks in a box");
T.ok((await p.textContent("[data-confirm-text]")).includes("Removes your profile"), "it says what deleting removes");
await shot(p, "confirm_delete_account");
await p.click("[data-confirm-no]"); await p.waitForTimeout(300);
T.eq(await p.locator("[data-confirm]").count(), 0, "Cancel closes it");
T.eq(h.errors, [], "no page errors (account)"); await h.close();
T.done();
