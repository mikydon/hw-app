# HW App: notes for Claude

Home bodyweight workout app by Michael (GitHub: mikydon). Formerly "Domáci tréning". The UI is in 11 languages (English base, Slovak original).
Talk to Michael in casual Slovak. Before you deliver anything, test it (build plus a browser run). He wants certainty, not "should work".

## Layout
- `src/App.jsx`: the whole React app in one file (exercise data, figures, ranks, challenges, UI). No user-facing text lives here.
- `src/i18n/`: `en.js` (base), `sk cs pl hu uk de es fr it pt`.js, `index.js` (`t`/`tp`, Intl dates, `LANGS`), `check.mjs` (run `node src/i18n/check.mjs` after any text change: keys, placeholders, plural forms).
  - In App.jsx `t` is imported as `T` and `tp` as `TP` (locals named `t` exist). `applyLang()` copies texts into `EX`, `WARMUP`, `COOL`, `FIGS` labels and `RANKS`, like `applyTheme()` does for colours.
  - Any new string: add it to `en.js` and every locale file. Keep `{placeholders}`. Slovak wording is Michael's; keep it.
  - Units are codes (`arm`, `leg`, `side`). History saved before v1.2 has Slovak names and units (`/ruku`…); display goes through `exName()` and `unitStr()`.
  - Daily lines: `quotes` (training days) and `restDay` (trained today or yesterday, never "go train"); `doneTitles`/`doneSubs` vary the "done today" card. They are picked by index, so every locale must have the same number of items (`check.mjs` enforces it).
- `assets/`: `mark.svg` (logo), `icon-maskable.svg`, `logo-wordmark.svg/png`. Icons in the root are rendered from them with Chromium.
- `Sheet` (bottom sheets: how-to, swap, editors) renders into `<body>` with a React portal. Inside a screen, the `.scr` slide-in animation makes the screen the containing block for `position: fixed`, which put sheets off-screen (fixed in v1.3.0). Keep the portal and `.sheetBox` (border-box, max-height from `dvh`). `Confetti` uses a portal for the same reason (it was cut off on short screens).
- Settings: language is one row that opens a scrollable sheet (room for more languages). Themes: navy, black, forest, plum, ocean, wine, slate, coffee (dark only; keep dim/panel contrast ≥ 4.5, names in `themes` of every locale).
- Figures (`FIGS`): side view, person faces right, y grows down, ground y = 94. Pose options: `hide`, `supine` (lying on the back: belly side flips), `fl` (limb-length override), `elbows` (explicit), `grip` (fist on the near hand), `bad` (red "wrong" frame), `top: "Y"|"T"|"W"` (back view, `TopFig`). Props: `frame`, `door`, `chair`, `table`, `wall`, `towel`/`towelFloor` (orange, `TOWEL`, own legend lines), `diamondTop` (hands inset); `mid: true` draws a prop between the far and near limbs. Belly marker: the front half of the torso line is yellow (offset 1.5, t 0.12–0.88), drawn on top so limbs never hide it; same place on every figure. Near limbs are bright, far limbs darker: when both sides matter (dead bug, bird dog, bicycle crunch) the bright and dark limbs are the two sides of the body. 4 poses render as a 2×2 grid. Limb lengths are fixed (`FL`); hands/feet are targets and IK picks the elbow/knee side by `armBend`/`legBend`, so a wrong sign flips a joint (elbows must point back toward the feet in push-ups/rows, knees on the floor in knee push-ups, etc.). A target farther than the limb length leaves the hand/foot short of it (gaps to frames/towels). `hide: ["farArm"|"farLeg"]` drops the back limb when it only confuses. Check new poses by printing joint positions and looking at a render; Michael reviews figures one by one.
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
  - `domaci-trening-v1-settings` (includes `lang`; missing = auto-detect from the phone; `exOff` = exercises turned off in Settings → Exercises)
  - `domaci-trening-v1-ui`: closed cards (`dailyHidden`, `doneHiddenTs`, `welcomeHidden`), today's daily line and the last 3 days of lines (`daily`, `recent`), the done-card variant (`doneVar`). Not in backups; full reset clears it.
- History entries: `{date, ts, day, rounds, items:[{id,name,unit,res}], prs, rankUps, warm, cool}` (+ `manual: true` when added by hand). XP, levels, ranks, challenges and streak are all derived from history.
- History can be edited, deleted or added to in the History tab. Every such change goes through `editHistory()`: sorted by date then time (`sortHistory`), then `prs`/`rankUps` recomputed in order (`recomputeFlags`, same rules as the end of a workout).
- Full reset (Settings) empties history, freeze days, `streakResetTs` and the UI memory; name, photo and settings stay.
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
- Turned-off exercises (`exOff`): `effId(slot)` replaces a day's exercise with the next one of the same type from `ALT_GROUPS` that is on, preferring ones no other day uses. At least one per type must stay on (the UI blocks the last one). A workout stores `session.base` (slot → exercise) at the start; older sessions without it fall back to `effId`.

