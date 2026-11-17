import { describe, expect, it } from 'vitest';
import { analyze, applyFix, weekTally, type Suggestion } from './coach';
import { SOURCES } from './research';
import { exercises, item, routine } from './testkit';
import type { Routine } from './types';

const run = (r: Routine, all: Routine[] = [r], estimateSec = 1800): Suggestion[] =>
  analyze({ routine: r, allRoutines: all, exercises, estimateSec });
const ids = (list: Suggestion[]) => list.map((s) => s.id);

/** A sensible full-body routine done twice a week: nothing to flag. */
const balanced = () =>
  routine(
    [
      item('db-goblet-squat', 3, 10),
      item('db-bench-press', 3, 10),
      item('cable-seated-row', 3, 10),
      item('db-rdl', 3, 10),
      item('db-shoulder-press', 2, 10),
      item('cable-lat-pulldown', 2, 10),
      item('db-reverse-lunge', 2, 10),
      item('bw-plank', 2, 30),
    ],
    { timesPerWeek: 2 },
  );

describe('weekly tally', () => {
  it('counts a full set for primary muscles and half for secondary, times sessions per week', () => {
    const r = routine([item('db-bench-press', 3, 10)], { timesPerWeek: 2 });
    const t = weekTally([r], exercises);
    expect(t.muscleSets.chest).toBe(6);
    expect(t.muscleSets.triceps).toBe(3);
    expect(t.push).toBe(6);
    expect(t.sessions).toBe(2);
  });

  it('adds routines together', () => {
    const a = routine([item('db-bench-press', 3, 10)]);
    const b = routine([item('bw-pushup', 4, 10)], { timesPerWeek: 2 });
    expect(weekTally([a, b], exercises).muscleSets.chest).toBe(11);
  });
});

describe('a balanced week', () => {
  it('raises no suggestions', () => {
    expect(run(balanced())).toEqual([]);
  });
});

describe('movement-pattern coverage', () => {
  it('flags a missing pull with a one-tap fix that uses equipment already in the routine', () => {
    const r = routine([item('db-goblet-squat'), item('db-bench-press'), item('db-rdl'), item('db-reverse-lunge'), item('bw-plank', 2, 30)], { timesPerWeek: 2 });
    const s = run(r).find((x) => x.id === 'coverage:pull')!;
    expect(s.what).toBe('No pulling movement in this routine.');
    expect(s.fix).toMatchObject({ type: 'add', exerciseId: 'db-row', label: 'Add One-Arm Dumbbell Row, 3×10' });
  });

  it('suggests a cable row when the routine already uses cables', () => {
    const r = routine([item('db-goblet-squat'), item('cable-fly'), item('m-chest-press'), item('db-rdl'), item('db-reverse-lunge'), item('bw-plank', 2, 30)], { timesPerWeek: 2 });
    expect(run(r).find((x) => x.id === 'coverage:pull')!.fix).toMatchObject({ label: 'Add Seated Cable Row, 3×10' });
  });

  it('looks across all routines, not just this one', () => {
    const push = routine([item('db-bench-press'), item('db-goblet-squat'), item('db-reverse-lunge'), item('bw-plank', 2, 30)]);
    const pull = routine([item('cable-seated-row'), item('db-rdl')]);
    expect(ids(run(push, [push, pull])).filter((i) => i.startsWith('coverage'))).toEqual([]);
    expect(ids(run(push, [push]))).toContain('coverage:pull');
  });

  it('rolls many gaps into one calm card', () => {
    const s = run(routine([item('db-curl')])).filter((x) => x.id.startsWith('coverage'));
    expect(s).toHaveLength(1);
    expect(s[0].what).toMatch(/^Your week is missing pushing, pulling, squat, hip-hinge, single-leg and core work\.$/);
  });

  it('applies the fix: compound lifts go before the first isolation exercise', () => {
    const r = routine([item('db-bench-press'), item('db-curl')]);
    const fixed = applyFix(r, { type: 'add', exerciseId: 'db-row', sets: 3, reps: 10, label: '' }, exercises);
    expect(fixed.items.map((i) => i.exerciseId)).toEqual(['db-bench-press', 'db-row', 'db-curl']);
    expect(fixed.items[1].sets).toHaveLength(3);
    expect(fixed.items[1].sets[0]).toMatchObject({ reps: 10, weightKg: null });
  });
});

