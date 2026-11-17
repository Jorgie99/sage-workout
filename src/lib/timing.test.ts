import { describe, expect, it } from 'vitest';
import { ctx, exercises, item, profile, routine } from './testkit';
import {
  buildPlan, describeSet, estimateRestSec, estimateSetSec, estimateTransitionSec, restActivity,
  secPerRep, startingWeightKg, tableRestSec, HEAVIER_REST_BONUS_SEC, RAMP_UP_REPS,
} from './timing';
import { kgToLb } from './units';

const squat = exercises['db-goblet-squat']; // compound, tempo 4, setup 12
const curl = exercises['db-curl']; // isolation, tempo 3, setup 8
const row = exercises['db-row']; // unilateral, tempo 3, setup 15
const plank = exercises['bw-plank']; // timed

describe('set duration estimate', () => {
  it('is setup + reps × seconds per rep', () => {
    expect(estimateSetSec(squat, 10, ctx())).toBe(12 + 10 * 4);
  });

  it('doubles the rep time for unilateral exercises', () => {
    expect(estimateSetSec(row, 10, ctx())).toBe(15 + 10 * 3 * 2);
  });

  it('adjusts tempo by experience level', () => {
    const novice = ctx({ profile: profile({ experience: 'new' }) });
    const veteran = ctx({ profile: profile({ experience: 'experienced' }) });
    expect(secPerRep(squat, novice)).toBeCloseTo(4 * 1.15);
    expect(secPerRep(squat, veteran)).toBeCloseTo(4 * 0.95);
    expect(estimateSetSec(squat, 10, novice)).toBeGreaterThan(estimateSetSec(squat, 10, veteran));
  });

  it('treats a missing experience level as "some experience"', () => {
    expect(secPerRep(squat, ctx({ profile: profile({ experience: null }) }))).toBe(4);
  });

  it('uses the learned pace once there is one', () => {
    const learned = ctx({ stats: { [squat.id]: { exerciseId: squat.id, samples: 3, secPerRep: 2.5 } } });
    expect(estimateSetSec(squat, 10, learned)).toBe(12 + 25);
  });

  it('counts timed holds as one second per "rep"', () => {
    expect(estimateSetSec(plank, 30, ctx())).toBe(plank.setup + 30);
  });
});

describe('rest between sets', () => {
  it('gives heavier, lower-rep compound sets more rest', () => {
    expect(tableRestSec(squat, 5)).toBe(180);
    expect(tableRestSec(squat, 8)).toBe(150);
    expect(tableRestSec(squat, 10)).toBe(120);
    expect(tableRestSec(squat, 15)).toBe(90);
  });

  it('gives isolation work less rest than compound work at the same reps', () => {
    for (const reps of [6, 10, 15, 20]) {
      expect(tableRestSec(curl, reps)).toBeLessThan(tableRestSec(squat, reps));
    }
  });

  it('never drops below 60 s in the research table', () => {
    for (const e of Object.values(exercises)) {
      for (const reps of [1, 5, 8, 12, 15, 25]) expect(tableRestSec(e, reps)).toBeGreaterThanOrEqual(60);
    }
  });

  it('adds a little rest for new lifters', () => {
    const base = estimateRestSec(squat, 10, 20, ctx()).sec;
    const novice = estimateRestSec(squat, 10, 20, ctx({ profile: profile({ experience: 'new' }) })).sec;
    expect(base).toBe(120);
    expect(novice).toBe(130); // 120 × 1.1, rounded to 5 s
  });

  it('adds rest when the weight is higher than last time', () => {
    const stats = { [squat.id]: { exerciseId: squat.id, samples: 1, lastWeightKg: 20 } };
    expect(estimateRestSec(squat, 10, 20, ctx({ stats })).sec).toBe(120);
    expect(estimateRestSec(squat, 10, 22.5, ctx({ stats })).sec).toBe(120 + HEAVIER_REST_BONUS_SEC);
  });

  it('applies the learned rest multiplier on top of the base', () => {
    const stats = { [squat.id]: { exerciseId: squat.id, samples: 4, restFactor: 0.75 } };
    const r = estimateRestSec(squat, 10, null, ctx({ stats }));
    expect(r.baseSec).toBe(120);
    expect(r.sec).toBe(90);
  });
});

