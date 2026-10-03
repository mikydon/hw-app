import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
// Scoreboard look: deep navy, chalk-white type, one signal yellow for "do this
// now", mint for done, sky blue for rest. The giant condensed number on the
// session screen is the one loud element; everything else stays quiet.
const C = {
  ink: "#0e1b36",
  panel: "#16284d",
  panelHi: "#1f3765",
  line: "#2c4679",
  chalk: "#eef2ff",
  dim: "#93a3c9",
  signal: "#ffd23f",
  signalInk: "#1d1700",
  mint: "#5fe3a1",
  sky: "#7cc4ff",
};
const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif";
const BODY = "'Figtree', -apple-system, 'Segoe UI', sans-serif";

function useFonts() {
  useEffect(() => {
    const add = (id, href) => {
      if (document.getElementById(id)) return;
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet"; l.href = href;
      document.head.appendChild(l);
    };
    add("f-bsd", "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&display=swap");
    add("f-fig", "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap");
  }, []);
}

// ─── AUDIO (unchanged — tested and working on Android) ──────────────────────
function unlockAudio() {
  if (window._wac) return;
  try { window._wac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
}
function beep(freq, dur, vol) {
  try {
    if (window._wmute) return;
    const ctx = window._wac;
    if (!ctx) return;
    const play = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + dur);
    };
    if (ctx.state === "suspended") ctx.resume().then(play); else play();
  } catch (_) {}
}
const soundExercise = () => beep(1047, 0.2, 0.5);
const soundRest = () => beep(659, 0.2, 0.5);
const soundPrepEnd = () => beep(880, 0.12, 0.4);

// Fun effects: all notes are scheduled on the audio clock inside ONE play call.
// No setTimeout chains — those are what broke the sound on Android before.
function melody(notes, type = "triangle", vol = 0.3) {
  if (window._wmute) return;
  try {
    const ctx = window._wac;
    if (!ctx) return;
    const play = () => {
      const t0 = ctx.currentTime + 0.02;
      notes.forEach(([f, at, d]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type; o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + at + d);
        o.start(t0 + at);
        o.stop(t0 + at + d + 0.03);
      });
    };
    if (ctx.state === "suspended") ctx.resume().then(play); else play();
  } catch (_) {}
}
// Reward sounds come in several variants; the same one never plays twice in a row.
// (Timer beeps above stay fixed on purpose, so you recognise them without looking.)
const SFX = {
  check: [
    [[[880, 0, 0.09], [1318, 0.07, 0.16]], "triangle", 0.3],
    [[[1175, 0, 0.07], [1568, 0.06, 0.15]], "sine", 0.3],
    [[[740, 0, 0.07], [1109, 0.06, 0.16]], "triangle", 0.3],
    [[[1319, 0, 0.16]], "triangle", 0.32],
  ],
  set: [
    [[[784, 0, 0.1], [1175, 0.09, 0.22]], "triangle", 0.3],
    [[[659, 0, 0.08], [880, 0.07, 0.08], [1319, 0.14, 0.22]], "triangle", 0.3],
    [[[1047, 0, 0.09], [1568, 0.08, 0.22]], "sine", 0.32],
    [[[523, 0, 0.07], [784, 0.06, 0.07], [1047, 0.12, 0.2]], "square", 0.12],
    [[[880, 0, 0.06], [988, 0.06, 0.06], [1175, 0.12, 0.24]], "triangle", 0.3],
    [[[988, 0, 0.07], [1319, 0.07, 0.32]], "square", 0.11],
  ],
  record: [
    [[[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.42]], "triangle", 0.3],
    [[[392, 0, 0.1], [494, 0.1, 0.1], [587, 0.2, 0.1], [784, 0.3, 0.45]], "triangle", 0.32],
    [[[523, 0, 0.09], [523, 0.12, 0.09], [523, 0.24, 0.09], [698, 0.36, 0.45]], "square", 0.12],
    [[[659, 0, 0.1], [831, 0.1, 0.1], [988, 0.2, 0.1], [1319, 0.3, 0.45]], "triangle", 0.3],
  ],
  finish: [
    [[[523, 0, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.14], [1047, 0.42, 0.22], [784, 0.64, 0.12], [1047, 0.78, 0.55]], "triangle", 0.3],
    [[[392, 0, 0.12], [523, 0.12, 0.12], [659, 0.24, 0.12], [784, 0.36, 0.12], [1047, 0.5, 0.55]], "triangle", 0.3],
    [[[523, 0, 0.15], [784, 0.15, 0.15], [1047, 0.3, 0.15], [1319, 0.45, 0.6]], "sine", 0.32],
    [[[587, 0, 0.1], [740, 0.1, 0.1], [880, 0.2, 0.1], [1175, 0.32, 0.12], [880, 0.46, 0.1], [1175, 0.58, 0.55]], "square", 0.11],
  ],
  level: [
    [[[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.12], [1319, 0.48, 0.12], [1568, 0.6, 0.6]], "square", 0.13],
    [[[659, 0, 0.1], [784, 0.1, 0.1], [988, 0.2, 0.1], [1319, 0.3, 0.1], [988, 0.42, 0.08], [1319, 0.52, 0.08], [1760, 0.62, 0.6]], "triangle", 0.3],
    [[[440, 0, 0.12], [554, 0.12, 0.12], [659, 0.24, 0.12], [880, 0.36, 0.12], [1109, 0.48, 0.12], [1319, 0.6, 0.65]], "triangle", 0.3],
  ],
};
const lastSfx = {};
function playSfx(kind) {
  const list = SFX[kind];
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastSfx[kind]) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  lastSfx[kind] = i;
  const [notes, type, vol] = list[i];
  melody(notes, type, vol);
}
const sfxTap = () => melody([[1180 + Math.floor(Math.random() * 6) * 50, 0, 0.05]], "sine", 0.12);
const sfxCheck = () => playSfx("check");
const sfxSet = () => playSfx("set");
const sfxRecord = () => playSfx("record");
const sfxFinish = () => playSfx("finish");
const sfxLevel = () => playSfx("level");
function vibrate(pat) { try { navigator.vibrate?.(pat); } catch (_) {} }
if (typeof document !== "undefined") {
  document.addEventListener("click", unlockAudio, { once: true });
}

// ─── EXERCISES ──────────────────────────────────────────────────────────────
// type "reps": number logged per round. type "time": hold timer.
// unit is appended to logged numbers ("/ruku", "/nohu", "/stranu").
const EX = {
  k1: {
    name: "Klik", type: "reps", start: 15, unit: "",
    muscles: "Hruď, triceps, predné ramená",
    tempo: "3 s dole, krátka pauza, hore",
    how: "Ruky daj o niečo širšie ako ramená, telo rovné od hlavy po päty, brucho a zadok zaťaté. 3 sekundy sa spúšťaj, kým sa hrudník takmer nedotkne zeme, chvíľu podrž a zatlač sa hore. Lakte zvierajú s telom asi 45°, nie do strán.",
    tip: "Keď v prvom kole dáš 25+, polož ruky na dve hrubé knihy. Hrudník pôjde hlbšie, sval sa viac natiahne a viac rastie.",
    yt: "https://www.youtube.com/watch?v=es_Tz8Si75o",
  },
  row1: {
    name: "Veslovanie o rám dverí", type: "reps", start: 12, unit: "/ruku",
    muscles: "Chrbát (latissimus), zadné ramená, biceps",
    tempo: "1 s hore, 1 s podrž, 3 s späť",
    how: "Postav sa do otvorených dverí bokom k rámu. Jednou rukou chyť rám vo výške hrudníka, chodidlá daj tesne k rámu. Zakloň sa s vystretou rukou, telo rovné. Pritiahni sa k rámu: lakeť ide dozadu popri tele, lopatku stiahni dozadu. Pomaly sa vráť. Najprv všetky opakovania jednou rukou, potom druhou.",
    tip: "Čím bližšie máš chodidlá k rámu a čím viac sa zakloníš, tým je to ťažšie. Drž sa pevného rámu, nie dverí, a cvič naboso, aby sa ti nešmýkali nohy.",
    yt: "https://www.youtube.com/watch?v=ytEalkENNiQ",
  },
  n1: {
    name: "ATG drep", type: "reps", start: 15, unit: "",
    muscles: "Predné stehná, zadok",
    tempo: "3 s dole, 1 s pauza dole, hore",
    how: "Chodidlá na šírku ramien, špičky mierne von. 3 sekundy sa spúšťaj čo najhlbšie, stehná pod úroveň kolien, päty stále na zemi. Dole 1 sekundu podrž a postav sa.",
    tip: "Pomalé tempo a pauza dole robia z ľahkého drepu ťažký. Ak dáš 20+ aj s tempom, napíš a vymeníme ho za ťažší cvik.",
    yt: "https://www.youtube.com/watch?v=zJBLDJMJiDE",
  },
  b5: {
    name: "Plank", type: "time", durs: [30, 45, 60, 75], dur: 45, unit: "",
    muscles: "Celý stred tela",
    how: "Predlaktia daj pod ramená, telo rovné od hlavy po päty. Zatni brucho a zadok, akoby ťa mal niekto udrieť do brucha. Zadok nedvíhaj ani nepúšťaj dole.",
    tip: "Keď dáš 60 s v oboch kolách, zdvihni počas planku jednu nohu (striedaj). Je to oveľa ťažšie.",
    yt: "https://www.youtube.com/watch?v=ASdvN_XEl_c",
  },
  r1: {
    name: "Pike klik", type: "reps", start: 12, unit: "",
    muscles: "Ramená, triceps",
    tempo: "3 s dole, hore",
    how: "Postav sa do obráteného V: ruky na zemi, zadok vysoko, nohy čo najrovnejšie. Ohni lakte a spúšťaj temeno hlavy k zemi kúsok pred rukami, takže ruky a hlava tvoria trojuholník. Zatlač sa späť hore.",
    tip: "Keď dáš 15+ v oboch kolách, polož nohy na stoličku. Viac tvojej váhy pôjde na ramená.",
    yt: "https://www.youtube.com/watch?v=pHR5yG6xBps",
  },
  row2: {
    name: "Veslovanie s uterákom o dvere", type: "reps", start: 10, unit: "",
    muscles: "Stredný chrbát, lopatky, biceps",
    tempo: "1 s hore, 1 s podrž, 3 s späť",
    how: "Otvor dvere a postav sa čelom k ich hrane, takže dvere máš medzi chodidlami. Prevleč uterák cez obe kľučky a chyť jeho konce, alebo chyť priamo obe kľučky. Zakloň sa s vystretými rukami, telo rovné. Pritiahni hrudník k hrane dverí, lopatky k sebe, a pomaly späť.",
    tip: "Najprv over, že kľučky sú pevné a nehýbu sa. Ak sa niečo hýbe, rob radšej veslovanie o rám (z dňa A). Bezpečnosť je dôležitejšia než cvik.",
    yt: "https://www.youtube.com/watch?v=g8wWFlr2gQU",
  },
  n2: {
    name: "Bulharský drep", type: "reps", start: 12, unit: "/nohu",
    muscles: "Predné stehná, zadok",
    tempo: "3 s dole, hore",
    how: "Postav sa pred stoličku a zadnú nohu polož nártom na sedadlo. Prednou nohou urob veľký krok vpred. 3 sekundy sa spúšťaj, zadné koleno ide k zemi. Zatlač sa cez pätu prednej nohy hore.",
    tip: "Predné chodidlo daj tak ďaleko, aby koleno zostalo nad chodidlom. Mierny predklon trupu = viac zaberie zadok.",
    yt: "https://www.youtube.com/watch?v=DeCnHqrN22U",
  },
  b2: {
    name: "Dead bug", type: "reps", start: 10, unit: "/stranu",
    muscles: "Hlboké brušné svaly",
    tempo: "pomaly, 2 s tam, 2 s späť",
    how: "Ľahni na chrbát, ruky vystri ku stropu, nohy zdvihni s kolenami v 90°. Pomaly spúšťaj pravú ruku za hlavu a ľavú nohu k zemi, potom sa vráť a vymeň strany.",
    tip: "Spodok chrbta musí celý čas ostať pritlačený k zemi. Ak sa odlepí, nespúšťaj nohu tak nízko.",
    yt: "https://www.youtube.com/watch?v=4XLEnwUr1d8",
  },
  k3: {
    name: "Diamond klik", type: "reps", start: 10, unit: "",
    muscles: "Triceps, vnútorná hruď",
    tempo: "3 s dole, hore",
    how: "Ruky daj pod hrudník tak, aby sa palce a ukazováky dotýkali a tvorili diamant. Spúšťaj sa, lakte idú dozadu popri tele. Hrudník smeruje k rukám.",
    tip: "Ak bolia zápästia alebo lakte, daj ruky kúsok od seba. Úzky klik zaťaží triceps skoro rovnako.",
    yt: "https://www.youtube.com/watch?v=_6AvEX9-k8E",
  },
  row3: {
    name: "Široké veslovanie o rám", type: "reps", start: 12, unit: "/ruku",
    muscles: "Zadné ramená, horný chrbát",
    tempo: "1 s hore, 1 s podrž, 3 s späť",
    how: "Rovnaké postavenie ako pri veslovaní o rám, ale rám chyť vo výške ramena a lakeť ťahaj do strany, nie popri tele. Ruka a trup tvoria písmeno T. Cítiť to máš vzadu na ramene a medzi lopatkami.",
    tip: "Tento uhol trénuje zadné ramená a horný chrbát. Práve tie robia ramená zozadu širšie a hrubšie.",
    yt: "https://www.youtube.com/watch?v=ytEalkENNiQ",
  },
  n7: {
    name: "Hamstring curl s uterákom", type: "reps", start: 10, unit: "",
    muscles: "Zadné stehná, zadok",
    tempo: "3 s von, 1 s späť",
    how: "Ľahni na chrbát na hladkú podlahu (parkety, dlažba), päty polož na uterák alebo cvič v ponožkách. Zdvihni boky do mostíka. 3 sekundy vysúvaj nohy dopredu, kým nie sú skoro vystreté, boky stále hore. Potom pritiahni päty späť k zadku.",
    tip: "Na koberci to nekĺže. Vtedy rob jednonohý mostík: boky hore, jedna noha vo vzduchu, a zapíš počet na jednu nohu.",
    yt: "https://www.youtube.com/watch?v=cWSsWpuxmYM",
  },
  b4: {
    name: "Bicycle crunch", type: "reps", start: 15, unit: "/stranu",
    muscles: "Šikmé brušné svaly, celé brucho",
    tempo: "pomaly, 1 s na stranu",
    how: "Ľahni na chrbát, ruky za hlavu, ramená zdvihni od zeme. Pravý lakeť k ľavému kolenu, pritom vystri pravú nohu. Potom naopak. Otáča sa trup, nie len lakte.",
    tip: "Pomaly. Rýchle šibanie lakťami nerobí nič, len namáha krk.",
    yt: "https://www.youtube.com/watch?v=9FGilxCbdz8",
  },
};