describe('push : pull balance', () => {
  it('flags pushing that outweighs pulling by more than 1.5×', () => {
    const r = balanced();
    r.items.push(item('m-chest-press', 4, 10), item('bw-pushup', 3, 10));
    const s = run(r).find((x) => x.id === 'pushpull')!;
    expect(s.what).toBe('Pushing outweighs pulling: 24 vs 10 weekly sets.');
    expect(s.fix?.type).toBe('add');
  });

  it('does not flag extra pulling', () => {
    const r = balanced();
    r.items.push(item('db-row', 4, 10));
    expect(ids(run(r))).not.toContain('pushpull');
  });
});

describe('upper vs lower balance', () => {
  it('flags a week that is more than 2:1 one way', () => {
    const r = routine(
      [item('db-bench-press', 4), item('cable-seated-row', 4), item('db-shoulder-press', 4), item('cable-lat-pulldown', 4), item('db-goblet-squat', 2), item('db-rdl', 2), item('db-reverse-lunge', 2), item('bw-plank', 2, 30)],
      { timesPerWeek: 2 },
    );
    const s = run(r).find((x) => x.id === 'upperlower')!;
    expect(s.what).toMatch(/^Upper body gets much more work than lower: 32 vs 12/);
    expect(['squat', 'hinge']).toContain(exercises[(s.fix as { exerciseId: string }).exerciseId].pattern);
  });
});

describe('weekly sets per muscle group', () => {
  it('flags a major muscle under 4 weekly sets', () => {
    const r = balanced();
    r.timesPerWeek = 1;
    r.items = r.items.map((i) => ({ ...i, sets: i.sets.slice(0, 2) }));
    const low = run(r, [r, routine([item('bw-plank', 1, 30)])]).filter((s) => s.id.startsWith('volume-low'));
    expect(low.length).toBeGreaterThan(0);
    expect(low.length).toBeLessThanOrEqual(2); // never a wall of cards
    expect(low[0].why).toContain('4 weekly sets');
  });

  it('flags a muscle over 20 weekly sets and offers to trim', () => {
    const r = balanced();
    r.items.push(item('m-chest-press', 4, 10), item('db-incline-press', 4, 10), item('cable-seated-row', 4, 10), item('db-row', 4, 10));
    const high = run(r).find((s) => s.id === 'volume-high:chest')!;
    expect(high.what).toMatch(/Chest gets about 22 sets a week/);
    expect(high.fix).toMatchObject({ type: 'trimSet' });
    const before = r.items.reduce((n, i) => n + i.sets.length, 0);
    const after = applyFix(r, high.fix!, exercises).items.reduce((n, i) => n + i.sets.length, 0);
    expect(after).toBe(before - 1);
  });
});

describe('rep ranges', () => {
  it('flags sets under 5 reps and fixes them to 8', () => {
    const r = balanced();
    r.items[0] = item('db-goblet-squat', 3, 3);
    const s = run(r).find((x) => x.id.startsWith('reps-low'))!;
    expect(s.what).toBe('Goblet Squat uses very low reps.');
    expect(applyFix(r, s.fix!, exercises).items[0].sets.every((x) => x.reps === 8)).toBe(true);
  });

  it('flags sets over 20 reps and fixes them to 15', () => {
    const r = balanced();
    r.items[1] = item('db-bench-press', 3, 30);
    const s = run(r).find((x) => x.id.startsWith('reps-high'))!;
    expect(applyFix(r, s.fix!, exercises).items[1].sets.every((x) => x.reps === 15)).toBe(true);
  });

  it('leaves 6–15 reps and timed holds alone', () => {
    const r = balanced();
    r.items[0] = item('db-goblet-squat', 3, 6);
    r.items[1] = item('db-bench-press', 3, 15);
    expect(ids(run(r)).some((i) => i.startsWith('reps'))).toBe(false);
  });
});

