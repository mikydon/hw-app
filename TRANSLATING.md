# Translating HW App

HW App is available in 14 languages. English is the base language; Slovak is the original.

You can help in two ways: fix a translation, or add a new language. You don't need to be a programmer for either.

Translations are reviewed before they ship. They arrive in the next big update (the second version number, e.g. 1.2 → 1.3).

## Where the texts are

Every language is one file in [`src/i18n/`](src/i18n/):

| File | Language |
|---|---|
| [`en.js`](src/i18n/en.js) | English (base: every other file follows it) |
| [`sk.js`](src/i18n/sk.js) | Slovenčina |
| [`cs.js`](src/i18n/cs.js) | Čeština |
| [`pl.js`](src/i18n/pl.js) | Polski |
| [`hu.js`](src/i18n/hu.js) | Magyar |
| [`uk.js`](src/i18n/uk.js) | Українська |
| [`de.js`](src/i18n/de.js) | Deutsch |
| [`es.js`](src/i18n/es.js) | Español |
| [`fr.js`](src/i18n/fr.js) | Français |
| [`it.js`](src/i18n/it.js) | Italiano |
| [`pt.js`](src/i18n/pt.js) | Português |
| [`zh.js`](src/i18n/zh.js) | 中文（简体） |
| [`ja.js`](src/i18n/ja.js) | 日本語 |
| [`ko.js`](src/i18n/ko.js) | 한국어 |

Chinese, Japanese and Korean were translated with the help of AI in October 2026. Native speakers are especially welcome to improve them.

## Fix a translation

**Easiest:** open an issue with the [Translation fix form](https://github.com/mikydon/hw-app/issues/new?template=translation-fix.yml). Say where in the app you saw the text, what it says and what it should say. A screenshot helps.

**Directly on GitHub (no tools needed):**

1. Open the language file above and click the ✏️ pencil (*Edit this file*). GitHub makes a copy (fork) for you.
2. Change the text between the quotes. Keep everything else as it is.
3. Click **Commit changes…** → **Propose changes** → **Create pull request**.

A check runs automatically on your pull request and tells you if something is off.

## Add a new language

**Easiest:** open an issue with the [New language form](https://github.com/mikydon/hw-app/issues/new?template=new-language.yml). You can attach the finished file to it.

**As a pull request:**

1. Copy [`en.js`](src/i18n/en.js) to a new file named with the [two-letter language code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes), e.g. `nl.js` for Dutch.
2. Translate the texts. The rules below matter.
3. Open a pull request. The new language is added to the language list during the review.

## Rules (the automatic check enforces them)

- **Only change the text inside the quotes.** Keys (the word before `:`) stay in English.
- **Keep every `{placeholder}`** exactly as it is, e.g. `{n}`, `{name}`, `{date}`. The app fills them in. You may move a placeholder within the sentence.
- **Lists keep the same number of items.** The daily quotes, figure labels and "What's new" lists are picked by position.
- **Plural forms (`pl:`)** use the categories your language needs: `one`, `few`, `many`, `other` ([which ones?](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)). Every form must contain `{n}`. Languages without plural forms (e.g. Chinese, Japanese, Korean) only need `other`.
- **Tone:** friendly and short, the way a coach talks to a friend. Use the informal "you" where your language has one.
- **Keep the names** "HW App", "Health Connect", "Samsung Health", "Patreon", "GitHub", "APK".
- Lines starting with 📱 are about the Android app only; keep the 📱.

If you work on your computer:

```bash
npm install
node src/i18n/check.mjs nl   # checks one language (here: nl.js); without a code it checks all
npm run build                # builds index.html; open it in a browser to see your language
```

## Review

[@mikydon](https://github.com/mikydon) reviews every change, then it ships with the next big update. Thank you for helping! 💛
