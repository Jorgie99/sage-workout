// Timing engine, part 3: "estimate, then learn" — plus the session summary
// maths (volume, calories, personal bests, progression).

import type { ExerciseMap } from './exercises';
import { actualBreakdown, sessionElapsedMs, type PlayerState } from './player';
import { TEMPO_FACTOR } from './timing';
import type {
  Breakdown, Exercise, ExerciseStats, PersonalBest, Profile, Routine, Session, SessionItem, SessionSet, WeightUnit,
} from './types';
import { formatWeight, lbToKg, uid } from './units';

export const EMA_ALPHA = 0.3;
export const SEC_PER_REP_RANGE: [number, number] = [1, 12];
export const REST_FACTOR_RANGE: [number, number] = [0.5, 2];
/** Shorter than this is treated as an accidental tap, not a real measurement. */
export const MIN_VALID_SET_SEC = 4;
export const MIN_VALID_REST_SEC = 5;

export const MET_LIFTING = 3.5; // Compendium 02054
export const MET_STRETCHING = 2.3; // Compendium 02101

const clamp = (n: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, n));

/** Exponential moving average: new = old + α × (observed − old). */
export function ema(prev: number, observed: number, alpha = EMA_ALPHA): number {
  return prev + alpha * (observed - prev);
}

/** The seconds-per-rep a finished set implies, or null if it can't be trusted. */
export function impliedSecPerRep(e: Exercise, reps: number, setSec: number): number | null {
  if (e.timed || reps <= 0 || setSec < MIN_VALID_SET_SEC) return null;
  const sides = e.unilateral ? 2 : 1;
  return clamp((setSec - e.setup) / (reps * sides), SEC_PER_REP_RANGE);
}

export interface Learned {
  stats: Record<string, ExerciseStats>;
  transitionFactor: number;
}

/**
 * Fold one finished workout into the per-exercise estimates:
 *  - seconds per rep, from each set's real duration
 *  - a rest multiplier, from the rest actually taken vs the research-based rest
 *  - a global transition multiplier, from real equipment-change times
 */
export function learnFromWorkout(
  state: PlayerState,
  exercises: ExerciseMap,
  before: Record<string, ExerciseStats>,
  profile: Profile,
  transitionFactor: number,
  now: number,
): Learned {
  const stats: Record<string, ExerciseStats> = {};
  const get = (id: string): ExerciseStats => {
    if (!stats[id]) stats[id] = { ...before[id], exerciseId: id, samples: before[id]?.samples ?? 0 };
    return stats[id];
  };
  const tempoFactor = TEMPO_FACTOR[profile.experience ?? 'some'];

  for (const log of state.logs) {
    const e = exercises[log.exerciseId];
    if (!e || log.skipped) continue;
    const st = get(e.id);
    st.lastUsedAt = now;
    if (log.rampUp) continue;

    const implied = impliedSecPerRep(e, log.reps, log.setSec);
    if (implied != null) {
      st.secPerRep = ema(st.secPerRep ?? e.tempo * tempoFactor, implied);
      st.samples += 1;
    }
    st.lastWeightKg = log.weightKg;
    st.lastReps = log.reps;
    if (log.weightKg != null && log.weightKg > (st.bestWeightKg ?? 0)) st.bestWeightKg = log.weightKg;
    if (log.reps > (st.bestReps ?? 0)) st.bestReps = log.reps;
    const vol = setVolumeKg(e, log.reps, log.weightKg, profile.weightKg);
    if (vol > (st.bestSetVolumeKg ?? 0)) st.bestSetVolumeKg = vol;
  }

  let tf = transitionFactor;
  state.plan.forEach((phase, i) => {
    const actual = state.actualSec[i];
    if (actual == null || actual < MIN_VALID_REST_SEC || phase.baseSec == null) return;
    const ratio = clamp(actual / phase.baseSec, REST_FACTOR_RANGE);
    if (phase.kind === 'rest') {
      const prev = state.plan[i - 1];
      const prevLog = state.logs.find((l) => l.phaseIndex === i - 1);
      if (!prev || prev.kind !== 'set' || !prev.exerciseId || !prevLog || prevLog.skipped) return;
      const st = get(prev.exerciseId);
      st.restFactor = ema(st.restFactor ?? 1, ratio);
    } else if (phase.kind === 'transition') {
      tf = ema(tf, ratio);
    }
  });

  return { stats, transitionFactor: clamp(tf, REST_FACTOR_RANGE) };
}

// ── Volume and calories (RESEARCH.md §9) ───────────────────────────────────

