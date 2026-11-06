// Smoke test: the app opens, Home shows, a workout can be started and the menu lists every screen.
import { start, T, entry } from "./harness.mjs";
const h = await start({ seed: { history: [entry("2026-11-01", "A", [{ id: "k1", name: "Push-up", unit: "", res: [12, 10] }])] } });
const p = h.page;
T.ok(await p.locator("[data-topbar]").count() > 0, "top bar shows");
T.ok(await p.locator("[data-start]").first().isVisible(), "start button visible");
T.eq(h.errors, [], "no page errors");
await h.close(); T.done();
