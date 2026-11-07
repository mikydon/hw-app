// 1.9.0 (Michael, Nov 7): editing the profile is a draft until Save (someone may only be trying things); closing keeps
// the profile as it was. The hero photo opens the editor too (it used to change the photo at once).
import { start, T, shot, entry } from "./harness.mjs";
import zlib from "zlib";
const it = (id, res) => ({ id, name: id, unit: "", res });
// a 40×40 red PNG for the photo picker
const png = (() => {
  const w = 40, raw = Buffer.alloc((w * 3 + 1) * w); for (let y = 0; y < w; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) raw.set([220, 40, 40], y * (w * 3 + 1) + 1 + x * 3); }
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(w, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
})();
const h = await start({ viewport: { width: 360, height: 760 }, dpr: 2, cloud: true, seed: { history: [entry("2026-11-02", "A", [it("k1", [20, 18])])], profile: { name: "Michael" } } });
const p = h.page;
const prof = () => p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")));
await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(800);
await p.click("[data-pf-edit]"); await p.waitForTimeout(500);
T.ok(await p.locator("[data-pf-edit-sheet]").isVisible(), "the editor opens");
T.ok(await p.locator("[data-pf-save]").isDisabled(), "Save is off while nothing changed");
await shot(p, "pfedit_open");
// try a name and a photo, then close: nothing kept
await p.fill("[data-name-input]", "Skúška");
await p.setInputFiles("[data-pf-edit-sheet] input[type=file]", { name: "a.png", mimeType: "image/png", buffer: png }); await p.waitForTimeout(600);
T.ok(await p.locator("[data-pf-save]").isEnabled(), "Save turns on after a change");
T.ok(/^data:image\/jpeg/.test(await p.getAttribute("[data-pf-edit-sheet] [data-pf-photo] img", "src") || ""), "the new photo shows in the editor");
await p.click('[aria-label="Close"] >> nth=-1'); await p.waitForTimeout(500);
let pr = await prof();
T.ok(pr.name === "Michael" && !pr.pfp, "closed without Save: name and photo stay as they were");
// the hero photo opens the editor (no direct change)
await p.click("[data-pf-hero] button >> nth=0"); await p.waitForTimeout(500);
T.ok(await p.locator("[data-pf-edit-sheet]").isVisible(), "a tap on the photo opens the editor");
T.eq(await p.inputValue("[data-name-input]"), "Michael", "the editor starts from the saved profile again");
// now save
await p.fill("[data-name-input]", "Miky");
await p.setInputFiles("[data-pf-edit-sheet] input[type=file]", { name: "a.png", mimeType: "image/png", buffer: png }); await p.waitForTimeout(600);
await p.click('[data-vis="all"]'); await p.waitForTimeout(200);
T.eq((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "setCardVis"))).length, 0, "who-sees is not sent before Save");
await shot(p, "pfedit_changed");
await p.click("[data-pf-save]"); await p.waitForTimeout(700);
pr = await prof();
T.ok(pr.name === "Miky" && /^data:image\/jpeg/.test(pr.pfp || ""), "Save keeps the name and the photo");
T.ok((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "setCardVis").map(x => x[1]))).includes("all"), "Save sends who-sees");
T.eq(await p.locator("[data-pf-edit-sheet]").count(), 0, "the editor closes after Save");
T.ok((await p.textContent("[data-pf-name]")).includes("Miky"), "the profile shows the new name");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
