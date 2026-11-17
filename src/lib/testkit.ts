// Small builders shared by the unit tests.
import { buildExerciseMap } from './exercises';
import type { TimingCtx } from './timing';
import { DEFAULT_PROFILE, type Profile, type Routine, type RoutineItem } from './types';

export const exercises = buildExerciseMap();

let n = 0;
const id = (p: string) => `${p}${++n}`;

export function item(exerciseId: string, sets = 3, reps = 10, weightKg: number | null = null): RoutineItem {
  return {
    id: id('i'),
    exerciseId,
    note: '',
    sets: Array.from({ length: sets }, () => ({ id: id('s'), weightKg, reps })),
  };
}

export function routine(items: RoutineItem[], over: Partial<Routine> = {}): Routine {
  return {
    id: id('r'), name: 'Test', order: 0, timesPerWeek: 1, items,
    warmupIds: null, cooldownIds: null, rampUp: false, dismissed: [],
    createdAt: 0, updatedAt: 0, ...over,
  };
}

export function profile(over: Partial<Profile> = {}): Profile {
  return { ...DEFAULT_PROFILE, weightKg: 60, heightCm: 165, sex: 'female', experience: 'some', onboarded: true, ...over };
}

export function ctx(over: Partial<TimingCtx> = {}): TimingCtx {
  return { exercises, stats: {}, profile: profile(), transitionFactor: 1, ...over };
}
