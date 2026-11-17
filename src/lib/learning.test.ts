import { describe, expect, it } from 'vitest';
import {
  applyProgression, buildSession, effectiveLoadKg, ema, estimateKcal, findPersonalBests, impliedSecPerRep,
  learnFromWorkout, prefillRoutine, routineTimes, setVolumeKg, suggestProgression, EMA_ALPHA,
} from './learning';
import { advance, startWorkout, type PlayerState } from './player';
import { ctx, exercises, item, profile, routine } from './testkit';
import { buildPlan, estimateSetSec } from './timing';
import type { Session, SessionItem } from './types';
import { lbToKg } from './units';

const T0 = 1_700_000_000_000;
const squat = exercises['db-goblet-squat'];
const row = exercises['db-row'];

/** Run a whole plan, spending `setSec` on every set and `restSec` on every rest/transition. */
function runWorkout(setSec: number, restSec: number, r = routine([item('db-goblet-squat', 3, 10, 10)], { warmupIds: [], cooldownIds: [] })) {
  const plan = buildPlan(r, ctx());
  let st: PlayerState = startWorkout({ routineId: r.id, routineName: r.name, autoStart: false }, plan.phases, plan.breakdown, T0);
  let now = T0;
  while (st.finishedAt == null) {
    now += (st.plan[st.index].kind === 'set' ? setSec : restSec) * 1000;
    st = advance(st, now);
  }
  return { st, r, now };
}

describe('exponential moving average', () => {
  it('moves a fraction of the way toward each observation', () => {
    expect(ema(4, 2)).toBeCloseTo(4 + EMA_ALPHA * (2 - 4));
    expect(ema(4, 4)).toBe(4);
  });

  it('converges on a steady pace', () => {
    let v = 4;
    for (let i = 0; i < 30; i++) v = ema(v, 2.5);
    expect(v).toBeCloseTo(2.5, 3);
  });
});

describe('implied seconds per rep', () => {
  it('removes setup time and divides by reps', () => {
    expect(impliedSecPerRep(squat, 10, squat.setup + 30)).toBe(3);
  });
  it('halves for unilateral exercises (both sides are in the set time)', () => {
    expect(impliedSecPerRep(row, 10, row.setup + 60)).toBe(3);
  });
  it('ignores accidental taps, zero reps and timed holds', () => {
    expect(impliedSecPerRep(squat, 10, 2)).toBeNull();
    expect(impliedSecPerRep(squat, 0, 40)).toBeNull();
    expect(impliedSecPerRep(exercises['bw-plank'], 30, 38)).toBeNull();
  });
  it('clamps absurd values', () => {
    expect(impliedSecPerRep(squat, 10, 5)).toBe(1);
    expect(impliedSecPerRep(squat, 1, 600)).toBe(12);
  });
});

