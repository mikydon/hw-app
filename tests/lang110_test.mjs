// 1.10.0: only English is in the app bundle; the other 14 languages are JSON blocks in the page, read when used.
// Every language still shows its own texts (also after switching without a reload), and a broken or missing block
// falls back to English instead of breaking the app.
import { start, T } from "./harness.mjs";
const want = { sk: "História", cs: "Historie", pl: "Historia", hu: "Előzmények", uk: "Історія", de: "Verlauf", es: "Historial", fr: "Historique", it: "Storico", pt: "Histórico", zh: "历史", ja: "履歴", ko: "기록", id: "Riwayat" };
const h = await start({ lang: "sk" });
const p = h.page;
T.eq(await p.evaluate(() => document.querySelectorAll('script[type="application/json"][id^="hw-l-"]').length), 14, "14 language blocks in the page");
const titles = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('script[id^="hw-l-"]')].map(el => [el.id.slice(5), JSON.parse(el.textContent).ui.tabHistory])));
for (const [c, t] of Object.entries(want)) if (titles[c] !== t) console.log("   note:", c, "tabHistory is", JSON.stringify(titles[c]));
T.ok(Object.keys(want).every(c => typeof titles[c] === "string" && titles[c].length > 0 && titles[c] !== "History"), "every block parses and has its own texts");
await p.click("[data-menu-btn]"); await p.waitForTimeout(300);
T.ok((await p.locator("[data-nav-box]").innerText()).includes("História"), "Slovak at start (from its block)");
await p.click('[data-nav-box] [data-screen="settings"]'); await p.waitForTimeout(500);
const pick = async code => { await p.locator('button[aria-haspopup="dialog"][aria-label*=":"]').first().click(); await p.waitForTimeout(350); await p.locator(`button[role="option"][lang="${code}"]`).click(); await p.waitForTimeout(500); };
await pick("uk");
T.ok((await p.locator("[data-topbar]").innerText()).includes("Налаштування"), "switching to Ukrainian works without a reload");
await pick("ja");
T.ok((await p.locator("[data-topbar]").innerText()).includes("設定"), "Japanese too");
// a missing block and a broken one: English, no crash
await p.evaluate(() => { document.getElementById("hw-l-de").remove(); document.getElementById("hw-l-fr").textContent = "{broken"; });
await pick("de");
T.ok((await p.locator("[data-topbar]").innerText()).includes("Settings"), "a missing block falls back to English");
await pick("fr");
T.ok((await p.locator("[data-topbar]").innerText()).includes("Settings"), "a broken block falls back to English");
await pick("sk");
T.ok((await p.locator("[data-topbar]").innerText()).includes("Nastavenia"), "and back to Slovak");
await p.reload(); await p.waitForTimeout(800);
T.ok((await p.locator("[data-topbar]").innerText()).length > 0 && (await p.evaluate(() => document.documentElement.lang)) === "sk", "the choice survives a reload");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