/** Load actually moved per rep: the share of body weight (if any) plus the weight held. */
export function effectiveLoadKg(e: Exercise, weightKg: number | null, bodyKg: number | null): number {
  const body = e.bw != null && bodyKg != null ? e.bw * bodyKg : 0;
  return body + (weightKg ?? 0);
}

export function setVolumeKg(e: Exercise, reps: number, weightKg: number | null, bodyKg: number | null): number {
  if (e.timed) return 0;
  return effectiveLoadKg(e, weightKg, bodyKg) * reps * (e.unilateral ? 2 : 1);
}

/** kcal = MET × kg × hours. Lifting block at 3.5 METs, stretching at 2.3. */
export function estimateKcal(b: Breakdown, bodyKg: number | null): number | null {
  if (bodyKg == null) return null;
  const liftingHours = (b.warmup + b.lifting + b.rest) / 3600;
  const stretchHours = b.cooldown / 3600;
  return Math.round(MET_LIFTING * bodyKg * liftingHours + MET_STRETCHING * bodyKg * stretchHours);
}

// ── Building the saved session ─────────────────────────────────────────────

export function findPersonalBests(
  items: SessionItem[],
  exercises: ExerciseMap,
  before: Record<string, ExerciseStats>,
  bodyKg: number | null,
): PersonalBest[] {
  const prs: PersonalBest[] = [];
  for (const item of items) {
    const e = exercises[item.exerciseId];
    const prev = before[item.exerciseId];
    // No history yet: a first session sets the baseline, it doesn't "beat" anything.
    if (!e || !prev || prev.lastReps == null) continue;
    const done = item.sets.filter((s) => !s.skipped && !s.rampUp && s.reps > 0);
    if (!done.length) continue;

    const maxWeight = Math.max(...done.map((s) => s.weightKg ?? 0));
    const maxReps = Math.max(...done.map((s) => s.reps));
    const maxVol = Math.max(...done.map((s) => setVolumeKg(e, s.reps, s.weightKg, bodyKg)));

    if (maxWeight > 0 && prev.bestWeightKg != null && maxWeight > prev.bestWeightKg + 0.05) {
      prs.push({ exerciseId: e.id, name: e.name, kind: 'weight', value: maxWeight, previous: prev.bestWeightKg });
    } else if (maxVol > 0 && prev.bestSetVolumeKg != null && prev.bestSetVolumeKg > 0 && maxVol > prev.bestSetVolumeKg + 0.05) {
      prs.push({ exerciseId: e.id, name: e.name, kind: 'volume', value: maxVol, previous: prev.bestSetVolumeKg });
    } else if (maxWeight === 0 && prev.bestReps != null && maxReps > prev.bestReps) {
      prs.push({ exerciseId: e.id, name: e.name, kind: 'reps', value: maxReps, previous: prev.bestReps });
    }
  }
  return prs;
}

export function buildSession(
  state: PlayerState,
  exercises: ExerciseMap,
  before: Record<string, ExerciseStats>,
  profile: Profile,
  now: number,
): Session {
  const byItem = new Map<number, SessionItem>();
  for (const log of state.logs) {
    const e = exercises[log.exerciseId];
    let item = byItem.get(log.itemIndex);
    if (!item) {
      item = { exerciseId: log.exerciseId, name: e?.name ?? 'Exercise', sets: [] };
      byItem.set(log.itemIndex, item);
    }
    const restPhase = state.plan[log.phaseIndex + 1];
    const isRest = restPhase && (restPhase.kind === 'rest' || restPhase.kind === 'transition');
    const set: SessionSet = {
      targetReps: log.targetReps,
      targetWeightKg: log.targetWeightKg,
      reps: log.reps,
      weightKg: log.weightKg,
      setSec: Math.round(log.setSec),
      estSetSec: log.estSetSec,
      restSec: isRest && state.actualSec[log.phaseIndex + 1] != null ? Math.round(state.actualSec[log.phaseIndex + 1]) : null,
      restBaseSec: isRest ? restPhase.baseSec ?? restPhase.estSec : null,
      skipped: log.skipped,
      ...(log.rampUp ? { rampUp: true } : {}),
    };
    item.sets.push(set);
  }
  const items = [...byItem.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);

  let volumeKg = 0;
  for (const item of items) {
    const e = exercises[item.exerciseId];
    if (!e) continue;
    for (const s of item.sets) {
      if (!s.skipped && !s.rampUp) volumeKg += setVolumeKg(e, s.reps, s.weightKg, profile.weightKg);
    }
  }

  const breakdown = actualBreakdown(state);
  const endedAt = state.finishedAt ?? now;
  return {
    id: uid('s'),
    routineId: state.routineId,
    routineName: state.routineName,
    startedAt: state.startedAt,
    endedAt,
    durationSec: Math.round(sessionElapsedMs(state, endedAt) / 1000),
    estimateSec: state.estimate.total,
    breakdown,
    estBreakdown: state.estimate,
    items,
    volumeKg: Math.round(volumeKg),
    kcal: estimateKcal(breakdown, profile.weightKg),
    prs: findPersonalBests(items, exercises, before, profile.weightKg),
    completed: state.index >= state.plan.length,
  };
}