// ─── ALTERNATIVES (for "Vymeniť cvik") ──────────────────────────────────────
Object.assign(EX, {
  kKnee: {
    name: "Klik na kolenách", tag: "ľahšie", type: "reps", start: 10, unit: "",
    muscles: "Hruď, triceps, predné ramená",
    tempo: "3 s dole, hore",
    how: "Kľakni si, ruky daj o niečo širšie ako ramená. Telo drž rovné od kolien po hlavu, zadok nevystrkuj. 3 sekundy sa spúšťaj hrudníkom k zemi a zatlač sa hore.",
    tip: "Keď dáš 20 v oboch kolách, vráť sa ku klasickému kliku.",
    yt: "https://www.youtube.com/watch?v=z8nUnCdZXQI",
  },
  kIncl: {
    name: "Šikmý klik o stôl", tag: "ľahšie", type: "reps", start: 12, unit: "",
    muscles: "Hruď, triceps, predné ramená",
    tempo: "3 s dole, hore",
    how: "Polož ruky na pevný stôl, posteľ alebo parapet. Telo drž rovné od piat po hlavu. Spúšťaj hrudník k hrane a zatlač sa späť. Čím nižšia opora, tým je to ťažšie.",
    tip: "Dobrá náhrada, keď ťa bolia zápästia na zemi alebo už nevládzeš.",
    yt: "https://www.youtube.com/watch?v=-9S9gdRwwak",
  },
  superman: {
    name: "Superman", tag: "bez dverí", type: "reps", start: 12, unit: "",
    muscles: "Spodný chrbát, zadok, zadné ramená",
    tempo: "hore, 2 s podrž, dole",
    how: "Ľahni na brucho, ruky vystri pred seba. Zdvihni naraz ruky, hrudník a nohy od zeme, 2 sekundy podrž a pomaly spusti. Pozeraj sa do zeme, krk nezakláňaj.",
    tip: "Nie je to ťah ako veslovanie, ale posilní chrbát, keď nemáš kde veslovať.",
    yt: "https://www.youtube.com/watch?v=cZxtPxeR2H8",
  },
  ytw: {
    name: "Y-T-W na zemi", tag: "bez dverí", type: "reps", start: 6, unit: "",
    muscles: "Stredný a horný chrbát, zadné ramená",
    tempo: "každá poloha 1 s podrž",
    how: "Ľahni na brucho, čelo na uterák. Zdvihni vystreté ruky do tvaru Y a podrž 1 s. Potom do strán do tvaru T. Nakoniec stiahni lakte k rebrám do tvaru W a lopatky k sebe. Y + T + W = 1 opakovanie.",
    tip: "Palce smerujú hore a ramená drž ďaleko od uší.",
    yt: "https://www.youtube.com/watch?v=OmgJCA_lzrs",
  },
  lunge: {
    name: "Reverzný výpad", tag: "bez stoličky", type: "reps", start: 10, unit: "/nohu",
    muscles: "Predné stehná, zadok",
    tempo: "2 s dole, hore",
    how: "Stoj vzpriamene. Urob veľký krok dozadu, zadné koleno ide skoro k zemi a predné zviera 90°. Zatlač sa cez pätu prednej nohy späť do stoja. Najprv všetky opakovania jednou nohou, potom druhou.",
    tip: "Šetrnejší na kolená ako výpad dopredu. Trup drž vzpriamený.",
    yt: "https://www.youtube.com/watch?v=ALl174GTuoY",
  },
  bridge: {
    name: "Mostík", tag: "ľahšie", type: "reps", start: 15, unit: "",
    muscles: "Zadok, zadné stehná",
    tempo: "hore, 2 s stlač, dole",
    how: "Ľahni na chrbát, kolená pokrč, chodidlá na zemi. Zatlač cez päty a zdvihni boky, kým telo netvorí rovnú čiaru od kolien po ramená. Hore 2 sekundy stlač zadok a pomaly spusti.",
    tip: "Ťažšia verzia: jedna noha vo vzduchu. Zapíš potom počet na jednu nohu.",
    yt: "https://www.youtube.com/watch?v=Q_Bpj91Yiis",
  },
  wallsit: {
    name: "Wall sit", tag: "výdrž", type: "time", durs: [30, 45, 60, 90], dur: 45, unit: "",
    muscles: "Predné stehná",
    how: "Opri sa chrbtom o stenu a zíď dole, kým stehná nie sú vodorovne so zemou a kolená nezvierajú 90°. Chrbát celý na stene, kolená nad členkami. Drž.",
    tip: "Ruky nedávaj na stehná, inak si pomáhaš.",
    yt: "https://www.youtube.com/watch?v=6caT9GsL4TA",
  },
  birddog: {
    name: "Bird dog", tag: "ľahšie", type: "reps", start: 10, unit: "/stranu",
    muscles: "Stred tela, spodný chrbát, zadok",
    tempo: "vystri, 2 s podrž, späť",
    how: "Kľakni si na štyri: ruky pod ramenami, kolená pod bokmi. Vystri naraz pravú ruku dopredu a ľavú nohu dozadu, telo tvorí rovnú čiaru. Podrž 2 sekundy, vráť sa a vymeň strany.",
    tip: "Boky sa nesmú otáčať. Predstav si, že máš na krížoch pohár vody.",
    yt: "https://www.youtube.com/watch?v=DkPT1fR_B9A",
  },
  hollow: {
    name: "Hollow body hold", tag: "výdrž", type: "time", durs: [20, 30, 45], dur: 30, unit: "",
    muscles: "Celý stred tela",
    how: "Ľahni na chrbát, ruky vystri za hlavu. Spodok chrbta pritlač k zemi a zdvihni ramená aj vystreté nohy kúsok od zeme. Drž bez pohybu.",
    tip: "Ak sa ti driek odlepí od zeme, zdvihni nohy vyššie alebo ich pokrč.",
    yt: "https://www.youtube.com/watch?v=LlDNef_Ztsc",
  },
  legraise: {
    name: "Leg raise", tag: "podobné", type: "reps", start: 10, unit: "",
    muscles: "Spodné brucho, bedrové flexory",
    tempo: "2 s hore, 2 s dole",
    how: "Ľahni na chrbát, ruky vedľa tela. Vystreté nohy pomaly zdvihni do zvislej polohy a pomaly ich spúšťaj skoro k zemi, ale nepolož ich. Spodok chrbta ostáva na zemi.",
    tip: "Ak ťa bolí driek, pokrč kolená.",
    yt: "https://www.youtube.com/watch?v=JB2oyawG9KI",
  },
});
const ALT_GROUPS = [
  ["k1", "k3", "r1", "kIncl", "kKnee"],
  ["row1", "row2", "row3", "superman", "ytw"],
  ["n1", "n2", "n7", "lunge", "bridge", "wallsit"],
  ["b5", "b2", "b4", "birddog", "hollow", "legraise"],
];
function altsFor(id, exclude) { const g = ALT_GROUPS.find(x => x.includes(id)) || []; return g.filter(x => x !== id && !exclude.includes(x)); }

// Every day: one push, one pull, one legs, one core.
const DAYS = [
  { id: "A", ids: ["k1", "row1", "n1", "b5"] },
  { id: "B", ids: ["r1", "row2", "n2", "b2"] },
  { id: "C", ids: ["k3", "row3", "n7", "b4"] },
];

// When every round last time hit "at", the app suggests the harder version.
const LEVEL_UP = {
  k1: { at: 25, text: "Polož ruky na dve hrubé knihy, aby hrudník išiel hlbšie. Čísla najprv klesnú, to je v poriadku." },
  row1: { at: 20, text: "Daj chodidlá bližšie k rámu a viac sa zakloň." },
  n1: { at: 20, text: "Rob drep 1 a 1/4: dole, štvrť cesty hore, znova úplne dole a až potom hore. To je 1 opakovanie." },
  b5: { at: 60, text: "Počas planku zdvihni jednu nohu, v polovici času nohy vymeň." },
  r1: { at: 15, text: "Polož nohy na stoličku." },
  row2: { at: 20, text: "Daj chodidlá bližšie k dverám a viac sa zakloň." },
  n2: { at: 15, text: "Spomaľ: 4 s dole a 2 s pauza dole." },
  b2: { at: 15, text: "Spúšťaj ruku a nohu pomalšie, 3 s tam a 3 s späť." },
  k3: { at: 20, text: "Polož nohy na stoličku." },
  row3: { at: 20, text: "Daj chodidlá bližšie k rámu a viac sa zakloň." },
  n7: { at: 15, text: "Rob ho jednou nohou, druhú drž vo vzduchu." },
  b4: { at: 25, text: "Spomaľ na 2 s na každú stranu." },
};

const WARMUP = [
  { id: "w1", name: "Kruhy rukami", dose: "15× dopredu, 15× dozadu", why: "Rozhýbe ramená pred klikmi a veslovaním.", yt: "https://www.youtube.com/watch?v=fxwa7edi4Y0" },
  { id: "w2", name: "Švihy nohou", dose: "10× každou nohou, drž sa steny", why: "Uvoľní bedrá pred drepmi.", yt: "https://www.youtube.com/watch?v=difYoBtZi2s" },
  { id: "w3", name: "World's greatest stretch", dose: "5× na každú stranu", why: "Bedrá, hrudný chrbát a zadné stehná naraz.", yt: "https://www.youtube.com/watch?v=A5H1IRn_pd4" },
  { id: "w4", name: "Inchworm", dose: "5×", why: "Prehreje celé telo a prejdeš ním do planku.", yt: "https://www.youtube.com/watch?v=aFkv2m9FTGs" },
];

const COOL = [
  { id: "c1", fig: "hf", name: "Bedrový flexor, ľavá", dur: 30, why: "Veľa sedíš (škola, počítač), takže predná strana bedra sa skracuje. Ak chceš robiť len jeden strečing, rob tento.", how: "Kľakni si na ľavé koleno, pravá noha vpredu. Zatni zadok a posuň boky dopredu, kým necítiš ťah vpredu na ľavom bedre. Neprehýbaj sa v krížoch.", yt: "https://www.youtube.com/watch?v=KT0HlPGCl6k" },
  { id: "c2", fig: "hf", name: "Bedrový flexor, pravá", dur: 30, why: "To isté na druhú stranu.", how: "Kľakni si na pravé koleno, ľavá noha vpredu. Zatni zadok a posuň boky dopredu.", yt: "https://www.youtube.com/watch?v=KT0HlPGCl6k" },
  { id: "c3", fig: "child", name: "Child's pose", dur: 30, why: "Upokojí dych a uvoľní chrbát. Je to čisto na pohodu.", how: "Kolená od seba, zadok si sadni na päty, ruky vystri čo najďalej pred seba, čelo na zem. Pomaly dýchaj.", yt: "https://www.youtube.com/watch?v=2MJGg-dUKh0" },
];

// History logged in chat before this version, so "Naposledy" works from day one.
const SEED_HISTORY = [];

const STORAGE_KEY = "domaci-trening-v1";
const REST_BETWEEN = 30;   // between exercises
const REST_ROUND = 60;     // after a full round

// ─── HELPERS ────────────────────────────────────────────────────────────────
const WD = ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"];
const pad = n => String(n).padStart(2, "0");
function dateKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function fmtDate(k, withYear) { const d = parseKey(k); return `${WD[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.${withYear ? ` ${d.getFullYear()}` : ""}`; }
function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
function fmtRes(r, unit) { if (r === null || r === undefined) return "–"; return typeof r === "number" ? `${r}${unit || ""}` : String(r); }

function buildSeq(dayId, rounds, swaps = {}) {
  const day = DAYS.find(d => d.id === dayId);
  const seq = [];
  for (let r = 0; r < rounds; r++) day.ids.forEach(slot => seq.push({ id: swaps[slot] || slot, slot, r }));
  return seq;
}
function lastFor(history, id) {
  for (let i = history.length - 1; i >= 0; i--) {
    const it = history[i].items.find(x => x.id === id && x.res.some(v => v !== null && v !== undefined));
    if (it) return { date: history[i].date, res: it.res };
  }
  return null;
}
const numVal = v => (typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN);
function bestFor(history, id) {
  let b = null;
  history.forEach(sess => sess.items.forEach(it => {
    if (it.id !== id) return;
    it.res.forEach(v => { const n = numVal(v); if (!isNaN(n) && (b === null || n > b)) b = n; });
  }));
  return b;
}
function levelUpFor(history, id) {
  const lu = LEVEL_UP[id];
  const l = lastFor(history, id);
  if (!lu || !l) return null;
  const nums = l.res.map(numVal).filter(n => !isNaN(n));
  return nums.length && Math.min(...nums) >= lu.at ? lu.text : null;
}
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
function plural(n, one, few, many) { return n === 1 ? one : n >= 2 && n <= 4 ? few : many; }

// XP: 10 per set, 25 per personal record, 10 for full warm-up, 10 for cool-down.
function setsIn(e) { return e.items.reduce((a, it) => a + it.res.filter(v => v !== null && v !== undefined).length, 0); }
function xpFor(e) { return 10 * setsIn(e) + 25 * ((e.prs && e.prs.length) || 0) + (e.warm ? 10 : 0) + (e.cool ? 10 : 0); }
function totalXP(h) { return h.reduce((a, e) => a + xpFor(e), 0) + challengeXP(h); }
function levelInfo(xp) { let lvl = 1, need = 100, rest = xp; while (rest >= need) { rest -= need; lvl++; need += 50; } return { lvl, into: rest, need }; }
// Streak for an every-other-day plan: it holds while no gap is longer than 2 days.
// META (from the profile) holds freeze days that bridge a gap and a manual reset time.
let META = { freezeDays: [], streakResetTs: 0 };
function entryTs(e) { return e.ts || parseKey(e.date).getTime() + 12 * 3600000; }
function streakInfo(history, today) {
  const train = new Set(history.filter(e => entryTs(e) > (META.streakResetTs || 0)).map(e => e.date));
  const resetDay = META.streakResetTs ? dateKey(new Date(META.streakResetTs)) : "";
  const frozen = (META.freezeDays || []).filter(k => k > resetDay);
  const dates = [...new Set([...train, ...frozen])].sort();
  if (!dates.length) return { n: 0, gap: null };
  let n = train.has(dates[dates.length - 1]) ? 1 : 0;
  for (let i = dates.length - 1; i > 0; i--) {
    if (daysBetween(dates[i - 1], dates[i]) <= 2) { if (train.has(dates[i - 1])) n++; } else break;
  }
  const gap = daysBetween(dates[dates.length - 1], today);
  return { n: gap <= 2 ? n : 0, gap, frozenToday: frozen.includes(today) };
}