describe('transition between exercises', () => {
  it('is longer when the equipment changes, longest when moving to a barbell', () => {
    const same = estimateTransitionSec(curl, exercises['db-lateral-raise'], 10, ctx()).sec;
    const different = estimateTransitionSec(curl, exercises['cable-triceps-pushdown'], 10, ctx()).sec;
    const barbell = estimateTransitionSec(curl, exercises['bb-back-squat'], 10, ctx()).sec;
    expect(same).toBe(60);
    expect(different).toBe(90);
    expect(barbell).toBe(120);
  });

  it('is never shorter than the rest owed when the same main muscle goes again', () => {
    const t = estimateTransitionSec(squat, exercises['kb-sumo-squat'], 10, ctx());
    expect(t.sec).toBeGreaterThanOrEqual(tableRestSec(squat, 10));
  });

  it('scales with the learned transition factor', () => {
    expect(estimateTransitionSec(curl, exercises['cable-curl'], 10, ctx({ transitionFactor: 1.5 })).sec).toBe(135);
  });
});

describe('rest activity', () => {
  it('never suggests a static stretch', () => {
    for (const e of Object.values(exercises)) {
      for (let i = 0; i < 6; i++) {
        const a = restActivity(e, i);
        expect(`${a.name} ${a.cue}`.toLowerCase()).not.toMatch(/stretch|hold for/);
      }
    }
  });

  it('matches the first suggestion to what was just trained', () => {
    expect(restActivity(curl, 0).name).toBe('shake out your arms');
    expect(restActivity(squat, 0).name).toBe('walk it out');
  });

  it('varies across the rests of one exercise', () => {
    const names = new Set([0, 1, 2].map((i) => restActivity(squat, i).name));
    expect(names.size).toBe(3);
  });
});

describe('starting weight suggestion', () => {
  it('needs a body weight', () => {
    expect(startingWeightKg(squat, profile({ weightKg: null }))).toBeNull();
  });

  it('is conservative and lands on a real dumbbell size', () => {
    const kg = startingWeightKg(squat, profile({ weightKg: 60, sex: 'female', weightUnit: 'lb' }))!;
    const lb = kgToLb(kg);
    expect(lb % 5).toBeCloseTo(0, 5);
    expect(kg).toBeLessThan(60 * 0.2); // below the male baseline
    expect(kg).toBeGreaterThan(0);
  });

  it('scales with experience', () => {
    const p = { weightKg: 80, sex: 'male', weightUnit: 'kg' } as const;
    const novice = startingWeightKg(exercises['m-leg-press'], profile({ ...p, experience: 'new' }))!;
    const veteran = startingWeightKg(exercises['m-leg-press'], profile({ ...p, experience: 'experienced' }))!;
    expect(novice).toBeLessThan(veteran);
  });

  it('never suggests less than an empty barbell', () => {
    const kg = startingWeightKg(exercises['bb-ohp'], profile({ weightKg: 45, sex: 'female', experience: 'new', weightUnit: 'kg' }))!;
    expect(kg).toBe(20);
  });
});

