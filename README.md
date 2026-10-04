<p align="center"><img src="assets/logo-wordmark.png" alt="HW App: home workout, no equipment" width="600"></p>

# HW App 💪

**HW App** (home workout app) is a free app for training at home with no equipment, in about 13 minutes. It runs on your phone like a normal app.

**Open it:** https://mikydon.github.io/hw-app/

## Install it on your phone
1. Open the link above in Chrome (Android) or Safari (iPhone).
2. Add it to your home screen:
   - **Android (Chrome):** menu ⋮ → *Install app* or *Add to Home screen*
   - **iPhone (Safari):** Share button → *Add to Home Screen*
3. Start it from the icon like any other app. It works offline too.

## What it does
- 3 workout days (A, B, C), trained every other day: push, pull, legs and core in a circuit of 2 or 3 rounds
- warm-up, timers, sounds and rest breaks between exercises, with tips during the rest
- a drawing, instructions and a video link for every exercise
- swap an exercise when one doesn't work for you
- XP, levels, a 🔥 streak with freezes, ranks per exercise (Wood to Diamond), weekly challenges and badges
- history with a calendar and a progress chart
- backup and restore of all your data as a file
- 11 languages: English, Slovenčina, Čeština, Polski, Magyar, Українська, Deutsch, Español, Français, Italiano, Português. The app picks your phone's language automatically; you can change it in Settings.

## Privacy
All your data (workouts, name, photo) is stored only on your phone, in this browser. Nothing is sent anywhere. If you clear the browser's data, the history is deleted too, so save a backup in Settings first.

## For developers
- Source: `src/App.jsx` (React), entry `src/main.jsx`
- Texts: `src/i18n/<lang>.js`. English (`en.js`) is the base; every other language falls back to it key by key.
  - To add a language: copy `en.js`, translate it, add it to `LANGS` and `SOURCES` in `src/i18n/index.js`, then run `node src/i18n/check.mjs <code>` (it checks keys, placeholders and plural forms).
- Build: `npm install`, then `npm run build`. This creates `index.html` with everything in one file.
- The site runs on GitHub Pages from the `main` branch, folder `/` (root).
- Logo and icons: `assets/mark.svg` (logo), `assets/icon-maskable.svg` (Android icon), `assets/logo-wordmark.svg`.
