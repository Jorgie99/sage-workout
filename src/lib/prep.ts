// Warm-up and cooldown generator (RESEARCH.md §7 and §8).
//
// Warm-up: 2–3 minutes of dynamic moves — one general pulse-raiser, then moves
// matched to the joints and muscles the routine uses. No static holds.
// Cooldown: 2–3 minutes of static stretches for the muscles worked most, held
// 30 s (20 s per side for one-sided stretches, as separate left/right steps).

import type { ExerciseMap } from './exercises';
import type { Muscle, Pattern, Routine } from './types';

export type Region =
  | 'general' | 'shoulders' | 'upperBack' | 'spine' | 'hips'
  | 'hamstrings' | 'glutes' | 'quads' | 'ankles' | 'core';

export interface WarmupMove {
  id: string;
  name: string;
  area: string;
  cue: string;
  sec: number;
  regions: Region[];
}

export interface Stretch {
  id: string;
  name: string;
  area: string;
  cue: string;
  muscles: Muscle[];
  perSide: boolean;
}

export interface PrepStep {
  key: string;
  moveId: string;
  name: string;
  area: string;
  cue: string;
  sec: number;
  side?: 'left' | 'right';
}

export const WARMUP_MIN_SEC = 120;
export const WARMUP_MAX_SEC = 180;
export const COOLDOWN_MIN_SEC = 120;
export const COOLDOWN_MAX_SEC = 180;
export const STRETCH_HOLD_SEC = 30;
export const STRETCH_SIDE_SEC = 20;

export const WARMUP_MOVES: WarmupMove[] = [
  { id: 'wu-march', name: 'March in Place', area: 'Whole body', sec: 30, regions: ['general'],
    cue: 'Brisk marching with big arm swings to raise your pulse.' },
  { id: 'wu-jacks', name: 'Low-Impact Jacks', area: 'Whole body', sec: 30, regions: ['general'],
    cue: 'Step one foot out at a time as your arms sweep overhead.' },
  { id: 'wu-arm-circles', name: 'Arm Circles', area: 'Shoulders', sec: 30, regions: ['shoulders'],
    cue: 'Small circles growing to big ones, forward then backward.' },
  { id: 'wu-wall-slides', name: 'Wall Slides', area: 'Shoulders & upper back', sec: 30, regions: ['shoulders', 'upperBack'],
    cue: 'Back against a wall, slide your arms up and down like a slow snow angel.' },
  { id: 'wu-band-pull-aparts', name: 'Band Pull-Aparts', area: 'Upper back', sec: 30, regions: ['upperBack', 'shoulders'],
    cue: 'Arms straight, pull the band to your chest; no band, just squeeze your shoulder blades.' },
  { id: 'wu-cat-cow', name: 'Cat-Cow', area: 'Spine', sec: 30, regions: ['spine', 'core'],
    cue: 'On all fours, slowly round then arch your back with your breath.' },
  { id: 'wu-thread-needle', name: 'Thread the Needle', area: 'Upper back', sec: 30, regions: ['spine', 'upperBack'],
    cue: 'On all fours, reach one arm under and then up to the ceiling; switch sides halfway.' },
  { id: 'wu-leg-swings', name: 'Leg Swings', area: 'Hips & hamstrings', sec: 30, regions: ['hips', 'hamstrings'],
    cue: 'Hold something steady and swing one leg front to back; switch legs halfway.' },
  { id: 'wu-hip-hinge', name: 'Hip Hinge Drill', area: 'Hamstrings & glutes', sec: 30, regions: ['hamstrings', 'glutes'],
    cue: 'Hands on hips, push your hips back with a flat back, then stand tall.' },
  { id: 'wu-glute-bridge', name: 'Glute Bridges', area: 'Glutes', sec: 30, regions: ['glutes', 'hips'],
    cue: 'Lying on your back, lift your hips by squeezing your glutes; pause at the top.' },
  { id: 'wu-bw-squat', name: 'Bodyweight Squats', area: 'Quads & hips', sec: 30, regions: ['quads', 'hips', 'ankles'],
    cue: 'Slow, easy squats — a little deeper with each rep.' },
  { id: 'wu-lunge-reach', name: 'Reverse Lunge with Reach', area: 'Hips & quads', sec: 40, regions: ['hips', 'quads', 'spine'],
    cue: 'Step back into a lunge and reach both arms overhead; alternate legs.' },
  { id: 'wu-ankle-rocks', name: 'Ankle Rocks', area: 'Ankles & calves', sec: 20, regions: ['ankles'],
    cue: 'In a split stance, glide your front knee over your toes, heel down; switch halfway.' },
  { id: 'wu-dead-bug', name: 'Dead Bug', area: 'Core', sec: 30, regions: ['core'],
    cue: 'On your back, slowly lower the opposite arm and leg while your lower back stays down.' },
  { id: 'wu-inchworm', name: 'Inchworm', area: 'Hamstrings, shoulders & core', sec: 40, regions: ['hamstrings', 'shoulders', 'core'],
    cue: 'Fold forward, walk your hands out to a plank, then walk them back.' },
  { id: 'wu-hip-circles', name: 'Standing Hip Circles', area: 'Hips', sec: 30, regions: ['hips'],
    cue: 'Lift one knee and draw slow circles from the hip; switch legs halfway.' },
];

