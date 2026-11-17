// Timing engine, part 1: estimates and the workout plan.
// Every default here is documented in RESEARCH.md (§5 rest, §6 rest activity,
// §7 ramp-up, §9 profile, §11 set time).

import type { ExerciseMap } from './exercises';
import { UPPER_PATTERNS } from './exercises';
import { cooldownIdsFor, cooldownSteps, warmupIdsFor, warmupSteps } from './prep';
import type {
  Breakdown, Exercise, ExerciseStats, Experience, Pattern, Phase, Profile, Routine, WeightUnit,
} from './types';
import { formatWeight, lbToKg } from './units';

export interface TimingCtx {
  exercises: ExerciseMap;
  stats: Record<string, ExerciseStats>;
  profile: Profile;
  transitionFactor: number;
}

export const TEMPO_FACTOR: Record<Experience, number> = { new: 1.15, some: 1, experienced: 0.95 };
export const NEW_LIFTER_REST_FACTOR = 1.1;
export const HEAVIER_REST_BONUS_SEC = 15;
export const MIN_REST_SEC = 30;
export const RAMP_UP_REPS = 8;
export const RAMP_UP_FRACTION = 0.5;
export const RAMP_UP_REST_SEC = 60;
export const GET_SET_SEC = 45;
export const GET_SET_NO_WARMUP_SEC = 20;
export const TO_COOLDOWN_SEC = 30;

const round5 = (n: number) => Math.round(n / 5) * 5;
const exp = (p: Profile): Experience => p.experience ?? 'some';

/** Seconds per rep: learned pace if we have one, else the default adjusted for experience. */
export function secPerRep(e: Exercise, ctx: Pick<TimingCtx, 'stats' | 'profile'>): number {
  if (e.timed) return 1;
  const learned = ctx.stats[e.id]?.secPerRep;
  if (learned != null) return learned;
  return e.tempo * TEMPO_FACTOR[exp(ctx.profile)];
}

/** Set duration = setup + reps × seconds per rep (× 2 if unilateral). */
export function estimateSetSec(e: Exercise, reps: number, ctx: Pick<TimingCtx, 'stats' | 'profile'>): number {
  const sides = e.unilateral ? 2 : 1;
  return Math.round(e.setup + Math.max(0, reps) * secPerRep(e, ctx) * sides);
}

/** Research-based rest for one set, before personal adjustments (RESEARCH.md §5). */
export function tableRestSec(e: Exercise, reps: number): number {
  if (e.timed) return 60;
  if (e.compound) {
    if (reps <= 5) return 180;
    if (reps <= 8) return 150;
    if (reps <= 12) return 120;
    return 90;
  }
  if (reps <= 8) return 90;
  if (reps <= 15) return 75;
  return 60;
}

export interface RestEstimate {
  /** Table value + experience + heavier-than-last-time bump. */
  baseSec: number;
  /** baseSec × your learned multiplier, rounded to 5 s. */
  sec: number;
}

export function estimateRestSec(
  e: Exercise,
  reps: number,
  weightKg: number | null,
  ctx: Pick<TimingCtx, 'stats' | 'profile'>,
): RestEstimate {
  let base = tableRestSec(e, reps);
  if (exp(ctx.profile) === 'new') base *= NEW_LIFTER_REST_FACTOR;
  const last = ctx.stats[e.id]?.lastWeightKg;
  if (weightKg != null && last != null && weightKg > last + 0.1) base += HEAVIER_REST_BONUS_SEC;
  const baseSec = round5(base);
  const factor = ctx.stats[e.id]?.restFactor ?? 1;
  return { baseSec, sec: Math.max(MIN_REST_SEC, round5(baseSec * factor)) };
}

/** Time to change equipment between two exercises. */
export function estimateTransitionSec(
  prev: Exercise,
  next: Exercise,
  nextReps: number,
  ctx: Pick<TimingCtx, 'stats' | 'profile' | 'transitionFactor'>,
): RestEstimate {
  let base = next.equipment === 'barbell' && prev.id !== next.id ? 120 : prev.equipment === next.equipment ? 60 : 90;
  // Same main muscle again: never less than the rest that muscle is owed.
  if (prev.primary[0] === next.primary[0]) base = Math.max(base, tableRestSec(prev, nextReps));
  const baseSec = round5(base);
  return { baseSec, sec: Math.max(MIN_REST_SEC, round5(baseSec * ctx.transitionFactor)) };
}

// ── Starting weights (RESEARCH.md §9 — a labelled heuristic) ───────────────

export function startingWeightKg(e: Exercise, profile: Profile): number | null {
  if (e.start == null || profile.weightKg == null) return null;
  const upper = UPPER_PATTERNS.includes(e.pattern) || e.pattern === 'carry';
  const sexFactor = profile.sex === 'male' ? 1 : upper ? 0.55 : 0.7;
  const expFactor = profile.experience === 'new' ? 0.8 : profile.experience === 'experienced' ? 1.2 : 1;
  const raw = e.start * profile.weightKg * sexFactor * expFactor;
  return roundLoadDown(raw, e, profile.weightUnit);
}

