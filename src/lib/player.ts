// Timing engine, part 2: the workout player as a pure state machine.
//
// Nothing here counts ticks. The state stores wall-clock timestamps, and every
// reading (elapsed, remaining, which phase we are in) is recomputed from
// `now`. iOS can freeze or throttle JavaScript whenever the app is in the
// background; when it wakes up, calling `tick(state, Date.now())` lands the
// player exactly where it should be.

import type { Breakdown, Phase } from './types';

export interface SetLog {
  phaseIndex: number;
  itemIndex: number;
  setIndex: number;
  exerciseId: string;
  targetReps: number;
  targetWeightKg: number | null;
  reps: number;
  weightKg: number | null;
  setSec: number;
  estSetSec: number;
  skipped: boolean;
  rampUp: boolean;
}

export interface PlayerState {
  routineId: string;
  routineName: string;
  plan: Phase[];
  index: number;
  startedAt: number;
  phaseStartedAt: number;
  pausedAt: number | null;
  /** Paused time inside the current phase. */
  phasePausedMs: number;
  totalPausedMs: number;
  /** +15 / −15 s adjustments to the current phase. */
  adjustSec: number;
  logs: SetLog[];
  /** Actual seconds spent in each completed phase (index-aligned with plan). */
  actualSec: number[];
  autoStart: boolean;
  estimate: Breakdown;
  finishedAt: number | null;
}

export function startWorkout(
  meta: { routineId: string; routineName: string; autoStart: boolean },
  plan: Phase[],
  estimate: Breakdown,
  now: number,
): PlayerState {
  return {
    ...meta, plan, estimate,
    index: 0, startedAt: now, phaseStartedAt: now,
    pausedAt: null, phasePausedMs: 0, totalPausedMs: 0, adjustSec: 0,
    logs: [], actualSec: [], finishedAt: plan.length === 0 ? now : null,
  };
}

export const currentPhase = (s: PlayerState): Phase | undefined => s.plan[s.index];
export const isFinished = (s: PlayerState) => s.finishedAt != null;
export const isPaused = (s: PlayerState) => s.pausedAt != null;

/** Does this phase move on by itself when its countdown reaches zero? */
export function autoAdvances(phase: Phase, autoStart: boolean): boolean {
  if (phase.kind === 'warmup' || phase.kind === 'cooldown') return true;
  if (phase.kind === 'set') return false; // a set only ends when you tap Done
  return autoStart; // rest / transition
}

export function phaseDurationMs(s: PlayerState): number {
  const p = currentPhase(s);
  return p ? Math.max(0, (p.estSec + s.adjustSec) * 1000) : 0;
}

export function phaseElapsedMs(s: PlayerState, now: number): number {
  if (isFinished(s)) return 0;
  return Math.max(0, (s.pausedAt ?? now) - s.phaseStartedAt - s.phasePausedMs);
}

/** Negative once the estimate has run out (the ring then counts up). */
export function phaseRemainingMs(s: PlayerState, now: number): number {
  return phaseDurationMs(s) - phaseElapsedMs(s, now);
}

/** Active session time, pauses excluded. */
export function sessionElapsedMs(s: PlayerState, now: number): number {
  const end = s.finishedAt ?? s.pausedAt ?? now;
  return Math.max(0, end - s.startedAt - s.totalPausedMs);
}

/** Estimated seconds left: what remains of this phase plus every later phase. */
export function remainingEstimateSec(s: PlayerState, now: number): number {
  if (isFinished(s)) return 0;
  let sec = Math.max(0, phaseRemainingMs(s, now)) / 1000;
  for (let i = s.index + 1; i < s.plan.length; i++) sec += s.plan[i].estSec;
  return sec;
}

/** Close the current phase at `endTs` and open the next one at the same instant. */
function completePhase(s: PlayerState, endTs: number, opts: { skipped?: boolean } = {}): PlayerState {
  const phase = currentPhase(s);
  if (!phase || isFinished(s)) return s;
  const elapsedSec = Math.max(0, (endTs - s.phaseStartedAt - s.phasePausedMs) / 1000);
  const actualSec = s.actualSec.slice();
  actualSec[s.index] = opts.skipped ? 0 : elapsedSec;

  let logs = s.logs;
  if (phase.kind === 'set') {
    logs = [
      ...logs,
      {
        phaseIndex: s.index,
        itemIndex: phase.itemIndex ?? 0,
        setIndex: phase.setIndex ?? 0,
        exerciseId: phase.exerciseId ?? '',
        targetReps: phase.reps ?? 0,
        targetWeightKg: phase.weightKg ?? null,
        reps: opts.skipped ? 0 : phase.reps ?? 0,
        weightKg: phase.weightKg ?? null,
        setSec: opts.skipped ? 0 : elapsedSec,
        estSetSec: phase.estSec,
        skipped: !!opts.skipped,
        rampUp: !!phase.rampUp,
      },
    ];
  }

  const index = s.index + 1;
  return {
    ...s, logs, actualSec, index,
    phaseStartedAt: endTs, phasePausedMs: 0, adjustSec: 0,
    finishedAt: index >= s.plan.length ? endTs : null,
  };
}

