import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';
import {
  cooldownSteps, generateCooldownIds, generateWarmupIds, getStretch, getWarmupMove, stretchAlternatives,
  warmupAlternatives, warmupSteps, STRETCHES, STRETCH_HOLD_SEC, STRETCH_SIDE_SEC, WARMUP_MOVES,
} from './prep';
import { exercises, item, routine } from './testkit';

const total = (steps: { sec: number }[]) => steps.reduce((s, x) => s + x.sec, 0);

const lower = routine([item('bb-back-squat'), item('db-rdl'), item('db-reverse-lunge'), item('bb-hip-thrust')]);
const upper = routine([item('db-bench-press'), item('cable-seated-row'), item('db-shoulder-press'), item('cable-lat-pulldown')]);
const full = routine([item('db-goblet-squat'), item('db-bench-press'), item('cable-seated-row'), item('db-rdl'), item('bw-plank', 2, 30)]);
const routines = { lower, upper, full, empty: routine([]), tiny: routine([item('db-curl', 1)]) };

describe('exercise library', () => {
  it('has 60–75 exercises with unique ids and complete data', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
    expect(EXERCISES.length).toBeLessThanOrEqual(75);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.primary.length, e.id).toBeGreaterThan(0);
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(1);
      expect(e.cues.length, e.id).toBeLessThanOrEqual(2);
      expect(e.tempo, e.id).toBeGreaterThan(0);
      expect(e.setup, e.id).toBeGreaterThan(0);
    }
  });

  it('covers every equipment type', () => {
    const kinds = new Set(EXERCISES.map((e) => e.equipment));
    expect([...kinds].sort()).toEqual(['band', 'barbell', 'bodyweight', 'cable', 'dumbbell', 'kettlebell', 'machine']);
  });
});

describe('warm-up generator', () => {
  for (const [name, r] of Object.entries(routines)) {
    it(`gives 4–6 moves of 20–40 s, 2–3 minutes in total (${name})`, () => {
      const steps = warmupSteps(generateWarmupIds(r, exercises));
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps.length).toBeLessThanOrEqual(6);
      for (const s of steps) {
        expect(s.sec).toBeGreaterThanOrEqual(20);
        expect(s.sec).toBeLessThanOrEqual(40);
      }
      expect(total(steps)).toBeGreaterThanOrEqual(120);
      expect(total(steps)).toBeLessThanOrEqual(180);
      expect(new Set(steps.map((s) => s.moveId)).size).toBe(steps.length);
    });
  }

  it('starts with a general pulse-raiser', () => {
    expect(generateWarmupIds(full, exercises)[0]).toBe('wu-march');
  });

  it('prepares the areas the routine actually uses', () => {
    const regions = (r: typeof lower) => new Set(generateWarmupIds(r, exercises).flatMap((id) => getWarmupMove(id)!.regions));
    const lo = regions(lower);
    const up = regions(upper);
    expect(lo.has('hips') && lo.has('glutes') && lo.has('hamstrings')).toBe(true);
    expect(up.has('shoulders') && up.has('upperBack')).toBe(true);
    expect(up.has('hamstrings')).toBe(false);
    expect(lo.has('upperBack')).toBe(false);
  });

  it('uses dynamic moves only — no static holds before lifting', () => {
    for (const m of WARMUP_MOVES) expect(`${m.name} ${m.cue}`.toLowerCase()).not.toMatch(/\bhold\b.*\bseconds\b|static/);
    const stretchIds = new Set(STRETCHES.map((s) => s.id));
    for (const r of Object.values(routines)) {
      for (const id of generateWarmupIds(r, exercises)) expect(stretchIds.has(id)).toBe(false);
    }
  });

  it('is deterministic', () => {
    expect(generateWarmupIds(full, exercises)).toEqual(generateWarmupIds(full, exercises));
  });

  it('gives every move a name, target area and a single-sentence cue', () => {
    for (const m of [...WARMUP_MOVES, ...STRETCHES]) {
      expect(m.name && m.area && m.cue, m.id).toBeTruthy();
      expect(m.cue.trim().split(/[.!?]\s/).length, m.id).toBe(1);
    }
  });
});

describe('cooldown generator', () => {
  for (const [name, r] of Object.entries(routines)) {
    it(`lasts 2–3 minutes (${name})`, () => {
      const steps = cooldownSteps(generateCooldownIds(r, exercises));
      expect(total(steps)).toBeGreaterThanOrEqual(120);
      expect(total(steps)).toBeLessThanOrEqual(180);
    });
  }

  it('stretches the muscles that were worked', () => {
    const muscles = (r: typeof lower) => new Set(generateCooldownIds(r, exercises).flatMap((id) => getStretch(id)!.muscles));
    const lo = muscles(lower);
    expect(lo.has('glutes') && lo.has('quads') && lo.has('hamstrings')).toBe(true);
    expect(lo.has('chest')).toBe(false);
    const up = muscles(upper);
    expect(up.has('back') && up.has('chest') && up.has('shoulders')).toBe(true);
    expect(up.has('quads')).toBe(false);
  });

  it('holds two-sided stretches for 30 s', () => {
    const steps = cooldownSteps(['st-childs-pose']);
    expect(steps).toHaveLength(1);
    expect(steps[0].sec).toBe(STRETCH_HOLD_SEC);
    expect(steps[0].side).toBeUndefined();
  });

  it('splits one-sided stretches into left then right as separate timed steps', () => {
    const steps = cooldownSteps(['st-figure-four']);
    expect(steps.map((s) => s.side)).toEqual(['left', 'right']);
    expect(steps.every((s) => s.sec === STRETCH_SIDE_SEC)).toBe(true);
    expect(steps[0].key).not.toBe(steps[1].key);
  });

  it('keeps every hold inside the researched 10–30 s range', () => {
    expect(STRETCH_HOLD_SEC).toBeLessThanOrEqual(30);
    expect(STRETCH_SIDE_SEC).toBeGreaterThanOrEqual(10);
  });
});

describe('swapping', () => {
  it('offers alternatives that are not already in the list, most relevant first', () => {
    const current = generateWarmupIds(lower, exercises);
    const alts = warmupAlternatives(current, lower, exercises);
    expect(alts.some((m) => current.includes(m.id))).toBe(false);
    expect(alts.length).toBe(WARMUP_MOVES.length - current.length);

    const cool = generateCooldownIds(upper, exercises);
    const stretchAlts = stretchAlternatives(cool, upper, exercises);
    expect(stretchAlts.some((s) => cool.includes(s.id))).toBe(false);
    const upperMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms'];
    expect(stretchAlts[0].muscles.some((m) => upperMuscles.includes(m))).toBe(true);
  });
});