describe('workout plan', () => {
  const r = routine([item('db-goblet-squat', 3, 10, 10), item('db-curl', 2, 12, 5)]);
  const plan = buildPlan(r, ctx());
  const kinds = plan.phases.map((p) => p.kind);

  it('runs warm-up → get set → sets and rests → cooldown', () => {
    expect(kinds[0]).toBe('warmup');
    expect(kinds[kinds.length - 1]).toBe('cooldown');
    const firstSet = kinds.indexOf('set');
    expect(kinds[firstSet - 1]).toBe('transition');
    expect(plan.phases[firstSet - 1].title).toBe('GET SET');
  });

  it('has one set phase per programmed set', () => {
    expect(kinds.filter((k) => k === 'set')).toHaveLength(5);
  });

  it('puts a rest between sets and a transition between exercises', () => {
    const sets = plan.phases.filter((p) => p.kind === 'set');
    const lastSquatSet = plan.phases.indexOf(sets[2]);
    expect(plan.phases[lastSquatSet - 1].kind).toBe('rest');
    expect(plan.phases[lastSquatSet + 1].kind).toBe('transition');
    expect(plan.phases[lastSquatSet + 1].name).toBe('Dumbbell Biceps Curl');
  });

  it("shows the next exercise's form cue on the last rest before it", () => {
    const tr = plan.phases.find((p) => p.title === 'NEXT UP')!;
    expect(tr.cue).toBe(curl.cues[0]);
  });

  it('never auto-starts a set straight from a timed phase', () => {
    plan.phases.forEach((p, i) => {
      if (p.kind === 'set') expect(['rest', 'transition']).toContain(plan.phases[i - 1].kind);
    });
  });

  it('breaks the estimate into warm-up, lifting, rests and cooldown that add up', () => {
    const b = plan.breakdown;
    expect(b.warmup).toBeGreaterThanOrEqual(120);
    expect(b.warmup).toBeLessThanOrEqual(180);
    expect(b.cooldown).toBeGreaterThanOrEqual(120);
    expect(b.cooldown).toBeLessThanOrEqual(180);
    expect(b.lifting).toBe(3 * (12 + 40) + 2 * (8 + 36));
    expect(b.total).toBe(b.warmup + b.lifting + b.rest + b.cooldown);
    expect(b.total).toBe(plan.phases.reduce((s, p) => s + p.estSec, 0));
  });

  it('updates the estimate when a warm-up move is removed', () => {
    const full = buildPlan(r, ctx()).breakdown;
    const ids = buildPlan(r, ctx()).phases.filter((p) => p.kind === 'warmup');
    const trimmed = buildPlan({ ...r, warmupIds: ['wu-march', 'wu-bw-squat'] }, ctx()).breakdown;
    expect(ids.length).toBeGreaterThan(2);
    expect(trimmed.warmup).toBe(60);
    expect(trimmed.total).toBeLessThan(full.total);
  });

  it('adds one lighter ramp-up set before the first loaded compound lift when enabled', () => {
    const withRamp = buildPlan({ ...r, rampUp: true }, ctx({ profile: profile({ weightUnit: 'kg' }) }));
    const ramp = withRamp.phases.filter((p) => p.rampUp);
    expect(ramp).toHaveLength(1);
    expect(ramp[0].reps).toBe(RAMP_UP_REPS);
    expect(ramp[0].weightKg).toBe(5); // 50% of 10 kg
    const idx = withRamp.phases.indexOf(ramp[0]);
    expect(withRamp.phases[idx + 1].kind).toBe('rest');
    expect(withRamp.phases[idx + 2].title).toBe('SET 1 OF 3');
  });

  it('fills blank weights with the suggested start', () => {
    const blank = buildPlan(routine([item('db-goblet-squat', 1, 10, null)]), ctx());
    const set = blank.phases.find((p) => p.kind === 'set')!;
    expect(set.weightKg).toBe(startingWeightKg(squat, profile()));
  });

  it('handles an empty routine without crashing', () => {
    const empty = buildPlan(routine([]), ctx());
    expect(empty.phases.every((p) => p.kind === 'warmup' || p.kind === 'cooldown')).toBe(true);
  });
});

describe('set description', () => {
  it('formats reps, sides, time and load', () => {
    expect(describeSet(squat, 12, 11.34, 'lb')).toBe('12 reps · 25 lb');
    expect(describeSet(row, 10, 10, 'kg')).toBe('10 reps each side · 10 kg');
    expect(describeSet(plank, 30, null, 'lb')).toBe('30 sec · bodyweight');
    expect(describeSet(exercises['band-row'], 1, null, 'lb')).toBe('1 rep · band');
  });
});
