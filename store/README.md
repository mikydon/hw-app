# Google Play listing

- `listing/<lang>.txt`: line 1 = app name (≤ 30), line 2 = short description (≤ 80), the rest = full description (≤ 4000). Uploaded through Play Console → Hlavný záznam v obchode → "Import prekladov pomocou umelej inteligencie" as ONE file with all languages: `node tools/store/onefile.mjs` writes it (`store/out/listing-all.txt`, blocks `=== <Language> – <code> ===` with App name / Short description / Full description, and it checks the three limits). Michael wants the texts only as this one file (his folder: `Play Store Description Text\<next number>.txt`).
- README screenshots (`docs/screens/`, 585×1266): `MORE=1 LANGS=en W=390 H=844 DPR=1.5 ONLY=01_home,02_workout,05_profile,09_history,10_shop,08_deck OUT=<dir>/ node tools/store/shots.mjs` (`MORE=1` adds History and the Shop's Looks page).
- Screenshots: `node tools/store/shots.mjs` (8 per language, 1080×1921 → crop to 1080×1920; `LANGS=sk,en`, `ONLY=01_home`), output in `store/out/shots/` (not committed).
- Tablets / PC (English only): `W=960 H=540 DPR=2` (7-inch) and `W=1280 H=720 DPR=1.5` (10-inch, also used for PC/Chromebook) → 1920×1080; skip 06 (the wide Profile already shows the stats page).
- Feature graphic 1024×500: `node tools/store/feature.mjs` (uses the cropped shots in `store/out/shots/<lang>/`), output `store/out/fg/`.
- Keep the texts true: when ads or purchases arrive, change "No ads" in every language; the world leaderboard is off, so it is not mentioned.
