import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getProfile, getRecentExerciseIds, getSettings } from './lib/db';
import { buildExerciseMap, type ExerciseMap } from './lib/exercises';
import type { TimingCtx } from './lib/timing';
import type { Exercise, ExerciseStats, Profile, Routine, Session, Settings } from './lib/types';
import { uid } from './lib/units';

export interface AppData {
  profile: Profile;
  settings: Settings;
  routines: Routine[];
  /** Newest first. */
  sessions: Session[];
  custom: Exercise[];
  stats: Record<string, ExerciseStats>;
  recents: string[];
  exercises: ExerciseMap;
  timing: TimingCtx;
}

const Ctx = createContext<AppData | null>(null);

export function DataProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const profile = useLiveQuery(getProfile);
  const settings = useLiveQuery(getSettings);
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray());
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray());
  const custom = useLiveQuery(() => db.customExercises.toArray());
  const statRows = useLiveQuery(() => db.exerciseStats.toArray());
  const recents = useLiveQuery(getRecentExerciseIds);

  const value = useMemo<AppData | null>(() => {
    if (!profile || !settings || !routines || !sessions || !custom || !statRows || !recents) return null;
    const exercises = buildExerciseMap(custom);
    const stats = Object.fromEntries(statRows.map((r) => [r.exerciseId, r]));
    return {
      profile, settings, routines, sessions, custom, stats, recents, exercises,
      timing: { exercises, stats, profile, transitionFactor: settings.transitionFactor },
    };
  }, [profile, settings, routines, sessions, custom, statRows, recents]);

  if (!value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData must be used inside DataProvider');
  return v;
}

export function blankRoutine(order: number): Routine {
  const now = Date.now();
  return {
    id: uid('r'), name: '', order, timesPerWeek: 1, items: [],
    warmupIds: null, cooldownIds: null, rampUp: true, dismissed: [],
    createdAt: now, updatedAt: now,
  };
}
