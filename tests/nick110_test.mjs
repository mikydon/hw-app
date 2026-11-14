// 1.10.0: reserved nicknames (Michael approved, Nov 14): nobody can look like the app's own account ("HW App" plans
// carry an official mark in the Library) or staff. The same rule is in firestore.rules (nickFree, rules tests).
import { start, T } from "./harness.mjs";
import { nickReserved } from "../src/cloud-shared.js";
T.eq(["HW_App", "hw.app", "hwapp", "HWApp_official", "my-hw-app", "Admin", "admin_x", "Support", "official.team", "Moderator", "HW App"].filter(nickReserved).length, 11, "reserved, whatever the separators");
T.eq(["Happy", "Zuzka", "Michael", "app_lover", "hw_fan", "Badmin"].filter(nickReserved), [], "ordinary names are fine");
{
  const h = await start({ viewport: { width: 380, height: 800 }, cloud: { prof: null }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="friends"]'); await p.waitForTimeout(900);
  T.ok(await p.locator("[data-fr-nicksetup]").isVisible(), "signed in without a nickname: the nickname form");
  await p.fill("[data-fr-nick]", "HW_App"); await p.click("[data-fr-nick-save]"); await p.waitForTimeout(300);
  T.ok((await p.textContent("[data-fr-nicksetup]")).includes("That name is reserved"), "HW_App is refused with a clear line");
  T.eq((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "createProfile"))).length, 0, "nothing sent to the server");
  await p.fill("[data-fr-nick]", "Michael_99"); await p.click("[data-fr-nick-save]"); await p.waitForTimeout(500);
  T.eq((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "createProfile"))).length, 1, "an ordinary name goes through");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
T.done();