// ── Next time: pre-fill and progression (RESEARCH.md §4) ───────────────────

export interface Progression {
  exerciseId: string;
  name: string;
  kind: 'weight' | 'reps';
  /** New load for every set (kind 'weight'). */
  toKg?: number;
  /** Reps to add to every set (kind 'reps'). */
  addReps?: number;
  text: string;
}

export const PROGRESSION_MAX_JUMP = 0.1; // ACSM 2009: 2–10% load increases
export const REP_CEILING = 15;

export function loadStepKg(unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(5) : 2.5;
}

/** A small next step for an exercise where every target rep was hit. */
export function suggestProgression(item: SessionItem, e: Exercise, unit: WeightUnit): Progression | null {
  const sets = item.sets.filter((s) => !s.rampUp);
  if (!sets.length || sets.some((s) => s.skipped || s.reps < s.targetReps)) return null;

  const weight = Math.max(...sets.map((s) => s.weightKg ?? 0));
  const topReps = Math.max(...sets.map((s) => s.targetReps));
  const step = loadStepKg(unit);
  const amount = e.timed ? 5 : 1;
  const repsText = e.timed ? `Add ${amount} seconds to each set` : 'Add 1 rep to each set';

  if (weight > 0) {
    const smallEnough = step / weight <= PROGRESSION_MAX_JUMP;
    if (smallEnough || (!e.timed && topReps >= REP_CEILING)) {
      const toKg = weight + step;
      return {
        exerciseId: e.id, name: e.name, kind: 'weight', toKg,
        text: `Go up to ${formatWeight(toKg, unit)} next time`,
      };
    }
    return {
      exerciseId: e.id, name: e.name, kind: 'reps', addReps: amount,
      text: `${repsText} before moving up in weight`,
    };
  }
  if (!e.timed && topReps >= 20) return null;
  return { exerciseId: e.id, name: e.name, kind: 'reps', addReps: amount, text: repsText };
}

/** Pre-fill the routine with the weights used today. */
export function prefillRoutine(routine: Routine, session: Session): Routine {
  const used = new Map<string, SessionSet[]>();
  for (const item of session.items) used.set(item.exerciseId, item.sets.filter((s) => !s.rampUp));
  const items = routine.items.map((item) => {
    const done = used.get(item.exerciseId);
    if (!done) return item;
    return {
      ...item,
      sets: item.sets.map((set, i) => {
        const d = done[i];
        return d && !d.skipped && d.weightKg != null ? { ...set, weightKg: d.weightKg } : set;
      }),
    };
  });
  return { ...routine, items, updatedAt: Date.now() };
}

export function applyProgression(routine: Routine, p: Progression): Routine {
  const items = routine.items.map((item) => {
    if (item.exerciseId !== p.exerciseId) return item;
    return {
      ...item,
      sets: item.sets.map((set) =>
        p.kind === 'weight' ? { ...set, weightKg: p.toKg ?? set.weightKg } : { ...set, reps: set.reps + (p.addReps ?? 0) },
      ),
    };
  });
  return { ...routine, items, updatedAt: Date.now() };
}

// ── Routine time history ───────────────────────────────────────────────────

export interface RoutineTimes {
  count: number;
  avgSec: number | null;
  lastAt: number | null;
  /** Durations of the most recent sessions, oldest first (max 10). */
  trend: number[];
}

export function routineTimes(sessions: Session[], routineId: string): RoutineTimes {
  const mine = sessions
    .filter((s) => s.routineId === routineId && s.completed)
    .sort((a, b) => a.startedAt - b.startedAt);
  if (!mine.length) return { count: 0, avgSec: null, lastAt: null, trend: [] };
  const avgSec = mine.reduce((sum, s) => sum + s.durationSec, 0) / mine.length;
  return {
    count: mine.length,
    avgSec,
    lastAt: mine[mine.length - 1].startedAt,
    trend: mine.slice(-10).map((s) => s.durationSec),
  };
}
