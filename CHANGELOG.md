# Changelog

HW App is an Android app: download the APK from the newest release (on your phone, open it to install). Small updates arrive inside the app by themselves; a big update (second number) is a new APK. The website https://mikydon.github.io/hw-app/ keeps working too.

Version numbers: **1** = the app, the second number = a big update (a new APK), the third = small fixes and tweaks that arrive by themselves (after 9 a fourth number is added: 1.0.9 → 1.0.9.1). Every big update compares each change with how it was before.

The website https://mikydon.github.io/hw-app/ runs the same code as the app and updates itself when you open it; points marked *(Android app only)* (APK installs, in-app updates) don't apply to it.

Everything before the Android app is **Browser beta** (the website), numbered 1.0.0 to 1.4.2. The Android app starts again at 1.0.0.

<!-- New version: add a "## x.y.z (date)" section on top (web-only history uses "## Browser beta x.y.z (date)"). On a push to main, .github/workflows/build.yml builds everything and .github/scripts/releases.sh creates/updates the releases (commit = the push, or the one in a commit comment). -->

## 1.9.4 (2026-11-11)

A small update: it arrives in the app by itself, no new APK needed.

- **Google Play version:** the "Support the app" row in Settings (a link to Patreon) is no longer shown there. Google Play's Payments policy does not let an app lead people to another way to pay, and a donation link to the developer is not clearly covered by its exceptions. The website and the APK from GitHub keep the row; nothing else changes.

## 1.9.3 (2026-11-08)

A small update: it arrives in the app by itself, no new APK needed.

- **Guide for the new plans:** the Workout plans chapter now walks through My week, New plan, and inside a plan the row "Days in my week", the exercises and the tips. Before, it showed only My week. People who already saw the chapter get it once more the next time they open Workout plans.
- **Guide for the rest of 1.9.0:** the workout chapter now explains the kg field (only on exercises with weights), notes and adding an exercise during a workout, and the Home chapter shows the pencil that changes the menu order. Before, the guide said nothing about them.

## 1.9.2 (2026-11-08)

A small update: it arrives in the app by itself, no new APK needed.

