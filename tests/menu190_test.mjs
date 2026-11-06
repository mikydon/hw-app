// 1.9.0: menu order (pencil, drag a row by its ≡ handle, others move, saved, first row = start screen) and the
// world leaderboard switched off.
import { start, T, shot } from "./harness.mjs";
const h = await start();
const p = h.page;
await p.click("[data-menu-btn]"); await p.waitForTimeout(400);
const order = () => p.locator("[data-nav-row]").evaluateAll(n => n.map(x => x.dataset.navRow));
T.eq((await order())[0], "train", "default order starts with Home");
T.eq((await order())[1], "plans", "plans right after Home");
await p.click("[data-nav-pencil]");
T.ok(await p.locator("[data-nav-handle]").count() === 9, "handles in edit mode");
// drag Calories (index 2) to the top
const hd = await p.locator('[data-nav-handle="calories"]').boundingBox();
const top = await p.locator('[data-nav-row="train"]').boundingBox();
await p.mouse.move(hd.x + hd.width / 2, hd.y + hd.height / 2); await p.mouse.down();
for (let k = 1; k <= 10; k++) await p.mouse.move(hd.x + hd.width / 2, hd.y + hd.height / 2 - k * (hd.y - top.y + 4) / 10);
const mid = await p.locator('[data-nav-row="train"]').evaluate(el => el.style.transform);
T.ok(mid.includes("translateY(") && !mid.includes("(0px)"), "others move out of the way while dragging");
await shot(p, "menu_drag");
await p.mouse.up(); await p.waitForTimeout(300);
T.eq((await order()).slice(0, 3), ["calories", "train", "plans"], "Calories moved to the top");
T.ok(await p.locator('[data-nav-row="calories"] [data-nav-start]').count() === 1, "first row marked as start screen");
await p.click("[data-nav-pencil]");
const st = await p.evaluate(() => JSON.parse(localStorage.getItem("domaci-trening-v1-settings")).menuOrder);
T.eq(st.slice(0, 2), ["calories", "train"], "saved in settings");
await p.reload(); await p.waitForTimeout(1000);
T.ok(await p.locator('[data-topbar]').innerText().then(t => t.includes("Calories")), "app opens on Calories");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
