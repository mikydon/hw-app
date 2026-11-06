// 1.9.0 (Michael, Nov 7): Shop → Redeem a code. The code is read from the server (Firestore promo/{CODE}), so Michael
// can make any code (e.g. JOZO = 200 diamonds) without an app update; each code once per account.
import { start, T, shot, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const h = await start({ viewport: { width: 360, height: 760 }, cloud: { promo: { JOZO: { d: 200 }, OLD: { d: 50, until: 1000 } } },
  seed: { history: [entry("2026-11-02", "A", [it("k1", [20, 18])])], profile: { name: "Michael" } } });
const p = h.page;
await p.click("[data-menu-btn]"); await p.click('[data-screen="shop"]'); await p.waitForTimeout(700);
const bal0 = Number(await p.getAttribute("[data-shop-bal]", "data-shop-bal"));
await p.locator("[data-shop-code]").scrollIntoViewIfNeeded();
await shot(p, "code_row");
await p.click("[data-shop-code]"); await p.waitForTimeout(400);
T.ok(await p.locator("[data-code-input]").isVisible(), "the code sheet opens");
await p.fill("[data-code-input]", "nope"); await p.click("[data-code-go]"); await p.waitForTimeout(300);
T.ok(/doesn't exist/.test(await p.textContent("[data-code-err]")), "an unknown code says so");
await p.fill("[data-code-input]", "old"); await p.click("[data-code-go]"); await p.waitForTimeout(300);
T.ok(/expired/.test(await p.textContent("[data-code-err]")), "an expired code says so");
await p.fill("[data-code-input]", " jozo");
T.eq(await p.inputValue("[data-code-input]"), " JOZO", "typed in capitals");
await p.click("[data-code-go]"); await p.waitForTimeout(500);
T.eq(await p.getAttribute("[data-code-got]", "data-code-got"), "200", "JOZO gives 200 diamonds");
T.ok((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "getPromo").map(x => x[1]))).includes("JOZO"), "asked the server for JOZO");
await shot(p, "code_got");
await p.click("[data-code-ok]"); await p.waitForTimeout(800);
const bal1 = Number(await p.getAttribute("[data-shop-bal]", "data-shop-bal"));
T.eq(bal1 - bal0, 200, `balance ${bal0} → ${bal1}`);
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-profile")).shop.codes);
T.ok(saved && saved.JOZO && saved.JOZO.d === 200, "saved in the profile (synced, in backups)");
// twice: refused without asking the server again
await p.click("[data-shop-code]"); await p.waitForTimeout(400);
await p.fill("[data-code-input]", "JOZO"); await p.click("[data-code-go]"); await p.waitForTimeout(300);
T.ok(/already/.test(await p.textContent("[data-code-err]")), "the same code twice: already redeemed");
await p.click('[aria-label="Close"] >> nth=-1'); await p.waitForTimeout(400);
// reload keeps it
await p.reload(); await p.waitForTimeout(1200);
await p.click("[data-menu-btn]"); await p.click('[data-screen="shop"]'); await p.waitForTimeout(700);
T.eq(Number(await p.getAttribute("[data-shop-bal]", "data-shop-bal")), bal1, "after a restart the diamonds stay");
await p.click("[data-shop-how]"); await p.waitForTimeout(400);
T.ok(/From codes/.test(await p.textContent("[data-shop-parts]")), "How you got them lists the codes");
T.eq(h.errors, [], "no page errors"); await h.close();
T.done();