export const STRETCHES: Stretch[] = [
  { id: 'st-chest-doorway', name: 'Doorway Chest Stretch', area: 'Chest', muscles: ['chest'], perSide: false,
    cue: 'Forearms on a doorframe, step through gently until you feel your chest open.' },
  { id: 'st-chest-clasp', name: 'Clasped-Hands Chest Opener', area: 'Chest & front shoulders', muscles: ['chest', 'shoulders'], perSide: false,
    cue: 'Clasp your hands behind you, straighten your arms and lift your chest.' },
  { id: 'st-childs-pose', name: 'Child’s Pose', area: 'Back & lats', muscles: ['back'], perSide: false,
    cue: 'Sit back on your heels and walk your hands far forward, letting your chest sink.' },
  { id: 'st-lat-side-reach', name: 'Side-Reach Lat Stretch', area: 'Lats', muscles: ['back'], perSide: true,
    cue: 'Hold something sturdy, sit your hips back and lean away until your side lengthens.' },
  { id: 'st-cross-body', name: 'Cross-Body Shoulder Stretch', area: 'Shoulders', muscles: ['shoulders'], perSide: true,
    cue: 'Draw one arm across your chest with the other, shoulder relaxed down.' },
  { id: 'st-overhead-triceps', name: 'Overhead Triceps Stretch', area: 'Triceps', muscles: ['triceps'], perSide: true,
    cue: 'Reach one hand down your back and gently press the elbow with the other hand.' },
  { id: 'st-biceps-wall', name: 'Wall Biceps Stretch', area: 'Biceps', muscles: ['biceps', 'forearms'], perSide: true,
    cue: 'Palm flat on a wall behind you at shoulder height, turn your body gently away.' },
  { id: 'st-quad-standing', name: 'Standing Quad Stretch', area: 'Quads', muscles: ['quads'], perSide: true,
    cue: 'Hold your ankle behind you, knees together, and tuck your hips under.' },
  { id: 'st-hip-flexor', name: 'Half-Kneeling Hip Flexor Stretch', area: 'Hip flexors & quads', muscles: ['quads'], perSide: true,
    cue: 'Kneel on one knee, squeeze that glute and shift your hips forward.' },
  { id: 'st-forward-fold', name: 'Seated Forward Fold', area: 'Hamstrings', muscles: ['hamstrings'], perSide: false,
    cue: 'Legs long, hinge from your hips and reach toward your feet with a long spine.' },
  { id: 'st-hamstring-supine', name: 'Lying Hamstring Stretch', area: 'Hamstrings', muscles: ['hamstrings'], perSide: true,
    cue: 'On your back, hold behind one thigh and straighten that leg toward the ceiling.' },
  { id: 'st-figure-four', name: 'Figure-4 Glute Stretch', area: 'Glutes', muscles: ['glutes'], perSide: true,
    cue: 'On your back, cross one ankle over the other knee and draw both legs in.' },
  { id: 'st-knee-hug', name: 'Double Knee Hug', area: 'Glutes & lower back', muscles: ['glutes', 'back'], perSide: false,
    cue: 'On your back, hug both knees to your chest and breathe slowly.' },
  { id: 'st-butterfly', name: 'Butterfly Stretch', area: 'Inner thighs', muscles: ['adductors'], perSide: false,
    cue: 'Soles of your feet together, sit tall and let your knees fall open.' },
  { id: 'st-calf-wall', name: 'Wall Calf Stretch', area: 'Calves', muscles: ['calves'], perSide: true,
    cue: 'Hands on a wall, one leg back with the heel pressed down and knee straight.' },
  { id: 'st-sphinx', name: 'Sphinx', area: 'Abs', muscles: ['core'], perSide: false,
    cue: 'Lie face down, prop up on your forearms and let your stomach lengthen.' },
];