describe('exercise order', () => {
  it('suggests moving a compound lift ahead of isolation work for the same muscle', () => {
    const r = routine([item('m-leg-extension', 2, 12), item('db-goblet-squat'), item('db-bench-press'), item('cable-seated-row'), item('db-rdl')]);
    const s = run(r).find((x) => x.id.startsWith('order'))!;
    expect(s.what).toBe('Leg Extension comes before Goblet Squat.');
    expect(s.fix).toMatchObject({ type: 'move', label: 'Move Goblet Squat before Leg Extension' });
    const fixed = applyFix(r, s.fix!, exercises);
    expect(fixed.items.slice(0, 2).map((i) => i.exerciseId)).toEqual(['db-goblet-squat', 'm-leg-extension']);
    expect(ids(run(fixed)).some((i) => i.startsWith('order'))).toBe(false);
  });

  it('moves the isolation exercise instead when several compound lifts follow it', () => {
    const r = balanced();
    r.items.unshift(item('m-leg-extension', 2, 12)); // before both the squat and the lunge
    const s = run(r).find((x) => x.id.startsWith('order'))!;
    expect(s.fix).toMatchObject({ type: 'moveAfter', label: 'Move Leg Extension after Dumbbell Reverse Lunge' });
    const fixed = applyFix(r, s.fix!, exercises);
    expect(ids(run(fixed)).some((i) => i.startsWith('order'))).toBe(false);
  });

  it('is happy with isolation work after the compound lifts', () => {
    const r = balanced();
    r.items.push(item('db-curl', 2, 12));
    expect(ids(run(r)).some((i) => i.startsWith('order'))).toBe(false);
  });
});

describe('same muscle back-to-back', () => {
  it('flags two compound lifts for the same main muscle in a row and offers to space them', () => {
    const r = routine(
      [item('db-bench-press'), item('db-incline-press'), item('cable-seated-row'), item('db-goblet-squat'), item('db-rdl'), item('db-reverse-lunge'), item('bw-plank', 2, 30)],
      { timesPerWeek: 2 },
    );
    const s = run(r).find((x) => x.id.startsWith('stack'))!;
    expect(s.what).toBe('Dumbbell Bench Press and Incline Dumbbell Press hit chest back-to-back.');
    const fixed = applyFix(r, s.fix!, exercises);
    expect(fixed.items.slice(0, 3).map((i) => i.exerciseId)).toEqual(['db-bench-press', 'cable-seated-row', 'db-incline-press']);
    expect(ids(run(fixed)).some((i) => i.startsWith('stack'))).toBe(false);
  });

  it('does not flag a squat followed by a hinge', () => {
    expect(ids(run(balanced())).some((i) => i.startsWith('stack'))).toBe(false);
  });
});

describe('session length and frequency', () => {
  it('flags a routine estimated over 60 minutes', () => {
    const r = balanced();
    r.items.push(item('db-curl', 3, 12));
    const s = run(r, [r], 75 * 60).find((x) => x.id === 'length')!;
    expect(s.what).toBe('This routine runs about 75 minutes.');
    expect(s.fix).toMatchObject({ type: 'trimSet' });
    expect(ids(run(r, [r], 59 * 60))).not.toContain('length');
  });

  it('flags a plan that adds up to one session a week, with a one-tap fix', () => {
    const r = balanced();
    r.timesPerWeek = 1;
    const s = run(r).find((x) => x.id === 'frequency')!;
    expect(applyFix(r, s.fix!, exercises).timesPerWeek).toBe(2);
  });
});

describe('cards', () => {
  const messy = () => {
    const r = routine([item('m-leg-extension', 3, 30), item('db-goblet-squat', 3, 3), item('db-bench-press', 5), item('db-incline-press', 5)]);
    return run(r, [r], 80 * 60);
  };

  it('can be dismissed', () => {
    const r = balanced();
    r.timesPerWeek = 1;
    expect(ids(run(r))).toContain('frequency');
    r.dismissed = ['frequency'];
    expect(ids(run(r))).not.toContain('frequency');
  });

  it('always cite sources that exist in the research file', () => {
    for (const s of messy()) {
      expect(s.sources.length).toBeGreaterThan(0);
      for (const id of s.sources) expect(SOURCES[id], `${s.id} cites ${id}`).toBeDefined();
    }
  });

  it('keep What and Why to one line each, with stable unique ids', () => {
    const list = messy();
    expect(list.length).toBeGreaterThan(3);
    expect(new Set(ids(list)).size).toBe(list.length);
    for (const s of list) {
      expect(s.what.length).toBeLessThanOrEqual(110);
      expect(s.why.length).toBeLessThanOrEqual(200);
      expect(s.what).not.toMatch(/\n/);
    }
  });

  it('say nothing about an empty routine', () => {
    expect(run(routine([]))).toEqual([]);
  });
});
