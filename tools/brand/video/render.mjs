// Marketing video, step 2: draws every frame of a 1080×1920 (9:16, Reels/Stories/Shorts) video at 30 fps from the
// clips of capture.mjs: animated headlines, the app inside an own phone frame (no real device brand), logo intro and
// "Free on Google Play" outro (text only: no Google badge artwork). One mp4 per scene, joined with the concat demuxer.
// node tools/brand/video/render.mjs [scene,…]   (CLIPS, OUT env; default = scratchpad/video/)
import { createRequire } from "node:module";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = process.env.OUT || "/tmp/claude-0/-home-claude/13cd6817-ba32-5f61-a043-b3a139dad897/scratchpad/video/";
const CLIPS = process.env.CLIPS || ROOT + "clips/";
const REPO = new URL("../../../", import.meta.url).pathname;
const W = 1080, H = 1920, FPS = 30;
const ONLY = process.argv[2] ? process.argv[2].split(",") : null;
// Scenes: clip = folder of frames, from = first frame, dur = seconds, head = [[word, yellow?] …], sub = line
const SCENES = [
  { id: "intro", dur: 2.6 },
  { id: "workout", clip: "workout", from: 0, dur: 8.6, head: [["Train", 0], ["at", 0], ["home.", 1]], sub: "No gym. No equipment. About 20 minutes." },
  { id: "summary", clip: "summary", from: 25, dur: 4.3, head: [["Every", 0], ["rep", 1], ["counts.", 0]], sub: "XP, records and streaks after every workout." },
  { id: "body", clip: "body", from: 0, dur: 4.4, head: [["Rank", 0], ["up", 0], ["every", 0], ["muscle.", 1]], sub: "From Iron all the way to Obsidian." },
  { id: "deck", clip: "deck", from: 0, dur: 6.0, head: [["Your", 0], ["reps", 1], ["become", 0], ["cards.", 0]], sub: "Muscle Deck: a card game powered by your training." },
  { id: "looks", clip: "looks", from: 18, dur: 3.8, head: [["Earn", 0], ["your", 0], ["looks.", 1]], sub: "Train, collect diamonds, style your profile." },
  { id: "outro", dur: 3.4 },
];
const font = (fam, w, f) => `@font-face{font-family:'${fam}';font-weight:${w};src:url('file://${REPO}fonts/${f}') format('woff2')}`;
const MARK = `<svg viewBox="0 0 512 512" width="100%" height="100%"><rect id="mBox" width="512" height="512" rx="116" fill="#111317" stroke="#2b2f38" stroke-width="5"/>
<path id="mRoof" d="M120 248 L256 130 L392 248" fill="none" stroke="#ffd23f" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/>
<g fill="#eef2ff"><rect class="mb" x="172" y="324" width="168" height="30" rx="15"/><rect class="mb" x="130" y="276" width="40" height="126" rx="16"/><rect class="mb" x="342" y="276" width="40" height="126" rx="16"/><rect class="mb" x="96" y="302" width="30" height="74" rx="13"/><rect class="mb" x="386" y="302" width="30" height="74" rx="13"/></g></svg>`;
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
${font("BS", 900, "big-shoulders-display-latin-900-normal.woff2")}${font("BS", 800, "big-shoulders-display-latin-800-normal.woff2")}
${font("FT", 600, "figtree-latin-600-normal.woff2")}${font("FT", 700, "figtree-latin-700-normal.woff2")}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#000}
#st{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#000;font-family:FT}
#g1,#g2{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
#g1{width:900px;height:620px;left:90px;top:-240px;background:radial-gradient(closest-side,rgba(255,210,63,.30),transparent)}
#g2{width:760px;height:760px;left:-260px;top:1100px;background:radial-gradient(closest-side,rgba(95,227,161,.13),transparent)}
#grid{position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 59px,rgba(255,255,255,.035) 59px 60px),repeating-linear-gradient(90deg,transparent 0 59px,rgba(255,255,255,.035) 59px 60px);-webkit-mask:radial-gradient(70% 45% at 50% 30%,#000,transparent)}
#txt{position:absolute;left:50px;right:50px;top:150px;display:flex;flex-direction:column;align-items:center}
#head{white-space:nowrap;text-align:center;font-family:BS;font-weight:900;font-size:132px;line-height:1;color:#f2f4f8;letter-spacing:.5px}
#head span{display:inline-block;margin:0 14px;will-change:transform}
#head span.y{color:#ffd23f}
#sub{margin-top:26px;max-width:880px;text-align:center;font-size:40px;font-weight:600;line-height:1.3;color:#9aa1ae}
#phone{position:absolute;left:${(W - 680) / 2}px;top:560px;width:680px;height:1440px;border-radius:92px;background:linear-gradient(160deg,#2a2e36,#121418 40%,#1b1e24);padding:20px;box-shadow:0 40px 120px rgba(0,0,0,.8),0 0 0 2px #3a3f4a inset,0 0 80px rgba(255,210,63,.08)}
#scr{position:relative;width:640px;height:1385px;border-radius:72px;overflow:hidden;background:#000}
#scr img{position:absolute;left:0;top:0;width:640px;height:1385px}
#cam{position:absolute;left:50%;top:22px;width:26px;height:26px;margin-left:-13px;border-radius:99px;background:#0a0b0d;box-shadow:0 0 0 3px #15171b;z-index:3}
#logo{position:absolute;left:50%;top:560px;width:340px;height:340px;margin-left:-170px}
#word{position:absolute;left:0;right:0;top:960px;text-align:center;font-family:BS;font-weight:900;font-size:170px;color:#f2f4f8;line-height:1}
#tag{position:absolute;left:0;right:0;top:1150px;text-align:center;font-size:44px;font-weight:600;color:#9aa1ae}
#play{position:absolute;left:50%;top:1300px;transform:translateX(-50%);padding:26px 54px;border-radius:99px;background:#ffd23f;color:#1d1700;font-size:46px;font-weight:700;white-space:nowrap;box-shadow:0 10px 0 #c29300,0 20px 60px rgba(255,210,63,.35)}
#feat{position:absolute;left:0;right:0;top:1500px;text-align:center;font-size:34px;font-weight:600;color:#6b7280}
</style></head><body><div id="st"><div id="grid"></div><div id="g1"></div><div id="g2"></div>
<div id="txt"><div id="head"></div><div id="sub"></div></div>
<div id="phone"><div id="scr"><img id="a"><div id="cam"></div></div></div>
<div id="logo">${MARK}</div><div id="word">HW App</div><div id="tag">Home workouts that stick.</div><div id="play">Free on Google Play</div><div id="feat">Android · 15 languages</div>
</div></body></html>`;

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeIO = t => { t = Math.min(1, Math.max(0, t)); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const back = t => { t = Math.min(1, Math.max(0, t)); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// State of one frame (pure numbers, applied in the page)
function frame(sc, t, T) {
  const st = { glow: T, head: null, sub: null, phone: null, logo: null, end: null };
  if (sc.id === "intro") {
    st.logo = { s: 0.6 + 0.4 * back(t / 0.7), o: ease(t / 0.3), roof: ease((t - 0.25) / 0.7), bars: [0, 1, 2, 3, 4].map(i => back((t - 0.55 - i * 0.07) / 0.45)), y: 0 };
    st.word = { o: ease((t - 0.9) / 0.4), y: 40 * (1 - ease((t - 0.9) / 0.5)) };
    st.tag = { o: ease((t - 1.25) / 0.4) };
    const out = ease((t - (sc.dur - 0.45)) / 0.45);
    st.logo.o *= 1 - out; st.logo.y = -80 * out; st.word.o *= 1 - out; st.tag.o *= 1 - out;
    return st;
  }
  if (sc.id === "outro") {
    st.phone = { y: 1500 * easeIO(t / 0.55), o: 1, img: null, fade: 0 };
    st.logo = { s: 0.6 + 0.4 * back((t - 0.25) / 0.6), o: ease((t - 0.25) / 0.3), roof: 1, bars: [1, 1, 1, 1, 1], y: 0 };
    st.word = { o: ease((t - 0.55) / 0.4), y: 40 * (1 - ease((t - 0.55) / 0.5)) };
    st.tag = { o: ease((t - 0.8) / 0.4) };
    st.play = { o: ease((t - 1.05) / 0.35), s: 0.8 + 0.2 * back((t - 1.05) / 0.5) };
    st.feat = { o: ease((t - 1.4) / 0.4) };
    return st;
  }
  const first = sc.id === "workout";
  const out = ease((t - (sc.dur - 0.32)) / 0.32);
  st.head = sc.head.map((w, i) => { const k = ease((t - 0.08 - i * 0.07) / 0.45); return { o: k * (1 - out), y: 70 * (1 - k) - 30 * out }; });
  st.sub = { o: ease((t - 0.45) / 0.4) * (1 - out), y: 20 * (1 - ease((t - 0.45) / 0.5)) };
  const n = fs.readdirSync(CLIPS + sc.clip).length;
  const fi = Math.min(n - 1, sc.from + Math.round(t * FPS));
  st.phone = { y: first ? 1400 * (1 - easeIO(t / 0.75)) : 0, o: 1, img: `file://${CLIPS}${sc.clip}/${String(fi).padStart(5, "0")}.jpg`, fade: first ? 0 : 1 - ease(t / 0.3), lift: first ? 0 : 40 * (1 - ease(t / 0.35)) };
  return st;
}