- **Plans are single workouts, with a week:** a workout plan is now one workout (its exercises, sets and hold times), and Workout plans → My plans → **My week** gives each weekday one of your plans or a rest day (for example Plan A on Mon, Wed and Fri, Plan B on Tue and Thu). A plan's editor also has the row "Days in my week". Before, a plan was a whole week of different days and only one plan could be in use.
- **Your plans move over by themselves:** a 1.9.0/1.9.1 plan whose training days all held the same exercises becomes one workout; one with different days becomes one workout per list of exercises, named after its days ("Push day · Mon, Thu"). The plan that was in use fills My week. Phones still on 1.9.0/1.9.1 keep seeing each plan on the days it is scheduled.
- **Start picker:** with plans but no week, or on a rest day, Start opens "What do you train today?": your plans (today's first), the recommended A/B/C with 19 or 13 minutes, or a free workout; the workout you did last is green with its day. "Train something else" on the workout page opens it any time.
- **Tips:** a plan's tips name what the workout leaves out (push, pull, legs or core); the week's tips check every muscle group over the whole week and the rest days in a row.
- **Guide:** the Home chapter explains your week's plan and the Start choice when you use your own plans; the Workout plans chapter shows My week.
- **Korean:** words no longer break in the middle at the end of a line; long Muscle Deck joker names never split inside a word.

## 1.9.1 (2026-11-07)

A small update: it arrives in the app by itself. Two points need the 1.9.1 APK *(Android app only)*; the app works with the 1.9.0 APK too, as before.

- **Signing in asks first:** signing in on a phone whose workouts belong to no account now asks whether to use the account's data or to add this phone's workouts to it (an account without workouts simply takes them, as before). Before, they were joined without asking, and the phone's placeholder name "User" could replace the account's name and photo (fixed for good in 1.9.0's sync; this closes the way in).
- **Name and photo heal:** a phone without a name or photo takes them from the account's friends profile, and a phone without a photo never removes the one your friends see.
- **Restore points:** the cloud keeps your data as it was at the end of each of the last 4 days you used the app; Settings → Account & cloud → Restore points lists them and goes back to one on all your devices (workouts added later are removed; purchases, opened cards and eaten calories stay).
- **Rest beeps on time with the screen off** *(Android app only, 1.9.1 APK)*: the lock-screen service plays the 3, 2, 1 and 0 beeps itself on its own clock (the app's web part wakes only about once a second there, so they came up to a second late), and follows the sound, volume and vibration settings.
- **Rest timer setting** *(Android app only)*: Settings → Workout → "Rest timer with the screen off" allows "Physical activity" later, or opens Android's settings when Android no longer asks.
- **Top bar at start:** the plate no longer stays cut short when the app opens (the phone's status-bar inset arrives after the first frame; it covered only the status bar until a scroll).
- **Muscle Deck progress follows the account:** level, games, wins and the other counters merge by their highest value (before, a phone with fewer games could replace them).
- **Health Connect after a reinstall** *(Android app only)*: while the app has less than about a week of steps and food from Health Connect, it reads the last 30 days (the most Health Connect allows a newly connected app), not only 7.
- **Muscle Deck:** long joker names shrink or hyphenate to fit their card.

## 1.9.0 (2026-11-07)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.8.2:

| | Before (1.8.2) | Now (1.9.0) |
|---|---|---|
| Workout plans | one plan for everyone: days A, B and C every other day | a new Plans screen (☰ menu) with two pages. Recommended is today's A, B, C plan. My plans: build your own plans from the app's exercises (never typed-in ones): pick exercises and sets for every weekday (empty days are rest days, and you can still train on them), copy a day to another, name the plan (default "Workout Plan N"), sort plans into groups (Home workout, Gym…) and by date or name, and use one. Small icons show whether a day trains push, pull, legs and core, and tips (never rules) say when a muscle gets little work across the week (ACSM 2026: every muscle at least 2 days and 10 sets a week) or when there are more rest days in a row than the streak allows. Settings → Exercises still swaps exercises of the Recommended plan |
| Home | Today page with the A/B/C day and Start | the first page is called Home; with your own plan in use the week strip shows the plan's days and you can pick any day for today (days done this week turn green). The workout's exercises are on the Exercises page, and you choose which page Home opens on (Settings, or hold a tab) |
| 134 exercises | 27 bodyweight exercises | 134: new bodyweight exercises plus dumbbells, kettlebells, bands, a pull-up bar and gym machines and cables, each with how-to text, a tip and the search button for videos. The list is sorted by body part (chest, back, shoulders, arms, legs, glutes, calves, core) with an equipment filter (none / free weights / machines), and the search knows other names in all 15 languages (press-up finds Push-up and shows the name it matched). Names use each language's standard wording (Slovak: Kľuk; Klik still finds it). The 27 exercises with drawings keep them |
| Weights | only reps and seconds | free-weight and machine exercises log kg × reps (carries kg × seconds; assisted machines log the help in kg, less is harder). The weight starts at last time's and the goal is one more rep. Every weight is a level with a rep range (8–12 or 10–15): reach its top and a bar fills up on the rest screen after the set (with confetti), and the next level is about 5 % heavier. The first time, the app suggests a starting weight from your body weight. Records for everything; free-weight exercises get ranks from your best set compared with your body weight (they need your weight in Calories); a strength score chart shows progress even when the weight changes |
| Body ranks | ranks only for single exercises | the Profile starts with a drawing of your body, front and back: chest, back, shoulders, arms, front and back of the thighs, glutes, calves and core each get a rank in its colour from the exercises that train it (the mean of your two best, so one exercise isn't enough). Tap a part or its tile to see its exercises |
| Muscle icons | exercise lists named the muscles in words | small body pictures show which muscles an exercise trains (the names are in the exercise's details); push, pull, legs and core marks use the same pictures |
| Rest | the rest ended at 0 and the next exercise started by itself | +15, +30 or +60 s; at 0 it beeps and counts on into minus until you tap Ready, and the real rest is saved with the exercise. After about 10 minutes the app asks "Still training?", and after a very long break whether to count all of it in the workout's time and calories |
| Rest with the screen off *(Android app only)* | with the screen off the rest timer was silent | the rest runs on in a notification on the lock screen and beeps and vibrates at 0, even with the screen off (allow "Physical activity" at your first rest; the app asks only then). On the website one line says this works only in the app |
| More during a workout | a workout had fixed exercises | add exercises when you're not tired yet (they count for that day, a better result is a record and the start next time), change a hold's time by 5 s during the workout, and write a note to an exercise or a rest (saved in History) |
| Stats | a few numbers | the Stats page of your profile draws your training: 12 weeks day by day (the bigger the square, the more sets), reps, time or workouts per week with the average, the weekdays you train, and calories (how often you hit your target in 30 days, the last 14 days next to the target). Tap a day or a week for its numbers. Rest days and freezes used are new numbers. Only you see the charts |
| Badges | 33 badges | 47: Variety (different exercises), Sets, Weight lifted, My plans, Squats in a set, Pull-ups in a set, Whole body (a rank in all 9 body parts), Golden body (Gold or better in all 9), A ton (1000 kg in one workout), Big day (500 reps in one workout), Dear diary (a workout note), and 3 more secret ones. The ones you have already earned wait as cards to open |
| Profile | the level showed on the photo and in a tile, a "Training since" line sat under the name, and edits changed things at once | your best badges sit under your name like on Discord (as many as fit; tap one for a small card). Editing the profile and its looks opens a bigger editor with a preview, an undo button and Save; nothing changes until you tap Save |
| Pages | big tabs with names; Friends and Plans switched only by tapping; from the bottom of a long page the next one showed up empty, then jumped | small floating tabs with icons and a light that glides with your finger. Every screen with pages swipes, and the next page slides in with its top in view |
| Diamond codes | diamonds came only from training | Shop → Redeem a code: codes from HW App (for example in a giveaway) add diamonds, each once per account |
| Your menu | the ☰ menu had a fixed order | tap the pencil and drag the rows; the first one is the screen the app opens on |
| Calories | a workout counted as 13 or 19 minutes | your real workout time counts (long breaks you leave out don't), and a workout that took unusually long adds nothing (the app tells you) |
| XP | every set gave 10 XP | the first 20 sets of a day give 10 XP each, every set after that 2 XP, so adding exercises can't farm XP |
| Health Connect *(Android app only)* | no help when Health Connect was missing on the phone or your health app didn't share its data with it | a step-by-step guide: install or update Health Connect, let your health app share (Samsung Health steps shown), then connect |
| Guide | 9 chapters | a 10th chapter for Workout plans; the Profile chapter shows your body ranks, your last workout and the new Stats charts; the Shop chapter shows diamond codes; the workout chapter explains the rest that counts on; the Muscle Deck practice game points at the hand counter, joker cards and drills |
| Buttons | some buttons gave no sign that a tap worked | every button reacts when pressed; buttons that wait for the network show a spinner, then a ✓ |
| World leaderboard | world top 50 | paused for now and shown as "coming soon"; the friends leaderboard stays |
| Workout summary | a long list of numbers | a calm summary that animates: time, sets and reps, XP and streak, what you earned today, your sets as small chips |
| Are you sure? | deleting took two taps on a text button | deleting a workout, a backup or your account, signing out and loading a backup ask in a box in the middle of the screen |
| Sets with 0 | a set logged as 0 counted, so a workout of only a warm-up, 0s and stretching kept the streak and gave XP | sets with 0 don't count: a workout needs at least one real set, else nothing is saved (no XP, no streak); History's editor says so too |
| Last workout on the profile | not shown | one quiet row on every profile (yours and what others see): day, minutes, sets, reps, a mark when it was added by hand; a tap opens the details |
| Muscle Deck | with all joker slots full an opened joker pack locked every option (the paid pack was lost); a tap on Sell sold at once; ✕ only left the game | a new table and shop: the blind as a medallion with its target, hands and discards as icon counters, jokers as cards with their empty slots, a fanned hand, the shop as cards in two columns (a tap opens the full text), the score as one meter whose numbers roll and flash (each card and joker shows what it adds), a Hands list with every hand's level and value (a drill shows "level 1 → 2" in the shop and pops when it lands). A tap on a joker shows it up close; Sell asks first (on the table, in the shop and inside a pack, so a full pack can be saved). A joker pack is marked Full and locked while every slot is taken. ✕ offers Save and quit, or Quit without saving (counts as a lost game) |
| Languages | new texts of 1.8.x were translated | all new texts in all 15 languages (AI-assisted for most; fixes welcome, see TRANSLATING.md) |

## 1.8.2 (2026-11-01)

- Friends and messages are one list. Tap a friend to write to them, tap their photo to open their profile (or see that it's private), and hold the row for the rest (remove, block, report, delete the chat, end a friend streak). The newest chats are on top, unread ones are marked, and the message takes the left half of the row while the level stays on the right. A running friend streak shows on the row and next to the name at the top of the chat. Before: separate Friends and Messages tabs, and a tap on a friend opened a menu first.
- Less text (a tester: "too much text"): the ☰ menu shows only icons and names (the Guide row shows 0/9); explanations under switches and boxes (Settings, workout settings, Shop, Muscle Deck, calorie settings, the showcase, backups, account) moved behind a small ? that opens them; helper lines like "Tap an exercise…", "For a workout you did without the app…", the chart hint and "If you don't make it today, that's fine" are gone; the counting hint shows only in the first workouts; the warning under Sign out / Delete account shows on the first tap.
- Your friend code has a copy icon instead of a "tap to copy" line; the Shop's weekly chest shows the 3 challenges as dots; the "More diamonds: coming soon" box is gone until it's there.
- The Explorer badge and the guide's first bubble count all 9 chapters (they said 7).
- A friend's card (hold a friend's row) has icon buttons for remove, block, report, delete chat and end friend streak; each opens a box in the middle of the screen that says what it will do, with Cancel and a red confirm button. Before: two-line text buttons that needed a second tap, with an explanation paragraph under them. The card's top is one tile that opens the profile: the photo with a glow ring and level, streak and workouts as three framed numbers with only their icons (before: labels over plain numbers, and Workouts had no icon); the friend streak is a warm tile with a + button; "Write a message" is gone (tapping the friend's row already opens the chat). Delete chat is always on the card (greyed out while there is no chat), and in a chat a tap on the friend's name opens the same card (before: the profile, and the menu only by holding).
- Holding text no longer selects it with the phone's Copy / Share / Select all bar (on Android it even selected text in the menu that opened under the finger).
- The Shop and Muscle Deck start the same 16 px under the top bar as every other screen (they started right under it).
- Badges and ranks open a card: tap a badge for all its levels with what each one needs, tap an exercise's rank for its 9 ranks with the numbers and a link to the exercise's how-to (the ranks moved there from the how-to sheet). The "Next: …" lines under the rows are gone.
- Every rank (Iron … Obsidian) has its own drawn emblem instead of an emoji, the same on badges, ranks, the showcase, history, the workout, the summary, reward cards and Muscle Deck. A badge without levels (like Health Connect) shines only in its own colour (it swept the colours of every level).
- Home: 19 / 13 min and Start are always in the floating bar at the bottom (before: a row on the day card, and the bar only once that row was scrolled away); the day card keeps the big day and A / B / C. Calories and weekly challenges are two full-width rows (icon, one number, a thin bar; the challenges show their 3 icons). Each Home page ends with room for the bar and fades out under it, so the last box can always be scrolled above it, with the same room after the last box as every other screen; switching between Today and Exercises goes back to the top, so nothing jumps. Every screen now ends with the same room at the bottom (it was 110 to 142 px, plus 14 px of extra scroll on some screens). The "Today is a training day. Last workout…" line shows only when your streak is at risk, and the "up next" label is gone.
- Badges, stats, weekly challenges, the top bar (streak, level), records, the "can't train today" reasons, the profile and friends lists use line icons drawn in one style instead of emoji. A badge's icon takes the colour of the level it reached (grey while locked). History shows the rank an exercise had that day only as its emblem (no "Silver at the time" line).
- Shop: looks are bigger cards that show each look on a grey sample profile (an effect plays over it, a frame sits around the photo, a title or name effect on the name) with the look's name in its rarity colour. The showcase on your profile has one field per row, so names aren't squeezed.

- Muscle Deck is easier to win. Michael played many Runs and never won one; the strong test bot won 0 % without ranks and 0–3 % with Silver. A Run's targets are lower now, most of all in the later antes (ante 1: 600 → 400, ante 8: 65 000 → 22 000), so the bot wins about 20 % without ranks, 60 % with Silver and 90 % with Platinum on the base intensity; Beast mode stays a real challenge.
- Muscle Deck has 24 new jokers (62 in all), many of them from game level 1 so a new player has choices: more chips or multiplier per card (High reps, Heavy lifter, Light weights, Team captain), per hand type (Gym buddy, Long stride, The pump, Station, Full gym, Quad day, Twins), per card played, discard or hand left (Tempo, Patience, Pacer), money (Tip jar, Sponsor, Gold medal), a joker that grows (Volume block), Afterburn, Team spirit, Iron push / pull / legs and the legendary Legend (× 3 on every hand). 8 new vouchers: Bigger packs, Talent scout, Drill master, Sponsorship deal, Second shelf (2 packs in the shop), Boss scouting (boss blinds need 25 % less), Morning routine and Deload week (every blind needs 15 % less). 3 new packs: a big joker pack (1 of 5), a big drill pack (1 of 5) and a rare joker pack (1 of 2, always rare or legendary).
- A Muscle Deck Run saved before an update goes on from the last move that still fits the new rules (it can't break or start over).
- Muscle Deck's jokers, vouchers, packs, perks and the end screen have line icons in the app's style instead of emoji (the type fans keep their type symbol), and so do emoji inside texts (streak, freeze, record, birthday…), the Health Connect lines and backup rows.
- Less text: the Calories week's colour legend and the Settings privacy note moved behind a ?, the Muscle Deck tutorial card is one line, Duel and Ranked are two small locked tiles, the perks are a row of icons (tap one for what it does and how to unlock it), and a voucher in the shop no longer repeats "for the whole Run".
- The guide shows what's new in 1.8.2: the weekly challenge rows on Home, the profile looks button, and holding a friend for their card.
- A pack with more choices than fit on a short screen scrolls.

- Badges (Michael: "the icon has the colour of its background; Iron on bronze is hard to see"): on the Badges page every icon sits in a dark, sunken well with no border, lit from below like a hologram in the badge's level colour; a badge you don't have yet has no light, only a dim icon.
- Iron and Silver no longer look alike: Iron's colour and emblem are a dark, warm iron (they were the same cool grey-blue as Silver).
- Frost (profile effect): the frost no longer looks squeezed (it was stretched with the box); it grows in all four corners at its real shape, with a soft rime along every edge.
- Fireworks (profile effect): a burst sometimes only flashed without opening into a ring, because it was placed near an edge (or in a small box) where most of the ring was cut off. Every burst is now placed so its whole ring is inside the box, and its size fits the box. Sparkles stay whole inside too. All 8 profile effects were checked for this.

## 1.8.1 (2026-10-31)

- The guide is shorter: it shows Home and the ☰ menu, then every screen shows you around by itself the first time you open it. New chapters for Muscle Deck and the Shop (9 chapters; all of them make the Explorer badge Obsidian, 7 stay Diamond).
- The guide no longer points at something you can't see: when you swipe to the other page or have the menu open, it brings the right page back first. A box taller than the screen is lit from its top on down (the bubble floats at the bottom) instead of being cut through a row, and the page can't be scrolled or swiped under the guide.
- Next in the guide no longer pauses for a few seconds when an optional part isn't on the screen (no calorie profile, signed out…).
- What the guide shows is placed in the middle of the free space under the top bar together with its bubble (measured from the real top bar, status bar included), so a box is never half under the top bar; the ☰ menu or a sheet opened over a lit step is closed again, and between steps a dim layer catches every tap, so nothing on the page can be opened by accident. Back (gesture or Esc) goes one step back instead of ending the guide; only "Skip the guide" ends it. The Shop chapter lights the whole "Streak and XP" box.
- Muscle Deck's screen has the same side margins as the other screens (its boxes reached the screen edges).
- No navy strip behind the keyboard while it slides in: the window and web view behind the page take the current theme's background colour. *(Android app only, needs this APK)*
- The guide can be started again from the start (☰ → Guide → Start the guide again: every screen shows its chapter again), a finished chapter has an Again button, and the first start after an update asks once, in a box in the middle of the screen, whether to go through the guide again.
- Google Play: the "new version" card has an Update now button that runs Google Play's in-app update (Play downloads and installs, the app restarts); where Play doesn't allow that, it opens the app's Play Store page. Not during a workout. Tapping the "new version" notification opens Home with this card, even if it was closed. *(Android app only)*
- Back from the workout settings (Home → Exercises → Exercises settings) takes you back to Home's Exercises page, not to Settings.
- Name effects like Glow are no longer cut off at the edges of the name.
- Everything new in 1.8.0 and 1.8.1 (Muscle Deck with its tutorial and rules, the Shop, diamonds, the weekly chest, profile looks, fair play, the guide) is now translated into all 15 languages; before, these parts were in English in every language.

## 1.8.0 (2026-10-25)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.7.5:

| | Before (1.7.5) | Now (1.8.0) |
|---|---|---|
| Muscle Deck (card game) | there was no game in the app | Muscle Deck, a poker-style card game powered by your training: the four suits are push, pull, legs and core, and every card scores 2 more chips for each rank of your best exercise of that type (Iron +0 … Obsidian +16). Poker hands plus the Circuit (all four types), small and big blinds and a boss with a twist, a shop with 21 jokers and drills that level up a hand, perks you unlock by training (a 7-workout streak, 25 workouts, Platinum in a core exercise…), and 5 intensity levels (Warm-up, Tempo, Heavy, All out, Beast mode) that make it harder and give more game XP; winning on your highest one unlocks the next. The game's money is Kapoke (its own K sign). When all 5 joker slots are full, a joker in the shop can be swapped for one of yours. New players get a 2-minute tutorial game (a practice blind that shows a Pair, a Circuit, a discard, a Flush and the shop step by step), How to play shows every hand with example cards (the ones that count are lit) and a worked score, and "Why this score?" under the preview lists every step of a score: the hand's base, each card (its value + your rank bonus), each joker, and the cards that don't count. 38 jokers in four rarities (Common, Uncommon, Rare and 3 Legendary ones) for different strategies (one that grows, a card that counts twice, single-card and single-type builds, an extra hand, discard or card, cheaper New, more interest), Kapoke has more to buy: Joker and Drill packs (choose 1 of 3) and one Voucher each ante that lasts the whole Run (a 6th joker slot, an extra hand, discard or card, a discount, more interest…). Scores and money roll up, big hands shake the table, a beaten blind throws confetti, and the game has its own sounds. The Run (8 antes) works offline; game XP raises your game level, which adds jokers to the shop, and Runs won raise the new Muscle Deck badge (Beast mode: a legendary badge for a win on the top intensity). A game in progress is saved and continues after a restart. A Duel against the bot and Ranked games against other players are shown as "coming soon" |
| Shop and diamonds | there was nothing to spend your training on | your training earns diamonds: 5 for every workout day done in the app (not added by hand), 15 for every 7 in a row, more for every badge level and exercise rank, 20 for every Muscle Deck Run you win. The new Shop (☰ menu) shows how many you have and where they came from, and sells streak freezes (60, up to the usual limit of 2), a 2× XP boost for 24 hours (40; a second one starts when the first ends) and profile looks. Buying takes two taps. Nothing you buy helps in Ranked or the world list; getting more diamonds by watching a video or buying them comes later |
| Weekly chest | finishing all 3 weekly challenges gave a freeze | it still does, and a chest opens too (Shop, or the notice on Home): diamonds (70 %), an XP boost (20 %) or a profile look (10 %), the same for the week on every device. Chests are only earned, never sold |
| Profile looks | every profile looked the same | 55 looks, all in your theme's colours: frames around your photo, banners behind it, titles under your name (each with its own plate and icon), name effects, and profile effects drawn over the whole profile card (snow, sparkles, petals, embers, a thunderstorm…). Tap one in the Shop to see it on your own profile first; after buying, the receipt offers Equip now. 6 are for sale each week (they change every Friday; bought ones stay listed as owned); 15 are only won with badges (the Shop gives a hint, not the exact badge). Change them on your Profile (the sparkle button); friends see them there too |
| Icons | emoji next to tips, notices, locks, the guide and update cards | clean line icons in your main colour |
| Friend streaks | a streak was yours alone | start a friend streak with up to 5 friends (their profile → Start friend streak; they accept in Friends). It grows every day on which both of you keep your streak (a workout or a freeze in the last 2 days), and Friends shows who has already trained today (✓) and whose last day it is (⚠) |
| Streak moment | the streak was a small number on the summary | after the first workout of the day the flame jumps up, the number rolls to the new one and this week's bar runs up to today, with a line of praise; then the reward cards |
| Freezes | a missed day ended the streak unless you used a freeze yourself in time | when your streak would break, a freeze is used by itself, and Home tells you how many are left (or that none are, so you need to train within 2 days; all 3 weekly challenges give a new one) |
| New exercise | an exercise done for the first time just appeared in your ranks | your first rank in it comes as a reward card like any other, with what the next rank needs |
| Fair play | any number of reps could be logged at once | a set logged faster than clean reps can be done (under 0.6 s a rep) asks first: keep going, or log what fits the time |
| World top 50 | anyone could type any numbers and be first | the world list is written by the server from your cloud backup: only workouts done in the app count, at most one a day, within normal limits (no set far above the Obsidian level, no sudden jumps, no 30-second workouts, no workouts saved long after their date), and it is ordered by workouts and streak. If unusual numbers would put you in the top 50, your place waits for a check (send a short video of a set to hwapp.support@gmail.com); the world tab shows what was counted and why |
| Ranks | 7 ranks: Wood, Iron, Bronze, Silver, Gold, Platinum, Diamond | 9 ranks like in Duolingo: Iron, Bronze, Silver, Gold, Platinum, Emerald, Amethyst, Diamond and Obsidian. Wood is gone and nobody loses anything: an exercise at Wood is Iron now (Iron = you did it), Bronze to Platinum need the same as before, Emerald and Amethyst sit between Platinum and the old Diamond, Diamond needs what it needed before, and Obsidian is a real challenge on top (for example a 10-minute plank, a 10-minute wall sit or 80 push-ups in a row; the Ranks page says "Challenge!" on that step). Badge levels move the same way: a badge keeps its level number (so its name goes one rank up), the old Diamond level stays Diamond, and two new levels sit between it and Obsidian |
| Exercise ranks | only some exercises had ranks; the easier and harder versions didn't, and the Ranks page listed exercises you had never done | all 27 exercises have ranks. The Ranks page lists only the ones you have done; one line says how many are still hidden |
| Timed holds | plank, wall sit and other holds stopped at the longest preset time (75 s for the plank) | a new "Max" choice next to the times: after the 5 s to get into position the time counts up (m:ss after a minute) until you tap stop, and that time is logged. It is preselected when last time was longer than every preset, and the minimized-workout player counts up too |
| Badges | every badge had levels, even Health Connect, which you only connect once (Iron → Gold → Diamond) | 33 badges: the tiered ones (up to 9 levels), and one-off badges that are rare, epic or legendary: Health Connect, Tried them all (every exercise at least once), Diamond program (Diamond in all 12 program exercises) and 9 secret badges (Comeback, Weekend warrior, Marathon, Ice cold, Hat-trick, Fresh start, Midnight session, Birthday workout, Obsidian). Secret badges appear only once you earn them; one line says how many are still hidden |
| Badge and rank boxes | a thin bar with segments showed the progress | the whole box is in the colour of your rank and fills up towards the next rank's colour as you get closer; level dots in each rank's colour show the way up. From Bronze up, a light runs across the box in the colours of every rank you have reached (Iron → … → yours); a top-level box glows |
| Guide | the first-start setup asked for your details, but nothing showed how the app works | an interactive guide in 7 chapters (Home, Badges, Workout, Profile, History, Calories, Friends). The screen dims, the real button or box lights up and a bubble explains it; steps that move somewhere wait for your tap (or Next taps it for you), and after a tab is tapped the guide explains the page that opened, not the tab buttons. Every finished chapter raises the new Explorer badge, so chapter 2 teaches opening badge cards with your own first badge. The Workout chapter runs during your next workout. New users get it right after the first-start setup, everyone else gets it offered once on Home, and the ☰ menu → Guide lists the chapters to start (again) any time |
| Languages | 14 | 15: Indonesian (Bahasa Indonesia; AI-assisted translation, fixes welcome, see TRANSLATING.md). Phones that report Indonesian with the old code "in" get it too |
| Small fixes | the bottoms of letters that reach below the line (g, y, j) and some Cyrillic letters were cut off in the screen title, in your name in the menu and on your profile, and in nicknames in Friends; Leaderboard, Friends and Messages switched without any motion | letters show in full; the Friends page slides in from the side of the tab you tapped |

Badges and ranks you had already opened as cards stay opened (the record of opened cards moved to the 9-rank scale; older app versions keep reading the old one).

## 1.7.5 (2026-10-24)

- Every password field (sign in, create account, change or add a password, delete an account) has an eye button that shows or hides what you typed, so typos are easy to catch (tester feedback).
- Text in the app is the same size on every phone: a bigger font size set in Android no longer makes the app's text bigger (it cut off words on a tester's phone, because Android enlarges the text but not the boxes around it). *(Android app: needs this version's APK or the Google Play version.)* With an older APK, and on the website, the screens make room instead: the date in the top bar gets shorter, the Home tiles and the showcase fields go one under the other, and the big titles stay on one line (tester feedback).
- *(Android app only)* With this version's APK, a fresh install also starts at 60 Hz before the app has loaded (it started at the highest refresh rate for a moment).
- *(Android app only)* Fixed: in the app from GitHub and Google Play, notifications were never asked for, always showed as off and never arrived (the test app worked). The release build renamed the app's own building blocks to save space (R8 obfuscation, since 1.6.5), and the notification permission broke with it. The release app is now built exactly like the tested one: unused code is still removed, nothing is renamed or merged. Needs this version's APK or the Google Play version.
- *(Android app only)* Notifications are checked every time the app opens: when they aren't allowed and you have them on, the app asks; if you say no, both notification switches (messages and new versions) go off, and they come back on by themselves once you allow notifications in Android. When Android won't ask any more, a button under the switch opens the app's notification settings.
- *(Android app only)* Settings has one Notifications row (it showed only the new-version switch, and the messages switch was hidden in the account box). Its line says what is on; a tap opens a sheet with one switch for all notifications and a switch for each kind: new versions, and messages and friend requests (or a link to sign in, which they need).
- *(Android app only)* The "Send a test notification" button now really puts the test notification in the notification bar, also while the app is open (Android hands a notification to an open app instead of showing it, so before, the app only said that it had arrived). Needs this version's APK; with an older one the line says that it arrived, as before.
- *(Android app only)* A reinstalled app starts clean with the sign-in screen: Android's automatic backup is off, so it no longer brings back old data (and old settings) on its own. Signing in brings your data back from the cloud.
- Website: signing in with Google always shows Google's account chooser (after signing out, signing in quietly took the old account).

## 1.7.4 (2026-10-18)

- Badges and exercise ranks you have earned now wait on your profile as face-down cards until you open them: tap one on the Badges or Ranks page, or Open on the Profile page, and they flip like the reward cards after a workout (rarest last). The ☰ menu counts how many are waiting. Everything earned before this update starts face down. Others always see your real badges and ranks.
- *(Android app only)* After reinstalling the app, it asks for notification permission again and subscribes to "new version" notifications again. Android's automatic backup restored the old app data, so the app thought it had already done both, and a reinstalled phone stayed silent.
- *(Android app only)* Settings: the notification switches show what really happens. They are off while Android doesn't allow notifications, and turning one on asks Android for permission (if Android won't ask any more, the line under it says where to allow them).

## 1.7.3 (2026-10-18)

- *(Android app only)* Screen smoothness is 60 Hz by default (saves battery); "the highest your phone allows" is a choice in Settings → Appearance. Forcing the highest mode kept phones with adaptive refresh rates from slowing the screen down when nothing moves.
- *(Android app only)* After allowing notifications in Android's settings, "notifications are turned off" no longer stays in Settings (the app checks again when it comes back to the front), and the phone is registered for notifications right away instead of at the next start.

## 1.7.2 (2026-10-18)

- The sign-in page (Friends and the first start) looks like in most apps: e-mail and password first with "Forgot password?" and "No account? Create account", then "or" and the Google button.

## 1.7.1 (2026-10-18)

- Sign in with e-mail and password, next to Google (Friends and the first start): create an account (a confirmation e-mail is sent), sign in, or get a link to set a new password if you forgot it. Google Play's reviewers needed this: a Google account always asks a new device for a code, so they couldn't sign in.
- Settings → Account & cloud → Password: change your password (your current one confirms it), add a password to a Google account so you can also sign in with that e-mail, get a reset link, or send the e-mail confirmation again.
- Deleting an e-mail account is confirmed with its password (Google accounts: Google, as before).

## 1.7.0 (2026-10-18)

**A big update: a new APK** (download it in the app and tap Install; your data stays). Compared with 1.6.5:

| | Before (1.6.5) | Now (1.7.0) |
|---|---|---|
| Profiles | friends only saw your nickname, photo, level, streak and number of workouts | your Profile looks exactly the way others see it, like on Steam: photo with a level badge, level and streak, and a Showcase whose fields you fill yourself (an exercise rank, three ranks, a badge, three badges or a number such as total reps; untouched fields show your best automatically). One field at the start, more at levels 5, 15, 30, 60, 120, 240… (10 in all). Swipe pages like on Home: Profile, Badges (every badge with progress to the next level, closest first), Ranks (every exercise with its best set and what the next rank needs) and Stats; on a wide screen they stand side by side. Tap a friend or someone in the world top 50 → View profile opens the same page. ✏️ → Who sees your profile: your friends (default), everyone signed in, or only you; people you blocked never can (the database rules enforce it). Calories, steps and Health Connect are never part of it |
| Rewards | new badges, ranks and records were a line of text on the summary | after a workout every new record, badge level, exercise rank and level comes as a face-down card glowing in its rarity colour (wobbling more the rarer it is); each card is dealt in with a swish; Gold and higher sparkle and say they look rare (a Diamond card shimmers in all colours); a tap makes the card shake while the sound charges up, then it flips with light rays, a burst, a flash, a rising sound, a low thud and a vibration, all bigger with the rarity (Diamond also shakes the screen). The cards go from the most common to the rarest; Skip closes them. Only earned rewards, no chance involved. Gold and higher badges and ranks have a moving shine on the profile, and a badge or rank at 80 % or more of the next level shows what's left in its colour |
| Phone ↔ website | the cloud backup was a single copy: restoring it replaced what was on the phone, and a new phone was offered a restore | signed in, the phone, the website and any other phone merge each other's changes within seconds: workouts (also edited or deleted ones), profile, calorie details and log, theme, look, main colour and turned-off exercises. Nothing is overwritten: each workout and calorie entry is kept, deletions are remembered, and for the rest the newer change wins. Which chats you read, chats you deleted for yourself and the people you blocked follow the account as well. Language, sounds, vibration, screen refresh rate and Health Connect data stay per device |
| Main colour | always yellow | yellow stays the main colour (also the icon); Settings → Appearance → Main colour offers violet, pink, turquoise, orange and coral too. Colours that would clash move aside (with turquoise, workouts turn lime; with orange or coral, the calorie colours change) |
| Tablet and computer | one narrow phone column in the middle of the screen | from 760 px wide (a tablet, a phone on its side, a computer window) the screens use the width: Workout and Calories show their pages side by side instead of swipe pages, History, Profile, Settings and Friends have two columns, sheets open in the middle. From 1100 px the menu is a side panel that stays open. A phone looks exactly as before |
| Emoji | the app's emoji (🔥, 🏆, badges…) looked different on every phone | Microsoft's 3D Fluent Emoji (MIT licence), the same on every Android phone and in Chrome-based browsers; Safari and Firefox keep their own. Messages keep the phone's emoji, so every emoji works there |
| Screens | History, Calories, Settings and Profile looked different from the Workout screen; Profile listed every badge not earned yet | the same boxes as the Workout screen in every look; every forward arrow in the app looks the same (main colour) |
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