// ─── WEEKLY CHALLENGES ──────────────────────────────────────────────────────
// Each week (Mon–Sun) has 3 challenges: "3 trainings" + 2 rotating ones.
// Completing all 3 also earns a 🧊 streak freeze. XP is derived from history.
function weekKey(k) { const d = parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); }
function sumReps(w, ids) { return w.reduce((a, e) => a + e.items.filter(it => !ids || ids.includes(it.id)).reduce((b, it) => b + it.res.reduce((c, v) => c + (typeof v === "number" ? v : 0), 0), 0), 0); }
const CH_BASE = { id: "w3", icon: "📅", text: "Odcvič 3 tréningy", goal: 3, xp: 50, val: w => w.length };
const CH_POOL = [
  { id: "pr1", icon: "🏆", text: "Prekonaj osobný rekord", goal: 1, xp: 40, val: w => w.reduce((a, e) => a + ((e.prs && e.prs.length) || 0), 0) },
  { id: "r3", icon: "💪", text: "Odcvič raz 3 kolá", goal: 1, xp: 40, val: w => w.filter(e => e.rounds === 3).length },
  { id: "warm", icon: "🔥", text: "2× celé zahriatie", goal: 2, xp: 30, val: w => w.filter(e => e.warm).length },
  { id: "cool", icon: "🧘", text: "2× strečing po tréningu", goal: 2, xp: 30, val: w => w.filter(e => e.cool).length },
  { id: "push100", icon: "🦾", text: "100 klikov spolu (všetky druhy)", goal: 100, xp: 50, val: w => sumReps(w, ["k1", "k3", "r1", "kKnee", "kIncl"]) },
  { id: "rank", icon: "🎖️", text: "Získaj nový rank", goal: 1, xp: 60, val: w => w.reduce((a, e) => a + ((e.rankUps && e.rankUps.length) || 0), 0) },
  { id: "reps300", icon: "📈", text: "300 opakovaní spolu", goal: 300, xp: 40, val: w => sumReps(w, null) },
  { id: "legs100", icon: "🦵", text: "100 opakovaní na nohy", goal: 100, xp: 40, val: w => sumReps(w, ["n1", "n2", "n7", "lunge", "bridge"]) },
];
function challengesFor(wk) {
  const seed = Math.round(parseKey(wk).getTime() / 604800000);
  const a = ((seed % CH_POOL.length) + CH_POOL.length) % CH_POOL.length;
  let b = (((seed * 5 + 3) % CH_POOL.length) + CH_POOL.length) % CH_POOL.length;
  if (b === a) b = (b + 1) % CH_POOL.length;
  return [CH_BASE, CH_POOL[a], CH_POOL[b]];
}
function challengeStatus(history, wk) {
  const w = history.filter(e => weekKey(e.date) === wk);
  return challengesFor(wk).map(c => { const v = c.val(w); return { id: c.id, icon: c.icon, text: c.text, goal: c.goal, xp: c.xp, v: Math.min(v, c.goal), done: v >= c.goal }; });
}
function challengeXP(history) {
  const wks = [...new Set(history.map(e => weekKey(e.date)))];
  return wks.reduce((a, wk) => a + challengeStatus(history, wk).filter(c => c.done).reduce((b, c) => b + c.xp, 0), 0);
}
function freezesAvailable(history) {
  const wks = [...new Set(history.map(e => weekKey(e.date)))];
  const earned = wks.filter(wk => challengeStatus(history, wk).every(c => c.done)).length + 1; // 1 free to start
  return Math.max(0, Math.min(2, earned - (META.freezeDays || []).length));
}
// Motivation. Quote of the day rotates by date; rest tips and finish lines are random.
const QUOTES = [
  "Disciplína ťa dovedie tam, kam motivácia nedočiahne.",
  "Nemusíš mať chuť. Stačí spraviť prvú sériu, zvyšok príde sám.",
  "Každé opakovanie je tehla. Postava sa stavia tehlu po tehle.",
  "13 minút dnes. Telo na celý život.",
  "Nikdy nevynechaj dvakrát po sebe.",
  "Malé kroky obdeň porazia veľké plány, ktoré nikdy nezačneš.",
  "Tvoje budúce ja ti poďakuje za dnešok.",
  "Nejde o dokonalý tréning. Ide o to, že prídeš.",
  "Tam, kde to začne páliť, sa začína rast.",
  "Svaly sa budujú cvičením, ale rastú jedlom a spánkom.",
  "Porovnávaj sa len so sebou z minulého týždňa.",
  "Kým ostatní hľadajú motiváciu, ty už máš odcvičené.",
  "Ťažké série, ľahší život.",
  "Každý silák raz začínal od nuly.",
];
const REST_TIPS = [
  "Napi sa vody.",
  "Dýchaj pomaly: nosom dnu, ústami von.",
  "Potras rukami a uvoľni ramená.",
  "Pri ďalšom cviku mysli na pomalé spúšťanie, 3 sekundy.",
  "Uvoľni čeľusť a ramená, nech nie si zbytočne stiahnutý.",
  "Postav sa a prejdi sa po izbe.",
];
const FINISH_LINES = [
  "Ďalšia tehla v stene. Takto sa to robí.",
  "Odcvičené. Teraz sa poriadne najedz a vyspi, vtedy svaly rastú.",
  "Sila nie je talent. Je to súčet presne takýchto dní.",
  "Hotovo. Toto je disciplína v praxi.",
  "Dnes si spravil to, čo väčšina len plánuje.",
];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function quoteOfDay(k) { return QUOTES[Math.floor(parseKey(k).getTime() / 86400000) % QUOTES.length]; }

const CHEERS = ["Silná séria!", "Tak sa to robí!", "Makáš!", "Ide ti to!", "Čistá práca!", "Toto je cesta k silnému telu.", "Ešte kúsok!"];

function nextDayIdx(history) {
  if (!history.length) return 0;
  const i = DAYS.findIndex(d => d.id === history[history.length - 1].day);
  return i < 0 ? 0 : (i + 1) % DAYS.length;
}
function logText(entry) {
  const head = `Deň ${entry.day}, ${fmtDate(entry.date, true)}`;
  const lines = entry.items.map(it => `${it.name}: ${it.res.map((r, i) => `${i + 1}. ${fmtRes(r, it.unit)}`).join("  ")}`);
  return [head, ...lines].join("\n");
}

// Storage: Claude's artifact storage when available, otherwise the browser's
// localStorage (GitHub Pages / home-screen app). Data stays on the device.
const store = {
  async get(k) {
    if (window.storage && window.storage.get) { try { const r = await window.storage.get(k); return r ? r.value : null; } catch (_) { return null; } }
    try { return window.localStorage.getItem(k); } catch (_) { return null; }
  },
  async set(k, v) {
    if (window.storage && window.storage.set) { try { await window.storage.set(k, v); } catch (_) {} return; }
    try { window.localStorage.setItem(k, v); } catch (_) {}
  },
};
async function saveAll(st) { await store.set(STORAGE_KEY, JSON.stringify(st)); }
async function loadAll() { try { const v = await store.get(STORAGE_KEY); if (v) return JSON.parse(v); } catch (_) {} return null; }

// Wall-clock countdown: survives the phone throttling timers in background.
function useCountdown(endAt, onEnd, onTick) {
  const calc = () => (endAt ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  const endRef = useRef(onEnd); endRef.current = onEnd;
  const tickRef = useRef(onTick); tickRef.current = onTick;
  useEffect(() => {
    if (!endAt) { setLeft(0); return; }
    let last = Math.ceil((endAt - Date.now()) / 1000);
    setLeft(Math.max(0, last));
    let fired = false;
    const iv = setInterval(() => {
      const s = Math.ceil((endAt - Date.now()) / 1000);
      if (s !== last) {
        last = s;
        setLeft(Math.max(0, s));
        if (s > 0 && tickRef.current) tickRef.current(s);
      }
      if (s <= 0 && !fired) { fired = true; clearInterval(iv); if (endRef.current) endRef.current(); }
    }, 200);
    return () => clearInterval(iv);
  }, [endAt]);
  return left;
}

function useWakeLock() {
  useEffect(() => {
    let lock = null;
    const get = async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch (_) {} };
    const onVis = () => { if (document.visibilityState === "visible") get(); };
    get();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); try { lock?.release(); } catch (_) {} };
  }, []);
}

// ─── EXERCISE ILLUSTRATIONS ────────────────────────────────────────────────
// Original stick-figure drawings built from joint positions. Lengths are fixed
// and elbows/knees are solved with 2-bone IK, so proportions stay consistent.
const FL = { torso: 26, neck: 4, head: 7, ua: 15, fa: 14, th: 20, sh: 20 };
const GROUND = 94;
const rad = d => (d * Math.PI) / 180;
const dirv = (p, ang, len) => [p[0] + len * Math.cos(rad(ang)), p[1] + len * Math.sin(rad(ang))];
function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 0.001;
  if (d >= l1 + l2 - 0.01) {
    const k = l1 / d, k2 = (l1 + l2) / d;
    return { mid: [a[0] + dx * k, a[1] + dy * k], end: [a[0] + dx * k2, a[1] + dy * k2] };
  }
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const px = a[0] + (dx * x) / d, py = a[1] + (dy * x) / d;
  return { mid: [px - (bend * h * dy) / d, py + (bend * h * dx) / d], end: b };
}
// Standing/leaning body from the feet: lean = degrees backwards from vertical (negative = forward).
function fromFeet(foot, lean) { const a = -90 - lean; return { hip: dirv(foot, a, FL.th + FL.sh), torso: a }; }

const FIGS = {
  k1: [
    { label: "Hore", hip: [50, 76.4], torso: -26, hands: [[73.4, GROUND], [75.4, GROUND]], armBend: [1, 1], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1] },
    { label: "Dole", hip: [50.3, 87.9], torso: -8.7, hands: [[72, GROUND], [74, GROUND]], armBend: [-1, -1], feet: [[10.8, GROUND], [12.8, GROUND]], legBend: [1, 1] },
  ],
  k3: [
    { label: "Hore", hip: [50, 76.4], torso: -26, hands: [[70, GROUND], [72, GROUND]], armBend: [1, 1], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1], props: [{ t: "diamond", x: 71, y: 89 }] },
    { label: "Dole, lakte k telu", hip: [50.3, 87.9], torso: -8.7, hands: [[70, GROUND], [72, GROUND]], armBend: [-1, -1], feet: [[10.8, GROUND], [12.8, GROUND]], legBend: [1, 1] },
  ],
  b5: [
    { label: "Správne: rovné telo", hip: [53, 86], torso: -12.5, hands: [[93, GROUND], [95, GROUND]], elbows: [[78, GROUND], [80, GROUND]], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1] },
    { label: "Zle: prehnutý driek", hip: [52, 92], torso: -26, hands: [[93, GROUND], [95, GROUND]], elbows: [[78, GROUND], [80, GROUND]], feet: [[14, GROUND], [16, GROUND]], legBend: [-1, -1], bad: true },
  ],
  n1: [
    { label: "Štart", hip: [58, 54], torso: -90, hands: [[84, 33], [86, 33]], armBend: [1, 1], feet: [[58, GROUND], [60, GROUND]], legBend: [1, 1] },
    { label: "Dole, päty na zemi", hip: [48, 82], torso: -58, hands: [[88, 58], [90, 58]], armBend: [1, 1], feet: [[60, GROUND], [62, GROUND]], legBend: [-1, -1] },
  ],
  r1: [
    { label: "Hore", hip: [50, 59.4], torso: 39, head: 50, hands: [[92.7, GROUND], [94.7, GROUND]], armBend: [-1, -1], feet: [[30, GROUND], [32, GROUND]], legBend: [1, 1] },
    { label: "Dole, hlava pred ruky", hip: [55, 59], torso: 50, head: 62, hands: [[90, GROUND], [92, GROUND]], armBend: [-1, -1], feet: [[36, GROUND], [38, GROUND]], legBend: [1, 1] },
  ],
  row1: [
    { label: "Štart, ruka vystretá", ...fromFeet([86, GROUND], 17), hands: [[96, 41], [70, 62]], armBend: [-1, 1], feet: [[86, GROUND], [88, GROUND]], legBend: [1, 1], props: [{ t: "frame" }] },
    { label: "Pritiahni, lakeť dozadu", ...fromFeet([88, GROUND], 0), hands: [[96, 42], [80, 62]], armBend: [1, 1], feet: [[86, GROUND], [88, GROUND]], legBend: [1, 1], props: [{ t: "frame" }] },
  ],
  row3: [
    { label: "Štart, ruka vo výške ramena", ...fromFeet([86, GROUND], 17), hands: [[96, 36], [70, 62]], armBend: [-1, 1], feet: [[86, GROUND], [88, GROUND]], legBend: [1, 1], props: [{ t: "frame" }] },
    { label: "Lakeť do strany, vysoko", ...fromFeet([88, GROUND], 0), hands: [[96, 30], [80, 62]], armBend: [-1, 1], feet: [[86, GROUND], [88, GROUND]], legBend: [1, 1], props: [{ t: "frame" }] },
  ],
  row2: [
    { label: "Štart, ruky vystreté", ...fromFeet([84, GROUND], 30), hands: [[84, 52], [86, 52]], armBend: [-1, -1], feet: [[84, GROUND], [86, GROUND]], legBend: [1, 1], props: [{ t: "door" }, { t: "towel", from: [104, 56], to: [85, 52] }] },
    { label: "Hrudník k dverám", ...fromFeet([84, GROUND], 14), hands: [[90, 54], [92, 54]], armBend: [1, 1], feet: [[84, GROUND], [86, GROUND]], legBend: [1, 1], props: [{ t: "door" }, { t: "towel", from: [104, 56], to: [91, 54] }] },
  ],
  n2: [
    { label: "Hore", hip: [62, 54], torso: -88, hands: [[64, 74], [60, 74]], armBend: [1, 1], feet: [[80, GROUND], [30, 70]], legBend: [-1, 1], props: [{ t: "chair" }] },
    { label: "Dole, zadné koleno k zemi", hip: [58, 72], torso: -80, hands: [[60, 92], [56, 92]], armBend: [1, 1], feet: [[80, GROUND], [30, 70]], legBend: [-1, 1], props: [{ t: "chair" }] },
  ],
  b2: [
    { label: "Štart", hip: [42, 88], torso: 0, head: 0, hands: [[68, 60], [70, 60]], armBend: [1, 1], feet: [[22, 68], [24, 68]], legBend: [-1, -1], lying: true },
    { label: "Ruka a opačná noha dole", hip: [42, 88], torso: 0, head: 0, hands: [[95, 86], [70, 60]], armBend: [1, 1], feet: [[24, 68], [3, 86]], legBend: [-1, -1], lying: true },
  ],
  n7: [
    { label: "Boky hore, päty pri zadku", hip: [54, 72], torso: 30, head: 10, hands: [[66, GROUND], [68, GROUND]], armBend: [1, 1], feet: [[34, GROUND - 2], [36, GROUND - 2]], legBend: [-1, -1], props: [{ t: "towelFloor", x: 28 }] },
    { label: "Vysuň nohy, boky stále hore", hip: [50, 80], torso: 22, head: 10, hands: [[66, GROUND], [68, GROUND]], armBend: [1, 1], feet: [[12, GROUND - 2], [14, GROUND - 2]], legBend: [-1, -1], props: [{ t: "towelFloor", x: 6 }] },
  ],
  b4: [
    { label: "Lakeť k opačnému kolenu", hip: [44, 88], torso: -22, head: -40, hands: [[66, 68], [70, 66]], armBend: [-1, -1], feet: [[42, 64], [8, 82]], legBend: [-1, -1] },
    { label: "Vymeň strany", hip: [44, 88], torso: -22, head: -40, hands: [[70, 66], [66, 68]], armBend: [-1, -1], feet: [[8, 82], [42, 64]], legBend: [-1, -1] },
  ],
  kKnee: [
    { label: "Hore, kolená na zemi", hip: [51.5, 81.4], torso: -39, hands: [[72, GROUND], [74, GROUND]], armBend: [1, 1], feet: [[18, 80], [20, 80]], legBend: [-1, -1] },
    { label: "Dole", hip: [55.5, 89.6], torso: -12.6, hands: [[78, GROUND], [80, GROUND]], armBend: [-1, -1], feet: [[20, 82], [22, 82]], legBend: [-1, -1] },
  ],
  kIncl: [
    { label: "Ruky na stole, hore", hip: [44.6, 68.3], torso: -40, hands: [[84, 72], [86, 72]], armBend: [1, 1], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1], props: [{ t: "table" }] },
    { label: "Hrudník k hrane", hip: [48.6, 74], torso: -30, hands: [[84, 72], [86, 72]], armBend: [-1, -1], feet: [[14, GROUND], [16, GROUND]], legBend: [1, 1], props: [{ t: "table" }] },
  ],
  superman: [
    { label: "Ľahni na brucho", hip: [46, 89], torso: 0, head: -8, hands: [[100, 90], [102, 90]], armBend: [1, 1], feet: [[6, 91], [8, 91]], legBend: [1, 1] },
    { label: "Zdvihni a podrž 2 s", hip: [46, 89], torso: -12, head: -22, hands: [[98, 74], [100, 74]], armBend: [1, 1], feet: [[8, 80], [10, 80]], legBend: [1, 1] },
  ],
  ytw: [
    { label: "Y: ruky dopredu hore", hip: [40, 89], torso: -8, head: -14, hands: [[94, 76], [96, 76]], armBend: [1, 1], feet: [[2, 91], [4, 91]], legBend: [1, 1] },
    { label: "W: lakte k rebrám", hip: [40, 89], torso: -8, head: -14, hands: [[72, 80], [74, 80]], armBend: [1, 1], feet: [[2, 91], [4, 91]], legBend: [1, 1] },
  ],
  lunge: [
    { label: "Štart", hip: [58, 54], torso: -90, hands: [[60, 80], [56, 80]], armBend: [1, 1], feet: [[58, GROUND], [60, GROUND]], legBend: [-1, -1] },
    { label: "Krok dozadu, koleno k zemi", hip: [56, 72], torso: -88, hands: [[58, 98], [54, 98]], armBend: [1, 1], feet: [[76, GROUND], [24, GROUND - 2]], legBend: [-1, 1] },
  ],
  bridge: [
    { label: "Ľahni, kolená pokrčené", hip: [46, 89], torso: 0, head: 0, hands: [[44, 92], [46, 92]], armBend: [1, 1], feet: [[28, GROUND], [30, GROUND]], legBend: [1, 1] },
    { label: "Boky hore, stlač zadok", hip: [48, 72], torso: 35, head: 10, hands: [[42, 93], [44, 93]], armBend: [1, 1], feet: [[28, GROUND], [30, GROUND]], legBend: [1, 1] },
  ],
  wallsit: [
    { label: "Stehná vodorovne, chrbát na stene", hip: [30, 70], torso: -90, hands: [[38, 92], [36, 92]], armBend: [1, 1], feet: [[50, GROUND], [52, GROUND]], legBend: [-1, -1], props: [{ t: "wall" }] },
  ],
  birddog: [
    { label: "Na štyroch", hip: [40, 74], torso: -20.3, hands: [[64, GROUND], [66, GROUND]], armBend: [1, 1], feet: [[20, GROUND], [22, GROUND]], legBend: [1, 1] },
    { label: "Ruka a opačná noha", hip: [40, 74], torso: -20.3, hands: [[94, 62], [66, GROUND]], armBend: [1, 1], feet: [[20, GROUND], [2, 70]], legBend: [1, 1] },
  ],
  hollow: [
    { label: "Driek pritlačený k zemi", hip: [50, 89], torso: -14, head: -24, hands: [[104, 72], [106, 72]], armBend: [1, 1], feet: [[12, 80], [14, 80]], legBend: [1, 1] },
  ],
  legraise: [
    { label: "Nohy hore", hip: [50, 89], torso: 0, head: 0, hands: [[48, 92], [50, 92]], armBend: [1, 1], feet: [[50, 49], [52, 49]], legBend: [1, 1] },
    { label: "Pomaly dole, nepoložiť", hip: [50, 89], torso: 0, head: 0, hands: [[48, 92], [50, 92]], armBend: [1, 1], feet: [[11, 84], [13, 84]], legBend: [1, 1] },
  ],
  hf: [
    { label: "Zadné koleno na zemi, boky dopredu", hip: [56, 76], torso: -92, hands: [[60, 80], [56, 80]], armBend: [1, 1], feet: [[84, GROUND], [24, GROUND]], legBend: [-1, -1] },
  ],
  child: [
    { label: "Zadok na päty, ruky ďaleko pred seba", hip: [32, 84], torso: 0, head: 18, hands: [[86, GROUND], [88, GROUND]], armBend: [1, 1], feet: [[30, GROUND], [32, GROUND]], legBend: [-1, -1] },
  ],
};

