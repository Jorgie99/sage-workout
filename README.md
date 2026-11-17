# Sage — workout routine builder, coach and visual timer

A personal workout app for iPhone, built as a Progressive Web App: install it from Safari, and it runs
full-screen and offline. No backend, no account, no sounds. Everything is stored on the phone in IndexedDB.

- **Stack:** Vite + React + TypeScript, `vite-plugin-pwa`, Dexie (IndexedDB), Vitest.
- **Docs:** [`RESEARCH.md`](RESEARCH.md) (the evidence behind every coaching rule and timing default) and
  [`DECISIONS.md`](DECISIONS.md) (judgement calls made while building).

**Live app:** https://jorgie99.github.io/sage-workout/

> **Status:** unit tested and walked through screen by screen in a desktop browser at 390×844. It has **not
> been tested on a real iPhone yet** — see "What has and hasn't been checked" in `DECISIONS.md`.

## Local development (Windows)

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. In Chrome or Edge, press F12 → the device toolbar → set the size to 390 × 844.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests (timing engine, player, learning, coach rules, warm-up/cooldown, contrast) |
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run preview` | Serves the production build at http://localhost:4173 (this is where the service worker runs) |
| `npm run assets` | Regenerates the icons and iOS splash screens in `public/` |

To try it on your iPhone before deploying: run `npm run preview`, find your PC's IP address with `ipconfig`,
and open `http://<that-ip>:4173` in Safari on the same Wi-Fi. (Offline mode and Add to Home Screen need HTTPS,
so they only work fully on the deployed site.)

Tip: this folder lives in OneDrive. If installs are slow, pause OneDrive syncing while `npm install` runs.

## Deploy to GitHub Pages (free)

The build uses relative paths and hash-based routing, so it works at `https://<user>.github.io/<repo>/`
without any configuration.

This repository is already set up: every push to `main` runs `.github/workflows/deploy.yml`, which installs,
runs the tests, builds, and publishes `dist/` to GitHub Pages. To ship a change:

```bash
git add -A
```

```bash
git commit -m "Describe the change"
```

```bash
git push
```

The new version is live a minute or two later; the installed app picks it up the next time it is opened
(close and reopen it once more if you still see the old version).

To set this up from scratch in a different repository: create a **public** repo (Pages is free for public
repos), push this folder to it, and choose **Settings → Pages → Source → GitHub Actions**.

## Install on your iPhone

1. Open the deployed URL in **Safari** (it must be Safari).
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open Sage from the Home Screen. It runs full-screen and works offline after the first load.

Notes for iOS:

- The screen stays awake during a workout on **iOS 18.4 or later** (Screen Wake Lock in Home Screen apps).
  On older versions the app tells you the screen may dim.
- There are no sounds and no vibration (iOS has no Vibration API). All cues are visual.
- Timers are based on timestamps, so switching apps or locking the phone does not lose your place.
- iOS can clear a web app's data if it goes unused for a long time. Use **Settings → Export backup** now and then.

## Optional: Ask Claude for a review

In **Settings**, paste your own Anthropic API key. A review button then appears on each routine's Coach tab.
The key is stored only on the device and is sent only to Anthropic. Without a key the button is hidden and
the built-in coach works fully offline.

## Project layout

```
src/lib/        pure logic — timing.ts, player.ts, learning.ts, coach.ts, prep.ts, exercises.ts, research.ts, db.ts, ai.ts
src/screens/    Onboarding, Routines, RoutineEditor, WorkoutTab, Player, SessionView, History, Settings
src/components/ bottom sheet, exercise picker, coach cards, swipe row, small controls
scripts/        gen-assets.mjs (icons and splash screens)
```
