// 1.9.0 (Michael, Nov 7): the looks editor (frames, banners, titles, name effects, effects) is a draft like the profile
// editor: the preview shows what you pick, nothing is kept until Save, closing keeps the profile as it was.
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const buys = ["f_neon", "f_crown", "b_galaxy", "n_fire"].map((w, i) => ({ i: "lk" + i, w, p: 0, ts: 1 + i }));
const h = await start({ viewport: { width: 360, height: 760 }, dpr: 2, seed: { history: [entry("2026-11-02", "A", [it("k1", [20, 18])])], profile: { name: "Michael", shop: { buys }, look: { frame: "f_neon" } } } });
const p = h.page;
const look = () => p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).look || {});
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(800);
await p.click("[data-pf-looks]"); await p.waitForTimeout(500);
T.ok(await p.locator("[data-looks-sheet]").isVisible(), "the looks editor opens");
T.ok(await p.locator("[data-looks-save]").isDisabled(), "Save is off while nothing changed");
T.eq(await p.getAttribute('[data-look-own="f_neon"]', "aria-pressed"), "true", "the worn frame is picked");
T.eq(await p.locator("[data-looks-grid] > button").count(), 4, "frames: None + 2 owned + Shop");
await shot(p, "looks_open");
// try a frame and a banner, close: nothing kept
await p.click('[data-look-own="f_crown"]'); await p.waitForTimeout(150);
T.eq(await p.getAttribute("[data-looks-preview] [data-look-frame]", "data-look-frame"), "f_crown", "the preview wears the picked frame");
await p.click('[data-look-kind="bg"]'); await p.waitForTimeout(150);
T.eq(await p.locator('[data-look-kind="frame"] [data-look-kind-dot]').count(), 1, "a dot marks the changed kind");
await p.click('[data-look-own="b_galaxy"]'); await p.waitForTimeout(150);
T.ok(await p.locator("[data-looks-save]").isEnabled(), "Save turns on after a change");
await shot(p, "looks_changed");
// the preview stays on screen while the list scrolls
await p.click('[data-look-kind="frame"]'); await p.waitForTimeout(150);
await p.setViewportSize({ width: 360, height: 690 }); await p.waitForTimeout(200);
await p.evaluate(() => { const b = document.querySelector("[data-looks-sheet]").closest(".sheetBox"); b.scrollTop = b.scrollHeight; }); await p.waitForTimeout(150);
await shot(p, "looks_sticky");
const pv = await p.locator("[data-looks-preview]").boundingBox(), sb = await p.locator(".sheetBox").last().boundingBox();
T.ok(pv.y >= sb.y - 30 && pv.y < sb.y + 8, `the preview stays at the top of the sheet (${Math.round(pv.y - sb.y)} px)`);
T.ok(await p.locator("[data-looks-save]").isVisible(), "Save is on screen at the bottom");
await p.setViewportSize({ width: 360, height: 600 }); await p.waitForTimeout(200);
T.eq(await p.evaluate(() => getComputedStyle(document.querySelector("[data-looks-preview]")).position), "static", "a short screen: the preview scrolls away (room for the list)");
await p.setViewportSize({ width: 360, height: 760 });
await p.click('[aria-label="Close"] >> nth=-1'); await p.waitForTimeout(500);
T.eq(JSON.stringify(await look()), JSON.stringify({ frame: "f_neon" }), "closed without Save: the look stays as it was");
T.eq(await p.getAttribute("[data-pf-hero] [data-look-frame]", "data-look-frame"), "f_neon", "the profile still wears the old frame");
// undo puts back the saved look
await p.click("[data-pf-looks]"); await p.waitForTimeout(500);
await p.click("[data-look-none=frame]"); await p.waitForTimeout(150);
T.eq(await p.locator("[data-looks-preview] [data-look-frame]").count(), 0, "None: the preview has no frame");
await p.click("[data-looks-undo]"); await p.waitForTimeout(150);
T.eq(await p.getAttribute('[data-look-own="f_neon"]', "aria-pressed"), "true", "undo: back to the saved frame");
T.ok(await p.locator("[data-looks-save]").isDisabled(), "undo: nothing to save");
// now save two changes
await p.click('[data-look-own="f_crown"]'); await p.click('[data-look-kind="name"]'); await p.click('[data-look-own="n_fire"]'); await p.waitForTimeout(150);
await p.click("[data-looks-save]"); await p.waitForTimeout(700);
const l = await look();
T.ok(l.frame === "f_crown" && l.name === "n_fire", "Save keeps both: " + JSON.stringify(l));
T.eq(await p.locator("[data-looks-sheet]").count(), 0, "the editor closes after Save");
T.eq(await p.getAttribute("[data-pf-hero] [data-look-frame]", "data-look-frame"), "f_crown", "the profile wears the new frame");
// an empty kind: the Shop tile and a line
await p.click("[data-pf-looks]"); await p.waitForTimeout(500);
await p.click('[data-look-kind="title"]'); await p.waitForTimeout(150);
T.ok(await p.locator("[data-looks-empty]").isVisible() && await p.locator("[data-looks-shop]").isVisible(), "no titles yet: a line and the Shop tile");
await p.click("[data-looks-shop]"); await p.waitForTimeout(700);
T.ok(await p.locator("[data-shop]").count() > 0, "the Shop tile opens the Shop");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
