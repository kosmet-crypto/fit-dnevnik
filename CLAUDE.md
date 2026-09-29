# Фит дневник (fit-dnevnik)

Offline food and training diary for one user (the owner's wife), shipped as an Android APK.
All data lives on the phone (WebView `localStorage`); nothing personal belongs in this repo.
The owner talks to Claude in Serbian (Cyrillic); answer in Serbian.

## Layout
- `index.html`: markup and CSS only (color tokens on `:root`, dark and light theme).
- `app.js`: the whole app (state, math, screens, sheets, i18n helpers, bridge calls).
- `foods.js`: built-in food base `FOOD_BASE` (per 100 g/ml: name, kcal, protein, unit, [portion name, g])
  and `ACTIVITY_BASE` ([name, MET]).
- `i18n.js`: `window.TR = { "Serbian Cyrillic text": ["English", "Norsk"] }`.
- `android/`: small WebView wrapper (`app.fitdnevnik`), Java only, no Kotlin.
  - `MainActivity.java`: WebView, `window.FitAndroid` bridge, update check, Health Connect (steps, sleep),
    backup folder (SAF), barcode scanner (Google code scanner).
  - `WebUpdater.java`: silent web-content updates; `InstallReceiver.java`: in-app APK install.
  - `WidgetProvider.java` + `res/layout/widget.xml`: home screen widget.
- `.github/workflows/android.yml`: builds the APK on every push to `main` and publishes a release.

## Rules for changes
- **Every user-visible string goes through `t('…')`** with the Serbian Cyrillic text as the key, and
  gets an entry in `i18n.js`. Latin script is produced automatically (`L()` transliterates), so never
  add Latin keys. Names from the food base, portions, activities, meal slots, days and months are
  translated too; text the user typed herself is shown as she wrote it.
- Check for missing translations after editing:
  ```
  node -e "global.window={};require('./foods.js');require('./i18n.js');const s=require('fs').readFileSync('app.js','utf8');const k=new Set([...s.matchAll(/\bt\('((?:[^'\\\\]|\\\\.)*)'/g)].map(m=>m[1]));console.log([...k].filter(x=>!window.TR[x]))"
  ```
- Stored data stays in Serbian (meal slots, base food ids `b:<name>`); only display is translated.
  Renaming a base food changes its id: old entries still show their stored name.
- New bridge features must be optional in JS (`window.FitAndroid && window.FitAndroid.x`), because
  the page can run on an older APK and in a normal browser.
- Changes under `android/` make the app ask for a real APK update; changes to the four web files
  are delivered silently. Prefer web-only changes when possible.
- Commit with the GitHub noreply address (the account blocks pushes that expose the private email):
  `--author="kosmet-crypto <330966259+kosmet-crypto@users.noreply.github.com>"` and the same
  `GIT_COMMITTER_EMAIL`.

## Product decisions (from the owner and his wife)
- She does not like weighing herself: weight is optional, never charted unless turned on in Settings.
  Progress is shown as weekly deficit, streaks, protein days, waist/hip measurements.
- Planned workouts are never counted on their own: the Day screen asks "Да ли си одрадила ову вежбу?"
  (Yes asks for minutes, shorter than plan is marked "скраћено"; No skips). Dance is Wed and Thu but
  varies; other routines can be added on any day from the "Још данас" chips.
- Food amounts default to grams (she logs in grams); egg dishes and "комад" portions default to
  count, and the app remembers per food whether she used portions or grams. A number typed in the
  search ("3 јаја") becomes the amount.
- Intake goal is 1,700 kcal, protein 100–110 g (her profile, entered in the app; not in the repo).
- Expenditure = BMR (Mifflin-St Jeor) × 1.2 + steps (0.00044 kcal × kg per step) + exercise
  ((MET − 1) × 3.5 × kg / 200 × min). Balance = intake − expenditure; 7,700 kcal ≈ 1 kg fat.
- Steps and sleep come from Health Connect (Android 14+). Each source is read separately and the
  largest number is used; sources are never added. A number she typed for a day always wins.
- Online food search (Open Food Facts) sends Cyrillic as Latin.

## Testing
No Android SDK in the container, so the APK is only built by CI. Test the web app with Playwright
(Chromium is preinstalled; `require('/opt/node22/lib/node_modules/playwright')`) against
`file:///…/index.html`, mocking `window.FitAndroid` with `addInitScript` for bridge features, and
look at screenshots. After pushing, check that the "Android APK" workflow run succeeded.

## Updates and releases
- Release `v1.0.<run>` contains `fit-dnevnik.apk`, `web.json` and the four web files.
  `web.json` = `{version, native, androidTree, files: {name: sha256}}`; `native` is the run number of
  the last change under `android/` (computed by CI from the git tree hash).
- The app checks hourly: if `native` > installed version code it offers "Ажурирај сада" and installs
  the APK itself; otherwise it downloads newer web files, verifies SHA-256 and uses them from the
  next start (or immediately after the manual "Провери да ли има ажурирање").
- Download link for a fresh install:
  https://github.com/kosmet-crypto/fit-dnevnik/releases/latest/download/fit-dnevnik.apk
