# RESEARCH.md — the evidence behind Sage's coaching rules and timing defaults

Every coaching rule, timing default, and number in the app points back to a section of this file.
The in-app "learn more" sheets show these same sources (they are mirrored in `src/lib/research.ts`).

**How to read this file**

- Each source has a short ID like `[acsm2026]`. The full reference list is at the bottom.
- **Verification.** Every source below was looked up online while this file was written (PubMed, PMC, the
  publisher page, or the Compendium site) to confirm that it exists and that the citation details are right.
  Where I could only confirm a finding from an abstract or a secondary summary rather than the full text,
  the reference list says so.
- **Evidence vs. judgement.** Research gives ranges, not app settings. Wherever the app had to pick one number
  inside a range, or where the research does not settle a question, the text says **"Design choice"** and
  explains the reasoning. Those choices are also logged in `DECISIONS.md`. Nothing marked "Design choice"
  is presented in the app as a research finding.
- This is general fitness information for a healthy adult, not medical advice.

---

## 1. What "toning" actually means

"Toned" is not a physiological state a muscle can be trained into. The look people mean by it comes from two
things happening together: **more muscle** and **less fat covering it** — what the literature calls body
recomposition `[barakat2020]`.

- **The muscle half comes from resistance training taken close to hard effort.** Muscle growth is similar
  across a very wide range of loads — the 2026 ACSM position stand found no difference in hypertrophy
  between low (30% 1RM) and high (100% 1RM) loads `[acsm2026]`, in line with an earlier meta-analysis that
  concluded hypertrophy "can be equally achieved across a spectrum of loading ranges" `[schoenfeld2017load]`.
  So "light weights and high reps to tone, heavy weights to bulk" is not supported: both build muscle if the
  sets are hard enough. Heavier loads are better specifically for maximal strength `[acsm2026]`
  `[schoenfeld2017load]`.
- **The fat half comes from overall energy balance, not from which exercise you pick.** Training a muscle does
  not preferentially burn the fat on top of it: six weeks of abdominal training alone did not reduce abdominal
  fat `[vispute2011]`, and a 2022 meta-analysis of 13 studies found localized training had no effect on
  localized fat `[ramirez2022]`.
- **Women and men respond similarly.** Relative gains in muscle size and lower-body strength are similar
  between sexes `[roberts2020]`, so the app does not program differently by sex (see §9 for the one place sex
  is used).

**What the app does with this:** the coach treats a "full-body toning" goal as *build muscle everywhere, with
enough weekly sets, in a comfortable moderate rep range*. It never suggests "toning exercises", spot
reduction, or high-rep-only work. The app does not give diet advice.

---

## 2. Movement-pattern balance

- The core ACSM recommendation is to train "at least twice weekly, with all major muscle groups being
  engaged" `[acsm2026]`; the earlier ACSM stand says the same for general fitness (each major muscle group
  2–3 days per week) `[garber2011]`.
- Multi-joint (compound) exercises train several muscle groups at once and are the time-efficient core of a
  programme `[iversen2021]` `[acsm2009]`.
- Organising exercise selection by movement pattern (push, pull, squat, hinge, single-leg, core) and keeping
  opposing muscle groups in balance is standard strength-and-conditioning practice `[nsca2016]`.
- Push/pull balance specifically: recreational lifters whose training favoured the chest and front shoulders
  showed shoulder strength imbalances and reduced mobility compared with non-lifters `[kolber2009]`.

**Limits of the evidence.** There is no trial showing that a specific push:pull or upper:lower *ratio* is
optimal. The pattern checklist and the ratios below are a practical way to apply "train all major muscle
groups" and "keep agonists and antagonists balanced".

**App rules**