const WARMUP_BY_ID: Record<string, WarmupMove> = Object.fromEntries(WARMUP_MOVES.map((m) => [m.id, m]));
const STRETCH_BY_ID: Record<string, Stretch> = Object.fromEntries(STRETCHES.map((s) => [s.id, s]));

const PATTERN_REGIONS: Record<Pattern, Partial<Record<Region, number>>> = {
  hpush: { shoulders: 2, spine: 1 },
  vpush: { shoulders: 2, spine: 1 },
  hpull: { upperBack: 2, spine: 1 },
  vpull: { upperBack: 2, shoulders: 1 },
  squat: { quads: 2, hips: 2, ankles: 1 },
  hinge: { hamstrings: 2, glutes: 2 },
  lunge: { hips: 2, quads: 1, glutes: 1 },
  gluteIso: { glutes: 2 },
  legIso: { quads: 1, hamstrings: 1 },
  coreAntiExt: { core: 2, spine: 1 },
  coreAntiRot: { core: 2, spine: 1 },
  coreFlex: { core: 2, spine: 1 },
  armIso: { shoulders: 1 },
  upperIso: { shoulders: 2 },
  calves: { ankles: 2 },
  carry: { shoulders: 1, core: 1 },
};

/** How much each body region needs warming, weighted by the routine's sets. */
export function regionNeeds(routine: Pick<Routine, 'items'>, exercises: ExerciseMap): Partial<Record<Region, number>> {
  const need: Partial<Record<Region, number>> = {};
  for (const item of routine.items) {
    const e = exercises[item.exerciseId];
    if (!e) continue;
    const sets = Math.max(1, item.sets.length);
    for (const [region, w] of Object.entries(PATTERN_REGIONS[e.pattern]) as [Region, number][]) {
      need[region] = (need[region] ?? 0) + w * sets;
    }
  }
  return need;
}

/** Sets per muscle in the routine: 1 for primary movers, 0.5 for secondary. */
export function muscleLoad(routine: Pick<Routine, 'items'>, exercises: ExerciseMap): Partial<Record<Muscle, number>> {
  const load: Partial<Record<Muscle, number>> = {};
  for (const item of routine.items) {
    const e = exercises[item.exerciseId];
    if (!e) continue;
    const sets = item.sets.length;
    for (const m of e.primary) load[m] = (load[m] ?? 0) + sets;
    for (const m of e.secondary) load[m] = (load[m] ?? 0) + sets * 0.5;
  }
  return load;
}

/** The generated warm-up as a list of move ids. Deterministic. */
export function generateWarmupIds(routine: Pick<Routine, 'items'>, exercises: ExerciseMap): string[] {
  const need = { ...regionNeeds(routine, exercises) };
  const picked: WarmupMove[] = [WARMUP_BY_ID['wu-march']];
  const targeted = WARMUP_MOVES.filter((m) => !m.regions.includes('general'));
  let total = picked[0].sec;

  const score = (m: WarmupMove) => m.regions.reduce((sum, r) => sum + (need[r] ?? 0), 0);

  while (picked.length < 6) {
    let best: WarmupMove | null = null;
    let bestScore = 0;
    for (const m of targeted) {
      if (picked.includes(m)) continue;
      if (total + m.sec > WARMUP_MAX_SEC) continue;
      const s = score(m);
      if (s > bestScore) {
        best = m;
        bestScore = s;
      }
    }
    if (!best) break;
    // Stop adding once the main areas are covered and the warm-up is long enough.
    if (picked.length >= 5 && total >= WARMUP_MIN_SEC) break;
    picked.push(best);
    total += best.sec;
    for (const r of best.regions) need[r] = (need[r] ?? 0) * 0.3;
  }

  // Short or empty routines: pad with general-purpose moves so the warm-up
  // still has at least four moves and lasts at least two minutes.
  const fillers = ['wu-arm-circles', 'wu-cat-cow', 'wu-bw-squat', 'wu-leg-swings', 'wu-jacks'];
  for (const id of fillers) {
    if (picked.length >= 4 && total >= WARMUP_MIN_SEC) break;
    const m = WARMUP_BY_ID[id];
    if (picked.includes(m) || total + m.sec > WARMUP_MAX_SEC) continue;
    picked.push(m);
    total += m.sec;
  }
  return picked.map((m) => m.id);
}

