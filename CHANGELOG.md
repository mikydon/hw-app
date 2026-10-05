# Zmeny / Changelog

Číslovanie: **1** = celá appka, druhé číslo = veľký update, tretie = drobné úpravy (po 9 pribudne štvrté: 1.4.9 → 1.4.9.1). Pri veľkom update je každá zmena porovnaná s tým, ako to bolo predtým.

<!-- New version: add a "## x.y.z (date)" section on top. A GitHub Action creates the release on push to main (commit = the push, or the one in a commit comment). -->

*Versioning: 1 = the app, second number = big update, third = small fixes (after 9 a fourth number is added: 1.4.9 → 1.4.9.1). Big updates compare every change with how it was before.*

## 1.4.2 (2026-10-05)

**Drobné úpravy.**

- „Čo je nové“ má strany: prvá je veľký update 1.4.0, potiahnutím doľava drobné úpravy 1.4.1, 1.4.2…
- hore verzie na ťuknutie a šípky, dole bodky, ktoré sa pri prechode spoja a zase rozdelia
- bodky a tlačidlo ostávajú vždy viditeľné dole
- po drobnej úprave sa pri prvom spustení na úvode ukáže karta „Appka bola aktualizovaná na 1.4.2 · Pozri, čo je nové“: ✕ ju zavrie, tlačidlo otvorí rovno stranu tejto verzie; pri ďalšom spustení už nie je

---
*Small update: "What's new" has swipeable pages (big update first, then each small update), version chips, arrows and merging page dots; after a small update, a one-time card on Home opens that version's page.*

## 1.4.1 (2026-10-05)
<!-- commit: ad8751b945b71083cea9753b463ecf8b84a75a2b -->

**Drobné úpravy.**

- kalkulačka kalórií: namiesto „Pohlavie“ otázka „Muž alebo žena?“ (vo všetkých jazykoch, napr. po anglicky „Man or woman?“ namiesto „Sex“)
- povinné údaje majú červenú hviezdičku * a vysvetlivku „* = povinné, bez nich nevieme vypočítať kalórie“
- pri narodení je jasné, že povinný je len rok; deň a mesiac nie, ale bez nich nebude pozdrav, konfety ani narodeninový odznak

---
*Small update: calorie form asks "Man or woman?", required fields marked with *, only the birth year is required.*

## 1.4.0 (2026-10-05)
<!-- commit: 97c45c159027c340178108bff8e0b1a63c4964e5 -->

**Veľký update: nové menu, kalórie, tréning na pozadí, odznaky s úrovňami, narodeniny.** Porovnanie s 1.3.2:

| | Predtým (1.3.2) | Teraz (1.4.0) |
|---|---|---|
| Menu | dole lišta s 3 kartami, profil cez fotku vpravo hore | jedno menu ☰ vpravo hore so všetkým: Tréning, Kalórie, História, Profil, Nastavenia |
| Tréning na pozadí | počas tréningu sa nedalo ísť nikam inam | tréning sa zmenší do okienka dole, čas a zvuky bežia ďalej, ťuknutím sa vrátiš |
| Počítadlo opakovaní | vopred nastavené podľa minula alebo odhadom | začína od 0, ukazuje minulý výsledok a cieľ +1 |
| Posledné kolo | 1–2 opakovania v zásobe | do technického zlyhania (kým je opakovanie čisté) |
| Kalórie | neboli | kalkulačka (Mifflin-St Jeor ako calculator.net): chudnutie, udržanie, priberanie; denný zápis jedla; tréningy z appky sa pripočítajú samy |
| Odznaky | 15 odznakov, áno/nie | 11 druhov s úrovňami Drevo → Diamant a ukazovateľom; získané ostávajú |
| Narodeniny | nič | pozdrav, konfety, freeze navyše, narodeninový odznak (po zadaní dátumu) |
| Plank | 30 – 75 s | aj 15 s |
| Bezpečnosť | ťažšie verzie bez upozornení | upozornenia pri rizikových krokoch |
| Tipy | neboli | každý druhý deň „Vedel si?“ s tlačidlom k funkcii |
| Čo je nové | nebolo | po veľkom update sa raz ukáže toto porovnanie, potom je v menu |

---
*Big update: one ☰ menu top right, the workout keeps running in a mini player, rep counter from 0 with a +1 goal, last round to technical failure, calorie calculator and food log, tiered badges, birthday surprises, 15 s plank, safety notes, tips, and a "What's new" screen.*

## 1.3.2 (2026-10-05)
<!-- commit: a9ab12c6246a5e676aa4d8b0437503ddb8b2d6e6 -->

**Drobné úpravy.**

- všetky obrázky cvikov prejdené a schválené jeden po druhom (žltá = strana brucha, oranžová = uterák)
- Y-T-W ako pohľad zhora, drep 1 a 1/4 v 4 krokoch
- 5 ťažších verzií ako nové cviky (mostík na jednej nohe, pike a diamond klik s nohami na stoličke, drep 1 a 1/4, plank na jednej nohe) s tlačidlom Vymeniť priamo v tipe
- náročnosť pri každom cviku: ľahšie / stredné / náročnejšie
- kobra v strečingu
- „~“ namiesto „asi“