| Rule | Threshold | Basis |
|---|---|---|
| Pattern coverage | Across all routines in a week there should be at least one push, pull, squat, hinge, single-leg, and core exercise | `[acsm2026]` `[garber2011]` `[nsca2016]` |
| Push:pull balance | Flag when weekly push sets exceed pull sets by more than 1.5× (or there is pushing and no pulling at all) | `[nsca2016]` `[kolber2009]`. **Design choice:** the 1.5× trigger is a practical threshold, not a research value. |
| Upper vs lower | Flag when one half of the body gets more than 2× the weekly sets of the other | `[acsm2026]` (all major muscle groups). **Design choice:** the 2× trigger. |
| Weekly frequency | Flag when the routines add up to fewer than 2 sessions per week | `[acsm2026]` |

---

## 3. Weekly sets per muscle group

- More weekly sets → more growth, with diminishing returns. A meta-analysis found a graded dose-response and
  larger gains with 10+ weekly sets per muscle group than with fewer than 5 `[schoenfeld2017volume]`.
- The 2026 ACSM stand recommends "≥10 sets/muscle group/wk" for hypertrophy and notes a dose-response that
  "plateaued and showed diminishing returns beyond … ~18–20 weekly sets" `[acsm2026]`.
- When time is short, **at least 4 weekly sets per muscle group** still produces meaningful gains
  `[iversen2021]`.
- How to count: the largest recent meta-regression got its best fit by counting a set fully for the muscles
  an exercise targets directly and as a half set for muscles it trains indirectly ("fractional" counting)
  `[pelland2026]`.

**App rules**

| Weekly hard sets per major muscle group | What the coach says | Basis |
|---|---|---|
| Fewer than 4 | "Low" — suggests adding an exercise | `[iversen2021]` |
| 4–9 | Fine; shown as "room to grow" on the chart, no nagging card | `[iversen2021]` `[schoenfeld2017volume]` |
| 10–20 | In the well-supported range | `[acsm2026]` `[schoenfeld2017volume]` |
| More than 20 | "Diminishing returns" — suggests trimming | `[acsm2026]` |

- Sets are counted as 1 per set for an exercise's primary muscles and 0.5 for secondary muscles
  `[pelland2026]`.
- Weekly totals are each routine's sets × the "times per week" you set for that routine.
- Major groups checked: chest, back, shoulders, quads, hamstrings, glutes. Arms, calves and core are shown on
  the chart but do not trigger "low" cards, because compound lifts already train them indirectly.
  **Design choice.**

---

## 4. Rep ranges

- Hypertrophy is similar from roughly 30% to 100% of 1RM when sets are taken to a high level of effort
  `[acsm2026]` `[schoenfeld2017load]`. Training to complete failure does not add benefit `[acsm2026]`.
- For time-efficient general training, a **6–15 rep** range is recommended `[iversen2021]`; ACSM's novice
  guidance is 8–12 reps `[acsm2009]`.
- Very heavy, low-rep work (≥80% 1RM) is the choice for *maximal strength* `[acsm2026]` and needs longer rests
  (§5).

**App rules**

- The coach treats **6–15 reps** as the home range for a full-body toning goal `[iversen2021]`.
- Sets of **fewer than 5 reps** get a gentle note: that is strength-style loading — fine, but it needs longer
  rests and is not necessary for this goal `[acsm2026]`.
- Sets of **more than 20 reps** get a note: they still build muscle `[schoenfeld2017load]` but take longer and
  are limited by discomfort rather than the muscle; adding load and working at 8–15 is more time-efficient
  `[iversen2021]`.
- The default when you add an exercise is **3 sets × 10 reps** (compounds and isolations) — inside 8–12
  `[acsm2009]` and 6–15 `[iversen2021]`.
- **Progression:** ACSM recommends a 2–10% load increase once you can do one to two reps more than the target
  `[acsm2009]`. The app suggests a small weight increase after a session where you hit every target rep; if
  the smallest available jump would be more than 10%, it suggests adding a rep per set first instead.

---

## 5. Rest between sets

- For muscle growth, resting **more than 60 s** gives a small benefit over shorter rests, with no appreciable
  further benefit beyond about **90 s** `[singer2024]`.
