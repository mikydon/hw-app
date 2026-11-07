# Google Play listing

- `listing/<lang>.txt`: line 1 = app name (≤ 30), line 2 = short description (≤ 80), the rest = full description (≤ 4000). Uploaded through Play Console → Hlavný záznam v obchode → "Import prekladov pomocou umelej inteligencie" (one file with all languages).
- Screenshots: `node tools/store/shots.mjs` (8 per language, 1080×1921 → crop to 1080×1920; `LANGS=sk,en`, `ONLY=01_home`), output in `store/out/shots/` (not committed).
- Feature graphic 1024×500: `node tools/store/feature.mjs` (uses the cropped shots in `store/out/shots/<lang>/`), output `store/out/fg/`.
- Keep the texts true: when ads or purchases arrive, change "No ads" in every language; the world leaderboard is off, so it is not mentioned.
