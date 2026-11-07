// Google Play feature graphic 1024×500 for every language: logo, headline, one line, two phones with the store shots
import { createRequire } from "node:module"; const { chromium } = createRequire("/home/claude/hw-app/tests/harness.mjs")("playwright");
import fs from "node:fs";
const S = process.env.OUT || "/home/claude/hw-app/store/out/";
const F = "/home/claude/hw-app/fonts/";
const T = {
  en: ["Home workout in 19 minutes", "Your own plans with weights, ranks, streaks, calories and friends."],
  sk: ["Domáci tréning za 19 minút", "Vlastné plány s váhami, ranky, séria, kalórie a priatelia."],
  cs: ["Domácí trénink za 19 minut", "Vlastní plány s vahami, ranky, šňůra, kalorie a přátelé."],
  pl: ["Trening w domu w 19 minut", "Własne plany z ciężarami, rangi, passa, kalorie i znajomi."],
  hu: ["Otthoni edzés 19 perc alatt", "Saját tervek súlyokkal, rangok, széria, kalóriák és barátok."],
  uk: ["Тренування вдома за 19 хвилин", "Власні плани з вагами, ранги, серія, калорії та друзі."],
  de: ["Workout zu Hause in 19 Minuten", "Eigene Pläne mit Gewichten, Ränge, Serien, Kalorien und Freunde."],
  es: ["Ejercicio en casa en 19 minutos", "Tus propios planes con pesas, rangos, rachas, calorías y amigos."],
  fr: ["Sport à la maison en 19 minutes", "Tes programmes avec poids, rangs, flammes, calories et amis."],
  it: ["Allenamento a casa in 19 minuti", "Le tue schede con pesi, ranghi, strisce, calorie e amici."],
  pt: ["Treino em casa em 19 minutos", "Seus planos com pesos, ranks, sequências, calorias e amigos."],
  zh: ["19 分钟居家训练", "自建负重计划、段位、连胜、热量和好友。"],
  ja: ["19分の自宅トレーニング", "ウェイト対応のマイプラン、ランク、連続記録、カロリー、フレンド。"],
  ko: ["19분 홈 트레이닝", "무게를 더한 나만의 플랜, 랭크, 연속 기록, 칼로리, 친구."],
  id: ["Latihan di rumah 19 menit", "Rencana sendiri dengan beban, rank, runtutan, kalori, dan teman."],
};
const LANGS = process.env.LANGS ? process.env.LANGS.split(",") : Object.keys(T);
const mark = fs.readFileSync("/home/claude/hw-app/assets/mark.svg", "utf8").replace(/<rect width="512" height="512" rx="116" fill="#0e1b36"\/>/, "");
const ff = (fam, file, w) => `@font-face{font-family:'${fam}';font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(F + file).toString("base64")}) format('woff2')}`;
const fonts = [
  ff("Big Shoulders Display", "big-shoulders-display-latin-900-normal.woff2", 900), ff("Big Shoulders Display", "big-shoulders-display-latin-ext-900-normal.woff2", 900),
  ff("Oswald", "oswald-latin-700-normal.woff2", 700), ff("Oswald", "oswald-latin-ext-700-normal.woff2", 700), ff("Oswald", "oswald-cyrillic-700-normal.woff2", 700),
  ff("Figtree", "figtree-latin-600-normal.woff2", 600), ff("Figtree", "figtree-latin-ext-600-normal.woff2", 600),
].join("");
const img = p => "data:image/png;base64," + fs.readFileSync(p).toString("base64");
const cjk = l => ["zh", "ja", "ko"].includes(l);
const page = (l) => `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><style>${fonts}
*{box-sizing:border-box;margin:0}
body{width:1024px;height:500px;overflow:hidden;background:#0e1b36;font-family:Figtree,'Noto Sans','Noto Sans CJK SC',sans-serif;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(520px 380px at 80% 30%,#1f3765 0%,transparent 70%),radial-gradient(420px 300px at 6% 104%,#ffd23f22 0%,transparent 70%),linear-gradient(160deg,#122247,#0b1730)}
.left{position:absolute;left:64px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center}
.brand{display:flex;align-items:center;gap:16px;margin-bottom:22px}
.mk{width:74px;height:74px;border-radius:18px;background:#16284d;box-shadow:inset 0 0 0 1.5px #2c4679;display:grid;place-items:center}
.mk svg{width:62px;height:62px}
.name{font-family:'Big Shoulders Display',Oswald,sans-serif;font-weight:900;font-size:76px;line-height:.9;color:#eef2ff;letter-spacing:.5px}
h1{font-family:${cjk(l) ? "'Noto Sans CJK SC','Noto Sans CJK JP','Noto Sans CJK KR',sans-serif;font-weight:900;letter-spacing:0;font-size:46px;line-height:1.15" : "'Big Shoulders Display',Oswald,sans-serif;font-weight:900;font-size:52px;line-height:.98;text-transform:uppercase;letter-spacing:.3px"};color:#ffd23f;text-wrap:balance}
p{margin-top:16px;font-size:20px;line-height:1.35;font-weight:600;color:#a9b7da;max-width:430px;text-wrap:pretty}:lang(ja) p,:lang(ko) p{word-break:keep-all}
.ph{position:absolute;width:212px;height:377px;border-radius:30px;padding:7px;background:#05080f;box-shadow:0 0 0 1.5px #3a5185,0 30px 60px #0009}
.ph img{width:100%;height:100%;border-radius:24px;display:block;object-fit:cover;object-position:top}
.p1{left:592px;top:84px;transform:rotate(-6deg)}
.p2{left:770px;top:52px;transform:rotate(5deg)}
</style></head><body><div class="bg"></div>
<div class="left"><div class="brand"><div class="mk">${mark}</div><div class="name">HW App</div></div><h1>${T[l][0]}</h1><p>${T[l][1]}</p></div>
<div class="ph p1"><img src="${img(S + "shots/" + l + "/02_workout.png")}"></div>
<div class="ph p2"><img src="${img(S + "shots/" + l + "/01_home.png")}"></div>
</body></html>`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
fs.mkdirSync(S + "fg", { recursive: true });
for (const l of LANGS) {
  await p.setContent(page(l)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  const over = await p.evaluate(() => { const h = document.querySelector("h1"), q = document.querySelector("p"), L = document.querySelector(".left").getBoundingClientRect(); return { h1: h.getBoundingClientRect().height, lines: Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)), top: L.top, txtBottom: q.getBoundingClientRect().bottom }; });
  console.log(l, JSON.stringify(over));
  await p.screenshot({ path: `${S}fg/feature-${l}.png` });
}
await b.close();