- For strength, untrained lifters do well with 60–120 s; trained lifters benefit from more than 2 min
  `[grgic2018]`. In trained men, 3-min rests produced more strength and thigh muscle growth than 1-min rests
  on a compound-heavy programme `[schoenfeld2016rest]`.
- ACSM's earlier guidance: 2–3 min for heavy multi-joint lifts, 1–2 min for assistance exercises
  `[acsm2009]`. The 2026 stand found rest length did not clearly change strength outcomes and had too little
  data to rule on hypertrophy `[acsm2026]` — so rest is a comfort-and-quality setting more than a make-or-break
  one.

**App defaults (seconds)** — chosen inside those ranges; heavier, lower-rep compound sets get the long end,
light isolation work the short end, and nothing goes below 60 s `[singer2024]`.

| Reps per set | Compound | Isolation / core |
|---|---|---|
| 1–5 | 180 | 90 |
| 6–8 | 150 | 90 |
| 9–12 | 120 | 75 |
| 13–20 | 90 | 60–75 |
| 21+ | 90 | 60 |
| Timed core holds and carries | — | 60 |

- **Heavier than last time: +15 s.** Heavier loads need longer recovery `[acsm2009]` `[grgic2018]`.
  **Design choice:** the size of the bump.
- **New lifters: +10% rest.** **Design choice requested in the product brief.** The research does not say
  novices need longer rests (if anything they can use shorter ones `[grgic2018]`); the extra time is for
  setting up and re-checking form, not physiology. It is small on purpose.
- **Transition between exercises: 60 s (same equipment), 90 s (different equipment), 120 s (moving to a
  barbell).** **Design choice** — this is logistics (walking, adjusting, loading plates), not a research
  value. If the next exercise works the same primary muscle, the transition is never shorter than the rest
  the table above would give.
- All of these are starting points. The app then learns your real rest times (§10).

---

## 6. What to do during rests

- **Avoid long static stretches of a muscle you are about to load.** Static stretching reduces immediate
  strength and power performance by a few percent on average, and the effect is concentrated in holds of
  **60 s or more per muscle** (about −4.6%) versus shorter holds (about −1.1%) `[behm2016]` `[kay2012]`.
- **Dynamic movement does not carry that cost** and gives a small performance benefit `[behm2016]`.
- A small acute study found that briefly stretching the *opposing* muscle between sets did not hurt and
  slightly increased reps `[miranda2015]` — interesting, but one small study in trained men, so the app does
  not prescribe it.

**App rules**

- Rest suggestions are light, low-effort activities only: walk around, shake out the limbs you just used,
  slow nasal breathing, sip water. **Design choice** on the specific wording; the constraint from research is
  what the app *avoids*.
- The app never suggests a static stretch for a muscle that is about to be loaded `[behm2016]` `[kay2012]`.
- On the last rest before a new exercise, the suggestion becomes easy *dynamic* mobility for the next
  movement plus that exercise's form cue `[behm2016]`.
- Static stretching is kept for the cooldown (§8).

---

## 7. Dynamic warm-up

- Warming up improved performance in 79% of the outcomes examined in a meta-analysis of 32 studies
  `[fradkin2010]`. The mechanisms are mostly temperature-related plus rehearsal of the movement
  `[mcgowan2015]`.
- Dynamic warm-up movement gives a small performance benefit, whereas long static holds beforehand reduce it
  `[behm2016]`.
- A short general warm-up **plus** a specific warm-up beat a specific warm-up alone before heavy leg presses
  `[abad2011]`.
- For time-efficient training, keep warm-ups short and specific to the exercises you are about to do
  `[iversen2021]`.

**App rules**

- Warm-up is **2–3 minutes: 4–6 dynamic moves of 20–40 s**, starting with one general pulse-raiser and then
  moves chosen for the joints and muscles the routine uses `[fradkin2010]` `[mcgowan2015]` `[abad2011]`.
  **Design choice:** the 2–3 minute length comes from the product brief and `[iversen2021]`'s "keep it
  short"; the studies above used longer warm-ups.