function Stick({ p }) {
  const shoulder = dirv(p.hip, p.torso, FL.torso);
  const headC = dirv(shoulder, p.head ?? p.torso, FL.neck + FL.head);
  const near = C.chalk, far = "#6f80aa";
  const parts = [];
  [1, 0].forEach(i => {
    const col = i === 0 ? near : far;
    let elbow, hand;
    if (p.elbows) { elbow = p.elbows[i]; hand = p.hands[i]; }
    else { const a = ik(shoulder, p.hands[i], FL.ua, FL.fa, p.armBend[i]); elbow = a.mid; hand = a.end; }
    const lg = ik(p.hip, p.feet[i], FL.th, FL.sh, p.legBend[i]);
    parts.push({ i, col, pts: [p.hip, lg.mid, lg.end] });
    parts.push({ i, col, pts: [shoulder, elbow, hand] });
  });
  const line = pts => pts.map(q => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
  return (
    <g strokeLinecap="round" strokeLinejoin="round" fill="none">
      {parts.filter(x => x.i === 1).map((x, k) => <polyline key={`f${k}`} points={line(x.pts)} stroke={x.col} strokeWidth="5" />)}
      <polyline points={line([p.hip, shoulder])} stroke={near} strokeWidth="6" />
      <circle cx={headC[0]} cy={headC[1]} r={FL.head} fill={near} stroke="none" />
      {parts.filter(x => x.i === 0).map((x, k) => <polyline key={`n${k}`} points={line(x.pts)} stroke={x.col} strokeWidth="5" />)}
    </g>
  );
}

function Prop({ pr }) {
  const s = { stroke: C.sky, strokeWidth: 3, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  if (pr.t === "frame") return <g><rect x="97" y="6" width="7" height="90" {...s} /><line x1="104" y1="6" x2="118" y2="6" {...s} /></g>;
  if (pr.t === "door") return <g><rect x="102" y="10" width="5" height="86" {...s} /><circle cx="104.5" cy="56" r="2.5" fill={C.sky} /></g>;
  if (pr.t === "towel") return <line x1={pr.from[0]} y1={pr.from[1]} x2={pr.to[0]} y2={pr.to[1]} stroke={C.signal} strokeWidth="3" strokeLinecap="round" />;
  if (pr.t === "chair") return <g {...s}><line x1="8" y1="72" x2="36" y2="72" /><line x1="10" y1="72" x2="10" y2="96" /><line x1="34" y1="72" x2="34" y2="96" /><line x1="10" y1="72" x2="10" y2="44" /></g>;
  if (pr.t === "table") return <g {...s}><line x1="80" y1="74" x2="118" y2="74" /><line x1="84" y1="74" x2="84" y2="96" /><line x1="114" y1="74" x2="114" y2="96" /></g>;
  if (pr.t === "wall") return <line x1="20" y1="4" x2="20" y2="96" {...s} strokeWidth="4" />;
  if (pr.t === "towelFloor") return <rect x={pr.x} y={GROUND} width="14" height="3" rx="1" fill={C.signal} />;
  if (pr.t === "diamond") return <path d={`M${pr.x} ${pr.y - 5} L${pr.x + 5} ${pr.y} L${pr.x} ${pr.y + 5} L${pr.x - 5} ${pr.y} Z`} stroke={C.signal} strokeWidth="2" fill="none" />;
  return null;
}

function ExFigure({ id }) {
  const poses = FIGS[id];
  if (!poses) return null;
  return (
    <div style={{ display: "flex", gap: 8, margin: "4px 0 14px", justifyContent: "center" }} role="img" aria-label={`Obrázok: ${poses.map(p => p.label).join(", ")}`}>
      {poses.map((p, i) => (
        <div key={i} style={{ flex: poses.length > 1 ? 1 : "0 1 62%", background: C.ink, border: `1.5px solid ${p.bad ? "#ff8a80" : C.line}`, borderRadius: 14, padding: "6px 4px 8px", textAlign: "center" }}>
          <svg viewBox="0 0 120 100" style={{ width: "100%", height: "auto", display: "block" }}>
            <line x1="0" y1={GROUND + 3} x2="120" y2={GROUND + 3} stroke={C.line} strokeWidth="2" />
            {(p.props || []).map((pr, k) => <Prop key={k} pr={pr} />)}
            <Stick p={p} />
          </svg>
          <div style={{ fontSize: 12, fontWeight: 600, color: p.bad ? "#ff8a80" : C.dim, marginTop: 4, lineHeight: 1.3 }}>{poses.length > 1 ? `${i + 1}. ` : ""}{p.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── RANKS ──────────────────────────────────────────────────────────────────
// Per-exercise rank from your best single set ever (strict form + tempo).
// Thresholds = Železo, Bronz, Striebro, Zlato, Platina, Diamant.
// First ranks come fast; Diamant is elite (e.g. 50 slow push-ups in one set).
const RANKS = [
  { name: "Drevo", icon: "🪵", color: "#c08a55" },
  { name: "Železo", icon: "⚙️", color: "#9aa5b8" },
  { name: "Bronz", icon: "🥉", color: "#e0955a" },
  { name: "Striebro", icon: "🥈", color: "#cfd8ea" },
  { name: "Zlato", icon: "🥇", color: "#ffd23f" },
  { name: "Platina", icon: "💠", color: "#6fe3d8" },
  { name: "Diamant", icon: "💎", color: "#9fd8ff" },
];
const RANK_AT = {
  k1: [5, 10, 18, 25, 35, 50], k3: [4, 8, 12, 18, 25, 35], r1: [4, 8, 12, 16, 22, 30],
  row1: [6, 10, 14, 18, 24, 30], row2: [5, 8, 12, 16, 20, 28], row3: [6, 10, 14, 18, 24, 30],
  n1: [8, 12, 18, 25, 35, 50], n2: [5, 8, 12, 16, 20, 30], n7: [4, 6, 10, 14, 18, 25],
  b5: [20, 30, 45, 60, 90, 180], b2: [5, 8, 12, 15, 20, 30], b4: [8, 12, 16, 20, 30, 40],
};
function rankIdx(id, best) {
  const at = RANK_AT[id];
  if (!at || best === null || best === undefined || isNaN(best)) return 0;
  let r = 0; at.forEach((v, i) => { if (best >= v) r = i + 1; });
  return r;
}
function rankNext(id, best) {
  const at = RANK_AT[id]; const r = rankIdx(id, best);
  if (!at || r >= at.length) return null;
  return { rank: RANKS[r + 1], need: at[r] - (best || 0), at: at[r] };
}
function RankBadge({ id, best, small }) {
  if (!RANK_AT[id]) return null;
  const r = RANKS[rankIdx(id, best)];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: small ? 12 : 13, fontWeight: 700, color: r.color, border: `1.5px solid ${r.color}55`, borderRadius: 99, padding: small ? "1px 8px" : "3px 10px", whiteSpace: "nowrap" }}>
      <span aria-hidden="true">{r.icon}</span>{r.name}
    </span>
  );
}
function RankLadder({ id, best }) {
  const at = RANK_AT[id]; if (!at) return null;
  const cur = rankIdx(id, best);
  const unit = EX[id].type === "time" ? " s" : EX[id].unit || "";
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontWeight: 700, color: C.chalk, marginBottom: 8 }}>Ranky (najlepšia séria{best !== null ? `: ${best}${unit}` : ": zatiaľ žiadna"})</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {RANKS.map((r, i) => (
          <div key={r.name} style={{ border: `1.5px solid ${i === cur ? r.color : C.line}`, background: i === cur ? `${r.color}22` : "transparent", borderRadius: 10, padding: "6px 4px", textAlign: "center", opacity: i > cur ? 0.6 : 1 }}>
            <div style={{ fontSize: 18 }}>{r.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.name}</div>
            <div style={{ fontSize: 11, color: C.dim }}>{i === 0 ? "štart" : `${at[i - 1]}${unit}+`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SHARED UI ──────────────────────────────────────────────────────────────
const btnBase = { border: "none", cursor: "pointer", fontFamily: BODY, fontWeight: 700, borderRadius: 14 };
const EDGE = { [C.signal]: "#c29300", [C.chalk]: "#8e9cc2", [C.panelHi]: "#0f2147", [C.mint]: "#2b9e66", "#e62117": "#9b120c" };
const bigBtn = (bg, fg) => ({ ...btnBase, width: "100%", padding: "17px 16px", fontSize: 16, background: bg, color: fg, "--e": EDGE[bg] || "transparent" });
const ghostBtn = { ...btnBase, background: "transparent", color: C.dim, border: `1.5px solid ${C.line}`, padding: "10px 14px", fontSize: 13 };

function openYT(url) { try { window.open(url, "_blank"); } catch (_) {} }

function Sheet({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(5,10,24,0.82)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.panel, borderRadius: 22, padding: "22px 20px 26px", width: "100%", maxWidth: 460, border: `1px solid ${C.line}`, maxHeight: "82vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, lineHeight: 1, color: C.chalk }}>{title}</div>
          <button onClick={onClose} aria-label="Zavrieť" style={{ ...btnBase, background: C.panelHi, color: C.dim, padding: "7px 12px", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ fontSize: 15, color: "#cdd6f0", lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  );
}

function HowTo({ id, history, onClose }) {
  const ex = EX[id];
  const best = bestFor(history, id);
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <div style={{ color: C.dim, fontSize: 13, marginBottom: 10 }}>{ex.muscles}</div>
      <ExFigure id={id} />
      {ex.tempo && <div style={{ background: C.panelHi, borderRadius: 12, padding: "10px 13px", marginBottom: 14, fontSize: 14 }}><b style={{ color: C.signal }}>Tempo:</b> {ex.tempo}</div>}
      <div>{ex.how}</div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, color: C.chalk }}>💡 {ex.tip}</div>
      <button onClick={() => openYT(ex.yt)} className="b3d" style={{ ...bigBtn("#e62117", "#fff"), marginTop: 16, fontSize: 14, padding: 14 }}>▶ Video na YouTube</button>
      <RankLadder id={id} best={best} />
    </Sheet>
  );
}

function Ring({ value, total, size, color, children }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const pct = total ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.panelHi} strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset .25s linear" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function Confetti({ count = 70 }) {
  const [pieces] = useState(() => Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    dx: `${Math.round((Math.random() * 2 - 1) * 120)}px`,
    rot: `${Math.round(Math.random() * 720 - 360)}deg`,
    dur: `${(1.8 + Math.random() * 1.6).toFixed(2)}s`,
    delay: `${(Math.random() * 0.5).toFixed(2)}s`,
    color: [C.signal, C.mint, C.sky, "#ff7ab6", C.chalk][i % 5],
    round: i % 3 === 0,
  })));
  const [show, setShow] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShow(false), 4200); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 90 }}>
      {pieces.map((p, i) => (
        <span key={i} className="conf" style={{ left: `${p.left}%`, background: p.color, borderRadius: p.round ? 99 : 2, "--dx": p.dx, "--rot": p.rot, "--dur": p.dur, "--delay": p.delay }} />
      ))}
    </div>
  );
}

const chip = color => ({ display: "flex", alignItems: "center", gap: 4, fontFamily: DISPLAY, fontWeight: 800, fontSize: 20, color, padding: "2px 10px", border: `1.5px solid ${C.line}`, borderRadius: 99 });

// ─── PROFILE / STATS HELPERS ────────────────────────────────────────────────
const PROFILE_KEY = "domaci-trening-v1-profile";
async function loadProfile() { try { const v = await store.get(PROFILE_KEY); if (v) return JSON.parse(v); } catch (_) {} return null; }
async function saveProfile(p) { await store.set(PROFILE_KEY, JSON.stringify(p)); }
// Square-crop + shrink the picked photo to 256 px so it stores small.
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 256, c = document.createElement("canvas");
        c.width = S; c.height = S;
        const m = Math.min(img.width, img.height);
        c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
        resolve(c.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = fr.result;
    };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}
// Best set for an exercise up to and including session index i (rank "at that time").
function bestUntil(history, id, i) { return bestFor(history.slice(0, i + 1), id); }
function bestStreak(history) {
  const dates = [...new Set(history.map(h => h.date))].sort();
  let best = dates.length ? 1 : 0, run = 1;
  for (let i = 1; i < dates.length; i++) { run = daysBetween(dates[i - 1], dates[i]) <= 2 ? run + 1 : 1; best = Math.max(best, run); }
  return best;
}
function totalReps(history) {
  return history.reduce((a, e) => a + e.items.reduce((b, it) => b + it.res.reduce((c, v) => c + (typeof v === "number" ? v : 0), 0), 0), 0);
}
function achievements(history) {
  const n = history.length;
  const bs = bestStreak(history);
  const prs = history.reduce((a, e) => a + ((e.prs && e.prs.length) || 0), 0);
  const maxRank = Math.max(0, ...Object.keys(RANK_AT).map(id => rankIdx(id, bestFor(history, id))));
  const lvl = levelInfo(totalXP(history)).lvl;
  const push = bestFor(history, "k1") || 0;
  return [
    { icon: "🎯", name: "Prvý krok", desc: "1. tréning", ok: n >= 1 },
    { icon: "🖐️", name: "Päťka", desc: "5 tréningov", ok: n >= 5 },
    { icon: "🔟", name: "Desiatka", desc: "10 tréningov", ok: n >= 10 },
    { icon: "🏅", name: "Štvrťstovka", desc: "25 tréningov", ok: n >= 25 },
    { icon: "🏆", name: "Päťdesiatka", desc: "50 tréningov", ok: n >= 50 },
    { icon: "🔥", name: "Rozbehnutý", desc: "Séria 3", ok: bs >= 3 },
    { icon: "⚡", name: "Nezastaviteľný", desc: "Séria 7", ok: bs >= 7 },
    { icon: "🌋", name: "Disciplína", desc: "Séria 15", ok: bs >= 15 },
    { icon: "📈", name: "Rekordman", desc: "1. osobný rekord", ok: prs >= 1 },
    { icon: "🥇", name: "Zlatý", desc: "Zlato v 1 cviku", ok: maxRank >= 4 },
    { icon: "💎", name: "Diamantový", desc: "Diamant v 1 cviku", ok: maxRank >= 6 },
    { icon: "✅", name: "Týždeň na 100 %", desc: "Všetky 3 výzvy", ok: [...new Set(history.map(e => weekKey(e.date)))].some(wk => challengeStatus(history, wk).every(c => c.done)) },
    { icon: "⭐", name: "Level 5", desc: "Dosiahni level 5", ok: lvl >= 5 },
    { icon: "💪", name: "Tri kolá", desc: "Odcvič 3 kolá", ok: history.some(e => e.rounds === 3) },
    { icon: "🦾", name: "Tridsiatka", desc: "30 klikov v sérii", ok: push >= 30 },
  ];
}

