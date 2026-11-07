<p align="center"><img src="assets/logo-wordmark.png" alt="HW App: home workout, no equipment" width="600"></p>

<p align="center">
  <a href="https://github.com/mikydon/hw-app/releases/latest"><img src="https://img.shields.io/github/v/release/mikydon/hw-app?label=Android%20app&color=ffd23f&labelColor=172443&style=for-the-badge" alt="Latest version"></a>
  <img src="https://img.shields.io/badge/price-free-3ddc84?labelColor=172443&style=for-the-badge" alt="Free">
  <img src="https://img.shields.io/badge/languages-15-8fd3ff?labelColor=172443&style=for-the-badge" alt="15 languages">
  <img src="https://img.shields.io/badge/Android-8.0%2B-b78cff?labelColor=172443&style=for-the-badge" alt="Android 8.0+">
</p>

<h3 align="center">🏠 Train at home, no equipment needed</h3>
<p align="center">🏋️ Got dumbbells or a gym? Your plans can use them too.</p>

<p align="center">
  <a href="https://github.com/mikydon/hw-app/releases/latest"><b>⬇️ Download the APK</b></a> &nbsp;•&nbsp;
  <a href="https://mikydon.github.io/hw-app/"><b>🌐 Open the website</b></a> &nbsp;•&nbsp;
  <a href="CHANGELOG.md"><b>📝 What's new</b></a>
</p>

<p align="center">
  <img src="docs/screens/home.png" width="19%" alt="Home: your week and today's workout">
  <img src="docs/screens/workout.png" width="19%" alt="A workout: last time and a +1 goal">
  <img src="docs/screens/profile.png" width="19%" alt="Profile: body ranks">
  <img src="docs/screens/stats.png" width="19%" alt="Stats: 12 weeks day by day">
  <img src="docs/screens/deck.png" width="19%" alt="Muscle Deck: the card game">
</p>

---

## ✨ What's inside

| | What you get |
|---|---|
| 🗓️ **Plans** | A ready plan (days A, B, C every other day: push, pull, legs, core, ~19 min) or your own plans for every weekday. |
| 💪 **134 exercises** | Bodyweight, dumbbells, kettlebells, bands, a pull-up bar, gym machines and cables, in body-part groups with a smart search. |
| 📈 **Beat last time** | Every set starts at last time's number with a **+1 goal**. Weights log kg × reps and tell you when to go heavier. |
| ⏱️ **Rest that waits** | +15 / +30 / +60 s, counts on after 0 and saves your real rest. In the app it runs on the lock screen and beeps with the screen off. |
| 🏆 **Ranks and badges** | Every exercise ranks from Iron to Obsidian, 9 body parts get ranks on a drawing of your body, 47 badges (some secret 🤫). |
| 🔥 **Streaks** | Train every other day to keep the streak; freezes save it when life happens. |
| 📊 **Stats** | 12 weeks day by day, weekly charts, your best weekdays, calories at a glance. |
| 🍎 **Calories** | Daily target (Mifflin-St Jeor) with your workouts added, a food log and Health Connect (steps, weight, food). |
| 👥 **Friends** | An optional account: friends, messages, friend streaks, a leaderboard and a profile they can open, with your last workout. |
| 🃏 **Muscle Deck** | A card game powered by your training: higher ranks, stronger cards. Jokers, drills, a shop and a practice game. |
| 💎 **Shop** | Diamonds you earn by training: streak freezes, XP boosts, profile frames, banners, titles and effects. Nothing is sold for money. |
| 🎨 **Yours** | 8 dark themes, 6 main colours, several looks, 15 languages and a guide that shows you around. |

## 📲 Install (Android 8.0+)

1. Open the [newest release](https://github.com/mikydon/hw-app/releases/latest) on your phone and download **HW-App-x.y.z.apk**.
2. Open it. If Android asks, allow installing apps from your browser.
3. If Play Protect says *App blocked to protect your device*, tap **Install anyway** (sometimes under *More details*).

<details>
<summary>📷 Show me the Play Protect screen</summary>
<br>
<img src="docs/play-protect-install-anyway.png" alt="Play Protect: tap Install anyway" width="300">
</details>

Small updates arrive inside the app by themselves; for a big one the app downloads the new APK for you. Your data stays.

## 🌐 Website (any phone, also iPhone)

Open **[mikydon.github.io/hw-app](https://mikydon.github.io/hw-app/)** and add it to your home screen (Android Chrome: ⋮ → *Install app*; iPhone Safari: Share → *Add to Home Screen*). It works offline too. Sign in to the same account in the app and on the website and they stay in sync.

<details>
<summary>📱 What only the Android app can do</summary>

- the rest timer on the lock screen, with a beep and vibration while the screen is off
- Health Connect (steps, weight, height, food from other apps)
- notifications for messages, friend requests and new versions
- backups saved in a folder on your phone, also automatically
- 120 Hz, the same text size for everyone, vibration that works with touch feedback off
</details>

## 🔒 Privacy

Without an account, everything stays on your device. An account (optional, 16+) adds friends, messages, a profile page (you choose who sees it) and a cloud backup on Google Firebase. Health Connect data never leaves your phone. The lock-screen rest timer asks for *Physical activity* only because Android requires it for that kind of timer; the app reads no activity data with it. Full policy: [privacy.html](https://mikydon.github.io/hw-app/privacy.html).

## 🌍 Languages

English, Slovenčina, Čeština, Polski, Magyar, Українська, Deutsch, Español, Français, Italiano, Português, 中文（简体）, 日本語, 한국어, Bahasa Indonesia. The app follows your phone's language. Found a mistake or missing yours? See [TRANSLATING.md](TRANSLATING.md).

<details>
<summary><b>🛠️ For developers</b></summary>

- Source: `src/App.jsx` (React), entry `src/main.jsx`
- Texts: `src/i18n/<lang>.js`. English (`en.js`) is the base; every other language falls back to it key by key.
  - To add a language: copy `en.js`, translate it, add it to `LANGS` and `SOURCES` in `src/i18n/index.js`, then run `node src/i18n/check.mjs <code>` (it checks keys, placeholders and plural forms).
- Build: `npm install`, then `npm run build`. This creates `index.html` with everything in one file.
- The site runs on GitHub Pages from the `main` branch, folder `/` (root).
- Logo and icons: `assets/mark.svg` (logo), `assets/icon-maskable.svg` (Android icon), `assets/logo-wordmark.svg`.
- Emoji: the emoji the app shows come from `fonts/hw-emoji.ttf`, made from Microsoft's [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) 3D set (MIT licence, `tools/emoji/LICENSE-fluent-emoji.txt`) by `tools/emoji/build_font.py` (uses Google's `emoji_builder.py`, Apache 2.0). Chat messages keep the phone's emoji.

</details>

## 🙏 Credits
- Emoji: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) © Microsoft Corporation, MIT licence.
- Fonts: Big Shoulders Display, Figtree and Oswald (SIL Open Font License), from [Fontsource](https://fontsource.org).
