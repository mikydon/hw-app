# HW App: notes for Claude

Home bodyweight workout app by Michael (GitHub: mikydon). Formerly "Domáci tréning". The UI is in 11 languages (English base, Slovak original).
Talk to Michael in casual Slovak. Before you deliver anything, test it (build plus a browser run). He wants certainty, not "should work".

## Layout
- `src/App.jsx`: the whole React app in one file (exercise data, figures, ranks, challenges, UI). No user-facing text lives here.
- `src/i18n/`: `en.js` (base), `sk cs pl hu uk de es fr it pt`.js, `index.js` (`t`/`tp`, Intl dates, `LANGS`), `check.mjs` (run `node src/i18n/check.mjs` after any text change: keys, placeholders, plural forms).
  - In App.jsx `t` is imported as `T` and `tp` as `TP` (locals named `t` exist). `applyLang()` copies texts into `EX`, `WARMUP`, `COOL`, `FIGS` labels and `RANKS`, like `applyTheme()` does for colours.
  - Any new string: add it to `en.js` and every locale file. Keep `{placeholders}`. Slovak wording is Michael's; keep it.
  - Units are codes (`arm`, `leg`, `side`). History saved before v1.2 has Slovak names and units (`/ruku`…); display goes through `exName()` and `unitStr()`.
- `assets/`: `mark.svg` (logo), `icon-maskable.svg`, `logo-wordmark.svg/png`. Icons in the root are rendered from them with Chromium.
- `src/main.jsx`: entry. Renders `<App/>` and registers `sw.js` when served over http(s).
- `template.html`, `build.mjs`: `npm install && npm run build` bundles `src/` with esbuild and inlines it into `index.html`.
- `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-*.png`, `icon-maskable-*.png`, `apple-touch-icon.png`: the deployable PWA. GitHub Pages serves it from `main`, root (https://mikydon.github.io/hw-app/).
- Always commit the rebuilt `index.html` together with any `src/` change.
- Bump `CACHE` in `sw.js` and `APP_VERSION` in `App.jsx` on releases.

## Storage
- `store` adapter: uses `window.storage` (Claude artifact) when present, otherwise `localStorage`.
- Keys (keep the old names, or users lose their data):
  - `domaci-trening-v1`: `{history, session}`
  - `domaci-trening-v1-profile`: name, pfp (256 px JPEG data URL), `freezeDays`, `streakResetTs`
  - `domaci-trening-v1-settings` (includes `lang`; missing = auto-detect from the phone)
- History entries: `{date, ts, day, rounds, items:[{id,name,unit,res}], prs, rankUps, warm, cool}`. XP, levels, ranks, challenges and streak are all derived from history.
- Backup export/import is JSON with `app: "hw-app"` (import also accepts the old `"domaci-trening"`). It currently uses an `<a download>` link. In the APK this must switch to the Capacitor Share/Filesystem plugins.

## Must keep
- Audio: one global `window._wac` AudioContext, unlocked on first click. Play sounds via `ctx.resume().then(play)`. Never chain sounds with `setTimeout` (this broke sound on Android). Multi-note effects are scheduled on the audio clock inside one `melody()` call.
- Timer beeps (`beep`) stay fixed. Reward sounds have variants, with no immediate repeat.
- Settings are mirrored to `window._wset`. Sound categories are `sndTap`, `sndFx` and `sndTimer`, plus `volume`, `vibrate`, `keepAwake` and `aiCopy` (off by default).
- Exercise videos are links only (opened on YouTube). Verify every link with YouTube oEmbed before adding it.

## Program logic (evidence-based, keep unless asked)
- Days A, B and C, trained every other day. Each day has push, pull, legs and core, done as a circuit of 2 or 3 rounds.
- Rest is 30 s between exercises and 60 s between rounds.
- Last round is taken close to failure (1–2 reps in reserve).
- Post-workout stretching is optional, per the 2025 Delphi consensus.

## Roadmap (agreed order)
1. Done in v1.2.0: 11 languages, HW App branding and logo. Settings tab was v1.1.0.
2. Real Android APK via Capacitor, with a GitHub Actions build to Releases.
   - Use the same signing key every time so updates keep user data.
   - Store the key as a repo secret.
   - Add an in-app "new version" check against GitHub Releases.
3. Firebase (free Spark plan): accounts, friend list and a global leaderboard (level, streak, trainings).
   - Profile photos go into Firestore, because Storage is no longer free since Feb 2026.
   - Add a privacy policy and an account-deletion option.

## Testing recipe
Bundle with esbuild into a test page. Run Playwright with Chromium at `/opt/pw-browsers/chromium`. Use `page.clock` to fast-forward timers. Google Fonts are blocked in the sandbox; for layout checks serve them from `@fontsource` packages via `page.route`. Check long languages (hu, de, uk) for overflow. Check the flows: workout, rest, swap, summary, reload persistence, settings and backup.