---
*Small update: all exercise drawings reviewed, 5 harder versions with a swap button in the tip, difficulty labels, cobra stretch.*

## 1.3.1 (2026-10-04)
<!-- commit: 1f9e202d776423460bb70664e2d8fb5206759d90 -->

**Drobné úpravy.**

- opravené obrázky: lakte pri kliku dozadu, pike klik s hlavou pred rukami, kolená, veslovanie
- konfety po predčasnom ukončení už nie sú odrezané
- jazyk sa vyberá v rolovacom okne
- 4 nové témy: Oceán, Víno, Bridlica, Káva
- rada, prečo mobil nevibruje (tichý režim / Nerušiť)

---
*Small update: figure fixes, confetti fix, language picker sheet, 4 more themes, vibration hint.*

## 1.3.0 (2026-10-04)
<!-- commit: 8c0688096097d97b9d178a723d4bd3c8d54738d0 -->

**Veľký update: denné texty, úprava histórie, výber cvikov.** Porovnanie s 1.2.0:

| | Predtým (1.2.0) | Teraz (1.3.0) |
|---|---|---|
| Text na úvode | stále rovnaký | každý deň iný, po tréningu oddychový, neopakuje sa 3 dni |
| Karty na úvode | nedali sa zavrieť | krížik na zavretie |
| História | len na čítanie | úprava, mazanie a ručné pridanie tréningu, rekordy sa prepočítajú |
| Reset | len séria | „Začať odznova“: história, séria a odznaky na nulu, profil ostane |
| Cviky | všetky vždy zapnuté | Nastavenia → Cviky: vypneš, čo nemôžeš, appka dá náhradu |
| Okná (Ako na to, Vymeniť) | občas mimo obrazovky | vždy celé na obrazovke |

---
*Big update: a new daily line every day, closable cards, edit/delete/add workouts in History, full reset, Settings → Exercises with automatic replacements, sheets always on screen.*

## 1.2.0 (2026-10-04)
<!-- commit: fcfe3aa0beb43c4d2c32f0bb3ed882d557960f99 -->

**Veľký update: jazyky a nový názov.** Porovnanie s 1.1.0:

| | Predtým (1.1.0) | Teraz (1.2.0) |
|---|---|---|
| Názov | Domáci tréning | **HW App** s novým logom a ikonou |
| Jazyky | len slovenčina | 11 jazykov (EN, SK, CS, PL, HU, UK, DE, ES, FR, IT, PT), vyberie sa podľa mobilu |
| Dátumy a čísla | slovenský formát | podľa zvoleného jazyka |
| Staré tréningy | po slovensky | zobrazia sa v novom jazyku |

---
*Big update: new name HW App with a new logo, 11 languages picked from the phone's language, local dates.*

## 1.1.0 (2026-10-04)
<!-- commit: 78d080ac13afa14201df8c8dec3596551f819d5f -->

**Veľký update: Nastavenia.** Porovnanie s 1.0.0:

| | Predtým (1.0.0) | Teraz (1.1.0) |
|---|---|---|
| Nastavenia | neboli | nová karta Nastavenia dole |
| Vzhľad | jedna farba | 4 tmavé témy |
| Zvuky | všetko spolu | zvlášť ťuknutia, efekty a časovač, hlasitosť, vibrácie, obrazovka nezhasne |
| Záloha | nebola | uloženie všetkých dát do súboru a obnova |
| Profil | karta dole | otvára sa cez fotku vpravo hore (jeho miesto dole dostali Nastavenia) |
| Prestávka | len odpočet | zaujímavosť o tréningu a povzbudenie |
| „Kopírovať pre AI“ | vždy zapnuté | voliteľné, predvolene vypnuté |

---
*Big update: Settings tab with 4 themes, separate sound toggles, volume, vibration, keep-awake, backup/restore, profile from the avatar, tips during rest, "Copy for AI" opt-in.*

## 1.0.0 (2026-10-03)
<!-- commit: 2ecfe41bf42369cf988382d6b24731ceb442d742 -->

**Prvá verzia (vtedy „Domáci tréning“).** Veľká verzia: celá appka.

- 3 tréningové dni A, B, C, cvičí sa obdeň: tlak, ťah, nohy a brucho v 2 alebo 3 kolách
- časovače, zvuky a prestávky medzi cvikmi
- obrázok, postup a video ku každému cviku, výmena cviku
- XP, levely, séria 🔥 so zamrazením, ranky pri cvikoch, týždenné výzvy
- história a profil
- dá sa nainštalovať do mobilu a funguje aj offline

---
*First version (then called "Domáci tréning"): A/B/C days, timers, sounds, drawings and videos, exercise swap, XP/levels, streak with freezes, ranks, weekly challenges, history, profile. Installable PWA, works offline.*