/** Round down to a load that exists in a gym, in the user's units. */
export function roundLoadDown(kg: number, e: Exercise, unit: WeightUnit): number {
  if (unit === 'lb') {
    const lb = kg * 2.2046226218;
    const floor = e.equipment === 'barbell' ? 45 : 5;
    return lbToKg(Math.max(floor, Math.floor(lb / 5) * 5));
  }
  const floor = e.equipment === 'barbell' ? 20 : 2.5;
  return Math.max(floor, Math.floor(kg / 2.5) * 2.5);
}

/** The load a set will use: what was typed, else the suggested start. */
export function resolveWeightKg(weightKg: number | null, e: Exercise, profile: Profile): number | null {
  if (weightKg != null) return weightKg;
  return startingWeightKg(e, profile);
}

// ── What to do while resting (RESEARCH.md §6) ──────────────────────────────

export interface RestActivity {
  name: string;
  cue: string;
}

const isUpperPattern = (p: Pattern) => UPPER_PATTERNS.includes(p);
const isCorePattern = (p: Pattern) => p.startsWith('core') || p === 'carry';

/**
 * A light activity for the rest after `restIndex`-th set of `prev`.
 * Never a static stretch: long static holds of a muscle about to be loaded
 * reduce performance (Behm 2016; Kay & Blazevich 2012).
 */
export function restActivity(prev: Exercise, restIndex: number): RestActivity {
  const regional: RestActivity = isCorePattern(prev.pattern)
    ? { name: 'stand tall and breathe', cue: 'Roll your shoulders back and take three slow breaths.' }
    : isUpperPattern(prev.pattern)
      ? { name: 'shake out your arms', cue: 'Let your arms hang loose and shake out your hands and shoulders.' }
      : { name: 'walk it out', cue: 'A slow lap of your space keeps blood moving without tiring your legs.' };
  const cycle: RestActivity[] = [
    regional,
    { name: 'slow nasal breathing', cue: 'In through your nose for four, out for six. Let your heart rate settle.' },
    { name: 'sip water', cue: 'A small sip, then stand tall and reset your posture.' },
    isUpperPattern(prev.pattern)
      ? { name: 'walk it out', cue: 'An easy stroll while your arms recover.' }
      : { name: 'shake out your legs', cue: 'Shift side to side and shake each leg loose.' },
  ];
  return cycle[restIndex % cycle.length];
}

/** Easy dynamic mobility for the movement that is coming next. */
export function mobilityFor(next: Exercise): string {
  switch (next.pattern) {
    case 'hpush': case 'vpush': case 'upperIso': case 'armIso':
      return 'a few easy arm circles';
    case 'hpull': case 'vpull':
      return 'a few shoulder-blade squeezes';
    case 'squat': case 'lunge': case 'legIso':
      return 'a few easy bodyweight squats';
    case 'hinge': case 'gluteIso':
      return 'a few gentle hip hinges';
    case 'calves':
      return 'a few ankle circles';
    default:
      return 'two slow breaths with your ribs down';
  }
}

// ── The plan ───────────────────────────────────────────────────────────────

export interface Plan {
  phases: Phase[];
  breakdown: Breakdown;
}

export function summarise(phases: Phase[]): Breakdown {
  const b: Breakdown = { warmup: 0, lifting: 0, rest: 0, cooldown: 0, total: 0 };
  for (const p of phases) {
    if (p.kind === 'warmup') b.warmup += p.estSec;
    else if (p.kind === 'set') b.lifting += p.estSec;
    else if (p.kind === 'cooldown') b.cooldown += p.estSec;
    else b.rest += p.estSec;
  }
  b.total = b.warmup + b.lifting + b.rest + b.cooldown;
  return b;
}

/** Index of the item that gets the optional ramp-up set: the first loaded compound lift. */
export function rampUpItemIndex(routine: Routine, ctx: Pick<TimingCtx, 'exercises' | 'profile'>): number {
  return routine.items.findIndex((item) => {
    const e = ctx.exercises[item.exerciseId];
    if (!e || !e.compound || e.timed || item.sets.length === 0) return false;
    if (e.equipment === 'bodyweight' || e.equipment === 'band') return false;
    return resolveWeightKg(item.sets[0].weightKg, e, ctx.profile) != null;
  });
}

