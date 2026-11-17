# DECISIONS.md

Judgement calls made while building, and what is still open.

## What has and hasn't been checked

**Checked**

- 140 unit tests: timing engine, player state machine, learning, coach rules, warm-up/cooldown generator,
  colour contrast.
- Every screen opened in a desktop browser at 390×844 and used end to end: onboarding, home, exercise picker
  (search, chips, recents), routine editor (typing weights, add set, swipe-to-delete, drag-to-reorder), warm-up
  swap, coach cards with one-tap fixes and "learn more", save, workout start, and a full workout in the player
  (auto-advancing warm-up, ramp-up set, Done, editing a logged set, ±15 s, last-5-seconds cue, the "ready"
  wash at zero, pause/resume, skip, reloading the page mid-workout, cooldown, finish), then summary, history
  and settings. No horizontal overflow; interactive targets are at least 48 px.
- Bugs found and fixed during that pass: swipe-to-delete was interrupted by the browser's native text drag;
  the editor reset to the Exercises tab after the first save of a new routine; the summary screen could
  redirect home before the just-saved session had loaded; the ring emptied anticlockwise.

**Not checked — please try these on your phone**

1. **A real iPhone.** Wake lock, safe-area spacing, Add to Home Screen, the splash screen, offline launch,
   the share-sheet backup export, and the swipe and drag gestures with a finger (they were tested with a mouse).
2. **The Ask Claude review has never been run against the API.** It compiles against the SDK's types only;
   no key was available to test with.
3. **Backup import/export** was not exercised in the browser pass (the logic is small, but untested).
4. **A real-length workout.** The test workout was rushed through in about three minutes.

## Plan that was followed

- **Data (Dexie):** `kv` (profile, settings, active workout, recent exercises), `routines`, `sessions`,
  `customExercises`, `exerciseStats` (learned pace, rest multiplier, bests). Loads are stored in kg and
  converted for display.
- **Screens:** Onboarding · Routines · Routine editor (Exercises / Warm-up / Coach) · Workout (start + player) ·
  Summary · History + detail · Settings. Hash routing, four-tab bar.
- **Timing engine:** `timing.ts` builds a list of phases with estimates → `player.ts` is a pure,
  timestamp-based state machine → `learning.ts` folds real times back in with an exponential moving average.

## Product decisions

- **App name "Sage"**, folder `sage-workout`. Easy to rename (manifest in `vite.config.ts`, `index.html`).
- **Rests wait for a tap by default.** The brief asks both for a wash into the next phase at zero and for
  logging rests that run late. So when a rest hits zero the screen washes to the next set's colour and shows
  "+0:08 extra rest" until you tap **Start set**; that real rest is logged. Settings has
  "Start sets automatically" for hands-free use. Warm-up and cooldown steps always advance by themselves.
- **A set never starts straight after a timed phase.** A short "Get set" step follows the warm-up and a
  "Cool down" step precedes the stretches, so set times are not polluted by walking to the equipment.
- **"Times per week" per routine** was added (not in the brief) because weekly sets per muscle cannot be
  judged without it.
- **Two extra movement patterns** beyond the brief's list: "Chest & shoulder isolation" and "Leg isolation",
  so lateral raises, flies, leg extensions and curls do not count as push or squat coverage.
- **Timed exercises** (plank, carries) use the reps field as seconds.
- **Weekly-set cards only fire below 4 or above 20**, and at most two "low" cards show at once, to keep the
  coach calm. The chart shows everything.
- **Height is collected but used in no calculation**; the profile screen says so. It is only included in an
  AI review.
- **Sex is used only for starting-weight suggestions.** "Prefer not to say" uses the more cautious values.
- **Volume counts the weight you type.** For dumbbells that is per dumbbell; unilateral sets count both sides.
- **Personal bests need history.** A first session sets the baseline rather than showing every lift as a best.
- **Progression:** +5 lb / +2.5 kg when that is within 10%; otherwise +1 rep per set until 15 reps.
- **Ramp-up set defaults to on** for new routines; it can be switched off per routine.
- **Backups never include the API key**, and importing keeps the key already on the device.
- **Deleting a routine keeps its sessions** in History.

## Design decisions

- **Contrast.** The brief's taupe (~#8A7F75) is 3.5:1 on cream and the deeper sage (~#6F8466) 3.6:1 — both
  fail AA for body text. Secondary text is `#6B6259`; sage used as text or behind white text is `#56694E`.
  The original taupe and sage are kept for icons, rings and large shapes. `src/lib/contrast.test.ts` checks
  every pairing against the real CSS tokens.
- **Phase colours:** warm-up sand, set sage, rest dusty blush, transition oat, cooldown a cooler pale sage.
  Each ring passes 3:1 against its tint.
- **Fonts:** Fraunces (headings, timer digits) and DM Sans (UI), Latin subsets copied into `src/assets/fonts`
  and precached.
- **Timer digits** sit in fixed-width cells so the time does not jitter.

## Technical decisions

- **Official Anthropic SDK instead of a hand-written `fetch`.** `dangerouslyAllowBrowser: true` sends the
  `anthropic-dangerous-direct-browser-access: true` header the brief names. It is loaded on demand, so it is
  a separate chunk. Default model `claude-haiku-5-5`, editable in Settings; replies use a JSON schema.
- **`base: './'` + `HashRouter`** so one build works on GitHub Pages under any repo name.
- **Splash images are not precached** (iOS fetches them itself); everything else is.
- **Drag to reorder** uses `@dnd-kit` with a drag handle; **swipe to delete** is a small custom pointer handler.
- **Main bundle is ~175 kB gzipped.** Acceptable for an installed, precached app; not optimised further.
- **The folder is inside OneDrive.** It works, but `node_modules` syncing can be slow.

## Research caveats

`RESEARCH.md` marks every place where the app picks a number that research does not fix ("Design choice").
The main ones: the push:pull 1.5× and upper:lower 2× triggers, the 60-minute session line, the +10% rest
for new lifters (requested in the brief; the evidence does not call for it), transition times, bodyweight
fractions other than push-ups, and all starting-weight suggestions.