describe('learning from a workout', () => {
  it('pulls the pace toward the real set times, so the next estimate is closer', () => {
    // Default: 12 + 10×4 = 52 s. She actually takes 37 s (2.5 s per rep).
    const { st, now } = runWorkout(37, 120);
    const before = estimateSetSec(squat, 10, ctx());
    const learned = learnFromWorkout(st, exercises, {}, profile(), 1, now);
    const after = estimateSetSec(squat, 10, ctx({ stats: learned.stats }));
    expect(before).toBe(52);
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(37);
    expect(learned.stats[squat.id].samples).toBe(3);

    // Keep training at that pace and the estimate converges on it.
    let stats = learned.stats;
    for (let i = 0; i < 8; i++) stats = { ...stats, ...learnFromWorkout(st, exercises, stats, profile(), 1, now).stats };
    expect(estimateSetSec(squat, 10, ctx({ stats }))).toBe(37);
  });

  it('learns a rest multiplier from rests that run short', () => {
    const { st, now } = runWorkout(40, 60); // research rest is 120 s; she takes 60
    const learned = learnFromWorkout(st, exercises, {}, profile(), 1, now);
    const f = learned.stats[squat.id].restFactor!;
    expect(f).toBeLessThan(1);
    expect(f).toBeGreaterThanOrEqual(0.5);
  });

  it('keeps the rest multiplier inside 0.5×–2× however extreme the rests are', () => {
    let stats = {};
    const { st, now } = runWorkout(40, 900);
    for (let i = 0; i < 20; i++) stats = { ...stats, ...learnFromWorkout(st, exercises, stats, profile(), 1, now).stats };
    expect((stats as Record<string, { restFactor: number }>)[squat.id].restFactor).toBeLessThanOrEqual(2);
  });

  it('learns equipment-change time separately from set rest', () => {
    const r = routine([item('db-goblet-squat', 1, 10, 10), item('cable-triceps-pushdown', 1, 10, 10)], { warmupIds: [], cooldownIds: [] });
    const { st, now } = runWorkout(40, 180, r); // transition base is 90 s
    const learned = learnFromWorkout(st, exercises, {}, profile(), 1, now);
    expect(learned.transitionFactor).toBeCloseTo(1 + EMA_ALPHA * (2 - 1));
    expect(learned.stats[squat.id].restFactor).toBeUndefined();
  });

  it('records last and best lifts', () => {
    const { st, now } = runWorkout(40, 120);
    const s = learnFromWorkout(st, exercises, {}, profile(), 1, now).stats[squat.id];
    expect(s).toMatchObject({ lastWeightKg: 10, lastReps: 10, bestWeightKg: 10, bestReps: 10, bestSetVolumeKg: 100, lastUsedAt: now });
  });
});

describe('volume and calories', () => {
  it('counts a push-up as 64% of body weight', () => {
    expect(effectiveLoadKg(exercises['bw-pushup'], null, 60)).toBeCloseTo(38.4);
    expect(setVolumeKg(exercises['bw-pushup'], 10, null, 60)).toBeCloseTo(384);
  });
  it('adds held weight on top of the body-weight share', () => {
    expect(effectiveLoadKg(exercises['bw-pullup'], 5, 60)).toBeCloseTo(0.96 * 60 + 5);
  });
  it('counts both sides of a unilateral set and skips timed holds', () => {
    expect(setVolumeKg(row, 10, 10, 60)).toBe(200);
    expect(setVolumeKg(exercises['bw-plank'], 30, null, 60)).toBe(0);
  });
  it('leaves body-weight exercises out when body weight is unknown', () => {
    expect(setVolumeKg(exercises['bw-pushup'], 10, null, null)).toBe(0);
  });
  it('uses MET × kg × hours with 3.5 for lifting and 2.3 for stretching', () => {
    const b = { warmup: 180, lifting: 600, rest: 1020, cooldown: 180, total: 1980 };
    expect(estimateKcal(b, 60)).toBe(Math.round(3.5 * 60 * 0.5 + 2.3 * 60 * 0.05));
    expect(estimateKcal(b, null)).toBeNull();
  });
});

describe('session summary', () => {
  it('captures sets, rests, totals and volume', () => {
    const { st, now } = runWorkout(40, 100);
    const session = buildSession(st, exercises, {}, profile(), now);
    expect(session.completed).toBe(true);
    expect(session.items).toHaveLength(1);
    expect(session.items[0].sets.map((s) => s.setSec)).toEqual([40, 40, 40]);
    expect(session.items[0].sets.map((s) => s.restSec)).toEqual([100, 100, null]);
    expect(session.volumeKg).toBe(300);
    expect(session.durationSec).toBe(100 + 3 * 40 + 2 * 100);
    expect(session.kcal).toBeGreaterThan(0);
    expect(session.prs).toEqual([]); // first session sets the baseline
  });
});

