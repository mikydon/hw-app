# Changelog

HW App is an Android app: download the APK from the newest release (on your phone, open it to install). Small updates arrive inside the app by themselves; a big update (second number) is a new APK. The website https://mikydon.github.io/hw-app/ keeps working too.

Version numbers: **1** = the app, the second number = a big update (a new APK), the third = small fixes and tweaks that arrive by themselves (after 9 a fourth number is added: 1.0.9 → 1.0.9.1). Every big update compares each change with how it was before.

The website https://mikydon.github.io/hw-app/ runs the same code as the app and updates itself when you open it; points marked *(Android app only)* (APK installs, in-app updates) don't apply to it.

Everything before the Android app is **Browser beta** (the website), numbered 1.0.0 to 1.4.2. The Android app starts again at 1.0.0.

<!-- New version: add a "## x.y.z (date)" section on top (web-only history uses "## Browser beta x.y.z (date)"). On a push to main, .github/workflows/build.yml builds everything and .github/scripts/releases.sh creates/updates the releases (commit = the push, or the one in a commit comment). -->

## 1.7.0 (2026-10-18)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.6.5:

| | Before (1.6.5) | Now (1.7.0) |
|---|---|---|
| Profiles | friends only saw your nickname, photo, level, streak and number of workouts | tap a friend or someone in the world top 50 → View profile: level, current and longest streak, workouts, total reps and training time, the date of the first workout, exercise ranks and badges, with a short animation; only what the person actually has is shown. Profile → Who sees your profile: your friends (default), everyone signed in, or only you; people you blocked never can (the database rules enforce it). Calories, steps and Health Connect are never part of it |
| Phone ↔ website | the cloud backup was a single copy: restoring it replaced what was on the phone, and a new phone was offered a restore | signed in, the phone, the website and any other phone merge each other's changes within seconds: workouts (also edited or deleted ones), profile, calorie details and log, theme, look, main colour and turned-off exercises. Nothing is overwritten: each workout and calorie entry is kept, deletions are remembered, and for the rest the newer change wins. Which chats you read, chats you deleted for yourself and the people you blocked follow the account as well. Language, sounds, vibration, screen refresh rate and Health Connect data stay per device |
| Main colour | yellow everywhere | violet, also on the icon and the splash screen; Settings → Appearance → Main colour offers yellow, pink, turquoise, orange and coral too. Colours that would clash move aside (with turquoise, workouts turn lime; with orange or coral, the calorie colours change) |
| Tablet and computer | one narrow phone column in the middle of the screen | from 760 px wide (a tablet, a phone on its side, a computer window) the screens use the width: Workout and Calories show their pages side by side instead of swipe pages, History, Profile, Settings and Friends have two columns, sheets open in the middle. From 1100 px the menu is a side panel that stays open. A phone looks exactly as before |
| Emoji | the app's emoji (🔥, 🏆, badges…) looked different on every phone | Microsoft's 3D Fluent Emoji (MIT licence), the same on every Android phone and in Chrome-based browsers; Safari and Firefox keep their own. Messages keep the phone's emoji, so every emoji works there |
| Screens | History, Calories, Settings and Profile looked different from the Workout screen; Profile listed every badge not earned yet | the same boxes as the Workout screen in every look; earned badges first, the rest folded under one row; tap Badges (or any badge) for all 21 with each level as a segment and how much is left to the next one ("13 / 25 · 12 to go"), closest first; the calorie legend shows colour swatches |
| World top 50 | a reported profile stayed there until the developer had looked at it | when three different people report a profile within 90 days, the push server hides it from the world top 50 at once and strangers can't open it (friends still can); the person sees a note in Friends and can write to hwapp.support@gmail.com if it's a mistake |