export function pause(s: PlayerState, now: number): PlayerState {
  if (isFinished(s) || isPaused(s)) return s;
  return { ...s, pausedAt: now };
}

export function resume(s: PlayerState, now: number): PlayerState {
  if (s.pausedAt == null) return s;
  const d = Math.max(0, now - s.pausedAt);
  return { ...s, pausedAt: null, phasePausedMs: s.phasePausedMs + d, totalPausedMs: s.totalPausedMs + d };
}

/** The big button: Done (set), Start set (rest), Next (warm-up / cooldown). */
export function advance(s: PlayerState, now: number): PlayerState {
  if (isFinished(s)) return s;
  return completePhase(resume(s, now), now);
}

/** Skip the current phase. Skipping a set also skips the rest that would follow it. */
export function skip(s: PlayerState, now: number): PlayerState {
  if (isFinished(s)) return s;
  const phase = currentPhase(s)!;
  let next = completePhase(resume(s, now), now, { skipped: phase.kind === 'set' });
  if (phase.kind === 'set' && currentPhase(next)?.kind === 'rest') {
    next = completePhase(next, now, { skipped: true });
  }
  return next;
}

/**
 * Bring the state up to date with the clock. Phases that advance on their own
 * are closed at the exact moment their countdown ended — not at `now` — so a
 * phone that was locked for two minutes resumes in the right phase with the
 * right time left.
 */
export function tick(s: PlayerState, now: number): PlayerState {
  let state = s;
  while (!isFinished(state) && !isPaused(state)) {
    const phase = currentPhase(state)!;
    if (!autoAdvances(phase, state.autoStart)) break;
    const endsAt = state.phaseStartedAt + state.phasePausedMs + phaseDurationMs(state);
    if (now < endsAt) break;
    state = completePhase(state, endsAt);
  }
  return state;
}

/** +15 s / −15 s. The countdown can be shortened to zero but not below. */
export function adjust(s: PlayerState, deltaSec: number, now: number): PlayerState {
  const phase = currentPhase(s);
  if (!phase || isFinished(s) || phase.kind === 'set') return s;
  const elapsedSec = Math.ceil(phaseElapsedMs(s, now) / 1000);
  const minAdjust = elapsedSec - phase.estSec;
  return { ...s, adjustSec: Math.max(s.adjustSec + deltaSec, Math.min(s.adjustSec, minAdjust)) };
}

/** Correct what was actually lifted. A changed weight carries to the remaining sets of that exercise. */
export function editLog(s: PlayerState, logIndex: number, reps: number, weightKg: number | null): PlayerState {
  const log = s.logs[logIndex];
  if (!log) return s;
  const logs = s.logs.slice();
  logs[logIndex] = { ...log, reps: Math.max(0, reps), weightKg };
  let plan = s.plan;
  if (weightKg !== log.weightKg && !log.rampUp) {
    plan = s.plan.map((p, i) =>
      i >= s.index && p.kind === 'set' && !p.rampUp && p.itemIndex === log.itemIndex && p.weightKg === log.weightKg
        ? { ...p, weightKg }
        : p,
    );
  }
  return { ...s, logs, plan };
}

/** End the workout now. A set in progress is not logged. */
export function endEarly(s: PlayerState, now: number): PlayerState {
  if (isFinished(s)) return s;
  const r = resume(s, now);
  const phase = currentPhase(r);
  const actualSec = r.actualSec.slice();
  if (phase && phase.kind !== 'set') actualSec[r.index] = phaseElapsedMs(r, now) / 1000;
  return { ...r, actualSec, finishedAt: now };
}

/** Actual time per bucket, from the phases that were completed. */
export function actualBreakdown(s: PlayerState): Breakdown {
  const b: Breakdown = { warmup: 0, lifting: 0, rest: 0, cooldown: 0, total: 0 };
  s.plan.forEach((p, i) => {
    const sec = s.actualSec[i] ?? 0;
    if (p.kind === 'warmup') b.warmup += sec;
    else if (p.kind === 'set') b.lifting += sec;
    else if (p.kind === 'cooldown') b.cooldown += sec;
    else b.rest += sec;
  });
  b.total = b.warmup + b.lifting + b.rest + b.cooldown;
  return b;
}