- No static holds in the warm-up `[behm2016]`.
- **Optional ramp-up set:** one lighter set (about 50% of the working weight, 8 easy reps, 60 s rest) before
  the first heavy compound lift — the "specific warm-up" `[abad2011]` `[iversen2021]` `[nsca2016]`.
  **Design choice:** the 50% × 8 recipe.

---

## 8. Post-workout static stretching (cooldown)

- For flexibility, ACSM recommends holding a static stretch **10–30 s**, accumulating about 60 s per stretch,
  at least 2–3 days per week, done when the muscle is warm `[garber2011]`.
- A 30-s hold improved hamstring flexibility as much as a 60-s hold and more than 15 s `[bandy1994]`.
- **Honest caveat:** post-exercise stretching does **not** reduce soreness or speed recovery compared with
  simply resting `[afonso2021]`, and stretching is only *needed* if flexibility is a goal `[iversen2021]`.

**App rules**

- Cooldown is **2–3 minutes of static stretches for the muscles the routine worked most**, each held
  **30 s** (two-sided stretches) or **20 s per side** as separate left/right steps `[garber2011]`
  `[bandy1994]`.
- The app describes the cooldown as *flexibility and winding down* — never as soreness prevention
  `[afonso2021]` — and every cooldown move can be swapped or removed.

---

## 9. Where your profile is used (and where it is not)

