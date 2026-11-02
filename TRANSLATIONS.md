# LifeHub translations

These translations are machine-assisted. A native speaker should review them before they are treated as final. The wording aims to stay plain and friendly, like the English in the app.

## How the app loads a language

- Each language is one file in `lang/`, for example `lang/es.json` or `lang/pt-BR.json`.
- Only the active language is fetched, plus English when the active language is not English. English fills any missing key.
- Keys are stable ids such as `home.morning`. Do not rename a key unless you change `app.js` too.
- `{name}` is a variable. Leave the braces and the name as they are.
- Plurals use a small ICU-style pattern:

  `{n, plural, one {# file} other {# files}}`

  `#` is the number. Add `zero`, `two`, `few`, or `many` when the language needs them. If a category is missing, the app uses `other`.

## Add a language

1. Copy `lang/en.json` to `lang/xx.json` (use a BCP 47 code, such as `pt-BR`).
2. Translate the values. Keep LifeHub, Google Maps, and the names of real services and apps (Medicare, NHS 111, Lifeline, Play Store, and so on).
3. In `i18n.js`, add a row to `LANGS`: `['xx', 'Name in that language']`.
4. If the language is right to left, add its base code to `RTL` in `i18n.js`.
5. Do not add the file to the service worker precache list. It is loaded when someone chooses it, then cached for offline use. `lang/en.json` stays in the precache so English still opens offline.

## Languages in this version

English, Spanish, French, German, Italian, Portuguese (Brazil), Portuguese (Portugal), Dutch, Arabic, Hebrew, Persian, Urdu, Hindi, Bengali, Indonesian, Turkish, Russian, Ukrainian, Polish, Vietnamese, Thai, Chinese (Simplified), Chinese (Traditional), Japanese, and Korean.

Arabic, Hebrew, Persian, and Urdu use `dir=rtl`.

## What stays in English for now

The privacy, terms, support, and delete-data pages are still English. Each page says a translation can be added later. The web app manifest description is also English, because the browser reads that file before the app can choose a language. The in-app description is translated.

Emergency phone numbers follow the region chosen in Settings, not the language.