describe('personal bests', () => {
  const done = (weightKg: number | null, reps: number): SessionItem => ({
    exerciseId: squat.id, name: squat.name,
    sets: [{ targetReps: 10, targetWeightKg: weightKg, reps, weightKg, setSec: 40, estSetSec: 50, restSec: 90, restBaseSec: 120, skipped: false }],
  });
  const prev = { [squat.id]: { exerciseId: squat.id, samples: 3, lastReps: 10, bestWeightKg: 10, bestReps: 10, bestSetVolumeKg: 100 } };

  it('flags a heavier weight', () => {
    expect(findPersonalBests([done(12.5, 10)], exercises, prev, 60)).toMatchObject([{ kind: 'weight', value: 12.5, previous: 10 }]);
  });
  it('flags more volume at the same weight', () => {
    expect(findPersonalBests([done(10, 12)], exercises, prev, 60)).toMatchObject([{ kind: 'volume', value: 120 }]);
  });
  it('stays quiet when nothing improved or there is no history', () => {
    expect(findPersonalBests([done(10, 10)], exercises, prev, 60)).toEqual([]);
    expect(findPersonalBests([done(50, 20)], exercises, {}, 60)).toEqual([]);
  });
});

describe('progression', () => {
  const sets = (weightKg: number | null, target: number, reps: number[]): SessionItem => ({
    exerciseId: squat.id, name: squat.name,
    sets: reps.map((r) => ({ targetReps: target, targetWeightKg: weightKg, reps: r, weightKg, setSec: 40, estSetSec: 50, restSec: 90, restBaseSec: 120, skipped: false })),
  });

  it('suggests nothing unless every target rep was hit', () => {
    expect(suggestProgression(sets(lbToKg(60), 10, [10, 10, 9]), squat, 'lb')).toBeNull();
  });
  it('suggests a small weight jump when the step is within 10%', () => {
    const p = suggestProgression(sets(lbToKg(60), 10, [10, 10, 10]), squat, 'lb')!;
    expect(p.kind).toBe('weight');
    expect(p.toKg).toBeCloseTo(lbToKg(65));
    expect(p.text).toBe('Go up to 65 lb next time');
  });
  it('suggests an extra rep instead when the smallest jump would be too big', () => {
    const p = suggestProgression(sets(lbToKg(15), 10, [10, 10, 10]), squat, 'lb')!;
    expect(p).toMatchObject({ kind: 'reps', addReps: 1 });
  });
  it('moves the weight up once reps reach the top of the range', () => {
    expect(suggestProgression(sets(lbToKg(15), 15, [15, 15, 15]), squat, 'lb')!.kind).toBe('weight');
  });
  it('adds reps for unloaded exercises', () => {
    expect(suggestProgression(sets(null, 12, [12, 12]), exercises['bw-pushup'], 'lb')).toMatchObject({ kind: 'reps', addReps: 1 });
  });

  it('pre-fills the routine with the weights actually used, and applies an accepted step', () => {
    const r = routine([item('db-goblet-squat', 3, 10, 10)]);
    const session = { items: [sets(12.5, 10, [10, 10, 10])] } as unknown as Session;
    const filled = prefillRoutine(r, session);
    expect(filled.items[0].sets.map((s) => s.weightKg)).toEqual([12.5, 12.5, 12.5]);
    const heavier = applyProgression(filled, { exerciseId: squat.id, name: squat.name, kind: 'weight', toKg: 15, text: '' });
    expect(heavier.items[0].sets.every((s) => s.weightKg === 15)).toBe(true);
    const moreReps = applyProgression(filled, { exerciseId: squat.id, name: squat.name, kind: 'reps', addReps: 1, text: '' });
    expect(moreReps.items[0].sets.every((s) => s.reps === 11)).toBe(true);
  });
});

describe('routine time history', () => {
  const sess = (routineId: string, startedAt: number, durationSec: number, completed = true) =>
    ({ routineId, startedAt, durationSec, completed }) as Session;

  it('averages completed sessions and keeps a trend of the last ten', () => {
    const list = Array.from({ length: 12 }, (_, i) => sess('a', i, 1800 + i * 60));
    const t = routineTimes([...list, sess('b', 99, 60), sess('a', 100, 30, false)], 'a');
    expect(t.count).toBe(12);
    expect(t.avgSec).toBe(1800 + 5.5 * 60);
    expect(t.trend).toHaveLength(10);
    expect(t.trend[9]).toBe(1800 + 11 * 60);
    expect(t.lastAt).toBe(11);
  });
  it('is empty before the first session', () => {
    expect(routineTimes([], 'a')).toEqual({ count: 0, avgSec: null, lastAt: null, trend: [] });
  });
});