function Avatar({ profile, size = 38 }) {
  const initial = (profile.name || "?").trim().charAt(0).toUpperCase() || "?";
  return profile.pfp ? (
    <img src={profile.pfp} alt="Profilová fotka" style={{ width: size, height: size, borderRadius: 99, objectFit: "cover", display: "block", border: `2px solid ${C.signal}` }} />
  ) : (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: 99, background: C.signal, color: C.signalInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontWeight: 900, fontSize: size * 0.55 }}>{initial}</div>
  );
}

const sectionTitle = { fontFamily: DISPLAY, fontSize: 28, fontWeight: 900, color: C.chalk, margin: "26px 0 10px" };
const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18 };

// ─── TOP BAR + TAB BAR ──────────────────────────────────────────────────────
function TopBar({ tab, history, profile, onProfile }) {
  const today = dateKey();
  const st = streakInfo(history, today);
  const lv = levelInfo(totalXP(history));
  const title = tab === "train" ? "Tréning" : tab === "history" ? "História" : "Profil";
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, background: `${C.ink}ee`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, lineHeight: 1, color: C.chalk }}>{title}</div>
          <div style={{ fontSize: 12, color: C.dim, textTransform: "capitalize", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fmtDate(today, true)}</div>
        </div>
        <div style={chip(st.n ? "#ffa94d" : C.dim)} aria-label={`Séria ${st.n}`}><span className={st.n ? "wiggle" : ""}>🔥</span>{st.n}</div>
        <div style={chip(C.sky)} aria-label={`Level ${lv.lvl}`}>⚡{lv.lvl}</div>
        <button onClick={onProfile} aria-label="Otvoriť profil" style={{ ...btnBase, background: "transparent", padding: 0, borderRadius: 99 }}>
          <Avatar profile={profile} size={38} />
        </button>
      </div>
    </div>
  );
}

function TabIcon({ name, active }) {
  const c = active ? C.signal : C.dim;
  const s = { fill: "none", stroke: c, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "train") return <svg width="26" height="26" viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" {...s} /></svg>;
  if (name === "history") return <svg width="26" height="26" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3" {...s} /><path d="M3.5 10h17M8 3v4M16 3v4" {...s} /><circle cx="12" cy="15" r="1.6" fill={c} stroke="none" /></svg>;
  return <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4" {...s} /><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" {...s} /></svg>;
}

function TabBar({ tab, setTab }) {
  const tabs = [["train", "Tréning"], ["history", "História"], ["profile", "Profil"]];
  return (
    <nav aria-label="Hlavné menu" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, background: `${C.panel}f2`, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: `1px solid ${C.line}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", display: "flex" }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => { if (tab !== id) sfxTap(); setTab(id); }} aria-current={tab === id ? "page" : undefined}
            style={{ ...btnBase, flex: 1, background: "transparent", padding: "8px 0 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: tab === id ? C.signal : C.dim, fontSize: 12, borderRadius: 0 }}>
            <span className={tab === id ? "pop" : ""} key={tab === id ? "on" : "off"} style={{ display: "inline-flex" }}><TabIcon name={id} active={tab === id} /></span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function ChallengesCard({ history }) {
  const wk = weekKey(dateKey());
  const list = challengeStatus(history, wk);
  const doneN = list.filter(c => c.done).length;
  const end = addDays(wk, 6);
  const left = daysBetween(dateKey(), end) + 1;
  return (
    <div style={{ ...card, padding: "14px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: C.chalk }}>Výzvy týždňa</div>
        <div style={{ fontSize: 12, color: C.dim }}>{doneN}/3, ešte {left} {plural(left, "deň", "dni", "dní")}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {list.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className={c.done ? "pop" : ""} style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: c.done ? C.mint : C.panelHi }}>{c.done ? "✓" : c.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: c.done ? C.mint : C.chalk }}>{c.text}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.done ? C.mint : C.sky, whiteSpace: "nowrap" }}>+{c.xp} XP</span>
              </div>
              <div style={{ height: 7, background: C.panelHi, borderRadius: 99, marginTop: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(c.v / c.goal) * 100}%`, background: c.done ? C.mint : C.sky, borderRadius: 99, transition: "width .6s ease-out" }} />
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{c.v} / {c.goal}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 10 }}>Splň všetky 3 a dostaneš 🧊 zamrazenie série.</div>
    </div>
  );
}

