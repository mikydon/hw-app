// 1.10.0 share card (Michael's growth list, Nov 12: "a share card after a workout"): one picture of the workout
// (1080 × 1350, the Instagram post size) drawn on a canvas with the app's fonts and the user's colours, shared through
// Android's share sheet (app) or the browser's (website), else downloaded. No account data, no photo, no ranks of
// others: only what the user just did. The footer names the app and where to get it (no prices, no "no ads").
export const CARD_W = 1080, CARD_H = 1350;

// the logo mark (assets/mark.svg) drawn with paths, so no image has to load first
function mark(g, x, y, s, signal, chalk) {
  const k = s / 512;
  g.save(); g.translate(x, y); g.scale(k, k);
  g.strokeStyle = signal; g.lineWidth = 44; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(120, 248); g.lineTo(256, 130); g.lineTo(392, 248); g.stroke();
  g.fillStyle = chalk;
  [[172, 324, 168, 30, 15], [130, 276, 40, 126, 16], [342, 276, 40, 126, 16], [96, 302, 30, 74, 13], [386, 302, 30, 74, 13]].forEach(([rx, ry, w, h, r]) => { rr(g, rx, ry, w, h, r); g.fill(); });
  g.restore();
}
function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// shrink a text until it fits
function fit(g, text, max, size, weight, family) {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; if (g.measureText(text).width <= max) return s; s -= 2; } while (s > 18);
  return s;
}
function ellipsis(g, text, max) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