## Roadmap (agreed order)
1. Done in v1.2.0: 11 languages, HW App branding and logo. Settings tab was v1.1.0.
   Done in v1.3.0: sheet fix, daily lines + closable cards, history editing/manual add, full reset, Settings → Exercises.
   Done in v1.3.1: figure fixes (push-up elbows back, pike head in front of hands, knees, rows), confetti fix, language sheet, 4 more themes, vibration hint. Name change still open (Michael suggested "howo"; HOWO is a Sinotruk truck brand).
   Done in v1.3.2 (branch `figures`, merged Oct 5, 2026): every figure reviewed and approved by Michael one by one (send one image with the English name plus the app's description and tip), Y-T-W as a top view, cobra stretch, sliding-towel legend, swap button in tips.
   Also in v1.3.2: harder versions as their own exercises with `swapTip` (⇄ swap button under the tip in a workout): `sbridge`, `r1e` (feet-elevated pike), `k3e` (feet-elevated diamond), `n1q` (1¼ squat, 4 poses), `b5l` (single-leg plank). Difficulty `diff` on all 27 exercises (`DiffChip`: program exercises `mid`, easier alternatives `easy`, harder versions `hard`; it replaced the `easier` tag). One-leg versions use the unit `leg`; tips explain "10 left + 10 right = log 10". "~" instead of "asi" in all texts. Michael chose not to add a single-leg towel curl (cramp/strain risk).
   Next version (v1.4.0), Michael's requests from Oct 4–5, 2026, not started yet:
   - Progressive overload nudge: from the 2nd time an exercise is done, show last time's result and a small "+1" target (aim for at least one more). If he doesn't beat it, that's fine. Decided (Oct 5): the last round goes to technical failure (stop when the next rep would break form); update the program rule texts accordingly.
   - Start every rep input at 0, never an estimate (today it starts at `EX[id].start` or last time's number).
   - Plank: add a 15 s option to `durs`.
   - Navigation redesign: remove the bottom tab bar. Put everything (History, Settings, Profile, the new calories…) behind one top-right menu icon where the profile button is now (a common icon, like other apps use), ordered logically, with a sleek modern animation.
   - Calorie calculator like https://www.calculator.net/calorie-calculator.html: input birth date (or only the year), weight, height; show calories to lose, to gain/bulk and to maintain. He picks one, then logs eaten calories by day (saved, with history). Age updates on its own on birthdays, so the target recalculates. Weight/height editable in a settings page placed after the main calorie log screen. Mifflin-St Jeor (calculator.net default), sex asked. Birth YEAR is required (age); the full date is optional, but saving without it asks "are you sure? no birthday greeting, confetti or achievement". Activity: the 6 calculator.net levels, but they describe activity OUTSIDE the app ("only the app" = sedentary); the app's own workouts are added on top automatically, and the screen says so.
   - Help hints: now and then show small helper lines, e.g. "Want a different theme? Settings → Themes".
   - Use the app during a workout: open Settings, Profile, etc. mid-workout without losing the workout. While away from the workout screen, show a small floating mini player (like YouTube's minimized video) with the running rest/hold timer; tapping it expands back to the workout. Nothing may reset.
   - Birthday: greeting ("VŠETKO NAJLEPŠIE"), confetti around the profile, some texts change ("dnes je tvoj deň"), a free freeze day, and a tiered achievement for opening the app on a birthday (1st … 10th birthday).
   - Achievements: all of them get tiers like the exercise ranks (Wood → Iron → … → Diamond), e.g. workouts 1/5/10/25/50/100/200; keep what users already earned.
   - Safety notes in tips/level-up texts for every exercise where a harder step has a real risk (e.g. single-leg towel curl: shorter range first; on cramp or dropping hips go back to two legs).
2. After that (APK, version number to be decided): Real Android APK via Capacitor, with a GitHub Actions build to Releases.
   - Use the same signing key every time so updates keep user data.
   - Store the key as a repo secret.
   - Add an in-app "new version" check against GitHub Releases.
3. Firebase (free Spark plan): accounts, friend list and a global leaderboard (level, streak, trainings).
   - Profile photos go into Firestore, because Storage is no longer free since Feb 2026.
   - Add a privacy policy and an account-deletion option.

## Testing recipe
Bundle with esbuild into a test page. Run Playwright with Chromium at `/opt/pw-browsers/chromium`. Use `page.clock` to fast-forward timers. Google Fonts are blocked in the sandbox; for layout checks serve them from `@fontsource` packages via `page.route`. Check long languages (hu, de, uk) for overflow. Check the flows: workout, rest, swap, summary, reload persistence, settings and backup. Since v1.3.0 also: sheets fully on screen after scrolling, daily line kinds and no repeats over many days (`page.clock.setFixedTime` + reload), closing cards, history edit/add/delete with record recompute, full reset, Exercises page (last one locked, replacement used in a workout). Seed localStorage once per context (guard with a sessionStorage flag) so reloads keep the data.