The [privacy policy](https://mikydon.github.io/hw-app/privacy.html) describes the profile page, the block list in your account and the automatic hiding after reports.

## 1.6.5 (2026-10-17)

- Friend links are now `https://mikydon.github.io/hw-app/add/?c=CODE` and open the app right on Friends with the code filled in *(Android App Link: the app from Google Play or the 1.6.5 APK)*. Without the app the website opens as before; on an Android phone it offers "Open in the app" (useful when a messenger opens links in its own browser). Older `?add=` links still work on the website.
- Calories: "Change goal" and "Edit details" opened with a big empty space at the top (the swipe pages' height stayed on the element React reused for the form; since 1.5.5). Fixed.
- Settings → Account & cloud: a "Back up now" button uploads the cloud backup right away (same rule as the automatic one: a phone without workouts never replaces a cloud copy that has some).
- *(Android app only)* A notification when a new version comes out, for everyone with notifications allowed (signed in or not; Android 13+ asks once at the start; switch in Settings). The GitHub app gets it when the release is published; the Google Play app once the version is approved in Google Play.
- *(Android app only)* The app from Google Play shows a card when Google Play has a newer version for you (Google Play's in-app update check). It never points to GitHub.
- *(Android app only)* The native code is shrunk and optimized with R8 (Google Play flagged "DEX code optimization below threshold"): 4.6 MB of DEX code instead of 19.1 MB, a 4.1 MB APK instead of 9.2 MB (less than half). The GitHub app gets this, the friend links and the update card with the 1.6.5 APK; the small update itself works on older APKs too.

## 1.6.4 (2026-10-17)

- *(Android app only)* Automatic backup works again after reinstalling the app. Android 11+ doesn't let a new install replace a file the old install created ("open failed: EACCES"), so the app now writes the automatic backup into the next free name (`…-2.json`) and keeps using it. The old file stays in Documents/HW App and can still be restored with "Restore from backup".
- Website: after a small update the "What's new" card opens on the newest page shown on the website (an update with only Android app changes has no page there).

## 1.6.3 (2026-10-17)

- *(Android app only)* Behind the scenes: the Google Play version is now signed with the same key as the GitHub version (Play app signing uses our own key), so both are the same app. Nothing changes for you; this release only carries a new version code so Google Play accepts the bundle.

## 1.6.2 (2026-10-16)

- The world leaderboard no longer shows profile photos, only the nickname and the numbers. Friends still see your photo.
- After you report a profile or a message, the app offers to block that person right away (one tap).
- Friend requests from people who aren't your friends yet show no profile photo.
- Signing in with a different account now asks whether to keep the data on the phone or start fresh with that account's cloud backup. Before, the previous account's name and theme stayed on the phone and were saved into the new account's backup.
- *(Android app only)* The calorie days badge now also counts days with food from Samsung Health (Health Connect); it only counted food logged in the app.
- *(Android app only)* The automatic backup in Documents/HW App is kept per account (`hw-app-auto-backup-<id>.json`), so a second account on the same phone no longer replaces the first one's file.
- In Messages, hold a chat to delete it. It disappears only for you (the friend keeps their copy); a new message brings the chat back.
- Signing out takes the app back to the very first start: everything on the phone, including the theme, is cleared (it stays in your cloud backup; the latest state is uploaded first, and if that fails nothing is cleared), so nothing mixes with the next account. That also disconnects Health Connect inside the app (connect it again in Calories). Signing out isn't possible during a workout. Backup files in the phone's folder are only loaded by hand.
- The "Reset streak" and "Start over from zero" buttons are removed from Settings.
- In the Glass and Liquid glass looks, the thin edge of the cards is the same on both sides (on the left it disappeared under the light reflection).
- The rules are written down: the text next to the world leaderboard switch and the [privacy policy](https://mikydon.github.io/hw-app/privacy.html) say that offensive nicknames or photos can be reported and are removed.

## 1.6.1 (2026-10-16)

- The date in the top bar is shown without the year, so it no longer gets cut off next to the streak and level chips (it was cut to "Friday, 10/16/20…" on many phones).
- A new page, [Delete your HW App account](https://mikydon.github.io/hw-app/delete-account.html), explains how to delete your account in the app, on the website without the app, or by request; the privacy policy links to it.
- Getting ready for Google Play: every release now also has `HW-App-x-play.aab`, the same version for Google Play. That build can't install APKs and doesn't update itself, because only Google Play may update an app installed from Google Play; the APK on GitHub keeps updating itself as before.
- *(Android app only, new APK installs)* The app no longer lists VO2 max (read and write) among its Health Connect permissions; it never used it (a newer version of the health plugin had added it).

## 1.6.0 (2026-10-15)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.5.8:

| | Before (1.5.8) | Now (1.6.0) |
|---|---|---|
| Notifications *(Android app only)* | new messages, friend requests and accepted requests showed only while the app was open | your phone notifies you also when the app is closed: the sender's nickname and the message, or the friend request, in your language. A tap opens that chat or Friends. Android 13+ asks for permission once; switch it off in Settings → Account & cloud, where a test button sends a notification to your own phone and says whether it arrived (or what stopped it). Nothing comes from people you blocked, and only things that really happened are sent: a small server of HW App (Cloudflare Workers, free plan) checks every notification in the database first and keeps nothing. Signing out removes this phone |
| Screen smoothness *(Android app only)* | the app ran at whatever refresh rate the phone gave it | the app asks for the highest refresh rate the phone allows (e.g. 120 Hz) from the first frame; Settings → Appearance lets you pick 60 Hz to save battery |

The privacy policy explains what notifications store (this phone's notification address, language, on/off and who you blocked).

## 1.5.8 (2026-10-14)

- Opening and closing with the arrows (Calories boxes, "how is the target calculated?", workouts in History, warm-up and cool-down instructions) is rebuilt so the graphics chip does the moving: the page takes its new layout at once, the boxes below slide from where they were to where they are now (transform), and the content fades in or out (opacity). Both run on the browser's compositor, so they stay smooth even while the app is busy. A box with nothing below it grows or shrinks on its own. Before, the box's height was animated, which redid the layout and repainted every card (with its shadow) on every frame, so on a phone it moved in visible steps.
- The swipe area on the main screen and in Calories always reaches the bottom of the screen. Before, it could end 14 px short when it was measured while the screen was still sliding in, so a swipe at the very bottom did nothing.

## 1.5.7 (2026-10-14)

- Switching pages with the tabs on top (main screen and Calories) glides smoothly in about a third of a second, with the knob following. Before, it sometimes jumped there at once (main screen), bounced back and forth on the way to the middle page, or jumped straight to the last page (Calories): every redraw re-attached the page strip and stopped the move halfway, and the browser's own smooth scrolling fought with page snapping. The app now moves the strip itself; a finger on the strip takes over at once.

## 1.5.6 (2026-10-14)

- Smoother animations. Opening and closing boxes (the arrows in Calories, History and the warm-up), switching pages and the Calories screen no longer stutter: the swipe pages set their height directly instead of redrawing the whole screen on every frame, and a box that opens only redraws itself. Every animation is also a little shorter. Before, they felt stuck and slow, especially on a phone.
- The floating Start bar slides away in one piece; only its arrival is staggered. Before, its buttons faded at different speeds and it seemed to fall apart. It also no longer shows up now and then while the Start button on the page is already in view (when the page moved out and back within one frame, the app read the older of the two reports).

## 1.5.5 (2026-10-14)

- Calories in three pages you swipe between (or switch at the top), like the main screen: **Today** (eaten / target, how the target is calculated, logging food, what you ate today), **Calendar** and **Details** (your data and goal). This week's calorie strip sits at the very top. Before, everything was on one long page.
- Calorie calendar: every day of the month in amber (light = logged, solid with ✓ = within 10 % of the target, with the day's total under the date); tap a day to see what you ate that day. It replaces the "Previous days" list.
- Logging food folds away with one tap on its title; when food comes from Health Connect, it starts folded.
- *(Android app only)* The Health Connect box folds away too; it starts folded when food comes from Health Connect.
- *(Android app only)* Food from Health Connect is listed with the app's name (Samsung Health, MyFitnessPal, Google Fit…) and the time stays on one line. Before, it showed a code like "com.sec.android.app.shealth", and a time like "10:50 AM" broke into two lines.
- One animation style for the whole app: sheets slide up from the bottom and back down when closed (before, they appeared and vanished at once), everything that opens and closes (workouts in History, "how is the target calculated?", warm-up and cool-down instructions, the calorie boxes) grows and shrinks smoothly with a turning arrow, and screens, menus, notices and dialogs share the same curves and lengths.
- The floating Start bar is bigger (larger 19 / 13 min squares and Start button, with the rounds under it). The Exercises page has the A/B/C switch above the exercises and a "Workout settings" box (Exercises in Settings, countdown sounds, vibration, keep the screen on), so the page isn't half empty any more.

## 1.5.4 (2026-10-14)

- Main screen: swiping between Today and Exercises also works on the empty space under the cards (the page now reaches the bottom of the screen). Before, it only worked on the cards themselves.
- The top bar stays rounded while it comes off the top and flows back: its link to the top edge is a liquid bridge with rounded feet, and the box rounds its corners right away. Before, a thin flat strip and square corners showed at the edges during the move.

## 1.5.3 (2026-10-14)

- Main screen in two pages you swipe between (or switch at the top): **Today** has this week on top (green = workout, amber line = calories logged, orange = calorie goal met), the big day with A/B/C and 19 / 13 min + Start, and two tiles: calories (eaten / target with a bar) and the weekly challenges with each challenge and its progress (tap for the full list). **Exercises** has the day's exercises. Only one notice at a time (done today, update, setup, hint or the daily line), the most important first. Before, everything was on one long page.
- Switches that aren't picked (A/B/C, 19 / 13 min, page tabs, month and day pickers, the Friends tabs) look pressed into the surface; the picked one stands out.
- The top bar's plate always reaches both edges of the window (on a PC its square corner showed next to the edge).
- Chat: "Recently used" in the emoji list now remembers every reaction you give (also from the quick bar and the double tap ❤️), newest first. Before, only emoji picked from the full list were kept.
- *(Android app only)* "Leave the app?" after a back on the main screen is now a box in the middle of the screen like the day card, with a square Stay button and a wide Leave button like the workout length. It stays until you choose (Stay, a tap next to it, Leave or one more back) and says what today means: a workout waiting, done today, a rest day or a minimized workout. Before, it was a strip at the bottom that went away by itself after 3.5 s.
- *(Android app only)* Closing the "new version" card on the main screen only hides it there: the update stays in the ☰ menu (at the bottom, next to the version), where you can download and install it, or switch on a downloaded small update. Before, after ✕ the only way was GitHub.

## 1.5.2 (2026-10-14)

- Messages, like Instagram: swipe a message toward the middle to answer it (a friend's to the right, your own to the left); the answer shows a small quote of it, and tapping the quote jumps to the original. Hold a message for a menu: Reply, Copy, Edit (your own, for 15 minutes; it then says "edited") and Report. Links in messages open in the browser.
- The chat stays where you are reading: new messages scroll it down only while you are at the bottom (or when you wrote them); otherwise a "New messages" button appears above the input. The input no longer covers the newest messages when the keyboard is closed.
- Reactions like Instagram: hold a message and tap ❤️ 😂 😮 😢 😡 👍, or the arrow for every emoji (recently used first); double tap = ❤️. Reactions show small under the message; tap them to see who reacted and to take yours back.
- Chat colour: 🎨 in the chat's header, 26 colours and gradients for your own messages; you both see it.
- Sending keeps the keyboard open; your own message scrolls the chat down only while you're at the bottom; opening a chat always starts at the newest message. Holding a message no longer selects its text. The chat's header (back, friend, colour) sits in the top bar, so it stays on screen while you scroll.
- Needs the updated Firestore rules (replies, edits, reactions, chat colour).

## 1.5.1 (2026-10-12)

- Top bar: when you scroll down, it now comes off the top edge like a drop of water: the sides pull in, the part over the status bar stretches into a thin neck, snaps, the bar wobbles for a moment and a small drop splashes back in. Scrolling back to the top plays it the other way: a drip and a bump reach for each other, join, and the bar flows back into the edge. Before, the full-width bar and the floating box just faded into each other. If you change direction halfway, the same drop slows down and goes back from where it is (never two animations at once, never a jump). The shape is drawn only during the ~0.7 s of the move; the bar's content never moves.

## 1.5.0 (2026-10-12)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.4.3:

| | Before (1.4.3) | Now (1.5.0) |
|---|---|---|
| Friends | HW App was just you and your phone | optional account: sign in with Google (16+), right at the first start if you like (it fills in your nickname and offers your cloud backup), or later in Friends. Add friends by friend code (`HW-…`), a share link or their nickname; accept or decline requests; remove, block or report anyone. Without an account nothing changes and the app makes no cloud connections |
| Leaderboard | your level and streak were only on your phone | compare level, streak and workouts with your friends, and, only if you switch it on, in the world top 50 |
| Messages | you couldn't write to anyone in the app | chat with your friends (Friends → Messages). New messages and friend requests appear live while the app is open: a short notice at the top, a number on ☰ and in the menu. Any message can be reported; after unfriending, the chat stays readable but closed |
| Cloud backup | backups were files you kept yourself | while you're signed in, a backup is saved to the cloud a few seconds after every change; only you can read it, and Health Connect data is never uploaded. On a new phone, sign in and restore it (the app offers it when the cloud has more workouts); even without workouts your details (birth date, gender, height, weight you typed, activity, goal, settings) are saved, so a new phone's setup fills itself in |
| Account | there were no accounts | Settings → Account & cloud: restore from the cloud, sign out, or delete the account with everything about it on the server. The privacy policy explains what is stored (Google Firebase, Frankfurt) |
| First start | height and weight read from Health Connect skipped their steps | the setup starts with "Got an account?" (Google sign-in, can be skipped); values from Health Connect stay as their own steps, filled in, to confirm or skip |
| Date picker | picking a date in History opened the phone's grey calendar | a calendar in the app's own colours (future days can't be picked); the text cursor and selection use the app's yellow |

## 1.4.3 (2026-10-12)

- The Glass layout looks more like real glass: a sheen from the top-left corner, a soft diagonal reflection, a bright rim along the top edge, and a dim glow of the theme colours behind the boxes (one background layer, drawn once). The floating Start bar, the top bar and the ☰ menu match it. Still opaque boxes without blur, so it stays light on the phone.
- Top bar: at the top of the page it now fills the screen edge to edge (no line along the top or the sides); the floating box under it only appears once it peels off.

## 1.4.2 (2026-10-12)

- The top bar in every layout: at the top of the page it hangs from the top edge (square top corners, rounded bottom corners); when you scroll down, it smoothly peels off into a floating rounded box, and back when you return to the top. Only opacity and position animate, so it costs no extra drawing.
- Liquid glass looks more like real glass: a sheen from the top-left corner, a soft diagonal reflection, a bright rim along the top edge and a lighter one at the bottom. Still without blur (measured: scrolling costs the same as in 1.4.1).

## 1.4.1 (2026-10-11)

- Liquid glass is smoother: no blur anywhere any more (the top bar, Start bar and mini player got a stronger tint instead), the colour background sits on its own layer and is drawn once, cards have no large drop shadows, and the ☰ menu opens with one slide instead of animating every row.
- Liquid glass: the top bar floats as a rounded glass box under the status bar, like the boxes below it.

## 1.4.0 (2026-10-11)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.3.1:

| | Before (1.3.1) | Now (1.4.0) |
|---|---|---|
| Backups *(Android app only)* | "Save backup" opened the share menu; nothing was ever saved by itself | backups go to **Documents/HW App** on the phone. New **Automatic backup** switch: every day (and a few seconds after every change, e.g. a finished workout) a fresh `hw-app-auto-backup.json` replaces the old one; it is never written while the app has no data, so a reset or a fresh install can't overwrite a good backup. Backups you save yourself are never deleted automatically. Settings → Backups in the phone lists them to restore, share or delete (two taps). Android 8–10 ask once for storage access |
| Badges | 11 badge families | 21: also how long you've been training, Health Connect (Iron = one kind of data, Gold = also weight & height, Diamond = also food calories; kept after disconnecting), early bird (start before 8:00), night owl (after 20:00), time trained, A + B + C, stretching, plank hold, calorie target hits (±10 %) and 10,000-step days. Profile shows badges and levels earned |
| Profile | numbers and emojis placed differently in every tile | every tile the same: label, icon on the right, the number in the same spot |
| Design | each screen had its own headings and boxes | the same section labels and boxes on every screen; the calorie week uses the same strip as the training week; list rows without leading emojis |
| Leaving the app *(Android app only)* | back on the main screen closed the app at once | the first back asks "Leave the app?"; a second back or Leave closes it |
| "?" next to exercises | big | smaller and quieter, same tap area |
| Smoothness | every frosted box (Liquid glass) blurred the background behind it, and the top bar and Start bar blurred in every layout, so scrolling could stutter on phones | only the bars that content scrolls under blur, in Liquid glass only; boxes look the same; closing the menu no longer forces a layout on touch screens |
| Videos | one fixed YouTube link per exercise (sometimes a different variation than the drawing) | "Search the web" opens a search for how to do the exercise, in the app's language |

## 1.3.1 (2026-10-10)

- Liquid glass: the ☰ menu panel now has the same colourful background as the rest of the app; before, it was a flat dark panel.

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
