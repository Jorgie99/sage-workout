// Built-in coach: offline rules, each one tied to RESEARCH.md.
// `analyze` looks at one routine in the context of the whole week
// (all routines × how often each is done) and returns calm, specific cards.

import type { ExerciseMap } from './exercises';
import {
  CORE_PATTERNS, LOWER_PATTERNS, MUSCLE_LABEL, PULL_PATTERNS, PUSH_PATTERNS, UPPER_PATTERNS,
} from './exercises';
import type { Exercise, Muscle, Pattern, Routine, RoutineItem } from './types';
import { uid } from './units';

// Thresholds — see RESEARCH.md §2–§4 and §10.
export const WEEKLY_SETS_LOW = 4;
export const WEEKLY_SETS_TARGET = 10;
export const WEEKLY_SETS_HIGH = 20;
export const PUSH_PULL_MAX_RATIO = 1.5;
export const UPPER_LOWER_MAX_RATIO = 2;
export const REPS_LOW = 5;
export const REPS_HIGH = 20;
export const REP_RANGE: [number, number] = [6, 15];
export const SESSION_MAX_SEC = 60 * 60;
export const MIN_SESSIONS_PER_WEEK = 2;
export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = 10;

export const MAJOR_MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];
export const CHART_MUSCLES: Muscle[] = [...MAJOR_MUSCLES, 'biceps', 'triceps', 'core', 'calves'];

export type Fix =
  | { type: 'add'; exerciseId: string; sets: number; reps: number; label: string }
  | { type: 'move'; itemId: string; beforeItemId: string; label: string }
  | { type: 'moveAfter'; itemId: string; afterItemId: string; label: string }
  | { type: 'reps'; itemId: string; reps: number; label: string }
  | { type: 'trimSet'; itemIds: string[]; label: string }
  | { type: 'frequency'; timesPerWeek: number; label: string };

export interface Suggestion {
  id: string;
  what: string;
  why: string;
  sources: string[];
  fix?: Fix;
}

type Group = 'push' | 'pull' | 'squat' | 'hinge' | 'single-leg' | 'core';

const GROUP_PATTERNS: Record<Group, Pattern[]> = {
  push: PUSH_PATTERNS,
  pull: PULL_PATTERNS,
  squat: ['squat'],
  hinge: ['hinge'],
  'single-leg': ['lunge'],
  core: CORE_PATTERNS,
};

const GROUP_PHRASE: Record<Group, string> = {
  push: 'pushing', pull: 'pulling', squat: 'squat', hinge: 'hip-hinge', 'single-leg': 'single-leg', core: 'core',
};

const GROUP_WHY: Record<Group, string> = {
  push: 'Presses train your chest, shoulders and triceps — part of covering every major muscle group each week.',
  pull: 'Rows and pulldowns train your back and balance out pressing, which helps keep shoulders happy.',
  squat: 'Squat patterns are the main way to train your quads; guidelines call for every major muscle group each week.',
  hinge: 'Hinges train hamstrings and glutes, which squats alone leave under-worked.',
  'single-leg': 'Single-leg work trains each side on its own and adds glute and hip stability work.',
  core: 'A little direct core work rounds out a full-body week.',
};

const CANDIDATES: Record<Group, string[]> = {
  pull: ['cable-seated-row', 'db-row', 'cable-lat-pulldown', 'm-row', 'band-row', 'bw-inverted-row'],
  push: ['db-bench-press', 'm-chest-press', 'bw-pushup', 'db-shoulder-press', 'bb-bench-press'],
  squat: ['db-goblet-squat', 'm-leg-press', 'bb-back-squat', 'kb-sumo-squat', 'bw-squat'],
  hinge: ['db-rdl', 'bb-rdl', 'kb-deadlift', 'cable-pull-through', 'bw-back-extension'],
  'single-leg': ['db-reverse-lunge', 'db-bulgarian', 'bw-walking-lunge'],
  core: ['bw-plank', 'bw-dead-bug', 'cable-pallof-press'],
};