| Profile field | Used for | Basis |
|---|---|---|
| Body weight | Calories: **kcal = MET × kg × hours**, with **3.5 METs** for the warm-up and lifting block (Compendium code 02054, resistance training, multiple exercises, 8–15 reps) and **2.3 METs** for the stretching cooldown (code 02101) | `[compendium2024]` |
| Body weight | Effective load of bodyweight exercises in volume totals: push-up **64%** of body weight, knee push-up **49%** | `[ebben2011]` |
| Body weight | Other bodyweight moves: squat and lunge **88%** (body mass minus shanks and feet), pull-up/chin-up/dip **96%** (minus forearms and hands), calf raise **97%** (minus feet) | Derived from segment masses in `[deleva1996]`. **Design choice / estimate** — these are simple "what mass is actually being moved" approximations, not measured values. Bodyweight exercises with no defensible figure are left out of volume totals. |
| Body weight, sex, experience | Conservative **starting-weight suggestions** when a weight is left blank | **Design choice / heuristic.** No study gives starting loads by body weight. The app uses a cautious fraction of body weight per exercise, scaled down for women on upper-body lifts (≈0.55×) and lower-body lifts (≈0.70×) because *absolute* strength differs on average (women ≈52% of men's upper-body and ≈66% of lower-body strength in `[miller1993]`), and scaled by experience (new 0.8×, experienced 1.2×). It is always labelled "suggested start" and the guidance is ACSM's: pick a load you can lift for the target reps with good form `[acsm2009]`. |
| Experience | Tempo: new lifters ×1.15 seconds per rep, experienced ×0.95 | ACSM recommends slow-to-moderate velocities for novices `[acsm2009]`. Rep speed itself does not change muscle growth across 0.5–8 s per rep `[acsm2026]`, so this only makes the *time estimate* realistic. **Design choice:** the multipliers. |
| Experience | Rest: new lifters +10% | See §5 — **design choice.** |
| Height | Shown in the profile; **not used in any calculation** | The MET formula above uses mass only. The app says so on the profile screen rather than pretending. |
| Sex | Starting weights only | `[roberts2020]` — training response is similar, so nothing else differs. |

---

## 10. Exercise order, same-muscle stacking, and session length

- **Order.** Strength gains are largest for exercises done early in the session; for multi-joint lifts
  specifically, doing them before single-joint lifts is better. Muscle growth is not affected by order
  `[nunes2021]` `[acsm2026]`. You also get more total reps out of whatever comes first `[simao2012]`.
  → **Rule:** if an isolation exercise comes before a compound lift that uses the same primary muscle, the
  coach suggests moving the compound first.
- **Same muscle back-to-back.** Because performance drops for exercises placed later `[simao2012]`, two heavy
  compound lifts for the same primary muscle in a row means the second is done pre-fatigued; alternating body
  areas lets each recover `[nsca2016]`.
  → **Rule:** the coach flags consecutive compound lifts with the same primary muscle and offers to move the
  second one later. It is framed as an option, since doing it on purpose is also legitimate.
- **Session length.** The strongest finding of the 2026 ACSM stand is that consistency matters more than any
  programme detail `[acsm2026]`, and time is the most commonly cited barrier — effective sessions can be
  short if they are built from compound lifts `[iversen2021]`.
  → **Rule:** the coach flags a routine estimated at **over 60 minutes** and suggests where to trim.
  **Design choice:** the 60-minute line.

---

## 11. The timing engine

- **Set time = setup + reps × seconds-per-rep (× 2 for one-side-at-a-time exercises).** This is arithmetic,
  not research. Default tempos are 2–4 s per rep, inside the range where rep speed makes no difference to
  results `[acsm2026]`.
- **Learning.** After each session the app updates your personal seconds-per-rep for each exercise and a
  personal rest multiplier, using an exponential moving average (new estimate = old + 0.3 × (observed − old)).
  **Design choice** — this is a standard smoothing method, not exercise science. Learned rest multipliers are
  capped between 0.5× and 2× of the research-based defaults in §5.

---

## References

1. **[acsm2026]** Currier BS, D'Souza AC, Fiatarone Singh MA, et al. American College of Sports Medicine
   Position Stand. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical
   Performance in Healthy Adults: An Overview of Reviews. *Med Sci Sports Exerc.* 2026;58(4):851–872.
   doi:10.1249/MSS.0000000000003897. Full text: https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823
   *(Full text read; quotes above are from the paper.)*
2. **[acsm2009]** American College of Sports Medicine. Position stand: Progression models in resistance
   training for healthy adults. *Med Sci Sports Exerc.* 2009;41(3):687–708.
   doi:10.1249/MSS.0b013e3181915670. https://pubmed.ncbi.nlm.nih.gov/19204579/
3. **[garber2011]** Garber CE, Blissmer B, Deschenes MR, et al. Quantity and quality of exercise for
   developing and maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently
   healthy adults: guidance for prescribing exercise. *Med Sci Sports Exerc.* 2011;43(7):1334–1359.
   doi:10.1249/MSS.0b013e318213fefb
4. **[schoenfeld2017volume]** Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly
   resistance training volume and increases in muscle mass: a systematic review and meta-analysis.
   *J Sports Sci.* 2017;35(11):1073–1082. doi:10.1080/02640414.2016.1210197.
   https://pubmed.ncbi.nlm.nih.gov/27433992/
5. **[pelland2026]** Pelland JC, Remmert JF, Robinson ZP, Hinson SR, Zourdos MC. The Resistance Training
   Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy
   and Strength Gain. *Sports Med.* 2026;56(2):481–505. *(Confirmed from the journal listing and the 2024
   SportRxiv preprint of the same title; full text not read.)*
6. **[iversen2021]** Iversen VM, Norum M, Schoenfeld BJ, Fimland MS. No Time to Lift? Designing Time-Efficient
   Training Programs for Strength and Hypertrophy: A Narrative Review. *Sports Med.* 2021;51(10):2079–2095.
   doi:10.1007/s40279-021-01490-1. https://pmc.ncbi.nlm.nih.gov/articles/PMC8449772
7. **[schoenfeld2017load]** Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW. Strength and Hypertrophy Adaptations
   Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-analysis.
   *J Strength Cond Res.* 2017;31(12):3508–3523. https://pubmed.ncbi.nlm.nih.gov/28834797/
8. **[schoenfeld2016rest]** Schoenfeld BJ, Pope ZK, Benik FM, et al. Longer Interset Rest Periods Enhance
   Muscle Strength and Hypertrophy in Resistance-Trained Men. *J Strength Cond Res.* 2016;30(7):1805–1812.
   https://pubmed.ncbi.nlm.nih.gov/26605807/ *(Small study: 21 men, 8 weeks.)*
9. **[grgic2018]** Grgic J, Schoenfeld BJ, Skrepnik M, Davies TB, Mikulic P. Effects of Rest Interval Duration
   in Resistance Training on Measures of Muscular Strength: A Systematic Review. *Sports Med.*
   2018;48(1):137–151. doi:10.1007/s40279-017-0788-x. https://pubmed.ncbi.nlm.nih.gov/28933024/
10. **[singer2024]** Singer A, Wolf M, Generoso L, et al. Give it a rest: a systematic review with Bayesian
    meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy.
    *Front Sports Act Living.* 2024;6:1429789. doi:10.3389/fspor.2024.1429789.
    https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11349676/
11. **[nunes2021]** Nunes JP, Grgic J, Cunha PM, et al. What influence does resistance exercise order have on
    muscular strength gains and muscle hypertrophy? A systematic review and meta-analysis.
    *Eur J Sport Sci.* 2021;21(2):149–157. https://pubmed.ncbi.nlm.nih.gov/32077380/
12. **[simao2012]** Simão R, de Salles BF, Figueiredo T, Dias I, Willardson JM. Exercise order in resistance
    training. *Sports Med.* 2012;42(3):251–265. https://pubmed.ncbi.nlm.nih.gov/22292516/
13. **[behm2016]** Behm DG, Blazevich AJ, Kay AD, McHugh M. Acute effects of muscle stretching on physical
    performance, range of motion, and injury incidence in healthy active individuals: a systematic review.
    *Appl Physiol Nutr Metab.* 2016;41(1):1–11. doi:10.1139/apnm-2015-0235
14. **[kay2012]** Kay AD, Blazevich AJ. Effect of acute static stretch on maximal muscle performance: a
    systematic review. *Med Sci Sports Exerc.* 2012;44(1):154–164. *(Confirmed as the dose-response source
    cited by `[behm2016]`; not separately read.)*
15. **[miranda2015]** Miranda H, Maia MF, Paz GA, Costa PB. Acute effects of antagonist static stretching in
    the inter-set rest period on repetition performance and muscle activation. *Res Sports Med.*
    2015;23(1):37–50. *(Ten trained men; acute effect only.)*
16. **[fradkin2010]** Fradkin AJ, Zazryn TR, Smoliga JM. Effects of warming-up on physical performance: a
    systematic review with meta-analysis. *J Strength Cond Res.* 2010;24(1):140–148.
    https://pubmed.ncbi.nlm.nih.gov/19996770/
17. **[mcgowan2015]** McGowan CJ, Pyne DB, Thompson KG, Rattray B. Warm-Up Strategies for Sport and Exercise:
    Mechanisms and Applications. *Sports Med.* 2015;45(11):1523–1546. doi:10.1007/s40279-015-0376-x.
    https://pubmed.ncbi.nlm.nih.gov/26400696/
18. **[abad2011]** Abad CCC, Prado ML, Ugrinowitsch C, Tricoli V, Barroso R. Combination of general and
    specific warm-ups improves leg-press one repetition maximum compared with specific warm-up in trained
    individuals. *J Strength Cond Res.* 2011;25(8):2242–2245. doi:10.1519/JSC.0b013e3181e8611b.
    https://pubmed.ncbi.nlm.nih.gov/21544000/ *(The general warm-up in this study was 20 min of cycling —
    much longer than the app's.)*
19. **[bandy1994]** Bandy WD, Irion JM. The effect of time on static stretch on the flexibility of the
    hamstring muscles. *Phys Ther.* 1994;74(9):845–850. https://pubmed.ncbi.nlm.nih.gov/8066111/
20. **[afonso2021]** Afonso J, Clemente FM, Nakamura FY, et al. The Effectiveness of Post-exercise Stretching
    in Short-Term and Delayed Recovery of Strength, Range of Motion and Delayed Onset Muscle Soreness: A
    Systematic Review and Meta-Analysis of Randomized Controlled Trials. *Front Physiol.* 2021;12:677581.
    doi:10.3389/fphys.2021.677581
21. **[barakat2020]** Barakat C, Pearson J, Escalante G, Campbell B, De Souza EO. Body Recomposition: Can
    Trained Individuals Build Muscle and Lose Fat at the Same Time? *Strength Cond J.* 2020;42(5):7–21.
    doi:10.1519/SSC.0000000000000584
22. **[vispute2011]** Vispute SS, Smith JD, LeCheminant JD, Hurley KS. The effect of abdominal exercise on
    abdominal fat. *J Strength Cond Res.* 2011;25(9):2559–2564.
23. **[ramirez2022]** Ramírez-Campillo R, et al. A proposed model to test the hypothesis of exercise-induced
    localized fat reduction (spot reduction), including a systematic review with meta-analysis.
    *Hum Mov.* 2022;23(3). doi:10.5114/hm.2022.110373
24. **[roberts2020]** Roberts BM, Nuckols G, Krieger JW. Sex Differences in Resistance Training: A Systematic
    Review and Meta-Analysis. *J Strength Cond Res.* 2020;34(5):1448–1460.
    https://pubmed.ncbi.nlm.nih.gov/32218059/
25. **[miller1993]** Miller AEJ, MacDougall JD, Tarnopolsky MA, Sale DG. Gender differences in strength and
    muscle fiber characteristics. *Eur J Appl Physiol.* 1993;66(3):254–262. doi:10.1007/BF00235103.
    https://pubmed.ncbi.nlm.nih.gov/8477683/ *(Eight men and eight women. The 52% / 66% figures were
    confirmed from the abstract of the thesis this paper is based on.)*
