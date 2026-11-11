// 1.10.0 Shop: diamonds on top, three swipe pages (Shop | Looks | Earned); the season pass, ads, buying diamonds and
// "suggest a look" are shown locked as "coming soon" and do nothing; the guide chapter walks all three pages.
import { start, T, shot, entry } from "./harness.mjs";
const clock = new Date(2026, 10, 11, 18).getTime();
const history = Array.from({ length: 12 }, (_, i) => entry(`2026-10-${String(8 + i * 2).padStart(2, "0")}`, "ABC"[i % 3], [{ id: "k1", name: "Push-up", unit: "", res: [10, 10] }]));
const openShop = async p => { await p.click("[data-menu-btn]"); await p.click('[data-nav-box] [data-screen="shop"]'); await p.waitForTimeout(600); };
{
  const h = await start({ clock, seed: { history } });
  const p = h.page;
  await openShop(p);
  T.ok(await p.locator("[data-shop-bal]").isVisible(), "diamonds on top");
  T.eq(await p.locator("[data-shop-tab]").count(), 3, "three pages");
  T.ok(await p.locator("[data-shop-chest]").isVisible() && await p.locator('[data-shop-item="boost"]').isVisible(), "Shop page: chest, freezes and boosts");
  T.ok((await p.locator("[data-shop-pass]").innerText()).includes("Coming soon"), "season pass: coming soon");
  T.eq(await p.locator("[data-shop-soon]").count(), 3, "ads, buying and suggesting are locked rows");
  T.eq(await p.locator("[data-shop-soon] button, [data-shop-pass] button, [data-shop-soon] a").count(), 0, "locked rows have nothing to tap");
  const before = await p.evaluate(() => localStorage.getItem("domaci-trening-v1-profile"));
  await p.locator('[data-shop-soon="buy"]').click({ force: true }); await p.locator('[data-shop-soon="ad"]').click({ force: true }); await p.waitForTimeout(300);
  T.eq(await p.evaluate(() => localStorage.getItem("domaci-trening-v1-profile")), before, "tapping them changes nothing");
  T.eq(await p.locator(".sheetBox").count(), 0, "and opens nothing");
  T.ok(!/patreon|paypal|ko-fi/i.test(await p.locator("[data-shop]").innerText()), "no other payment names anywhere in the Shop");
  // 1.10.0 speed: look effects stand still unless their card is mostly on screen (before: ~100 animations always ran)
  const anim = () => p.evaluate(() => document.getAnimations().filter(a => a.playState === "running" && a.effect && a.effect.target && a.effect.target.closest("[data-shop-look], [data-shop-wonlook]")).length);
  T.eq(await p.locator('[data-look-on="1"]').count(), 0, "on the Shop page no look card is switched on");
  T.eq(await anim(), 0, "and none of their animations run");
  await shot(p, "shop110_a");
  await p.click("[data-shop-code]"); await p.waitForTimeout(400);
  T.ok(await p.locator(".sheetBox").isVisible(), "codes still open their sheet");
  await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(500);
  await p.click('[data-shop-tab="1"]'); await p.waitForTimeout(700);
  T.ok(await p.locator("[data-shop-today] [data-shop-look]").first().isVisible(), "Looks page: this week's looks");
  const onN = await p.locator('[data-shop-today] [data-look-on="1"]').count(), allN = await p.locator("[data-shop-today] [data-shop-look]").count();
  T.ok(onN >= 1 && onN < allN, `only the cards on screen are switched on (${onN} of ${allN})`);
  T.eq(await p.locator('[data-shop-won] [data-look-on="1"]').count(), 0, "cards of the page next door stay off");
  await p.locator("[data-shop-today] [data-shop-look]").first().click(); await p.waitForTimeout(500);
  T.ok(await p.locator("[data-look-sheet]").isVisible(), "a look opens on your profile");
  await p.locator(".sheetBox button[aria-label]").first().click(); await p.waitForTimeout(500);
  await p.click('[data-shop-tab="2"]'); await p.waitForTimeout(700);
  T.ok(await p.locator("[data-shop-won] [data-shop-wonlook]").first().isVisible(), "Earned page: looks from badges");
  await shot(p, "shop110_c");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
{
  const h = await start({ clock, seed: { tour: true, history, profile: { tourDone: [1, 2, 4, 5, 6, 7, 8, 10] } } });
  const p = h.page;
  const bubble = async () => { await p.waitForSelector("[data-tour-bubble]", { timeout: 8000 }); await p.waitForTimeout(500); return p.locator("[data-tour-bubble]").innerText(); };
  await p.click("[data-menu-btn]"); await p.waitForTimeout(400); await p.click("[data-tour-open]"); await p.waitForTimeout(400); await p.click('[data-tour-ch="9"]');
  const seen = [];
  for (let i = 0; i < 14; i++) {
    const t = await bubble(); seen.push(t);
    if (t.includes("Tap Looks")) { await p.click('[data-shop-tab="1"]', { force: true }); continue; }
    if (t.includes("Tap Earned")) { await p.click('[data-shop-tab="2"]', { force: true }); continue; }
    const last = t.includes("button on your Profile");
    await p.click("[data-tour-next]");
    if (last) break;
  }
  const all = seen.join("\n---\n");
  T.ok(all.includes("Diamonds: you earn them") && all.includes("a chest opens here") && all.includes("Streak freezes and XP boosts"), "guide: diamonds, chest, items");
  T.ok(all.includes("Locked things are on the way"), "guide: what is coming");
  T.ok(all.includes("Got a code?"), "guide: codes");
  T.ok(all.indexOf("Tap Looks") < all.indexOf("New looks every Friday") && all.indexOf("New looks every Friday") < all.indexOf("Tap Earned") && all.indexOf("Tap Earned") < all.indexOf("can't be bought"), "guide: Looks page, then Earned page");
  await p.waitForTimeout(700);
  T.eq(await p.locator('[data-shop-tab="0"]').getAttribute("aria-selected"), "true", "guide ends back on the Shop page");
  T.eq(h.errors, [], "no page errors (guide)");
  await h.close();
}
T.done();
