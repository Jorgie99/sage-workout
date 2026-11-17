// Shared data model. All loads are stored in kilograms and all durations in
// seconds; the UI converts to the units chosen in the profile.

export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'adductors' | 'calves' | 'core';

export type Pattern =
  | 'hpush' | 'vpush' | 'hpull' | 'vpull'
  | 'squat' | 'hinge' | 'lunge' | 'gluteIso'
  | 'coreAntiExt' | 'coreAntiRot' | 'coreFlex'
  | 'armIso' | 'upperIso' | 'legIso' | 'calves' | 'carry';

export type Equipment =
  | 'dumbbell' | 'barbell' | 'cable' | 'machine' | 'kettlebell' | 'band' | 'bodyweight';

export interface Exercise {
  id: string;
  name: string;
  primary: Muscle[];
  secondary: Muscle[];
  pattern: Pattern;
  equipment: Equipment;
  compound: boolean;
  /** One side at a time: a set takes twice as long. Reps are per side. */
  unilateral: boolean;
  /** Default seconds per rep. */
  tempo: number;
  /** Seconds to get into position before the first rep of each set. */
  setup: number;
  cues: string[];
  /** The "reps" field is a hold/carry time in seconds. */
  timed?: boolean;
  /** Fraction of body weight moved (RESEARCH.md §9). Absent = not counted in volume. */
  bw?: number;
  /** Conservative starting load as a fraction of body weight (RESEARCH.md §9). */
  start?: number;
  custom?: boolean;
}

export type Sex = 'female' | 'male' | 'na';
export type Experience = 'new' | 'some' | 'experienced';
export type WeightUnit = 'lb' | 'kg';
export type HeightUnit = 'ft' | 'cm';

export interface Profile {
  heightCm: number | null;
  weightKg: number | null;
  sex: Sex;
  experience: Experience | null;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  onboarded: boolean;
}

export interface Settings {
  apiKey: string;
  model: string;
  /** Start the next set automatically when a rest hits zero. */
  autoStart: boolean;
  /** Learned multiplier on transition time between exercises. */
  transitionFactor: number;
}

export interface RoutineSet {
  id: string;
  weightKg: number | null;
  reps: number;
}

export interface RoutineItem {
  id: string;
  exerciseId: string;
  note: string;
  sets: RoutineSet[];
}

export interface Routine {
  id: string;
  name: string;
  order: number;
  timesPerWeek: number;
  items: RoutineItem[];
  /** null = use the generated warm-up; otherwise the user's customised list. */
  warmupIds: string[] | null;
  cooldownIds: string[] | null;
  rampUp: boolean;
  /** Dismissed coach suggestion ids. */
  dismissed: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ExerciseStats {
  exerciseId: string;
  /** Learned seconds per rep (EMA). */
  secPerRep?: number;
  /** Learned multiplier on the research-based rest (EMA). */
  restFactor?: number;
  samples: number;
  lastWeightKg?: number | null;
  lastReps?: number;
  bestWeightKg?: number;
  bestReps?: number;
  bestSetVolumeKg?: number;
  lastUsedAt?: number;
}

export interface Breakdown {
  warmup: number;
  lifting: number;
  rest: number;
  cooldown: number;
  total: number;
}

export type PhaseKind = 'warmup' | 'set' | 'rest' | 'transition' | 'cooldown';

export interface Phase {
  id: string;
  kind: PhaseKind;
  estSec: number;
  /** Large label, e.g. "SET 2 OF 4", "REST", "WARM-UP 1 OF 5". */
  title: string;
  /** Exercise / move name, or the rest activity ("walk it out"). */
  name: string;
  /** e.g. "12 reps · 25 lb" or the target area. */
  detail?: string;
  /** One-sentence cue. */
  cue?: string;
  exerciseId?: string;
  itemIndex?: number;
  setIndex?: number;
  setCount?: number;
  reps?: number;
  weightKg?: number | null;
  rampUp?: boolean;
  /** For rests: the research-based rest before the learned multiplier. */
  baseSec?: number;
}

export interface SessionSet {
  targetReps: number;
  targetWeightKg: number | null;
  reps: number;
  weightKg: number | null;
  setSec: number;
  estSetSec: number;
  restSec: number | null;
  restBaseSec: number | null;
  skipped: boolean;
  rampUp?: boolean;
}

export interface SessionItem {
  exerciseId: string;
  name: string;
  sets: SessionSet[];
}

export interface PersonalBest {
  exerciseId: string;
  name: string;
  kind: 'weight' | 'reps' | 'volume';
  value: number;
  previous: number;
}

export interface Session {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: number;
  endedAt: number;
  /** Active time, pauses excluded. */
  durationSec: number;
  estimateSec: number;
  breakdown: Breakdown;
  estBreakdown: Breakdown;
  items: SessionItem[];
  volumeKg: number;
  kcal: number | null;
  prs: PersonalBest[];
  completed: boolean;
}

export interface PrepMove {
  id: string;
  name: string;
  area: string;
  cue: string;
}

export const DEFAULT_PROFILE: Profile = {
  heightCm: null,
  weightKg: null,
  sex: 'na',
  experience: null,
  heightUnit: 'ft',
  weightUnit: 'lb',
  onboarded: false,
};

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'claude-haiku-5-5',
  autoStart: false,
  transitionFactor: 1,
};

export const MAX_ROUTINES = 3;