/** The generated cooldown as a list of stretch ids. Deterministic. */
export function generateCooldownIds(routine: Pick<Routine, 'items'>, exercises: ExerciseMap): string[] {
  const load = { ...muscleLoad(routine, exercises) };
  const picked: Stretch[] = [];
  let total = 0;
  const cost = (s: Stretch) => (s.perSide ? STRETCH_SIDE_SEC * 2 : STRETCH_HOLD_SEC);
  const score = (s: Stretch) => s.muscles.reduce((sum, m, i) => sum + (load[m] ?? 0) * (i === 0 ? 1 : 0.5), 0);

  while (total < COOLDOWN_MAX_SEC) {
    let best: Stretch | null = null;
    let bestScore = 0;
    for (const s of STRETCHES) {
      if (picked.includes(s) || total + cost(s) > COOLDOWN_MAX_SEC) continue;
      const sc = score(s);
      if (sc > bestScore) {
        best = s;
        bestScore = sc;
      }
    }
    if (!best) break;
    picked.push(best);
    total += cost(best);
    for (const m of best.muscles) load[m] = (load[m] ?? 0) * 0.2;
  }

  const fillers = ['st-childs-pose', 'st-forward-fold', 'st-chest-clasp', 'st-knee-hug'];
  for (const id of fillers) {
    if (total >= COOLDOWN_MIN_SEC) break;
    const s = STRETCH_BY_ID[id];
    if (picked.includes(s) || total + cost(s) > COOLDOWN_MAX_SEC) continue;
    picked.push(s);
    total += cost(s);
  }
  return picked.map((s) => s.id);
}

export function warmupIdsFor(routine: Routine, exercises: ExerciseMap): string[] {
  return routine.warmupIds ?? generateWarmupIds(routine, exercises);
}

export function cooldownIdsFor(routine: Routine, exercises: ExerciseMap): string[] {
  return routine.cooldownIds ?? generateCooldownIds(routine, exercises);
}

export function warmupSteps(ids: string[]): PrepStep[] {
  return ids
    .map((id) => WARMUP_BY_ID[id])
    .filter(Boolean)
    .map((m, i) => ({ key: `${m.id}-${i}`, moveId: m.id, name: m.name, area: m.area, cue: m.cue, sec: m.sec }));
}

/** One-sided stretches become two separate timed steps: left, then right. */
export function cooldownSteps(ids: string[]): PrepStep[] {
  const steps: PrepStep[] = [];
  ids
    .map((id) => STRETCH_BY_ID[id])
    .filter(Boolean)
    .forEach((s, i) => {
      if (s.perSide) {
        for (const side of ['left', 'right'] as const) {
          steps.push({ key: `${s.id}-${i}-${side}`, moveId: s.id, name: s.name, area: s.area, cue: s.cue, sec: STRETCH_SIDE_SEC, side });
        }
      } else {
        steps.push({ key: `${s.id}-${i}`, moveId: s.id, name: s.name, area: s.area, cue: s.cue, sec: STRETCH_HOLD_SEC });
      }
    });
  return steps;
}

export function getWarmupMove(id: string): WarmupMove | undefined {
  return WARMUP_BY_ID[id];
}
export function getStretch(id: string): Stretch | undefined {
  return STRETCH_BY_ID[id];
}

/** Alternatives for a swap, most relevant to this routine first. */
export function warmupAlternatives(currentIds: string[], routine: Pick<Routine, 'items'>, exercises: ExerciseMap): WarmupMove[] {
  const need = regionNeeds(routine, exercises);
  return WARMUP_MOVES.filter((m) => !currentIds.includes(m.id)).sort(
    (a, b) =>
      b.regions.reduce((s, r) => s + (need[r] ?? 0), 0) - a.regions.reduce((s, r) => s + (need[r] ?? 0), 0),
  );
}

export function stretchAlternatives(currentIds: string[], routine: Pick<Routine, 'items'>, exercises: ExerciseMap): Stretch[] {
  const load = muscleLoad(routine, exercises);
  return STRETCHES.filter((s) => !currentIds.includes(s.id)).sort(
    (a, b) =>
      b.muscles.reduce((s, m) => s + (load[m] ?? 0), 0) - a.muscles.reduce((s, m) => s + (load[m] ?? 0), 0),
  );
}
