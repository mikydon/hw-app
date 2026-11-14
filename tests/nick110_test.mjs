// 1.10.0: reserved nicknames (Michael approved, Nov 14): nobody can look like the app's own account ("HW App" plans
// carry an official mark in the Library) or staff. The same rule is in firestore.rules (nickFree, rules tests).
import { start, T } from "./harness.mjs";
import { nickReserved, nickBad, textBad, BAD_IN } from "../src/cloud-shared.js";
import fs from "fs";
T.eq(["HW_App", "hw.app", "hwapp", "HWApp_official", "my-hw-app", "Admin", "admin_x", "Support", "official.team", "Moderator", "HW App"].filter(nickReserved).length, 11, "reserved, whatever the separators");
T.eq(["Happy", "Zuzka", "Michael", "app_lover", "hw_fan", "Badmin"].filter(nickReserved), [], "ordinary names are fine");
// swear-word filter (Michael, Nov 14): known words refused, ordinary names that merely contain the letters stay fine
T.eq(["Fuck_you", "sh1tface", "Kurva123", "k0k0t", "xXHitlerXx", "puta", "Ass", "big.dick", "сука", "Hurensohn99", "n1gga", "Kúrva"].filter(x => !nickBad(x)), [], "rude names are refused (leet, accents, separators)");
T.eq(["Classic", "Scunthorpe", "therapist", "computadora", "Faszination", "Michael", "Zuzka_99", "Passion", "Cassandra", "Dickens", "cocktail", "tropical", "Replica", "Assassin", "Puttanesca", "Bitcoin", "Matthias", "Hassan", "Cumberland"].filter(nickBad), [], "ordinary names stay fine");
T.ok(textBad("Leg day kurva") && textBad("Push for my ass") && !textBad("Class push day") && !textBad("Assassin core"), "plan names: whole words for the short ones");
const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
const m = rules.match(/function nickClean[^\n]*matches\("\.\*\(([^)]*)\)\.\*"\)/);
T.eq(m && m[1].split("|"), BAD_IN, "firestore.rules nickClean has exactly the app's list");
{
  const h = await start({ viewport: { width: 380, height: 800 }, cloud: { prof: null }, seed: { profile: { name: "Michael" } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="friends"]'); await p.waitForTimeout(900);
  T.ok(await p.locator("[data-fr-nicksetup]").isVisible(), "signed in without a nickname: the nickname form");
  await p.fill("[data-fr-nick]", "HW_App"); await p.click("[data-fr-nick-save]"); await p.waitForTimeout(300);
  T.ok((await p.textContent("[data-fr-nicksetup]")).includes("That name is reserved"), "HW_App is refused with a clear line");
  T.eq((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "createProfile"))).length, 0, "nothing sent to the server");
  await p.fill("[data-fr-nick]", "Kurva_99"); await p.click("[data-fr-nick-save]"); await p.waitForTimeout(300);
  T.ok((await p.textContent("[data-fr-nicksetup]")).includes("isn't allowed"), "a rude name is refused too");
  await p.fill("[data-fr-nick]", "Michael_99"); await p.click("[data-fr-nick-save]"); await p.waitForTimeout(500);
  T.eq((await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "createProfile"))).length, 1, "an ordinary name goes through");
  T.eq(h.errors, [], "no page errors");
  await h.close();
}
// a plan with a rude name never goes to the Library or the profile
{
  const plan = { id: "pX", n: 1, name: "Kurva day", grp: null, ts: 1, mts: 1, items: [{ id: "k1", sets: 3 }], days: {}, ds: "{}" };
  const plans = { v: 2, list: [plan], groups: [], seq: 1, del: {}, week: {}, wmts: 1, sort: "date", dir: "desc" };
  const h = await start({ viewport: { width: 380, height: 820 }, cloud: {}, seed: { profile: { name: "Michael", plans } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.waitForTimeout(350); await p.click('[data-nav-box] [data-screen="plans"]'); await p.waitForTimeout(800);
  await p.click('[data-plans-seg="mine"]'); await p.waitForTimeout(700);
  await p.click('[data-plan-card="pX"]'); await p.waitForTimeout(600);
  await p.click('[data-plan-pub-box] [role="switch"]'); await p.waitForTimeout(400);
  T.ok((await p.textContent("[data-plan-pub-box]")).includes("Rename the plan first"), "Library: rename first");
  await p.click('[data-plan-profile-box] [role="switch"]'); await p.waitForTimeout(400);
  T.ok((await p.textContent("[data-plan-profile-box]")).includes("Rename the plan first"), "profile: rename first");
  const sent = await p.evaluate(() => window.__fakeLog.filter(x => x[0] === "pubPut" || x[0] === "savePlib").length);
  T.eq(sent, 0, "nothing sent");
  T.eq(h.errors, [], "no page errors (plan)");
  await h.close();
}
T.done();