export function buildPlan(routine: Routine, ctx: TimingCtx): Plan {
  const phases: Phase[] = [];
  const items = routine.items
    .map((item, itemIndex) => ({ item, itemIndex, e: ctx.exercises[item.exerciseId] }))
    .filter((x) => x.e && x.item.sets.length > 0);

  // Warm-up
  const warm = warmupSteps(warmupIdsFor(routine, ctx.exercises));
  warm.forEach((s, i) =>
    phases.push({
      id: `wu-${i}`, kind: 'warmup', estSec: s.sec,
      title: `WARM-UP ${i + 1} OF ${warm.length}`, name: s.name, detail: s.area, cue: s.cue,
    }),
  );

  const rampIndex = routine.rampUp ? rampUpItemIndex(routine, ctx) : -1;

  items.forEach(({ item, itemIndex, e }, k) => {
    const sets = item.sets;
    const next = items[k + 1];

    if (k === 0) {
      phases.push({
        id: 'get-set', kind: 'transition',
        estSec: warm.length ? GET_SET_SEC : GET_SET_NO_WARMUP_SEC,
        title: 'GET SET', name: e.name, detail: 'Set up for your first exercise', cue: e.cues[0],
        exerciseId: e.id,
      });
    }

    if (itemIndex === rampIndex) {
      const working = resolveWeightKg(sets[0].weightKg, e, ctx.profile);
      const rampKg = working != null ? roundLoadDown(working * RAMP_UP_FRACTION, e, ctx.profile.weightUnit) : null;
      phases.push({
        id: `ramp-${item.id}`, kind: 'set', estSec: estimateSetSec(e, RAMP_UP_REPS, ctx),
        title: 'RAMP-UP SET', name: e.name, cue: 'Light and smooth — this one is just a rehearsal.',
        exerciseId: e.id, itemIndex, setIndex: -1, setCount: sets.length,
        reps: RAMP_UP_REPS, weightKg: rampKg, rampUp: true,
      });
      phases.push({
        id: `ramp-rest-${item.id}`, kind: 'rest', estSec: RAMP_UP_REST_SEC,
        title: 'REST', name: 'load your working weight', cue: e.cues[0], exerciseId: e.id,
      });
    }

    sets.forEach((set, j) => {
      const weightKg = resolveWeightKg(set.weightKg, e, ctx.profile);
      phases.push({
        id: `set-${item.id}-${set.id}`, kind: 'set', estSec: estimateSetSec(e, set.reps, ctx),
        title: `SET ${j + 1} OF ${sets.length}`, name: e.name, cue: e.cues[j % e.cues.length],
        exerciseId: e.id, itemIndex, setIndex: j, setCount: sets.length,
        reps: set.reps, weightKg,
      });

      if (j < sets.length - 1) {
        const rest = estimateRestSec(e, set.reps, weightKg, ctx);
        const act = restActivity(e, j);
        phases.push({
          id: `rest-${item.id}-${set.id}`, kind: 'rest', estSec: rest.sec, baseSec: rest.baseSec,
          title: 'REST', name: act.name, cue: act.cue, exerciseId: e.id,
        });
      } else if (next) {
        // Last rest before a new exercise: mobility for it plus its form cue.
        const tr = estimateTransitionSec(e, next.e, next.item.sets[0].reps, ctx);
        phases.push({
          id: `tr-${item.id}`, kind: 'transition', estSec: tr.sec, baseSec: tr.baseSec,
          title: 'NEXT UP', name: next.e.name,
          detail: `Set up, then ${mobilityFor(next.e)}`, cue: next.e.cues[0],
          exerciseId: next.e.id,
        });
      }
    });
  });

  // Cooldown
  const cool = cooldownSteps(cooldownIdsFor(routine, ctx.exercises));
  if (cool.length && items.length) {
    phases.push({
      id: 'to-cooldown', kind: 'transition', estSec: TO_COOLDOWN_SEC,
      title: 'COOL DOWN', name: 'Find some floor space',
      detail: 'Put your weights away and grab water', cue: 'Stretching now is for flexibility and winding down.',
    });
  }
  cool.forEach((s, i) =>
    phases.push({
      id: `cd-${i}`, kind: 'cooldown', estSec: s.sec,
      title: `COOLDOWN ${i + 1} OF ${cool.length}`,
      name: s.side ? `${s.name} · ${s.side}` : s.name, detail: s.area, cue: s.cue,
    }),
  );

  return { phases, breakdown: summarise(phases) };
}

export function estimateRoutine(routine: Routine, ctx: TimingCtx): Breakdown {
  return buildPlan(routine, ctx).breakdown;
}

/** "12 reps · 25 lb", "30 sec", "10 reps each side · bodyweight" */
export function describeSet(
  e: Pick<Exercise, 'timed' | 'unilateral' | 'equipment'> | undefined,
  reps: number,
  weightKg: number | null | undefined,
  unit: WeightUnit,
): string {
  const side = e?.unilateral ? ' each side' : '';
  const amount = e?.timed ? `${reps} sec${side}` : `${reps} rep${reps === 1 ? '' : 's'}${side}`;
  let load = '';
  if (weightKg != null && weightKg > 0) load = formatWeight(weightKg, unit);
  else if (e?.equipment === 'bodyweight') load = 'bodyweight';
  else if (e?.equipment === 'band') load = 'band';
  return load ? `${amount} · ${load}` : amount;
}
