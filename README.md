<p align="center"><img src="assets/logo-wordmark.png" alt="HW App: home workout, no equipment" width="600"></p>

# HW App 💪

**HW App** (home workout app) is a free app for training at home with no equipment, and since 1.9.0 also with dumbbells, a bar or gym machines if you have them. It's an Android app; the website version works in any browser too.

## Install it on your phone (Android)
Needs Android 8.0 or newer.

1. On your phone, open the newest release: https://github.com/mikydon/hw-app/releases/latest
2. Download **HW-App-x.y.z.apk** (only this file) and open it.
3. If Android asks, allow installing apps from your browser.
4. Google Play Protect may say *App blocked to protect your device*, because the app isn't from the Play Store. Tap **Install anyway** (on some phones it's under *More details*):

   <img src="docs/play-protect-install-anyway.png" alt="Play Protect: tap Install anyway" width="300">

5. Updates: small ones arrive inside the app by themselves; for a big one the app shows a card with the new APK. Install it over the old one, your data stays.

**Coming from the website?** In the browser: Settings → *Save backup*. In the app: Settings → *Restore from backup*.

## Website (any phone, also iPhone)
Open https://mikydon.github.io/hw-app/ and add it to your home screen (Android Chrome: menu ⋮ → *Install app*; iPhone Safari: Share → *Add to Home Screen*). It works offline too. Data in the website and in the Android app are separate, unless you sign in to the same account on both: then they stay in sync.

## What it does
- a recommended plan with 3 workout days (A, B, C), trained every other day: push, pull, legs and core in a circuit of 2 or 3 rounds, no equipment needed
- your own workout plans: pick exercises and sets for every weekday (empty days are rest days), sort plans into groups; small icons show what each day trains and tips say when a muscle gets little work
- 134 exercises in body-part groups (chest, back, shoulders, arms, legs, glutes, calves, core) with a search that knows other names too: bodyweight, dumbbells, kettlebells, bands, a pull-up bar, gym machines and cables (an equipment filter keeps machines away from home users)
- weights: free-weight and machine exercises log kg × reps, start at last time's weight and show weight levels (when to go heavier)
- the rep counter starts at last time's result with a +1 goal, so you keep beating yourself; sets with 0 don't count
- rest that waits for you: +15/+30/+60 s, at 0 it beeps and counts on, and your real rest is saved; in the Android app the rest runs on the lock screen and beeps with the screen off
- add exercises during a workout when you're not tired yet, and notes to any exercise or rest
- one menu (☰, top right) for everything; during a workout you can open other screens and the workout keeps running in a small floating window
- calorie calculator (Mifflin-St Jeor, like calculator.net) with lose / maintain / gain targets, workouts from the app added automatically, and a daily food log
- birthday surprises (greeting, confetti, a free streak freeze) when you enter your birth date
- warm-up, timers, sounds and rest breaks between exercises, with tips during the rest; optional stretching at the end (hip flexor, cobra, child's pose)
- instructions, tips and a "how to" web search for every exercise, and a drawing (yellow line = belly side) for the 27 bodyweight ones
- exercises marked easier, medium or harder; when one gets easy, its tip points to the harder version and lets you swap to it
- swap an exercise when one doesn't work for you, or turn off exercises you can't do in Settings → Exercises (the app replaces them with another of the same type)
- XP, levels, a 🔥 streak with freezes, a rank for every exercise (Iron to Obsidian; weighted ones by your body weight), body ranks for 9 body parts on a drawing of your body, weekly challenges and 47 badges: badges with levels, rare, epic and legendary one-off badges, and secret ones
- a Stats page that draws your training: 12 weeks day by day, reps, time or workouts per week, calorie targets hit and your best weekdays
- an optional account (16+): friends by code or link, messages, friend streaks, a friends leaderboard (the world list is paused for now), a profile page others can open with your last workout on it, and a cloud backup that keeps your phone and the website in sync
- Muscle Deck: a poker-style card game powered by your training (higher exercise ranks make stronger cards), with jokers, drills that level up hands, a tutorial game and a picture guide
- diamonds you earn by training (or get with a code from HW App), a Shop with streak freezes, XP boosts and profile looks (frames, banners, titles, name effects and profile effects), and a weekly chest for finishing all 3 weekly challenges; nothing is sold for money
- an interactive guide that shows how the app works, and notifications for messages and new versions (Android app)
- 8 dark themes, 6 main colours and several looks for the boxes
- history with a calendar and a progress chart; edit or delete past workouts, or add one you did without the app
- a new motivational line every day (a rest-day one after a workout), and cards you can close
- backup and restore of all your data as a file
- 15 languages: English, Slovenčina, Čeština, Polski, Magyar, Українська, Deutsch, Español, Français, Italiano, Português, 中文（简体）, 日本語, 한국어, Bahasa Indonesia. The app picks your phone's language automatically (English if yours isn't there yet); you can change it in Settings. Found a mistake or missing your language? See [TRANSLATING.md](TRANSLATING.md).

What changed in each version: [CHANGELOG.md](CHANGELOG.md).

## Privacy
Without an account, all your data (workouts, calories, name, photo, birth date) is stored only on your device: in the app, or in the browser on the website. An account (optional, 16+) adds friends, a leaderboard, messages, a profile page others can open (you choose who: friends, everyone or only you; it shows your levels, badges, ranks and your last workout) and a cloud backup, stored with Google Firebase. The rest timer on the lock screen (Android app) asks for the "Physical activity" permission only because Android requires it for that kind of timer; the app reads no activity data with it. If you connect Health Connect, the app reads only your steps, weight and height (and, if you choose, the calories of food logged in other apps), and they stay on your phone. If you clear the browser's data, the website's history is deleted too, so save a backup in Settings first. Full policy: [privacy.html](https://mikydon.github.io/hw-app/privacy.html).

## For developers
- Source: `src/App.jsx` (React), entry `src/main.jsx`
- Texts: `src/i18n/<lang>.js`. English (`en.js`) is the base; every other language falls back to it key by key.
  - To add a language: copy `en.js`, translate it, add it to `LANGS` and `SOURCES` in `src/i18n/index.js`, then run `node src/i18n/check.mjs <code>` (it checks keys, placeholders and plural forms).
- Build: `npm install`, then `npm run build`. This creates `index.html` with everything in one file.
- The site runs on GitHub Pages from the `main` branch, folder `/` (root).
- Logo and icons: `assets/mark.svg` (logo), `assets/icon-maskable.svg` (Android icon), `assets/logo-wordmark.svg`.
- Emoji: the emoji the app shows come from `fonts/hw-emoji.ttf`, made from Microsoft's [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) 3D set (MIT licence, `tools/emoji/LICENSE-fluent-emoji.txt`) by `tools/emoji/build_font.py` (uses Google's `emoji_builder.py`, Apache 2.0). Chat messages keep the phone's emoji.

## Credits
- Emoji: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) © Microsoft Corporation, MIT licence.
- Fonts: Big Shoulders Display, Figtree and Oswald (SIL Open Font License), from [Fontsource](https://fontsource.org).