26. **[compendium2024]** Herrmann SD, Willis EA, Ainsworth BE, et al. 2024 Adult Compendium of Physical
    Activities: A third update of the energy costs of human activities. *J Sport Health Sci.*
    2024;13(1):6–12. MET values checked against the published tables at https://pacompendium.com
    (codes 02054 = 3.5, 02101 = 2.3).
27. **[ebben2011]** Ebben WP, Wurm B, VanderZanden TL, et al. Kinetic analysis of several variations of
    push-ups. *J Strength Cond Res.* 2011;25(10):2891–2894. *(Regular push-up 64% of body mass, knee push-up
    49%.)*
28. **[deleva1996]** de Leva P. Adjustments to Zatsiorsky-Seluyanov's segment inertia parameters.
    *J Biomech.* 1996;29(9):1223–1230. doi:10.1016/0021-9290(95)00178-6. *(Segment mass fractions: each shank
    ≈4.3–4.8% and each foot ≈1.3–1.4% of body mass.)*
29. **[kolber2009]** Kolber MJ, Beekhuizen KS, Cheng MS, Hellman MA. Shoulder joint and muscle
    characteristics in the recreational weight training population. *J Strength Cond Res.*
    2009;23(1):148–157. doi:10.1519/JSC.0b013e31818eafb4 *(Men only; a follow-up in women did not find the
    same strength-ratio imbalance.)*
30. **[nsca2016]** Haff GG, Triplett NT, eds. *Essentials of Strength Training and Conditioning.* 4th ed.
    National Strength and Conditioning Association / Human Kinetics; 2016. *(Textbook — used for standard
    practice on exercise selection, muscle balance, and specific warm-up sets, not for numeric thresholds.)*
