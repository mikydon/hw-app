# Changelog

HW App is an Android app: download the APK from the newest release (on your phone, open it to install). Small updates arrive inside the app by themselves; a big update (second number) is a new APK. The website https://mikydon.github.io/hw-app/ keeps working too.

Version numbers: **1** = the app, the second number = a big update (a new APK), the third = small fixes and tweaks that arrive by themselves (after 9 a fourth number is added: 1.0.9 → 1.0.9.1). Every big update compares each change with how it was before.

The website https://mikydon.github.io/hw-app/ runs the same code as the app and updates itself when you open it; points marked *(Android app only)* (APK installs, in-app updates) don't apply to it.

Everything before the Android app is **Browser beta** (the website), numbered 1.0.0 to 1.4.2. The Android app starts again at 1.0.0.

<!-- New version: add a "## x.y.z (date)" section on top (web-only history uses "## Browser beta x.y.z (date)"). On a push to main, .github/workflows/build.yml builds everything and .github/scripts/releases.sh creates/updates the releases (commit = the push, or the one in a commit comment). -->

## 1.3.0 (2026-10-10)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.2.1:

| | Before (1.2.1) | Now (1.3.0) |
|---|---|---|
| Vibration *(Android app only)* | with "touch feedback" off in the phone's settings the app didn't vibrate at all (Android 13+ silences vibrations without attributes then) | the end of rests and holds vibrates like an alarm (the app's own small plugin with the ALARM usage), also in silent mode and whatever the touch feedback setting |
| Weight and height *(Android app only)* | typed in by hand and changed by hand | taken from Health Connect (Samsung Health, smart scales…) and kept up to date; the newer value wins, so a weight typed in the app is never overwritten by an older Health Connect record |
| First start *(Android app only)* | every detail typed in | right after the nickname: "Connect Health Connect?"; yes = steps, weight and height load by themselves and those questions are skipped (Health Connect has no age or gender, so those are still asked); no = type them in |
| Texts | some still mentioned tabs at the bottom, clearing the browser (in the app) or silent mode for vibration | reviewed in all 14 languages: ☰ menu → Profile, backups when changing phones, alarm vibration, Health Connect with steps, weight and height |
| Privacy policy | steps and food calories | also weight and height ([privacy.html](https://mikydon.github.io/hw-app/privacy.html)) |
| Calories on the main screen | an input field, an Add button and week dots in one crowded card | one clean card: eaten vs target, a thin bar and one line; tapping it opens Calories, where food is logged |
| Looks | solid coloured boxes in every layout | new **Liquid glass** layout (first in the list): see-through frosted boxes over soft colour blobs of the theme, like on iPhones; the top bar, the floating Start bar, the mini player, the ☰ menu and the sheets are frosted glass too |
| "Can't train today" sheet | its save button said "Skip and save workout" (two texts had the same name since 1.2.0, so one replaced the other) | "Save the reason" again; the translation check now catches a name used twice |

## 1.2.1 (2026-10-10)

- When a big update includes only one small update, "What's new" and the release notes say "Also the small update 1.1.1" instead of "1.1.1–1.1.1".

## 1.2.0 (2026-10-10)

**A big update: a new APK** (install it over the old app; your data stays). From now on the next new APKs download inside the app. Compared with 1.1.1:

| | Before (1.1.1) | Now (1.2.0) |
|---|---|---|
| Big updates *(Android app only)* | "Download" opened the browser; you had to find the APK in your downloads and open it | the APK downloads inside the app, with a percentage and a filling bar on the card and a thin line under the top bar on every screen; when it's done it waits until you tap Install (never during a workout); Android asks once to allow installs from HW App, then shows its normal "update this app?" confirmation |
| First start | gender, birth date, height, weight and activity on one long page | one question per screen (nickname → gender → birthday → height → weight → activity → goal), each saved on Next, every step skippable, with Back |
| Birth month and day | the phone's grey dropdown lists | grids of months and days in the app's colours (also in Calories) |
| Example height and weight | grey 180 cm and 75 kg in the empty fields | height shows 0; the weight field shows a healthy weight for the height you entered (BMI 22) |
| Food calories from Health Connect *(Android app only)* | connecting added food from other apps to your own entries straight away | steps connect by themselves; food calories are optional ("Also connect food calories"), and you choose and confirm how they count: only Health Connect (your own entries don't count on those days but stay saved, and count again if you disconnect) or added together; every food entry from Health Connect is listed in Calories with its time and app (today open, older days behind an arrow) |
| Today's calorie target | only the final number | "How is the target calculated?" shows the sum: a normal day, your goal, today's workout and extra steps |
| Vibration setting | turning it on did nothing you could feel | the phone vibrates briefly when you turn it on |
| Languages | 11 | 14: Chinese (Simplified), Japanese and Korean are new; the language list links to [TRANSLATING.md](https://github.com/mikydon/hw-app/blob/main/TRANSLATING.md), where anyone can fix a translation or add a language (reviewed, shipped with the next big update) |

## 1.1.1 (2026-10-10)

- "What's new" for a big update also lists all the small updates before it, so whoever installs the new APK sees everything they got (for 1.1.0: 1.0.1–1.0.7). The GitHub release notes of a big update do the same.

## 1.1.0 (2026-10-10)

**A big update: a new APK** (install it over the old app; your data stays). Compared with 1.0.7:

| | Before (1.0.7) | Now (1.1.0) |
|---|---|---|
| Steps *(Android app only)* | calories only knew your activity level and the app's workouts | with your permission the app reads your daily steps from Health Connect (Samsung Health, Google Fit, Fitbit… all write there); steps above what your activity level already assumes add calories to the day's target (~0.5 kcal per kg per km), so nothing is counted twice; calories you log in other apps (Samsung Health, MyFitnessPal…) count as eaten automatically (can be turned off) |
| Android version *(Android app only)* | Android 7.0 and newer | Android 8.0 and newer (Health Connect needs it) |
| Privacy policy | not written anywhere | [privacy.html](https://mikydon.github.io/hw-app/privacy.html), linked at the bottom of Settings: your data stays on your device; only steps and eaten calories are read from Health Connect, never sent anywhere |
| Calendar in History | a trained day was all green; calories weren't shown | top-left corner = workout (green), bottom-right = calories (light orange = logged, orange with ✓ = target hit), with a legend |
| Calorie colours, week dots | calories green/turquoise like workouts; unlabeled dots | calories orange, workouts green; the dots show weekdays and today's date |
| Workout length | two wide buttons, Start below | squares 19 / 13 min with Start next to them, like the floating bar (all looks) |
| Badges and ranks | each in its own coloured frame | one box with quiet tiles |
| Looks | 3 layouts | 5 layouts (new: Glass, Accent) |

## 1.0.7 (2026-10-10)

- The main screen is split into boxes with small headings (This week, Today's workout, Exercises, Workout length), next to the Calories and Challenges boxes. Before: one long open page.
- Settings → Appearance → Layout: Boxes (default), Tiles (lighter, tighter boxes, also on the other screens) or Open (the old look), to compare on the phone.
- The side menu is clearer: profile box, the screens in one box, and at the bottom one box about the app (version + What's new, newest version on GitHub, update state; on the website the Android app link).

## 1.0.6 (2026-10-10)

- Floating start bar on the main screen: when the rounds choice is off screen, a bar slides up with two small squares (19 and 13 min) and a wide "Start day X". It slides away when the rounds buttons are in view. Before: one sticky Start button without the choice of length.
- First start: the app asks for a nickname, then gender, birth date, height, weight and activity, then the calorie goal. Every step can be skipped. Whatever is still missing (nickname, data for calories, goal) is listed at the top of the main screen with an "Add" button that opens the right step. Before: nothing was asked; calories had to be found in the menu.
- The calorie form says "Gender" again (instead of "Man or woman?").

## 1.0.5 (2026-10-10)

- Tempo guide: exercises with a fixed tempo (e.g. push-ups "3 s down, short pause, up") have a "▶ Tempo" button in the workout. A circle shrinks on the way down, grows on the way up and turns into a bar that fills during a hold or pause, with the phase name and the seconds left; it repeats every rep until you turn it off. No guide where the tempo isn't a fixed rhythm (bicycle crunch, Y-T-W, 1¼ squat).
- "🧊 I can't train today…" (shown when the streak is at risk, and from the freeze card in Profile) asks for the reason: illness, pain or injury, work or school, travel, other, plus an optional note. With a freeze left it uses one; without, the reason is still saved. The History calendar shows such days in blue with the reason's icon. (Before: the button only used a freeze.)
- "💛 Support the app" moved from the menu to the bottom of Settings. The menu shows the newest version on GitHub (in the app and on the website); tapping it opens the releases page.
- Calories on the main screen: eaten vs target with a bar, a line for the time of day (breakfast, lunch, how much is left, target hit), quick add and a button to Calories. Before: only on the Calories screen. Without the calculator set up, a "Set up calories" card.
- Calorie streak 🥗: days in a row with calories logged; dots for the last 7 days: green = logged, turquoise = target hit (within ±10 %). On Home and on the Calories screen.
- After a workout the summary says how many calories you still need today ("Have something good after the workout…"); the menu shows today's calories under Calories.
- *(Android app only)* While a small update downloads, the top of the main screen says so with a progress bar ("keep the app open"); when it's ready there is "Switch on now". Before: nothing was shown, so it was easy to close the app halfway.

## 1.0.4 (2026-10-10)

- The rep counter starts at what you did last time (before: at 0); the +1 goal stays.
- Tap the big number to type the reps directly.
- One-arm and one-leg exercises (door frame rows, Bulgarian split squat, reverse lunge, single-leg bridge…): right side first, "Continue", then left. If the sides differ, the app says so, asks you to train both sides equally and logs the weaker side.
- A small clock runs at the top during a workout; the summary shows the total time (saved with the workout).

## 1.0.3 (2026-10-10)

- *(Android app only)* **If you have app 1.0.0:** small updates don't reach it. Download **HW-App-1.0.3.apk** below once and install it over the old app (your data stays). From then on small updates arrive by themselves.
  Why: the updater switched a downloaded version on while the app was in the background, where Android may pause it; the new version then didn't report a good start in time and was rolled back. Since 1.0.2 the app switches at the start, in the foreground.
- *(Android app only)* The menu shows, under the app version, when the app last looked for an update and how it went (only in the Android app).

## 1.0.2 (2026-10-10)

A small update: it arrives inside the app by itself.

- *(Android app only)* Small updates now switch on at the next start of the app. Before, the updater only switched when the app went to the background, so a new version showed up only at the third start. During a running workout the switch still waits for a later start.
- The "Start day" button is on screen as soon as the app opens (it stays at the bottom edge until you scroll to its place) and shows the chosen rounds.

## 1.0.1 (2026-10-10)

A small update: it arrives inside the app by itself and switches on at the next start.

- 3 rounds (~19 min) are now preselected and recommended; 2 rounds are for days when you're short on time.
- Tap 🔥 or ⚡ at the top to open your profile; the time is shown next to the date.
- Tap a day in the week strip: a green day opens that workout in History, any other day opens History.
- A ? next to every exercise name opens its description (Home, workout, rest screen, summary, History, Profile, Settings → Exercises, swap sheet).
- Adding an exercise to a past workout uses a sheet in the app's colours instead of the phone's dropdown.
- The profile name is centred under the photo; the Save button no longer overlaps the line under it.
- The big day title no longer touches the line under it.
- The +100/+250/+500 buttons in Calories are gone.
- The menu has "💛 Support the app": optional support on Patreon. The whole app stays free.

## 1.0.0 (2026-10-10)

**The first Android app.** HW App moved from the browser into a real app. Compared with Browser beta 1.4.2:

| | Before (Browser beta 1.4.2) | Now (1.0.0) |
|---|---|---|
| App | a website in the browser | a real Android app with an icon on the home screen |
| Your data | saved in the browser | saved in the app; move it with a backup (browser: Settings → Save backup, app: Settings → Restore from backup) |
| Updates | a new version on the next visit | small updates download by themselves and switch on at the next start; for a big one the app shows where to get the new APK |
| Backup | downloaded as a file | opens the share menu: save it to Files or Google Drive, or send it to yourself |
| Offline | fonts came from Google, so without internet the app looked different | the fonts are inside the app, everything works offline |
| Back button | – | closes a sheet or the menu; in a workout it takes you Home and the workout keeps running |
| Version numbers | Browser beta 1.0.0 to 1.4.2 | counting starts again at 1.0.0 |

## Browser beta 1.4.2 (2026-10-05)
<!-- commit: 34cc653b38c243582fdf363070be18f29e0a353f -->

**Small update.**

- "What's new" has pages: the first is the big update 1.4.0; swipe left for the small updates 1.4.1, 1.4.2…
- Version chips and arrows on top; dots at the bottom that merge and split again as you swipe.
- The dots and the button always stay visible at the bottom.
- After a small update, the first start shows a card on the home screen: "The app has been updated to 1.4.2 · See what's new". ✕ closes it, the button opens that version's page. It's gone on the next start.

## Browser beta 1.4.1 (2026-10-05)
<!-- commit: ad8751b945b71083cea9753b463ecf8b84a75a2b -->

**Small update.**

- Calorie calculator: "Man or woman?" instead of "Sex", in every language.
- Required fields have a red star * and the note "* = required. Without these we can't work out your calories."
- For the birth date only the year is required. Day and month are optional, but without them there's no birthday greeting, confetti or birthday badge.

## Browser beta 1.4.0 (2026-10-05)
<!-- commit: 97c45c159027c340178108bff8e0b1a63c4964e5 -->

**Big update: new menu, calories, workout in the background, badges with levels, birthdays.** Compared with 1.3.2:

| | Before (1.3.2) | Now (1.4.0) |
|---|---|---|
| Menu | a bar with 3 tabs at the bottom, profile through the photo top right | one ☰ menu top right with everything: Workout, Calories, History, Profile, Settings |
| Workout in the background | you couldn't go anywhere else during a workout | the workout shrinks to a small window at the bottom, the timer and sounds keep going, tap to go back |
| Rep counter | pre-filled from last time or an estimate | starts at 0, shows last time's result and a +1 goal |
| Last round | 1–2 reps in reserve | to technical failure (as long as the reps are clean) |
| Calories | none | calculator (Mifflin-St Jeor, like calculator.net): lose, maintain, gain; a daily food log; workouts in the app are added automatically |
| Badges | 15 badges, earned or not | 11 kinds with levels Wood → Diamond and a progress bar; what you earned stays |
| Birthday | nothing | greeting, confetti, an extra freeze, a birthday badge (with the birth date filled in) |
| Plank | 30 – 75 s | also 15 s |
| Safety | harder versions without warnings | warnings for the risky steps |
| Tips | none | a "Did you know?" every other day with a button to the feature |
| What's new | none | after a big update this comparison shows once, then it's in the menu |

## Browser beta 1.3.2 (2026-10-05)
<!-- commit: a9ab12c6246a5e676aa4d8b0437503ddb8b2d6e6 -->

**Small update.**

- Every exercise drawing reviewed and approved one by one (yellow = belly side, orange = towel).
- Y-T-W as a top view, the 1¼ squat in 4 steps.
- 5 harder versions as new exercises (single-leg bridge, feet-elevated pike and diamond push-ups, 1¼ squat, single-leg plank), with a Swap button right in the tip.
- Difficulty on every exercise: easier / medium / harder.
- Cobra stretch in the cool-down.
- "~" instead of "about".

## Browser beta 1.3.1 (2026-10-04)
<!-- commit: 1f9e202d776423460bb70664e2d8fb5206759d90 -->

**Small update.**

- Fixed drawings: elbows back in push-ups, head in front of the hands in pike push-ups, knees, rows.
- Confetti after ending a workout early is no longer cut off.
- The language is picked in a scrollable sheet.
- 4 new themes: Ocean, Wine, Slate, Coffee.
- A hint on why the phone doesn't vibrate (silent mode / Do Not Disturb).

## Browser beta 1.3.0 (2026-10-04)
<!-- commit: 8c0688096097d97b9d178a723d4bd3c8d54738d0 -->

**Big update: daily lines, editable history, exercise picker.** Compared with 1.2.0:

| | Before (1.2.0) | Now (1.3.0) |
|---|---|---|
| Line on the home screen | always the same | a new one every day, a rest-day one after a workout, no repeats within 3 days |
| Cards on the home screen | couldn't be closed | ✕ to close |
| History | read only | edit, delete or add a workout by hand; records are recalculated |
| Reset | only the streak | "Start over from zero": history, streak and badges back to zero, the profile stays |
| Exercises | all always on | Settings → Exercises: turn off what you can't do, the app picks a replacement |
| Sheets (How to, Swap) | sometimes off the screen | always fully on the screen |

## Browser beta 1.2.0 (2026-10-04)
<!-- commit: fcfe3aa0beb43c4d2c32f0bb3ed882d557960f99 -->

**Big update: languages and a new name.** Compared with 1.1.0:

| | Before (1.1.0) | Now (1.2.0) |
|---|---|---|
| Name | Domáci tréning | **HW App** with a new logo and icon |
| Languages | Slovak only | 11 languages (EN, SK, CS, PL, HU, UK, DE, ES, FR, IT, PT), picked from the phone's language |
| Dates and numbers | Slovak format | in the chosen language's format |
| Old workouts | in Slovak | shown in the new language |

## Browser beta 1.1.0 (2026-10-04)
<!-- commit: 78d080ac13afa14201df8c8dec3596551f819d5f -->

**Big update: Settings.** Compared with 1.0.0:

| | Before (1.0.0) | Now (1.1.0) |
|---|---|---|
| Settings | none | a new Settings tab at the bottom |
| Look | one colour | 4 dark themes |
| Sounds | all together | separate taps, effects and timer, volume, vibration, keep the screen on |
| Backup | none | save all data to a file and restore it |
| Profile | a tab at the bottom | opens through the photo top right (Settings took its place at the bottom) |
| Rest | only a countdown | a training fact and a bit of encouragement |
| "Copy log for AI" | always on | optional, off by default |

## Browser beta 1.0.0 (2026-10-03)
<!-- commit: 2ecfe41bf42369cf988382d6b24731ceb442d742 -->

**First version (then called "Domáci tréning").** The whole app.

- 3 workout days A, B, C, trained every other day: push, pull, legs and core in 2 or 3 rounds.
- Timers, sounds and rest between exercises.
- A drawing, steps and a video for every exercise; swap an exercise.
- XP, levels, a 🔥 streak with freezes, ranks per exercise, weekly challenges.
- History and profile.
- Installable on the phone, works offline.