async function draw(sc, t, TT) {
  const st = frame(sc, t, TT);
  await page.evaluate(async ({ st, head, sub }) => {
      const $ = id => document.getElementById(id);
      $("g1").style.transform = `translate(${Math.sin(st.glow * 0.5) * 60}px, ${Math.cos(st.glow * 0.4) * 30}px)`;
      $("g2").style.transform = `translate(${Math.cos(st.glow * 0.35) * 80}px, ${Math.sin(st.glow * 0.3) * 50}px)`;
      const hd = $("head");
      if (st.head) {
        if (hd.dataset.k !== head.map(w => w[0]).join(" ")) {
          hd.dataset.k = head.map(w => w[0]).join(" "); hd.innerHTML = head.map(w => `<span class="${w[1] ? "y" : ""}">${w[0]}</span>`).join("");
          let f = 132; hd.style.fontSize = f + "px"; while (hd.scrollWidth > 980 && f > 70) { f -= 4; hd.style.fontSize = f + "px"; } // one line, as big as fits
        }
        [...hd.children].forEach((s, i) => { s.style.opacity = st.head[i].o; s.style.transform = `translateY(${st.head[i].y}px)`; });
        $("sub").textContent = sub; $("sub").style.opacity = st.sub.o; $("sub").style.transform = `translateY(${st.sub.y}px)`;
      } else { hd.innerHTML = ""; hd.dataset.k = ""; $("sub").style.opacity = 0; }
      const ph = $("phone");
      if (st.phone) {
        ph.style.display = "block"; ph.style.transform = `translateY(${st.phone.y + Math.sin(st.glow * 1.2) * 6}px)`;
        const a = $("a");
        if (st.phone.img && a.getAttribute("src") !== st.phone.img) { a.src = st.phone.img; await a.decode().catch(() => {}); }
        a.style.opacity = 1 - (st.phone.fade || 0); a.style.transform = `translateY(${st.phone.lift || 0}px)`;
      } else ph.style.display = "none";
      const lg = $("logo");
      if (st.logo) {
        lg.style.display = "block"; lg.style.opacity = st.logo.o; lg.style.transform = `translateY(${st.logo.y}px) scale(${st.logo.s})`;
        document.getElementById("mRoof").setAttribute("stroke-dashoffset", String(1 - st.logo.roof));
        [...document.querySelectorAll(".mb")].forEach((b, i) => { const k = st.logo.bars[i]; b.style.transformOrigin = "256px 339px"; b.style.transform = `scale(${Math.max(0, k)})`; });
      } else lg.style.display = "none";
      const show = (id, o) => { const e = $(id); if (!o) { e.style.display = "none"; return; } e.style.display = "block"; e.style.opacity = o.o; if (o.y != null) e.style.transform = `translateY(${o.y}px)`; if (o.s != null) e.style.transform = `translateX(-50%) scale(${o.s})`; };
      show("word", st.word); show("tag", st.tag); show("play", st.play); show("feat", st.feat);
    }, { st, head: sc.head || [], sub: sc.sub || "" });
}
const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
fs.writeFileSync(ROOT + "stage.html", HTML);
await page.goto("file://" + ROOT + "stage.html");
await page.evaluate(() => document.fonts.ready);
// STILL="workout:1.2,outro:2.5" draws only those moments (full size) to check before a full render
const STILL = process.env.STILL ? process.env.STILL.split(",").map(x => x.split(":")) : null;
let T = 0;
for (const sc of SCENES) {
  if (STILL) { for (const [id, ts] of STILL) if (id === sc.id) { await draw(sc, +ts, T + +ts); fs.writeFileSync(ROOT + `still_${id}_${ts}.jpg`, await page.screenshot({ type: "jpeg", quality: 92 })); } T += sc.dur; continue; }
  const nF = Math.round(sc.dur * FPS);
  if (ONLY && !ONLY.includes(sc.id)) { T += sc.dur; continue; }
  const dir = ROOT + "f_" + sc.id + "/"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < nF; i++) {
    const t = i / FPS;
    await draw(sc, t, T + t);
    fs.writeFileSync(dir + String(i).padStart(5, "0") + ".jpg", await page.screenshot({ type: "jpeg", quality: 92 }));
  }
  const tmp = ROOT + "s_" + sc.id + ".tmp.mp4";
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", dir + "%05d.jpg", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", String(FPS), tmp]);
  fs.renameSync(tmp, ROOT + "s_" + sc.id + ".mp4");
  console.log(sc.id, nF, "frames");
  T += sc.dur;
}
await browser.close();
if (STILL) process.exit(0);
fs.writeFileSync(ROOT + "list.txt", SCENES.map(s => `file 's_${s.id}.mp4'`).join("\n") + "\n");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", ROOT + "list.txt", "-c", "copy", "-movflags", "+faststart", ROOT + "hw-app-promo.tmp.mp4"]);
fs.renameSync(ROOT + "hw-app-promo.tmp.mp4", ROOT + "hw-app-promo.mp4");
console.log("done", ROOT + "hw-app-promo.mp4");