// ─── TAB 1: TRÉNING ─────────────────────────────────────────────────────────
function TrainTab({ history, onStart, onFreeze }) {
  const today = dateKey();
  const auto = nextDayIdx(history);
  const [dayIdx, setDayIdx] = useState(auto);
  const [rounds, setRounds] = useState(2);
  const [howEx, setHowEx] = useState(null);
  const last = history[history.length - 1];
  const gap = last ? daysBetween(last.date, today) : null;
  const day = DAYS[dayIdx];
  const st = streakInfo(history, today);

  const doneToday = !!last && gap <= 0;
  const nextIdeal = last ? addDays(last.date, 2) : today;
  let status = "Prvý tréning. Poďme na to.";
  if (last) {
    if (doneToday) status = nextIdeal <= today ? "Kedykoľvek budeš chcieť." : `Ideálne ${fmtDate(nextIdeal)}, lebo cvičíš obdeň.`;
    else if (gap === 1) status = `Včera si cvičil deň ${last.day}. Podľa plánu (obdeň) je ďalší tréning zajtra, ale ísť môžeš aj dnes.`;
    else if (gap === 2) status = `Dnes je tréningový deň. Ak dnes necvičíš, zajtra ti skončí séria 🔥 ${st.n}.`;
    else status = `Dnes je tréningový deň. Posledný tréning: ${fmtDate(last.date)} (pred ${gap} dňami).`;
  }

  const week = (() => {
    const t = parseKey(today);
    const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    const done = new Set(history.map(x => x.date));
    return ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((lb, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const k = dateKey(d);
      return { lb, k, on: done.has(k), isToday: k === today };
    });
  })();
  const weekCount = week.filter(w => w.on).length;

  return (
    <div className="scr" style={{ padding: "16px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
      {howEx && <HowTo id={howEx} history={history} onClose={() => setHowEx(null)} />}

      {doneToday && (
        <div style={{ background: "#173f3a", border: `1.5px solid ${C.mint}`, borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div className="pop" style={{ width: 46, height: 46, borderRadius: 99, background: C.mint, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, flexShrink: 0 }}>✓</div>
          <div>
            <div style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 900, lineHeight: 0.95, color: C.mint }}>Dnes si už cvičil</div>
            <div style={{ fontSize: 14, color: C.chalk, marginTop: 4, fontWeight: 600 }}>Deň {last.day} je hotový. Teraz jedz a spi, svaly rastú pri oddychu.</div>
            <div style={{ fontSize: 12, color: "#bfe9d4", marginTop: 4, lineHeight: 1.5 }}>{last.items.map(it => `${it.name} ${it.res.map(r => fmtRes(r, "")).join("/")}`).join(", ")}</div>
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div style={{ ...card, padding: "15px 16px", marginBottom: 16, borderColor: C.signal }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 900, color: C.signal, lineHeight: 1 }}>Vitaj! 👋</div>
          <div style={{ fontSize: 14, color: C.chalk, lineHeight: 1.55, marginTop: 8 }}>
            Cvičíš doma, bez náradia, asi 13 minút. Striedaš dni <b>A, B, C</b> a cvičíš obdeň.
            Každý tréning má zahriatie, potom 4 cviky dookola (2 alebo 3 kolá) a voliteľný strečing.
          </div>
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.55, marginTop: 8 }}>
            Ťukni na cvik a uvidíš obrázok, postup a video. Ak ti cvik nejde, počas tréningu ho vymeníš tlačidlom ⇄. Meno a fotku si nastav v Profile vpravo hore.
          </div>
        </div>
      )}

      <div style={{ padding: "4px 0 4px 14px", borderLeft: `4px solid ${C.signal}` }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 27, fontWeight: 800, lineHeight: 1.1, color: C.chalk }}>{quoteOfDay(today)}</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 16 }} aria-label={`Tento týždeň ${weekCount} ${plural(weekCount, "tréning", "tréningy", "tréningov")}`}>
        {week.map(w => (
          <div key={w.k} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: w.isToday ? C.chalk : C.dim, fontWeight: w.isToday ? 700 : 500, marginBottom: 4 }}>{w.lb}</div>
            <div style={{ height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900,
              background: w.on ? C.mint : "transparent", color: C.ink, border: `1.5px solid ${w.on ? C.mint : w.isToday ? C.chalk : C.line}` }}>{w.on ? "✓" : ""}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 6 }}>Tento týždeň {weekCount} {plural(weekCount, "tréning", "tréningy", "tréningov")}. Cieľ sú 3–4 (obdeň).</div>

      <div style={{ fontSize: 14, color: C.dim, marginTop: 22 }}>{doneToday ? "Ďalší tréning" : "Dnešný tréning"}</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: doneToday ? 72 : 96, lineHeight: 0.85, letterSpacing: -1, color: C.chalk, marginTop: 4 }}>
        Deň {day.id}
      </div>
      <div style={{ fontSize: 14, color: !doneToday && gap !== null && gap >= 2 ? C.signal : C.dim, marginTop: 10, lineHeight: 1.5 }}>{status}</div>
      {!doneToday && st.gap === 2 && st.n > 0 && !st.frozenToday && freezesAvailable(history) > 0 && (
        <button onClick={onFreeze} style={{ ...ghostBtn, marginTop: 10, color: C.sky, borderColor: C.sky }}>🧊 Dnes nemôžem: použiť zamrazenie ({freezesAvailable(history)})</button>
      )}
      {st.frozenToday && <div style={{ fontSize: 13, color: C.sky, marginTop: 8 }}>🧊 Dnešok je zamrazený, séria je v bezpečí.</div>}

      <div role="radiogroup" aria-label="Vyber deň" style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {DAYS.map((d, i) => (
          <button key={d.id} role="radio" aria-checked={i === dayIdx} onClick={() => { sfxTap(); setDayIdx(i); }}
            style={{ ...btnBase, flex: 1, padding: "10px 0", fontFamily: DISPLAY, fontSize: 22, fontWeight: 800,
              background: i === dayIdx ? C.chalk : "transparent", color: i === dayIdx ? C.ink : C.dim,
              border: `1.5px solid ${i === dayIdx ? C.chalk : C.line}` }}>
            {d.id}{i === auto && <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 600, marginLeft: 5, verticalAlign: "middle" }}>na rade</span>}
          </button>
        ))}
      </div>

      <div style={{ ...card, marginTop: 18 }}>
        {day.ids.map((id, i) => {
          const ex = EX[id];
          const l = lastFor(history, id);
          const b = bestFor(history, id);
          const n = rankNext(id, b);
          return (
            <button key={id} onClick={() => setHowEx(id)}
              style={{ ...btnBase, display: "flex", width: "100%", alignItems: "center", gap: 12, textAlign: "left", background: "transparent", color: C.chalk, padding: "14px 16px", borderRadius: 0, borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{ex.muscles}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                  <RankBadge id={id} best={b} small />
                  {n && <span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>{n.rank.icon} o {n.need} viac</span>}
                </div>
                {levelUpFor(history, id) && <div style={{ fontSize: 12, color: C.signal, fontWeight: 700, marginTop: 3 }}>⬆ Čas na ťažšiu verziu</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: l ? C.chalk : C.dim }}>
                  {l ? l.res.map(r => fmtRes(r, "")).join(" / ") : "nové"}
                </div>
                <div style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>{l ? `naposledy${ex.unit ? ` (${ex.unit.replace("/", "na ")})` : ""}` : "ťukni pre info"}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>Ťukni na cvik: obrázok, postup, video a ranky.</div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {[2, 3].map(n => (
          <button key={n} onClick={() => { sfxTap(); setRounds(n); }}
            style={{ ...btnBase, flex: 1, padding: "11px 8px", fontSize: 13, background: rounds === n ? C.panelHi : "transparent", color: rounds === n ? C.chalk : C.dim, border: `1.5px solid ${rounds === n ? C.chalk : C.line}` }}>
            {n} kolá, asi {n === 2 ? 13 : 19} min
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>3 kolá znamenajú viac sérií za týždeň, a teda rýchlejší rast. Keď nemáš čas, 2 kolá stačia.</div>

      <button onClick={() => { unlockAudio(); onStart(day.id, rounds); }} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 14, fontSize: 18, padding: 19 }}>
        Začať deň {day.id}
      </button>

      <div style={{ marginTop: 22 }}><ChallengesCard history={history} /></div>
    </div>
  );
}

// ─── TAB 2: HISTÓRIA ────────────────────────────────────────────────────────
function MonthCalendar({ history }) {
  const today = dateKey();
  const t = parseKey(today);
  const [ym, setYm] = useState([t.getFullYear(), t.getMonth()]);
  const [y, m] = ym;
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const byDate = {};
  history.forEach(e => { byDate[e.date] = e.day; });
  const MONTHS = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const count = Object.keys(byDate).filter(k => k.startsWith(`${y}-${pad(m + 1)}`)).length;
  const shift = n => { sfxTap(); const d = new Date(y, m + n, 1); setYm([d.getFullYear(), d.getMonth()]); };
  return (
    <div style={{ ...card, padding: "14px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => shift(-1)} aria-label="Predchádzajúci mesiac" style={{ ...ghostBtn, padding: "4px 12px", fontSize: 16 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, color: C.chalk }}>{MONTHS[m]} {y}</div>
          <div style={{ fontSize: 12, color: C.dim }}>{count} {plural(count, "tréning", "tréningy", "tréningov")}</div>
        </div>
        <button onClick={() => shift(1)} aria-label="Ďalší mesiac" style={{ ...ghostBtn, padding: "4px 12px", fontSize: 16 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
        {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map(d => <div key={d} style={{ fontSize: 11, color: C.dim, textAlign: "center", fontWeight: 600 }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = `${y}-${pad(m + 1)}-${pad(d)}`;
          const on = byDate[k];
          const isToday = k === today;
          return (
            <div key={i} title={on ? `Deň ${on}` : undefined} style={{ aspectRatio: "1", borderRadius: 9, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: on ? C.mint : "transparent", color: on ? C.ink : k > today ? "#4d5f8a" : C.dim, border: `1.5px solid ${on ? C.mint : isToday ? C.chalk : "transparent"}`, fontSize: 13, fontWeight: on ? 800 : 500 }}>
              {d}
              {on && <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }}>{on}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressChart({ history }) {
  const withData = Object.keys(RANK_AT).filter(id => history.some(e => e.items.some(it => it.id === id)));
  const [sel, setSel] = useState(withData.includes("k1") ? "k1" : withData[0]);
  const [tip, setTip] = useState(null);
  if (!withData.length) return null;
  const pts = history.map(e => {
    const it = e.items.find(x => x.id === sel);
    if (!it) return null;
    const nums = it.res.map(numVal).filter(n => !isNaN(n));
    return nums.length ? { date: e.date, v: Math.max(...nums) } : null;
  }).filter(Boolean);
  const W = 320, H = 150, P = { l: 30, r: 14, t: 16, b: 26 };
  const vals = pts.map(p => p.v);
  const at = RANK_AT[sel];
  const maxV = Math.max(...vals, 5);
  const top = Math.ceil((maxV * 1.15) / 5) * 5;
  const x = i => P.l + (pts.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (pts.length - 1));
  const yv = v => P.t + (1 - v / top) * (H - P.t - P.b);
  const unit = EX[sel].type === "time" ? " s" : "";
  const nextAt = at.find(v => v > Math.max(...vals));
  return (
    <div style={{ ...card, padding: "14px 14px 10px" }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 6 }}>
        {withData.map(id => (
          <button key={id} onClick={() => { sfxTap(); setSel(id); setTip(null); }} style={{ ...btnBase, flexShrink: 0, padding: "6px 11px", fontSize: 12, background: sel === id ? C.chalk : "transparent", color: sel === id ? C.ink : C.dim, border: `1.5px solid ${sel === id ? C.chalk : C.line}` }}>{EX[id].name}</button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: C.chalk, fontWeight: 700 }}>{EX[sel].name}: najlepšia séria na tréning{unit ? " (sekundy)" : ""}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", marginTop: 6 }} onClick={() => setTip(null)}>
        {[0, top / 2, top].map(g => (
          <g key={g}>
            <line x1={P.l} x2={W - P.r} y1={yv(g)} y2={yv(g)} stroke={C.line} strokeWidth="1" />
            <text x={P.l - 6} y={yv(g) + 4} textAnchor="end" fontSize="10" fill={C.dim}>{Math.round(g)}</text>
          </g>
        ))}
        {nextAt && nextAt <= top && (
          <g>
            <line x1={P.l} x2={W - P.r} y1={yv(nextAt)} y2={yv(nextAt)} stroke={RANKS[at.indexOf(nextAt) + 1].color} strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={W - P.r} y={yv(nextAt) - 4} textAnchor="end" fontSize="10" fill={C.dim}>{RANKS[at.indexOf(nextAt) + 1].icon} {RANKS[at.indexOf(nextAt) + 1].name} {nextAt}{unit}</text>
          </g>
        )}
        {pts.length > 1 && <polyline points={pts.map((p, i) => `${x(i)},${yv(p.v)}`).join(" ")} fill="none" stroke={C.sky} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p, i) => (
          <g key={i} onClick={ev => { ev.stopPropagation(); sfxTap(); setTip(i); }} style={{ cursor: "pointer" }}>
            <circle cx={x(i)} cy={yv(p.v)} r="14" fill="transparent" />
            <circle cx={x(i)} cy={yv(p.v)} r="5" fill={C.sky} stroke={C.panel} strokeWidth="2" />
            {(i === pts.length - 1 || tip === i) && <text x={x(i)} y={yv(p.v) - 10} textAnchor="middle" fontSize="12" fontWeight="800" fill={C.chalk}>{p.v}{unit}</text>}
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={tip === i ? C.chalk : C.dim}>{parseKey(p.date).getDate()}.{parseKey(p.date).getMonth() + 1}.</text>
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 12, color: C.dim }}>Ťukni na bod pre hodnotu. Prerušovaná čiara = ďalší rank.</div>
    </div>
  );
}

function HistoryTab({ history, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(null);
  const [open, setOpen] = useState(null);
  const sets = history.reduce((a, e) => a + setsIn(e), 0);
  const prs = history.reduce((a, e) => a + ((e.prs && e.prs.length) || 0), 0);
  const tiles = [["Tréningy", history.length], ["Série", sets], ["Rekordy", prs]];
  return (
    <div className="scr" style={{ padding: "16px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {tiles.map(([l, v]) => (
          <div key={l} style={{ ...card, padding: "12px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1, color: C.chalk }}>{v}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <MonthCalendar history={history} />
      <div style={sectionTitle}>Progres</div>
      <ProgressChart history={history} />
      <div style={sectionTitle}>Tréningy</div>
      {history.length === 0 && <div style={{ color: C.dim, fontSize: 14 }}>Zatiaľ žiadny tréning. Prvý pridáš na karte Tréning.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {history.slice().reverse().map((s, ri) => {
          const idx = history.length - 1 - ri;
          const isOpen = open === idx || ri === 0;
          return (
            <div key={`${s.date}-${idx}`} style={{ ...card, padding: "13px 15px" }}>
              <button onClick={() => { sfxTap(); setOpen(open === idx ? null : idx); }} aria-expanded={isOpen}
                style={{ ...btnBase, width: "100%", background: "transparent", color: C.chalk, padding: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderRadius: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: C.panelHi, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, flexShrink: 0 }}>{s.day}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, textTransform: "capitalize" }}>{fmtDate(s.date, true)}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>{s.rounds || 2} kolá, {setsIn(s)} sérií{s.prs && s.prs.length ? `, 🏆 ${s.prs.length}` : ""}</div>
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: C.sky }}>+{xpFor(s)} XP</div>
              </button>
              {isOpen && (
                <div style={{ marginTop: 10 }}>
                  {s.items.map(it => {
                    const b = EX[it.id] ? bestUntil(history, it.id, idx) : null;
                    const r = RANKS[EX[it.id] ? rankIdx(it.id, b) : 0];
                    return (
                      <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.line}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.chalk }}>{s.prs && s.prs.includes(it.id) ? "🏆 " : ""}{it.name}</div>
                          {RANK_AT[it.id] && <div style={{ fontSize: 12, color: r.color, fontWeight: 700 }}>{r.icon} {r.name} v tom čase</div>}
                        </div>
                        <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 800, color: C.chalk, whiteSpace: "nowrap" }}>{it.res.map(v => fmtRes(v, "")).join(" / ")}<span style={{ fontFamily: BODY, fontSize: 11, color: C.dim, marginLeft: 3 }}>{it.unit}</span></div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                    <button onClick={() => { if (confirmDel === idx) { onDelete(idx); setConfirmDel(null); } else setConfirmDel(idx); }}
                      style={{ ...btnBase, background: "transparent", color: confirmDel === idx ? "#ff8a80" : C.dim, fontSize: 12, padding: "4px 6px", fontWeight: 600 }}>
                      {confirmDel === idx ? "Naozaj zmazať?" : "Zmazať tréning"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB 3: PROFIL ──────────────────────────────────────────────────────────
function ProfileTab({ history, profile, setProfile, muted, onToggleMute, onFreeze }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const fz = freezesAvailable(history);
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name || "");
  const [howEx, setHowEx] = useState(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const today = dateKey();
  const xp = totalXP(history);
  const lv = levelInfo(xp);
  const st = streakInfo(history, today);
  const ach = achievements(history);
  const since = history.length ? history.map(e => e.date).sort()[0] : null;

  const pick = async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try { const url = await fileToAvatar(f); setProfile({ ...profile, pfp: url }); setErr(""); sfxCheck(); }
    catch (_) { setErr("Túto fotku sa nepodarilo načítať. Skús inú (JPG alebo PNG)."); }
  };
  const copyAll = async () => {
    const text = history.map(logText).join("\n\n");
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (__) {} document.body.removeChild(t); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const stats = [["Tréningy", history.length], ["Série spolu", history.reduce((a, e) => a + setsIn(e), 0)], ["Opakovaní spolu", totalReps(history)], ["Najdlhšia séria", `🔥 ${bestStreak(history)}`]];

  return (
    <div className="scr" style={{ padding: "16px 18px 110px", maxWidth: 460, margin: "0 auto" }}>
      {howEx && <HowTo id={howEx} history={history} onClose={() => setHowEx(null)} />}
      <input ref={fileRef} type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 6 }}>
        <button onClick={() => fileRef.current && fileRef.current.click()} aria-label="Zmeniť profilovú fotku" style={{ ...btnBase, position: "relative", background: "transparent", padding: 0, borderRadius: 99 }}>
          <Avatar profile={profile} size={104} />
          <span style={{ position: "absolute", right: -2, bottom: -2, width: 34, height: 34, borderRadius: 99, background: C.panelHi, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📷</span>
        </button>
        {err && <div style={{ fontSize: 13, color: "#ff8a80", marginTop: 8 }}>{err}</div>}
        {editing ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={name} onChange={e => setName(e.target.value.slice(0, 24))} autoFocus aria-label="Meno"
              style={{ fontFamily: BODY, fontSize: 18, fontWeight: 700, padding: "8px 12px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: C.panel, color: C.chalk, width: 180, outline: "none" }} />
            <button onClick={() => { setProfile({ ...profile, name: name.trim() || "Ja" }); setEditing(false); sfxCheck(); }} className="b3d" style={{ ...btnBase, background: C.signal, color: C.signalInk, padding: "8px 14px", "--e": EDGE[C.signal] }}>Uložiť</button>
          </div>
        ) : (
          <button onClick={() => { setName(profile.name || ""); setEditing(true); }} style={{ ...btnBase, background: "transparent", color: C.chalk, marginTop: 10, padding: "2px 6px" }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 900 }}>{profile.name || "Ja"}</span>
            <span style={{ fontSize: 13, color: C.dim, marginLeft: 6 }}>✏️</span>
          </button>
        )}
        <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>{since ? `Cvičí od ${fmtDate(since, true)}` : "Nový člen"}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 18 }}>
        <div style={{ ...card, padding: "14px" }}>
          <div style={{ fontSize: 12, color: C.dim }}>Séria</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, color: "#ffa94d", lineHeight: 1 }}><span className={st.n ? "wiggle" : ""}>🔥</span> {st.n}</div>
          <div style={{ fontSize: 12, color: st.gap === 2 ? C.signal : C.dim, marginTop: 4 }}>{st.gap === 2 ? "Dnes cvič, nech ju nestratíš!" : "Drží, kým nevynecháš 2 dni."}</div>
        </div>
        <div style={{ ...card, padding: "14px" }}>
          <div style={{ fontSize: 12, color: C.dim }}>Level</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 40, fontWeight: 900, color: C.sky, lineHeight: 1 }}>⚡ {lv.lvl}</div>
          <div style={{ height: 8, background: C.panelHi, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(lv.into / lv.need) * 100}%`, background: C.sky, borderRadius: 99, transition: "width .6s ease-out" }} />
          </div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{lv.into}/{lv.need} XP, spolu {xp}</div>
        </div>
      </div>

      <div style={{ ...card, padding: "13px 15px", marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 30 }}>🧊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.chalk }}>Zamrazenie série: {fz}/2</div>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.45 }}>Keď nemôžeš cvičiť, zamraz deň a séria sa nepreruší. Nové získaš za splnenie všetkých 3 výziev týždňa.</div>
        </div>
        <button disabled={!fz || st.frozenToday || (history.length && history[history.length - 1].date === today)} onClick={onFreeze}
          style={{ ...btnBase, background: fz && !st.frozenToday ? C.sky : C.panelHi, color: fz && !st.frozenToday ? C.ink : C.dim, padding: "9px 12px", fontSize: 13, opacity: !fz || st.frozenToday ? 0.6 : 1 }}>
          {st.frozenToday ? "Dnes ✓" : "Použiť"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        {stats.map(([l, v]) => (
          <div key={l} style={{ ...card, padding: "12px 14px" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 900, color: C.chalk, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={sectionTitle}>Ranky</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {Object.keys(RANK_AT).map(id => {
          const b = bestFor(history, id);
          const r = RANKS[rankIdx(id, b)];
          return (
            <button key={id} onClick={() => setHowEx(id)} style={{ ...btnBase, textAlign: "left", background: C.panel, border: `1.5px solid ${r.color}66`, padding: "10px 12px", color: C.chalk }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{EX[id].name}</div>
              <div style={{ fontSize: 13, color: r.color, fontWeight: 700, marginTop: 4 }}>{r.icon} {r.name}<span style={{ color: C.dim, fontWeight: 500 }}>{b !== null ? `, max ${b}${EX[id].type === "time" ? " s" : ""}` : ""}</span></div>
            </button>
          );
        })}
      </div>

      <div style={sectionTitle}>Odznaky <span style={{ fontFamily: BODY, fontSize: 14, color: C.dim, fontWeight: 600 }}>{ach.filter(a => a.ok).length}/{ach.length}</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {ach.map(a => (
          <div key={a.name} style={{ ...card, padding: "12px 6px", textAlign: "center", opacity: a.ok ? 1 : 0.45, borderColor: a.ok ? C.signal : C.line }}>
            <div style={{ fontSize: 28, filter: a.ok ? "none" : "grayscale(1)" }}>{a.ok ? a.icon : "🔒"}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.chalk, marginTop: 4 }}>{a.name}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{a.desc}</div>
          </div>
        ))}
      </div>

      <div style={sectionTitle}>Nastavenia</div>
      <div style={{ ...card }}>
        <button onClick={onToggleMute} style={{ ...btnBase, width: "100%", background: "transparent", color: C.chalk, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 0 }}>
          <span>Zvuky</span>
          <span style={{ width: 50, height: 28, borderRadius: 99, background: muted ? C.panelHi : C.mint, position: "relative", transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: muted ? 3 : 25, width: 22, height: 22, borderRadius: 99, background: C.chalk, transition: "left .2s" }} />
          </span>
        </button>
        <button onClick={copyAll} style={{ ...btnBase, width: "100%", background: "transparent", color: C.chalk, padding: "14px 16px", textAlign: "left", borderTop: `1px solid ${C.line}`, borderRadius: 0 }}>
          {copied ? "✓ Skopírované" : "Kopírovať celú históriu"}
        </button>
        <button onClick={() => {
            if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
            setProfile({ ...profile, streakResetTs: Date.now(), freezeDays: profile.freezeDays || [] }); setConfirmReset(false);
          }}
          style={{ ...btnBase, width: "100%", background: "transparent", color: confirmReset ? "#ff8a80" : C.chalk, padding: "14px 16px", textAlign: "left", borderTop: `1px solid ${C.line}`, borderRadius: 0 }}>
          {confirmReset ? "Naozaj vynulovať sériu? Ťukni znova" : "Resetovať sériu 🔥 na 0"}
          <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>História, XP a ranky ostanú. Séria sa začne počítať odznova.</div>
        </button>
      </div>
    </div>
  );
}

// ─── SESSION: WARM-UP ───────────────────────────────────────────────────────
function Warmup({ done, setDone, onNext }) {
  const count = done.filter(Boolean).length;
  return (
    <div>
      <div style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 900, lineHeight: 0.95, color: C.chalk }}>Zahriatie</div>
      <div style={{ fontSize: 14, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>Asi 3 minúty. Sprav cvik a ťukni naň. Prvé kolo tréningu ber tiež ako zahriatie, nechoď v ňom na doraz.</div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {WARMUP.map((w, i) => (
          <div key={w.id} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
            <button onClick={() => { const n = [...done]; n[i] = !n[i]; if (n[i]) sfxCheck(); setDone(n); }} aria-pressed={!!done[i]}
              style={{ ...btnBase, flex: 1, textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: "14px 15px",
                background: done[i] ? "#173f3a" : C.panel, border: `1.5px solid ${done[i] ? C.mint : C.line}`, color: C.chalk }}>
              <div key={done[i] ? "on" : "off"} className={done[i] ? "pop" : ""} style={{ width: 30, height: 30, borderRadius: 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                border: `2px solid ${done[i] ? C.mint : C.dim}`, background: done[i] ? C.mint : "transparent", color: C.ink, fontSize: 16, fontWeight: 900 }}>{done[i] ? "✓" : ""}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{w.name}</div>
                <div style={{ fontSize: 13, color: C.signal, fontWeight: 600, marginTop: 1 }}>{w.dose}</div>
                <div style={{ fontSize: 12, color: C.dim, fontWeight: 500, marginTop: 2 }}>{w.why}</div>
              </div>
            </button>
            <button onClick={() => openYT(w.yt)} aria-label={`Video: ${w.name}`} style={{ ...btnBase, background: C.panel, border: `1.5px solid ${C.line}`, color: C.dim, padding: "0 13px", fontSize: 14 }}>▶</button>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="b3d" style={{ ...bigBtn(count === WARMUP.length ? C.signal : C.panelHi, count === WARMUP.length ? C.signalInk : C.chalk), marginTop: 18 }}>
        {count === WARMUP.length ? "Ideme cvičiť" : "Preskočiť zahriatie"}
      </button>
    </div>
  );
}

// ─── SESSION: WORK ──────────────────────────────────────────────────────────
function SwapSheet({ item, exclude, history, onPick, onClose }) {
  const opts = altsFor(item.slot, exclude);
  return (
    <Sheet title="Vymeniť cvik" onClose={onClose}>
      <div style={{ fontSize: 14, color: C.dim, marginBottom: 12 }}>Nejde ti {EX[item.id].name}? Vyber náhradu. Platí len pre tento tréning, v oboch kolách.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {item.slot !== item.id && (
          <button onClick={() => onPick(item.slot)} style={{ ...btnBase, textAlign: "left", background: C.panelHi, color: C.chalk, padding: "12px 14px", border: `1.5px solid ${C.line}` }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>↩ Späť na pôvodný: {EX[item.slot].name}</div>
          </button>
        )}
        {opts.map(id => {
          const ex = EX[id]; const l = lastFor(history, id);
          return (
            <button key={id} onClick={() => onPick(id)} style={{ ...btnBase, textAlign: "left", background: C.panelHi, color: C.chalk, padding: "12px 14px", border: `1.5px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{ex.muscles}{l ? `. Naposledy ${l.res.map(r => fmtRes(r, "")).join("/")}` : ""}</div>
              </div>
              {ex.tag && <span style={{ fontSize: 11, fontWeight: 700, color: C.sky, border: `1.5px solid ${C.sky}55`, borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap" }}>{ex.tag}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function Work({ item, rounds, history, sessionResults, onRecord, onSwap, exclude }) {
  const [swap, setSwap] = useState(false);
  const ex = EX[item.id];
  const last = lastFor(history, item.id);
  const isLastRound = item.r === rounds - 1;
  const [how, setHow] = useState(false);

  const thisSession = (sessionResults && sessionResults[item.id]) || [];
  const initReps = () => {
    const v0 = last ? last.res[item.r] : undefined;
    if (typeof v0 === "number") return v0;
    // No number for this round from last time: use what you did in the previous round today.
    const prev = thisSession[item.r - 1];
    if (typeof prev === "number") return prev;
    if (!last) return ex.start;
    const v = last.res[item.r];
    if (typeof v === "number") return v;
    const first = last.res.find(x => typeof x === "number");
    return typeof first === "number" ? first : ex.start;
  };
  const [reps, setReps] = useState(initReps);

  const initDur = () => {
    if (ex.type !== "time") return 0;
    const v = last ? parseInt(last.res[item.r] ?? last.res[0], 10) : NaN;
    return ex.durs.includes(v) ? v : ex.dur;
  };
  const [dur, setDur] = useState(initDur);
  const [ph, setPh] = useState("ready"); // ready | prep | hold
  const [endAt, setEndAt] = useState(null);

  const left = useCountdown(endAt,
    () => {
      if (ph === "prep") { soundExercise(); setPh("hold"); setEndAt(Date.now() + dur * 1000); }
      else if (ph === "hold") { soundExercise(); vibrate([250]); setEndAt(null); onRecord(`${dur}s`); }
    },
    () => { if (ph === "prep") soundPrepEnd(); }
  );

  const startHold = () => { unlockAudio(); setPh("prep"); setEndAt(Date.now() + 5000); };
  const stopHold = () => {
    unlockAudio();
    if (ph === "prep") { setPh("ready"); setEndAt(null); return; }
    const held = Math.max(1, dur - left);
    setEndAt(null);
    onRecord(`${held}s`);
  };

  const best = bestFor(history, item.id);
  const lvl = levelUpFor(history, item.id);
  const lastLine = last ? `Naposledy (${fmtDate(last.date)}): ${last.res.map(r => fmtRes(r, ex.unit)).join(" / ")}` : "Nový cvik, začni na pohodu a nájdi si číslo.";

  return (
    <div>
      {how && <HowTo id={item.id} history={history} onClose={() => setHow(false)} />}
      {swap && <SwapSheet item={item} exclude={exclude || []} history={history} onClose={() => setSwap(false)} onPick={id => { setSwap(false); sfxCheck(); onSwap(item.slot, id); }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 900, lineHeight: 0.95, color: C.chalk }}>{ex.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setHow(true)} style={{ ...ghostBtn, padding: "8px 12px" }}>Ako na to</button>
          {onSwap && ph === "ready" && <button onClick={() => { sfxTap(); setSwap(true); }} style={{ ...ghostBtn, padding: "8px 12px", color: C.sky, borderColor: `${C.sky}88` }}>⇄ Vymeniť</button>}
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>{ex.muscles}{ex.tempo ? `. Tempo: ${ex.tempo}` : ""}</div>
      <div style={{ fontSize: 13, color: C.chalk, marginTop: 6 }}>{lastLine}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <RankBadge id={item.id} best={best} />
        {RANK_AT[item.id] && (() => { const n = rankNext(item.id, best); return n ? <span style={{ fontSize: 12, color: C.dim }}>{n.rank.icon} {n.rank.name} od {n.at}{ex.type === "time" ? " s" : ""}</span> : <span style={{ fontSize: 12, color: C.dim }}>Najvyšší rank!</span>; })()}
        {item.slot !== item.id && <span style={{ fontSize: 12, color: C.sky }}>náhrada za: {EX[item.slot].name}</span>}
      </div>
      {lvl && item.r === 0 && (
        <div style={{ marginTop: 12, border: `1.5px solid ${C.signal}`, borderRadius: 14, padding: "10px 13px", fontSize: 13, color: C.chalk, lineHeight: 1.5 }}>
          <b style={{ color: C.signal }}>⬆ Čas na ťažšiu verziu.</b> Minule si dal cieľ vo všetkých kolách. {lvl}
        </div>
      )}
      {isLastRound && (
        <div style={{ marginTop: 10, fontSize: 13, color: C.signal, fontWeight: 600 }}>Posledné kolo. Toto je séria, ktorá stavia svaly: choď skoro do zlyhania, nechaj si 1–2 opakovania v zásobe. 💪</div>
      )}

      {ex.type === "reps" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 26 }}>
            <button className="b3d" onClick={() => { sfxTap(); setReps(Math.max(0, reps - 1)); }} aria-label="Menej" style={{ ...btnBase, width: 64, height: 64, borderRadius: 99, background: C.panelHi, color: C.chalk, fontSize: 32, "--e": "#0a1734" }}>−</button>
            <div style={{ textAlign: "center", minWidth: 120 }}>
              <div key={reps} className="bump" style={{ fontFamily: DISPLAY, fontSize: 132, fontWeight: 900, lineHeight: 0.85, color: best !== null && reps > best ? C.signal : C.chalk }}>{reps}</div>
              <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>opakovaní{ex.unit ? ` ${ex.unit.replace("/", "na ")}` : ""}</div>
              <div style={{ height: 22, marginTop: 4, fontSize: 14, fontWeight: 800, color: C.signal }}>{best !== null && reps > best ? <span className="pop" style={{ display: "inline-block" }}>{rankIdx(item.id, reps) > rankIdx(item.id, best) ? `${RANKS[rankIdx(item.id, reps)].icon} Nový rank: ${RANKS[rankIdx(item.id, reps)].name}!` : "🏆 Osobný rekord"}</span> : ""}</div>
            </div>
            <button className="b3d" onClick={() => { const n = reps + 1; if (best !== null && n === best + 1) sfxRecord(); else sfxTap(); setReps(n); }} aria-label="Viac" style={{ ...btnBase, width: 64, height: 64, borderRadius: 99, background: C.panelHi, color: C.chalk, fontSize: 32, "--e": "#0a1734" }}>+</button>
          </div>
          <div style={{ fontSize: 12, color: C.dim, textAlign: "center", marginTop: 10 }}>{last ? "Číslo je nastavené podľa minula." : "Číslo je len odhad."} Sprav sériu a uprav ho na to, koľko si dal.</div>
          <button onClick={() => { unlockAudio(); onRecord(reps); }} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 22, fontSize: 18, padding: 19 }}>
            Hotovo, {reps}{ex.unit}
          </button>
        </>
      )}

      {ex.type === "time" && (
        <>
          {ph === "ready" && (
            <>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
                {ex.durs.map(d => (
                  <button key={d} onClick={() => setDur(d)} style={{ ...btnBase, padding: "10px 14px", fontSize: 15, background: dur === d ? C.chalk : "transparent", color: dur === d ? C.ink : C.dim, border: `1.5px solid ${dur === d ? C.chalk : C.line}` }}>{d} s</button>
                ))}
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 132, fontWeight: 900, lineHeight: 0.85, color: C.chalk, textAlign: "center", marginTop: 20 }}>{dur}</div>
              <div style={{ fontSize: 13, color: C.dim, textAlign: "center", marginTop: 4 }}>sekúnd. Po štarte máš 5 s na zaujatie pozície.</div>
              <button onClick={startHold} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 22, fontSize: 18, padding: 19 }}>Štart</button>
            </>
          )}
          {ph === "prep" && (
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Ring value={left} total={5} size={230} color={C.signal}>
                <div style={{ fontFamily: DISPLAY, fontSize: 110, fontWeight: 900, lineHeight: 0.85, color: C.signal }}>{left}</div>
                <div style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>zaujmi pozíciu</div>
              </Ring>
              <button onClick={stopHold} style={{ ...ghostBtn, marginTop: 18 }}>Zrušiť</button>
            </div>
          )}
          {ph === "hold" && (
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Ring value={left} total={dur} size={230} color={C.chalk}>
                <div style={{ fontFamily: DISPLAY, fontSize: 110, fontWeight: 900, lineHeight: 0.85, color: C.chalk }}>{left}</div>
                <div style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>drž</div>
              </Ring>
              <button onClick={stopHold} style={{ ...ghostBtn, marginTop: 18 }}>Nevládzem, zastaviť</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SESSION: REST ──────────────────────────────────────────────────────────
function Rest({ rest, nextItem, rounds, onEnd, onAdd }) {
  const left = useCountdown(rest.endAt, () => { soundRest(); vibrate([250]); onEnd(); }, s => { if (s <= 3) soundPrepEnd(); });
  const ex = EX[nextItem.id];
  const newRound = !!rest.newRound;
  return (
    <div style={{ textAlign: "center", paddingTop: 10 }}>
      {rest.pr && <Confetti count={55} />}
      <div className="pop" style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, lineHeight: 1, color: rest.pr ? C.signal : C.chalk }}>{rest.cheer || "Dobrá séria!"}</div>
      <div style={{ fontSize: 14, color: C.sky, fontWeight: 700, marginTop: 6 }}>{newRound ? `Kolo hotové! Oddych pred kolom ${nextItem.r + 1} z ${rounds}` : "Oddych"}</div>
      <div style={{ marginTop: 18 }}>
        <Ring value={left} total={rest.total} size={250} color={C.sky}>
          <div className={left <= 3 && left > 0 ? "pulse" : ""} style={{ fontFamily: DISPLAY, fontSize: 124, fontWeight: 900, lineHeight: 0.85, color: left <= 3 ? C.signal : C.chalk }}>{left}</div>
        </Ring>
      </div>
      <div style={{ marginTop: 22, fontSize: 13, color: C.dim }}>Ďalej</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 36, fontWeight: 800, color: C.chalk, lineHeight: 1.05 }}>{ex.name}</div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Priprav si miesto, kým to odpočíta.</div>
      {rest.tip && <div style={{ marginTop: 14, fontSize: 14, color: C.sky, fontWeight: 600 }}>💧 {rest.tip}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button onClick={onAdd} style={{ ...ghostBtn, flex: 1, padding: 14, fontSize: 14 }}>+15 s</button>
        <button onClick={() => { unlockAudio(); onEnd(); }} style={{ ...btnBase, flex: 2, padding: 14, fontSize: 15, background: C.panelHi, color: C.chalk }}>Som pripravený</button>
      </div>
    </div>
  );
}

// ─── SESSION: COOL-DOWN (optional) ──────────────────────────────────────────
function CoolItem({ def, done, onDone }) {
  const [ph, setPh] = useState("idle"); // idle | prep | hold
  const [endAt, setEndAt] = useState(null);
  const [open, setOpen] = useState(false);
  const left = useCountdown(endAt,
    () => {
      if (ph === "prep") { soundExercise(); setPh("hold"); setEndAt(Date.now() + def.dur * 1000); }
      else if (ph === "hold") { soundExercise(); vibrate([250]); setPh("idle"); setEndAt(null); onDone(); }
    },
    () => { if (ph === "prep") soundPrepEnd(); }
  );
  const start = () => { unlockAudio(); setPh("prep"); setEndAt(Date.now() + 3000); };
  const stop = () => { setPh("idle"); setEndAt(null); if (ph === "hold") onDone(); };

  return (
    <div style={{ background: done ? "#173f3a" : C.panel, border: `1.5px solid ${done ? C.mint : ph !== "idle" ? C.sky : C.line}`, borderRadius: 16, padding: "14px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.chalk }}>{def.name}</div>
          <div style={{ fontSize: 13, color: ph === "prep" ? C.signal : C.dim, marginTop: 2 }}>
            {done ? "✓ hotovo" : ph === "prep" ? `zaujmi pozíciu, ${left}` : ph === "hold" ? `drž, ${left} s` : `${def.dur} s`}
          </div>
        </div>
        {ph === "idle" && !done && <button onClick={start} style={{ ...btnBase, background: C.sky, color: C.ink, padding: "10px 16px", fontSize: 14 }}>Štart</button>}
        {ph !== "idle" && <button onClick={stop} style={{ ...ghostBtn, padding: "8px 12px" }}>Stop</button>}
        {done && ph === "idle" && <span style={{ color: C.mint, fontSize: 22, fontWeight: 900 }}>✓</span>}
      </div>
      <div style={{ fontSize: 13, color: "#cdd6f0", marginTop: 8, lineHeight: 1.55 }}>{def.why}</div>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ ...btnBase, background: "transparent", color: C.dim, fontSize: 12, padding: "8px 0 0", fontWeight: 600 }}>{open ? "▾ skryť postup" : "▸ ako na to"}</button>
      {open && (
        <div style={{ fontSize: 13, color: "#cdd6f0", lineHeight: 1.55, marginTop: 6 }}>
          {def.fig && <ExFigure id={def.fig} />}
          {def.how}
          <button onClick={() => openYT(def.yt)} style={{ ...btnBase, display: "block", marginTop: 8, background: "transparent", color: C.sky, fontSize: 13, padding: 0 }}>▶ Video</button>
        </div>
      )}
    </div>
  );
}

function Cool({ onFinish }) {
  const [done, setDone] = useState(COOL.map(() => false));
  return (
    <div>
      <div style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 900, lineHeight: 0.95, color: C.chalk }}>Tréning hotový</div>
      <div style={{ fontSize: 14, color: C.dim, marginTop: 10, lineHeight: 1.55 }}>
        Strečing na konci je <b style={{ color: C.chalk }}>voliteľný</b>. Odborníci sa zhodli, že nepomáha regenerácii ani rastu svalov. Pomáha len ohybnosti. Ak ho chceš, tieto dva majú pre teba zmysel: bedrový flexor (na obe strany) a child's pose. Spolu 90 sekúnd.
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {COOL.map((c, i) => <CoolItem key={c.id} def={c} done={done[i]} onDone={() => setDone(d => d.map((v, j) => (j === i ? true : v)))} />)}
      </div>
      <button onClick={() => onFinish(done.some(Boolean))} className="b3d" style={{ ...bigBtn(C.signal, C.signalInk), marginTop: 18 }}>
        {done.some(Boolean) ? "Uložiť tréning" : "Preskočiť a uložiť tréning"}
      </button>
    </div>
  );
}

// ─── SESSION: SUMMARY ───────────────────────────────────────────────────────
function Summary({ entry, xpBefore = 0, xpGained, newCh = [], history, onClose }) {
  const [copied, setCopied] = useState(false);
  const gained = entry ? (xpGained ?? xpFor(entry)) : 0;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!gained) return;
    let raf;
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 1300);
      setShown(Math.round(gained * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [gained]);
  const lvNow = levelInfo(xpBefore + shown);
  const leveledUp = levelInfo(xpBefore + gained).lvl > levelInfo(xpBefore).lvl;
  const st = entry ? streakInfo(history, entry.date) : { n: 0 };
  const [finishLine] = useState(() => pick(FINISH_LINES));
  const text = entry ? logText(entry) : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (__) {} document.body.removeChild(t); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };
  if (!entry) {
    return (
      <div>
        <div style={{ fontFamily: DISPLAY, fontSize: 48, fontWeight: 900, color: C.chalk }}>Nič sa neuložilo</div>
        <div style={{ fontSize: 14, color: C.dim, marginTop: 8 }}>Neodcvičil si žiadnu sériu, takže v histórii nič nepribudlo.</div>
        <button onClick={onClose} className="b3d" style={{ ...bigBtn(C.panelHi, C.chalk), marginTop: 18 }}>Domov</button>
      </div>
    );
  }
  return (
    <div>
      <Confetti />
      <div className="pop" style={{ fontFamily: DISPLAY, fontSize: 60, fontWeight: 900, lineHeight: 0.95, color: C.mint }}>Výborne!</div>
      <div style={{ fontSize: 16, color: C.chalk, marginTop: 8, fontWeight: 600, lineHeight: 1.4 }}>{finishLine}</div>
      <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>Deň {entry.day}, {fmtDate(entry.date, true)}</div>
      <div style={{ marginTop: 16, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 900, lineHeight: 1, color: C.sky }}>+{shown} XP</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 800, color: "#ffa94d" }}>🔥 {st.n}</div>
        </div>
        <div style={{ height: 14, background: C.panelHi, borderRadius: 99, marginTop: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(lvNow.into / lvNow.need) * 100}%`, background: C.sky, borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 13, color: C.dim, marginTop: 8 }}>Level {lvNow.lvl}, {lvNow.into} / {lvNow.need} XP. Séria: {st.n} {plural(st.n, "tréning", "tréningy", "tréningov")} po sebe.</div>
        {leveledUp && shown === gained && (
          <div className="pop" style={{ marginTop: 10, fontFamily: DISPLAY, fontSize: 28, fontWeight: 900, color: C.signal, transformOrigin: "left center" }}>⚡ Level up! Level {lvNow.lvl}</div>
        )}
      </div>
      {newCh.length > 0 && (
        <div className="pop" style={{ marginTop: 14, background: "#173f3a", border: `2px solid ${C.mint}`, borderRadius: 16, padding: "12px 16px" }}>
          {newCh.map(c => (
            <div key={c.id} style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: C.mint, lineHeight: 1.2 }}>✓ Výzva splnená: {c.text} <span style={{ color: C.sky }}>+{c.xp} XP</span></div>
          ))}
        </div>
      )}
      {entry.rankUps && entry.rankUps.length > 0 && (
        <div className="pop" style={{ marginTop: 14, border: `2px solid ${C.signal}`, borderRadius: 16, padding: "12px 16px" }}>
          {entry.rankUps.map(ru => (
            <div key={ru.id} style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 900, color: RANKS[ru.to].color, lineHeight: 1.15 }}>{RANKS[ru.to].icon} {EX[ru.id] ? EX[ru.id].name : ru.id}: {RANKS[ru.to].name}</div>
          ))}
        </div>
      )}
      {entry.prs && entry.prs.length > 0 && (
        <div className="pop" style={{ marginTop: 14, background: C.signal, color: C.signalInk, borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 32, fontWeight: 900, lineHeight: 1 }}>🏆 {entry.prs.length} {plural(entry.prs.length, "osobný rekord", "osobné rekordy", "osobných rekordov")}</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{entry.items.filter(it => entry.prs.includes(it.id)).map(it => it.name).join(", ")}</div>
        </div>
      )}
      <div style={{ marginTop: 16, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18 }}>
        {entry.items.map((it, i) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "13px 16px", borderTop: i ? `1px solid ${C.line}` : "none" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.chalk }}>{entry.prs && entry.prs.includes(it.id) ? "🏆 " : ""}{it.name}</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 800, color: C.chalk, whiteSpace: "nowrap" }}>{it.res.map(r => fmtRes(r, "")).join(" / ")}<span style={{ fontFamily: BODY, fontSize: 11, color: C.dim, marginLeft: 4 }}>{it.unit}</span></div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: C.dim, marginTop: 14, lineHeight: 1.5 }}>Ďalší tréning: deň {DAYS[(DAYS.findIndex(d => d.id === entry.day) + 1) % DAYS.length].id}, ideálne {fmtDate(addDays(entry.date, 2))}</div>
      <button onClick={copy} className="b3d" style={{ ...bigBtn(copied ? C.mint : C.chalk, C.ink), marginTop: 16 }}>{copied ? "✓ Skopírované" : "Kopírovať záznam"}</button>
      <button onClick={onClose} className="b3d" style={{ ...bigBtn("transparent", C.dim), marginTop: 8, border: `1.5px solid ${C.line}` }}>Domov</button>
    </div>
  );
}

// ─── SESSION SHELL ──────────────────────────────────────────────────────────
function Session({ session, setSession, history, onSave, onClose }) {
  useWakeLock();
  const [confirmQuit, setConfirmQuit] = useState(false);
  const swaps = session.swaps || {};
  const seq = buildSeq(session.day, session.rounds, swaps);
  const day = DAYS.find(d => d.id === session.day);
  const doSwap = (slot, id) => setSession({ ...session, swaps: { ...swaps, [slot]: id === slot ? undefined : id } });
  const usedIds = day.ids.map(slot => swaps[slot] || slot);
  const hasResults = Object.values(session.results).some(a => a && a.some(v => v !== null && v !== undefined));

  const finish = (coolDone = false) => {
    const ids = [...new Set(day.ids.flatMap(slot => [slot, swaps[slot]].filter(Boolean)))];
    const items = ids
      .map(id => ({ id, name: EX[id].name, unit: EX[id].unit, res: Array.from({ length: session.rounds }, (_, r) => { const v = (session.results[id] || [])[r]; return v === undefined ? null : v; }) }))
      .filter(it => it.res.some(v => v !== null));
    const prs = items.filter(it => {
      const b = bestFor(history, it.id);
      const top = Math.max(...it.res.map(numVal).filter(n => !isNaN(n)));
      return b !== null && top > b;
    }).map(it => it.id);
    const rankUps = items.map(it => {
      const from = rankIdx(it.id, bestFor(history, it.id));
      const to = rankIdx(it.id, Math.max(...it.res.map(numVal).filter(n => !isNaN(n))));
      return to > from ? { id: it.id, to } : null;
    }).filter(Boolean);
    const entry = items.length ? { date: dateKey(), ts: Date.now(), day: session.day, rounds: session.rounds, items, prs, rankUps, warm: session.warm.every(Boolean), cool: !!coolDone } : null;
    const xpBefore = totalXP(history);
    let xpGained = 0, newCh = [];
    if (entry) {
      const after = [...history, entry];
      xpGained = totalXP(after) - xpBefore;
      const wk = weekKey(entry.date);
      const beforeDone = new Set(challengeStatus(history, wk).filter(c => c.done).map(c => c.id));
      newCh = challengeStatus(after, wk).filter(c => c.done && !beforeDone.has(c.id));
    }
    if (entry) {
      onSave(entry);
      const up = levelInfo(xpBefore + xpGained).lvl > levelInfo(xpBefore).lvl;
      if (up) sfxLevel(); else sfxFinish();
      vibrate(prs.length || up ? [120, 60, 120, 60, 260] : [200]);
    }
    setSession({ ...session, phase: "summary", entry, xpBefore, xpGained, newCh, rest: null });
  };

  const record = (val) => {
    const it = seq[session.pos];
    const arr = [...(session.results[it.id] || [])];
    arr[it.r] = val;
    const results = { ...session.results, [it.id]: arr };
    if (session.pos >= seq.length - 1) {
      sfxSet();
      setSession({ ...session, results, phase: "cool", rest: null });
      return;
    }
    const next = seq[session.pos + 1];
    const secs = next.r !== it.r ? REST_ROUND : REST_BETWEEN;
    const prevBest = Math.max(bestFor(history, it.id) ?? -Infinity, ...(session.results[it.id] || []).map(numVal).filter(n => !isNaN(n)));
    const pr = bestFor(history, it.id) !== null && numVal(val) > prevBest;
    const oldBest = isFinite(prevBest) ? prevBest : null;
    const newRank = rankIdx(it.id, numVal(val));
    const rankUp = (pr || oldBest === null) && newRank > rankIdx(it.id, oldBest);
    const cheer = rankUp ? `${RANKS[newRank].icon} Nový rank: ${RANKS[newRank].name}!` : pr ? "🏆 Nový osobný rekord!" : CHEERS[Math.floor(Math.random() * CHEERS.length)];
    if (rankUp) { sfxLevel(); vibrate([120, 60, 120, 60, 260]); } else if (pr) { sfxRecord(); vibrate([80, 40, 80]); } else sfxSet();
    setSession({ ...session, results, phase: "rest", rest: { endAt: Date.now() + secs * 1000, total: secs, nextPos: session.pos + 1, newRound: next.r !== it.r, pr, cheer, tip: pick(REST_TIPS) } });
  };

  const goBack = () => {
    if (session.phase === "rest") setSession({ ...session, phase: "work", rest: null });
    else if (session.phase === "work" && session.pos > 0) setSession({ ...session, pos: session.pos - 1 });
    else if (session.phase === "work" && session.pos === 0) setSession({ ...session, phase: "warmup" });
  };

  const inFlow = session.phase === "work" || session.phase === "rest";
  const cur = seq[Math.min(session.pos, seq.length - 1)];
  const doneCount = session.phase === "cool" || session.phase === "summary" ? seq.length : session.phase === "rest" ? session.pos + 1 : session.phase === "work" ? session.pos : 0;

  return (
    <div style={{ padding: "16px 18px 40px", maxWidth: 460, margin: "0 auto" }}>
      {session.phase !== "summary" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 14, color: C.dim, fontWeight: 600 }}>
              Deň {session.day}{inFlow ? `, kolo ${cur.r + 1} z ${session.rounds}` : ""}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {inFlow && <button onClick={goBack} style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12 }}>Späť</button>}
              <button onClick={() => { if (!confirmQuit) { setConfirmQuit(true); setTimeout(() => setConfirmQuit(false), 3000); return; } if (hasResults) finish(); else onClose(); }}
                style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12, color: confirmQuit ? "#ff8a80" : C.dim, borderColor: confirmQuit ? "#ff8a80" : C.line }}>
                {confirmQuit ? (hasResults ? "Ukončiť a uložiť?" : "Naozaj ukončiť?") : "Ukončiť"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 12, marginBottom: 22 }} aria-label={`Hotové ${doneCount} z ${seq.length}`}>
            {seq.map((s, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i < doneCount ? C.mint : inFlow && i === session.pos ? C.signal : C.panelHi, marginLeft: i > 0 && s.r !== seq[i - 1].r ? 6 : 0 }} />
            ))}
          </div>
        </>
      )}

      <div key={`${session.phase}-${session.pos}`} className="scr">
      {session.phase === "warmup" && (
        <Warmup done={session.warm} setDone={w => setSession({ ...session, warm: w })} onNext={() => { unlockAudio(); setSession({ ...session, phase: "work", pos: 0 }); }} />
      )}
      {session.phase === "work" && (
        <Work key={`${session.pos}-${seq[session.pos].id}`} item={seq[session.pos]} rounds={session.rounds} history={history} sessionResults={session.results} onRecord={record} onSwap={doSwap} exclude={usedIds} />
      )}
      {session.phase === "rest" && session.rest && (
        <Rest key={session.rest.nextPos} rest={session.rest} nextItem={seq[session.rest.nextPos]} rounds={session.rounds}
          onEnd={() => setSession(s => (s.phase === "rest" && s.rest ? { ...s, phase: "work", pos: s.rest.nextPos, rest: null } : s))}
          onAdd={() => setSession(s => (s.rest ? { ...s, rest: { ...s.rest, endAt: s.rest.endAt + 15000, total: s.rest.total + 15 } } : s))} />
      )}
      {session.phase === "cool" && <Cool onFinish={finish} />}
      {session.phase === "summary" && <Summary entry={session.entry} xpBefore={session.xpBefore || 0} xpGained={session.xpGained} newCh={session.newCh || []} history={history} onClose={onClose} />}
      </div>
    </div>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  useFonts();
  const [history, setHistory] = useState(SEED_HISTORY);
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [tab, setTab] = useState("train");
  const [profile, setProfileState] = useState({ name: "User", pfp: null, freezeDays: [], streakResetTs: 0 });
  META = { freezeDays: profile.freezeDays || [], streakResetTs: profile.streakResetTs || 0 };
  useEffect(() => { window._wmute = muted; }, [muted]);
  useEffect(() => { loadProfile().then(p => { if (p) setProfileState(prev => ({ ...prev, ...p })); }); }, []);
  const setProfile = p => { setProfileState(p); saveProfile(p); };
  const applyFreeze = () => {
    unlockAudio();
    const t = dateKey();
    if ((profile.freezeDays || []).includes(t) || freezesAvailable(history) < 1) return;
    sfxCheck();
    setProfile({ ...profile, freezeDays: [...(profile.freezeDays || []), t] });
  };

  useEffect(() => {
    loadAll().then(s => {
      if (s && Array.isArray(s.history)) setHistory(s.history);
      if (s && typeof s.muted === "boolean") setMuted(s.muted);
      if (s && s.session && s.session.phase !== "summary") {
        const ss = s.session;
        // A rest timer can't survive a reload, so resume at the next exercise.
        if (ss.phase === "rest" && ss.rest) setSession({ ...ss, phase: "work", pos: ss.rest.nextPos, rest: null });
        else setSession(ss);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveAll({ history, muted, session: session && session.phase !== "summary" ? session : null });
  }, [history, session, muted, loaded]);

  useEffect(() => { window.scrollTo?.(0, 0); }, [session?.phase, session?.pos, tab]);

  const start = (dayId, rounds) => setSession({ day: dayId, rounds, phase: "warmup", pos: 0, warm: WARMUP.map(() => false), results: {}, rest: null });

  return (
    <div style={{ minHeight: "100vh", background: C.ink, color: C.chalk, fontFamily: BODY }}>
      <style>{`
        button:focus-visible{outline:3px solid ${C.signal};outline-offset:2px}
        .b3d{transition:transform .08s ease, box-shadow .08s ease; box-shadow:0 5px 0 var(--e, transparent)}
        .b3d:active{transform:translateY(4px); box-shadow:0 1px 0 var(--e, transparent)}
        @keyframes scrIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .scr{animation:scrIn .28s ease-out both}
        @keyframes bump{0%{transform:scale(.82)}55%{transform:scale(1.12)}100%{transform:scale(1)}}
        .bump{animation:bump .22s ease-out}
        @keyframes pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}
        .pop{animation:pop .4s cubic-bezier(.2,1.4,.4,1) both}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        .pulse{animation:pulse .5s ease-in-out infinite}
        @keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}75%{transform:rotate(14deg)}}
        .wiggle{display:inline-block;animation:wiggle .5s ease-in-out 2}
        @keyframes fall{0%{transform:translate3d(0,-10vh,0) rotate(0)}100%{transform:translate3d(var(--dx),110vh,0) rotate(var(--rot))}}
        .conf{position:absolute;top:0;width:9px;height:14px;animation:fall var(--dur) cubic-bezier(.25,.6,.4,1) var(--delay) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.conf{display:none}}
      `}</style>
      {!loaded ? (
        <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Načítavam…</div>
      ) : session ? (
        <Session session={session} setSession={setSession} history={history}
          onSave={entry => setHistory(h => [...h, entry])}
          onClose={() => setSession(null)} />
      ) : (
        <>
          <TopBar tab={tab} history={history} profile={profile} onProfile={() => { sfxTap(); setTab("profile"); }} />
          {tab === "train" && <TrainTab history={history} onStart={start} onFreeze={applyFreeze} />}
          {tab === "history" && <HistoryTab history={history} onDelete={idx => setHistory(h => h.filter((_, i) => i !== idx))} />}
          {tab === "profile" && <ProfileTab history={history} profile={profile} setProfile={setProfile} muted={muted} onFreeze={applyFreeze}
            onToggleMute={() => { unlockAudio(); const m = !muted; window._wmute = m; setMuted(m); if (!m) sfxCheck(); }} />}
          <TabBar tab={tab} setTab={setTab} />
        </>
      )}
    </div>
  );
}
