// 1.10.0 (Michael, Nov 12): confetti on one canvas (it made the phone lag as 70–90 animated elements), fireworks that
// never show at the old spot (a hidden start of every round + a rocket), paused shop effects are hidden instead of
// frozen, and five new profile effects.
import { start, T, entry } from "./harness.mjs";
const it = (id, res) => ({ id, name: id, unit: "", res });
const hist = [entry("2026-11-02", "A", [it("k1", [20, 18])])];
const d = new Date();

// ── confetti: a birthday on Home ──
{
  const h = await start({ viewport: { width: 412, height: 800 }, seed: { history: hist, profile: { name: "Michael", birth: { y: 2000, m: d.getMonth() + 1, d: d.getDate() } } } });
  const p = h.page;
  await p.waitForSelector("[data-confetti]", { timeout: 4000 }).catch(() => {});
  T.eq(await p.locator("canvas[data-confetti]").count(), 1, "confetti is one canvas");
  T.eq(await p.locator(".conf").count(), 0, "no confetti elements any more");
  const drawn = await p.evaluate(() => new Promise(res => setTimeout(() => { const c = document.querySelector("canvas[data-confetti]"); if (!c) return res(-1); const a = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i]) n++; res(n); }, 900)));
  T.ok(drawn > 300, `pieces are drawn on it (${drawn} px)`);
  T.ok(await p.evaluate(() => { const c = document.querySelector("canvas[data-confetti]"); return c.width <= innerWidth * 1.5 + 1 && getComputedStyle(c).pointerEvents === "none"; }), "the canvas is at most 1.5× and lets taps through");
  await p.waitForTimeout(4600);
  T.eq(await p.locator("canvas[data-confetti]").count(), 0, "the canvas is gone after the last piece");
  await h.close();
}

// ── fireworks on the profile: every burst opens to its ring and never moves while a spark shows ──
{
  const h = await start({ viewport: { width: 412, height: 800 }, seed: { history: hist, profile: { name: "Michael", shop: { buys: [{ i: "lk0", w: "fx_fireworks", p: 0, ts: 1 }] }, look: { fx: "fx_fireworks" } } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(900);
  const res = await p.evaluate(() => new Promise(done => {
    const bursts = [...document.querySelectorAll("[data-pf-hero] [data-fw-burst]")];
    const st = bursts.map(() => ({ cycles: 0, weak: 0, jumps: 0, cur: null, hiddenAfterMove: true, moved: 0, pos: null }));
    const t0 = performance.now();
    const tick = () => {
      bursts.forEach((b, k) => {
        const s = st[k], sp = b.querySelector('[data-i="0"]'), cs = getComputedStyle(sp), op = Number(cs.opacity);
        const m = new DOMMatrixReadOnly(cs.transform), dist = Math.hypot(m.e, m.f), pos = b.style.left + "," + b.style.top, r = parseFloat(b.style.getPropertyValue("--r"));
        if (s.pos !== null && s.pos !== pos) { s.moved = performance.now(); if (op > 0.02) s.hiddenAfterMove = false; }
        if (s.moved && performance.now() - s.moved < 250 && op > 0.02) s.hiddenAfterMove = false; // a quarter second of slack
        s.pos = pos;
        if (op > 0.08) { if (!s.cur) s.cur = { pos, max: 0, r }; if (s.cur.pos !== pos) { s.jumps++; s.cur.pos = pos; } s.cur.max = Math.max(s.cur.max, dist); }
        else if (s.cur) { s.cycles++; if (s.cur.max < s.cur.r * 0.7) s.weak++; s.cur = null; }
      });
      if (performance.now() - t0 < 9000) requestAnimationFrame(tick); else done(st.map(s => [s.cycles, s.weak, s.jumps, s.hiddenAfterMove]));
    };
    requestAnimationFrame(tick);
  }));
  T.eq(res.length, 3, "three bursts");
  T.ok(res.every(r => r[0] >= 2), `every burst went off (${res.map(r => r[0])})`);
  T.ok(res.every(r => r[1] === 0), "every burst opened to its ring");
  T.ok(res.every(r => r[2] === 0), "no burst moved while a spark was showing");
  T.ok(res.every(r => r[3]), "after moving, the sparks stay hidden for at least a quarter second");
  T.eq(await p.locator("[data-pf-hero] [data-fw-burst] .lkRocket").count(), 3, "each burst has its rocket");
  await h.close();
}

// ── the five new effects draw inside the hero; they are in the shop list ──
for (const fx of ["fx_rain", "fx_bubbles", "fx_hearts", "fx_fireflies", "fx_stars"]) {
  const h = await start({ viewport: { width: 412, height: 800 }, seed: { history: hist, profile: { name: "Michael", shop: { buys: [{ i: "lk0", w: fx, p: 0, ts: 1 }] }, look: { fx } } } });
  const p = h.page;
  await p.click("[data-menu-btn]"); await p.click('[data-screen="profile"]'); await p.waitForTimeout(900);
  const r = await p.evaluate(fx => {
    const box = document.querySelector(`[data-pf-hero] [data-look-fx="${fx}"]`); if (!box) return null;
    const kids = box.querySelectorAll("span, svg"), anim = box.getAnimations ? box.getAnimations({ subtree: true }).length : 0;
    return { kids: kids.length, anim, clip: getComputedStyle(box).overflow, name: 1 };
  }, fx);
  T.ok(r && r.kids >= 8 && r.anim >= 8 && r.clip === "hidden", `${fx} runs inside the hero (${r && r.kids} parts, ${r && r.anim} animations)`);
  await p.click("[data-pf-looks]"); await p.waitForTimeout(400); await p.click('[data-look-kind="fx"]'); await p.waitForTimeout(200);
  const label = await p.locator(`[data-look-own="${fx}"]`).innerText();
  T.ok(label.trim().length > 2 && !label.includes("fx_"), `${fx} has a name in the looks list (${label.trim().split("\n")[0]})`);
  await h.close();
}

// ── a shop card that is not running hides its effect instead of freezing it ──
{
  const h = await start({ viewport: { width: 412, height: 800 }, seed: { history: hist, profile: { name: "Michael" } } });
  const p = h.page;
  const ok = await p.evaluate(() => {
    const w = document.createElement("div"); w.className = "lkOff"; w.innerHTML = '<div data-look-fx="x"></div>'; document.body.appendChild(w);
    const v = getComputedStyle(w.firstChild).opacity; w.className = ""; const v2 = getComputedStyle(w.firstChild).transitionProperty; w.remove(); return v === "0" && v2.includes("opacity");
  });
  T.ok(ok, "a paused look card fades its effect out");
  await h.close();
}
T.done();
