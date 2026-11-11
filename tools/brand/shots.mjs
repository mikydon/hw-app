// node shots.mjs <screen> [tag]  — screenshots a menu screen with a realistic history. env: LANG2, W, H, FULL=1, THEME, LOOK
import { start, entry } from "/home/claude/hw-app/tests/harness.mjs";
const OUT = "/tmp/claude-0/-home-claude/13cd6817-ba32-5f61-a043-b3a139dad897/scratchpad/s110/";
const screen = process.argv[2] || "history", tag = process.argv[3] || "a";
const now = new Date(2026, 10, 11, 18, 0);
const dk = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const history = [];
for (let i = 44; i >= 0; i -= 2) {
  const d = new Date(now); d.setDate(d.getDate() - i); const n = (44 - i) / 2, day = "ABC"[n % 3];
  if (n % 5 === 3) history.push(entry(dk(d), null, [{ id: "fw_dumbbell_bench_press", name: "x", unit: "", res: [10, 9, 8], kg: [20, 20, 22.5] }, { id: "fw_goblet_squat", name: "x", unit: "", res: [12, 12], kg: [16, 16], note: "left knee a bit stiff" }, { id: "b5", name: "x", unit: "s", res: ["45s", "60s"] }], { plan: { id: "p1", name: "Gym day", grp: "Gym", wd: 1 }, dur: 2400 + n * 30 }));
  else history.push(entry(dk(d), day, day === "A" ? [{ id: "k1", name: "x", unit: "", res: [12 + (n >> 2), 11, 14 + (n >> 2)] }, { id: "v1", name: "x", unit: "", res: [8, 8, 9] }, { id: "n1", name: "x", unit: "", res: [20, 20, 24] }, { id: "b5", name: "x", unit: "s", res: ["30s", "45s", "60s"] }] : [{ id: "k1", name: "x", unit: "", res: [10, 10] }, { id: "n1", name: "x", unit: "", res: [18, 20] }, { id: "b5", name: "x", unit: "s", res: ["30s", "30s"] }], { dur: 900 + n * 20, prs: n % 4 === 0 ? ["k1"] : [] }));
}
const kcal = { sex: "m", height: 180, weight: 78, activity: 1.375, goal: { type: "maintain", rate: 0 }, log: {} };
for (let i = 0; i < 12; i++) { const d = new Date(now); d.setDate(d.getDate() - i); kcal.log[dk(d)] = [{ ts: d.getTime(), kcal: i % 3 ? 2350 : 1700, note: "" }]; }
if (import.meta.url === `file://${process.argv[1]}`) {
  const W = +(process.env.W || 412), H = +(process.env.H || 900);
  const h = await start({ clock: now.getTime(), lang: process.env.LANG2 || "en", viewport: { width: W, height: H }, dpr: 2, gl: !!process.env.GL,
    seed: { history, kcal, profile: { name: "Michael", birth: { y: 2000, m: 4, d: 10 }, skips: { [dk(new Date(2026, 10, 2))]: { r: "sick", note: "" } } }, settings: { ...(process.env.THEME ? { theme: process.env.THEME } : {}), ...(process.env.LOOK ? { look: process.env.LOOK } : {}) } } });
  const p = h.page;
  if (screen !== "train") { if (await p.locator("[data-menu-btn]").count()) { await p.click("[data-menu-btn]"); await p.waitForTimeout(350); } await p.locator(`[data-screen="${screen}"]`).first().click(); }
  if (process.env.TAB) { await p.click(process.env.TAB); await p.waitForTimeout(700); }
  await p.waitForTimeout(900);
  if (process.env.SCROLL) { await p.evaluate(y => window.scrollTo(0, +y), process.env.SCROLL); await p.waitForTimeout(400); }
  await p.screenshot({ path: `${OUT}${screen}_${tag}.png`, fullPage: !!process.env.FULL });
  console.log("errors", h.errors.length, h.errors.slice(0, 3));
  await h.close();
}