// d = { title, date, stats: [[value, label]] (2–3), streak, streakLabel, days: [[letter, on]] × 7 (optional), bars: [[label, value, best]] (optional), rows: [[name, value]] (≤ 5), foot, sub,
//       c: {ink, panel, line, chalk, dim, signal, signalInk, mint}, font: {display, body} }
export function drawShareCard(canvas, d) {
  canvas.width = CARD_W; canvas.height = CARD_H;
  const g = canvas.getContext("2d"), c = d.c, F = d.font, P = 80;
  // background: the theme's ink with a soft glow of the main colour in a corner
  g.fillStyle = c.ink; g.fillRect(0, 0, CARD_W, CARD_H);
  const glow = g.createRadialGradient(CARD_W * 0.85, 120, 20, CARD_W * 0.85, 120, 760);
  glow.addColorStop(0, c.signal + "40"); glow.addColorStop(1, c.signal + "00");
  g.fillStyle = glow; g.fillRect(0, 0, CARD_W, CARD_H);
  // head: mark + date
  mark(g, P - 14, 64, 120, c.signal, c.chalk);
  g.fillStyle = c.dim; g.font = `600 30px ${F.body}`; g.textAlign = "right"; g.textBaseline = "middle";
  g.fillText(d.date, CARD_W - P, 124);
  // title
  g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillStyle = c.chalk;
  const ts = fit(g, d.title, CARD_W - 2 * P, 92, 900, F.display);
  g.font = `900 ${ts}px ${F.display}`; g.fillText(d.title, P, 300);
  if (d.sub) { g.fillStyle = c.dim; g.font = `600 32px ${F.body}`; g.fillText(ellipsis(g, d.sub, CARD_W - 2 * P), P, 356); }
  // the numbers: tiles
  const n = d.stats.length, gap = 24, tw = (CARD_W - 2 * P - gap * (n - 1)) / n, ty = 410, th = 220;
  d.stats.forEach(([val, label], i) => {
    const x = P + i * (tw + gap);
    g.fillStyle = c.panel; rr(g, x, ty, tw, th, 36); g.fill();
    g.fillStyle = c.chalk; g.textAlign = "center";
    const vs = fit(g, String(val), tw - 40, 96, 900, F.display);
    g.font = `900 ${vs}px ${F.display}`; g.fillText(String(val), x + tw / 2, ty + 130);
    g.fillStyle = c.dim; g.font = `700 28px ${F.body}`; g.fillText(ellipsis(g, label.toUpperCase(), tw - 30), x + tw / 2, ty + 184);
  });
  // streak pill
  let y = ty + th + 56;
  if (d.streak > 0) {
    // the number in orange, then the word ("Streak") in grey: no plural forms to get wrong in 15 languages
    g.textAlign = "left"; g.textBaseline = "middle";
    g.font = `900 46px ${F.display}`; const nw = g.measureText(String(d.streak)).width;
    g.font = `700 30px ${F.body}`; const lw = g.measureText(d.streakLabel).width;
    g.fillStyle = "#ffa94d26"; rr(g, P, y, 86 + nw + 18 + lw + 34, 84, 42); g.fill();
    g.save(); g.translate(P + 30, y + 16); g.scale(2.2, 2.2); g.fillStyle = "#ffa94d";
    g.beginPath(); g.moveTo(12, 21); g.bezierCurveTo(8, 21, 5.5, 18.3, 5.5, 14.7); g.bezierCurveTo(5.5, 11.5, 7.7, 9.3, 9.1, 7.1); g.bezierCurveTo(9.7, 8.7, 10.5, 9.7, 11.6, 10.2);
    g.bezierCurveTo(12, 7, 13, 4.7, 14.6, 3); g.bezierCurveTo(15.2, 5.9, 18.5, 8.6, 18.5, 13.2); g.bezierCurveTo(18.5, 17.6, 15.9, 21, 12, 21); g.closePath(); g.fill(); g.restore();
    g.fillStyle = "#ffa94d"; g.font = `900 46px ${F.display}`; g.fillText(String(d.streak), P + 86, y + 44);
    g.fillStyle = c.dim; g.font = `700 30px ${F.body}`; g.fillText(d.streakLabel, P + 86 + nw + 18, y + 44);
    g.textBaseline = "alphabetic";
    y += 84 + 48;
  }
  // the week (recap card): seven day pills, trained ones in the workout colour
  if (d.days && d.days.length === 7) {
    const dg = 14, dw = (CARD_W - 2 * P - dg * 6) / 7;
    d.days.forEach(([l, on], i) => {
      const x = P + i * (dw + dg);
      g.textAlign = "center"; g.fillStyle = on ? c.chalk : c.dim; g.font = `700 28px ${F.body}`; g.fillText(l, x + dw / 2, y + 30);
      g.fillStyle = on ? (c.mint || c.signal) : c.panel; rr(g, x, y + 48, dw, 26, 13); g.fill();
    });
    y += 74 + 48;
  }
  // bars (year card): 12 months, the height = workouts, the best month in the main colour
  if (d.bars && d.bars.length) {
    const nb = d.bars.length, bg = 12, bw = (CARD_W - 2 * P - bg * (nb - 1)) / nb, bh = 150, mx = Math.max(1, ...d.bars.map(b => b[1]));
    d.bars.forEach(([l, v, hi], i) => {
      const x = P + i * (bw + bg), hgt = v ? Math.max(14, (v / mx) * bh) : 6;
      g.fillStyle = v ? (hi ? c.signal : (c.mint || c.signal)) : c.panel; rr(g, x, y + bh - hgt, bw, hgt, Math.min(12, bw / 2)); g.fill();
      g.textAlign = "center"; g.fillStyle = c.dim; g.font = `700 26px ${F.body}`; g.fillText(l, x + bw / 2, y + bh + 40);
    });
    y += bh + 40 + 48;
  }
  // exercises: up to five rows
  const rows = d.rows.slice(0, 5), rh = 76, box = rows.length * rh + 24;
  if (rows.length) {
    g.fillStyle = c.panel; rr(g, P, y, CARD_W - 2 * P, box, 36); g.fill();
    rows.forEach(([name, val], i) => {
      const ry = y + 12 + i * rh;
      if (i) { g.fillStyle = c.line; g.fillRect(P + 32, ry, CARD_W - 2 * P - 64, 2); }
      g.textBaseline = "middle"; g.textAlign = "right"; g.fillStyle = c.signal; g.font = `800 34px ${F.body}`;
      const vw = g.measureText(val).width; g.fillText(val, CARD_W - P - 36, ry + rh / 2);
      g.textAlign = "left"; g.fillStyle = c.chalk; g.font = `700 34px ${F.body}`;
      g.fillText(ellipsis(g, name, CARD_W - 2 * P - 100 - vw), P + 36, ry + rh / 2);
    });
    g.textBaseline = "alphabetic";
  }
  // footer
  g.textAlign = "left"; g.fillStyle = c.chalk; g.font = `900 40px ${F.display}`; g.fillText("HW App", P, CARD_H - 92);
  g.fillStyle = c.dim; g.font = `600 28px ${F.body}`; g.fillText(d.foot, P, CARD_H - 50);
  return canvas;
}