const MUSCLE_CANDIDATES: Partial<Record<Muscle, string[]>> = {
  chest: CANDIDATES.push,
  back: CANDIDATES.pull,
  shoulders: ['db-shoulder-press', 'm-shoulder-press', 'db-lateral-raise', 'cable-face-pull'],
  quads: [...CANDIDATES.squat, 'm-leg-extension'],
  hamstrings: ['db-rdl', 'm-leg-curl', 'bb-rdl', 'kb-deadlift'],
  glutes: ['db-hip-thrust', 'bb-hip-thrust', 'bw-glute-bridge', 'cable-kickback'],
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
/** "Chest gets", "Glutes get". */
const gets = (m: Muscle) => `${MUSCLE_LABEL[m]} ${['chest', 'back', 'core'].includes(m) ? 'gets' : 'get'}`;

function listPhrase(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

// ── Weekly tallies ─────────────────────────────────────────────────────────

export interface WeekTally {
  /** Hard sets per muscle per week: 1 per set for primary movers, 0.5 for secondary. */
  muscleSets: Record<Muscle, number>;
  patternSets: Partial<Record<Pattern, number>>;
  push: number;
  pull: number;
  upper: number;
  lower: number;
  sessions: number;
}

export function weekTally(routines: Routine[], exercises: ExerciseMap): WeekTally {
  const muscleSets = Object.fromEntries(Object.keys(MUSCLE_LABEL).map((m) => [m, 0])) as Record<Muscle, number>;
  const patternSets: Partial<Record<Pattern, number>> = {};
  let sessions = 0;
  for (const r of routines) {
    const times = Math.max(0, r.timesPerWeek);
    if (r.items.length) sessions += times;
    for (const item of r.items) {
      const e = exercises[item.exerciseId];
      if (!e) continue;
      const sets = item.sets.length * times;
      for (const m of e.primary) muscleSets[m] += sets;
      for (const m of e.secondary) muscleSets[m] += sets * 0.5;
      patternSets[e.pattern] = (patternSets[e.pattern] ?? 0) + sets;
    }
  }
  const sum = (ps: Pattern[]) => ps.reduce((s, p) => s + (patternSets[p] ?? 0), 0);
  return {
    muscleSets, patternSets, sessions,
    push: sum(PUSH_PATTERNS), pull: sum(PULL_PATTERNS),
    upper: sum(UPPER_PATTERNS), lower: sum(LOWER_PATTERNS),
  };
}

function pickExercise(candidates: string[], routine: Routine, exercises: ExerciseMap): Exercise | null {
  const inRoutine = new Set(routine.items.map((i) => i.exerciseId));
  const available = candidates.map((id) => exercises[id]).filter((e): e is Exercise => !!e && !inRoutine.has(e.id));
  if (!available.length) return null;
  // Prefer equipment the routine already uses, so the fix doesn't send you across the gym.
  // Bodyweight moves are always available.
  const equipment = new Set([...routine.items.map((i) => exercises[i.exerciseId]?.equipment), 'bodyweight']);
  return available.find((e) => equipment.has(e.equipment)) ?? available[0];
}

function addFix(e: Exercise): Fix {
  const reps = e.timed ? 30 : DEFAULT_REPS;
  return {
    type: 'add', exerciseId: e.id, sets: DEFAULT_SETS, reps,
    label: `Add ${e.name}, ${DEFAULT_SETS}×${reps}${e.timed ? ' s' : ''}`,
  };
}

// ── The rules ──────────────────────────────────────────────────────────────

export interface AnalyzeInput {
  routine: Routine;
  /** Every routine, including the one being analysed (with its latest edits). */
  allRoutines: Routine[];
  exercises: ExerciseMap;
  /** Estimated total seconds for `routine`, from the timing engine. */
  estimateSec: number;
}

export function analyze({ routine, allRoutines, exercises, estimateSec }: AnalyzeInput): Suggestion[] {
  const out: Suggestion[] = [];
  const items = routine.items.filter((i) => exercises[i.exerciseId] && i.sets.length > 0);
  if (!items.length) return out;

  const week = weekTally(allRoutines, exercises);
  const scope = allRoutines.length > 1 ? 'across your routines' : 'in this routine';
  const exOf = (i: RoutineItem) => exercises[i.exerciseId];

  // 1 · Movement-pattern coverage across the week
  const missing = (Object.keys(GROUP_PATTERNS) as Group[]).filter(
    (g) => GROUP_PATTERNS[g].reduce((s, p) => s + (week.patternSets[p] ?? 0), 0) === 0,
  );
  if (missing.length >= 3) {
    const first = pickExercise(CANDIDATES[missing[0]], routine, exercises);
    out.push({
      id: `coverage:${missing.join('+')}`,
      what: `Your week is missing ${listPhrase(missing.map((g) => GROUP_PHRASE[g]))} work.`,
      why: 'Guidelines recommend training every major muscle group at least twice a week; covering each movement pattern is the simplest way to do it.',
      sources: ['acsm2026', 'garber2011', 'nsca2016'],
      fix: first ? addFix(first) : undefined,
    });
  } else {
    for (const g of missing) {
      const pick = pickExercise(CANDIDATES[g], routine, exercises);
      out.push({
        id: `coverage:${g}`,
        what: `No ${GROUP_PHRASE[g]} movement ${scope}.`,
        why: GROUP_WHY[g],
        sources: g === 'pull' ? ['acsm2026', 'nsca2016', 'kolber2009'] : ['acsm2026', 'nsca2016'],
        fix: pick ? addFix(pick) : undefined,
      });
    }
  }

  // 2 · Push : pull balance
  if (week.pull > 0 && week.push > week.pull * PUSH_PULL_MAX_RATIO) {
    const pick = pickExercise(CANDIDATES.pull, routine, exercises);
    out.push({
      id: 'pushpull',
      what: `Pushing outweighs pulling: ${fmt(week.push)} vs ${fmt(week.pull)} weekly sets.`,
      why: 'Lifters whose training leans toward chest and front shoulders tend to develop shoulder imbalances; matching presses with rows keeps things even.',
      sources: ['nsca2016', 'kolber2009'],
      fix: pick ? addFix(pick) : undefined,
    });
  }

  // 3 · Upper vs lower balance
  if (week.upper > 0 && week.lower > 0) {
    const upperHeavy = week.upper > week.lower * UPPER_LOWER_MAX_RATIO;
    const lowerHeavy = week.lower > week.upper * UPPER_LOWER_MAX_RATIO;
    if (upperHeavy || lowerHeavy) {
      const pick = pickExercise(
        upperHeavy ? [...CANDIDATES.squat, ...CANDIDATES.hinge] : [...CANDIDATES.pull, ...CANDIDATES.push],
        routine, exercises,
      );
      out.push({
        id: 'upperlower',
        what: upperHeavy
          ? `Upper body gets much more work than lower: ${fmt(week.upper)} vs ${fmt(week.lower)} weekly sets.`
          : `Lower body gets much more work than upper: ${fmt(week.lower)} vs ${fmt(week.upper)} weekly sets.`,
        why: 'For a full-body goal, guidelines call for all major muscle groups to be trained each week — a big gap leaves one half behind.',
        sources: ['acsm2026', 'garber2011'],
        fix: pick ? addFix(pick) : undefined,
      });
    }
  }

  // 4 · Weekly hard sets per major muscle group
  const low = MAJOR_MUSCLES.filter((m) => week.muscleSets[m] > 0 && week.muscleSets[m] < WEEKLY_SETS_LOW).sort(
    (a, b) => week.muscleSets[a] - week.muscleSets[b],
  );
  for (const m of low.slice(0, 2)) {
    const pick = pickExercise(MUSCLE_CANDIDATES[m] ?? [], routine, exercises);
    out.push({
      id: `volume-low:${m}`,
      what: `${gets(m)} about ${fmt(week.muscleSets[m])} sets a week — on the low side.`,
      why: `At least ${WEEKLY_SETS_LOW} weekly sets per muscle group builds muscle, and around ${WEEKLY_SETS_TARGET} is well supported.`,
      sources: ['iversen2021', 'schoenfeld2017volume', 'acsm2026'],
      fix: pick ? addFix(pick) : undefined,
    });
  }
  for (const m of MAJOR_MUSCLES.filter((x) => week.muscleSets[x] > WEEKLY_SETS_HIGH)) {
    const contributors = items
      .filter((i) => exOf(i).primary.includes(m) && i.sets.length > 2)
      .sort((a, b) => b.sets.length - a.sets.length);
    out.push({
      id: `volume-high:${m}`,
      what: `${gets(m)} about ${fmt(week.muscleSets[m])} sets a week — more than you need.`,
      why: `Growth levels off with diminishing returns beyond roughly 18–${WEEKLY_SETS_HIGH} weekly sets per muscle, so the extra sets mostly cost time.`,
      sources: ['acsm2026', 'schoenfeld2017volume'],
      fix: contributors.length
        ? { type: 'trimSet', itemIds: [contributors[0].id], label: `Drop a set of ${exOf(contributors[0]).name}` }
        : undefined,
    });
  }

  // 5 · Rep ranges for a full-body toning goal
  const lowRep = items.filter((i) => !exOf(i).timed && i.sets.some((s) => s.reps < REPS_LOW));
  for (const item of lowRep.slice(0, 2)) {
    out.push({
      id: `reps-low:${item.id}`,
      what: `${exOf(item).name} uses very low reps.`,
      why: 'Sets under 5 reps are maximal-strength work — great if that’s the aim, but muscle grows just as well at 6–15 reps with shorter rests.',
      sources: ['acsm2026', 'iversen2021', 'schoenfeld2017load'],
      fix: { type: 'reps', itemId: item.id, reps: 8, label: 'Change to 8 reps' },
    });
  }
  const highRep = items.filter((i) => !exOf(i).timed && i.sets.some((s) => s.reps > REPS_HIGH));
  for (const item of highRep.slice(0, 2)) {
    out.push({
      id: `reps-high:${item.id}`,
      what: `${exOf(item).name} uses very high reps.`,
      why: 'High reps still build muscle, but past 20 the burn stops you before the muscle does. A bit more load at 8–15 reps does the same job faster.',
      sources: ['schoenfeld2017load', 'iversen2021'],
      fix: { type: 'reps', itemId: item.id, reps: 15, label: 'Change to 15 reps' },
    });
  }

  // 6 · Exercise order: compound lifts before isolation work for the same muscles
  let orderCards = 0;
  for (let i = 0; i < items.length - 1 && orderCards < 2; i++) {
    const iso = exOf(items[i]);
    if (iso.compound) continue;
    const later = items.slice(i + 1).filter((x) => {
      const e = exOf(x);
      return e.compound && iso.primary.some((m) => e.primary.includes(m) || e.secondary.includes(m));
    });
    if (!later.length) continue;
    orderCards++;
    const why = 'You get the most out of whatever you do first. Doing the big lift before the isolation move means it isn’t held back by a pre-tired muscle.';
    const sources = ['nunes2021', 'simao2012', 'acsm2026'];
    if (later.length === 1) {
      const compound = exOf(later[0]);
      out.push({
        id: `order:${items[i].id}`,
        what: `${iso.name} comes before ${compound.name}.`,
        why, sources,
        fix: { type: 'move', itemId: later[0].id, beforeItemId: items[i].id, label: `Move ${compound.name} before ${iso.name}` },
      });
    } else {
      const last = later[later.length - 1];
      out.push({
        id: `order:${items[i].id}`,
        what: `${iso.name} comes before ${later.length} compound lifts that use the same muscles.`,
        why, sources,
        fix: { type: 'moveAfter', itemId: items[i].id, afterItemId: last.id, label: `Move ${iso.name} after ${exOf(last).name}` },
      });
    }
  }

  // 7 · The same main muscle loaded heavily back-to-back
  for (let i = 0; i < items.length - 1; i++) {
    const a = exOf(items[i]);
    const b = exOf(items[i + 1]);
    if (!a.compound || !b.compound || a.primary[0] !== b.primary[0]) continue;
    const spacer = items.slice(i + 2).find((x) => {
      const e = exOf(x);
      return e.primary[0] !== a.primary[0] && e.compound;
    });
    out.push({
      id: `stack:${items[i + 1].id}`,
      what: `${a.name} and ${b.name} hit ${MUSCLE_LABEL[a.primary[0]].toLowerCase()} back-to-back.`,
      why: 'The second lift starts pre-tired, so you’ll manage fewer reps. Putting a different area in between lets the muscle recover — unless the stacking is on purpose.',
      sources: ['simao2012', 'nsca2016'],
      fix: spacer
        ? { type: 'moveAfter', itemId: items[i + 1].id, afterItemId: spacer.id, label: `Move ${b.name} after ${exOf(spacer).name}` }
        : undefined,
    });
    break;
  }

  // 8 · Session length
  if (estimateSec > SESSION_MAX_SEC) {
    const trim = items.filter((i) => !exOf(i).compound && i.sets.length >= 3).map((i) => i.id);
    out.push({
      id: 'length',
      what: `This routine runs about ${Math.round(estimateSec / 60)} minutes.`,
      why: 'Showing up consistently matters more than any single detail, and long sessions are the easiest ones to skip. Compound lifts give the most per minute.',
      sources: ['acsm2026', 'iversen2021'],
      fix: trim.length ? { type: 'trimSet', itemIds: trim, label: 'Drop one set from each isolation exercise' } : undefined,
    });
  }

  // 9 · Weekly frequency
  if (week.sessions < MIN_SESSIONS_PER_WEEK) {
    out.push({
      id: 'frequency',
      what: 'Your plan adds up to one session a week.',
      why: 'The core guideline is resistance training at least twice a week with all major muscle groups involved.',
      sources: ['acsm2026'],
      fix: { type: 'frequency', timesPerWeek: 2, label: 'Do this routine twice a week' },
    });
  }

  return out.filter((s) => !routine.dismissed.includes(s.id));
}

// ── Applying a one-tap fix ─────────────────────────────────────────────────

export function newItem(e: Exercise, sets = DEFAULT_SETS, reps?: number): RoutineItem {
  const r = reps ?? (e.timed ? 30 : DEFAULT_REPS);
  return {
    id: uid('i'),
    exerciseId: e.id,
    note: '',
    sets: Array.from({ length: sets }, () => ({ id: uid('st'), weightKg: null, reps: r })),
  };
}

export function applyFix(routine: Routine, fix: Fix, exercises: ExerciseMap): Routine {
  const items = routine.items.slice();
  switch (fix.type) {
    case 'add': {
      const e = exercises[fix.exerciseId];
      if (!e) return routine;
      const item = newItem(e, fix.sets, fix.reps);
      // Compound lifts go ahead of the first isolation exercise; everything else at the end.
      const firstIso = items.findIndex((i) => exercises[i.exerciseId] && !exercises[i.exerciseId].compound);
      if (e.compound && firstIso >= 0) items.splice(firstIso, 0, item);
      else items.push(item);
      return { ...routine, items };
    }
    case 'move': {
      const from = items.findIndex((i) => i.id === fix.itemId);
      if (from < 0) return routine;
      const [moved] = items.splice(from, 1);
      const to = items.findIndex((i) => i.id === fix.beforeItemId);
      items.splice(to < 0 ? 0 : to, 0, moved);
      return { ...routine, items };
    }
    case 'moveAfter': {
      const from = items.findIndex((i) => i.id === fix.itemId);
      if (from < 0) return routine;
      const [moved] = items.splice(from, 1);
      const to = items.findIndex((i) => i.id === fix.afterItemId);
      items.splice(to < 0 ? items.length : to + 1, 0, moved);
      return { ...routine, items };
    }
    case 'reps':
      return {
        ...routine,
        items: items.map((i) => (i.id === fix.itemId ? { ...i, sets: i.sets.map((s) => ({ ...s, reps: fix.reps })) } : i)),
      };
    case 'trimSet':
      return {
        ...routine,
        items: items.map((i) => (fix.itemIds.includes(i.id) && i.sets.length > 1 ? { ...i, sets: i.sets.slice(0, -1) } : i)),
      };
    case 'frequency':
      return { ...routine, timesPerWeek: fix.timesPerWeek };
  }
}
