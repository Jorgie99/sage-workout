import Dexie, { type Table } from 'dexie';
import {
  DEFAULT_PROFILE, DEFAULT_SETTINGS,
  type Exercise, type ExerciseStats, type Profile, type Routine, type Session, type Settings,
} from './types';
import type { PlayerState } from './player';

// Everything lives in IndexedDB on this device. There is no server.

interface KV {
  key: string;
  value: unknown;
}

class SageDB extends Dexie {
  kv!: Table<KV, string>;
  routines!: Table<Routine, string>;
  sessions!: Table<Session, string>;
  customExercises!: Table<Exercise, string>;
  exerciseStats!: Table<ExerciseStats, string>;

  constructor() {
    super('sage-workout');
    this.version(1).stores({
      kv: 'key',
      routines: 'id, order',
      sessions: 'id, routineId, startedAt',
      customExercises: 'id',
      exerciseStats: 'exerciseId',
    });
  }
}

export const db = new SageDB();

const K = {
  profile: 'profile',
  settings: 'settings',
  active: 'activeWorkout',
  recents: 'recentExercises',
} as const;

async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? (row.value as T) : fallback;
}
const setKV = (key: string, value: unknown) => db.kv.put({ key, value });

export const getProfile = async (): Promise<Profile> => ({ ...DEFAULT_PROFILE, ...(await getKV<Partial<Profile>>(K.profile, {})) });
export const saveProfile = (p: Profile) => setKV(K.profile, p);

export const getSettings = async (): Promise<Settings> => ({ ...DEFAULT_SETTINGS, ...(await getKV<Partial<Settings>>(K.settings, {})) });
export const saveSettings = (s: Settings) => setKV(K.settings, s);

export const getActiveWorkout = () => getKV<PlayerState | null>(K.active, null);
export const saveActiveWorkout = (s: PlayerState) => setKV(K.active, s);
export const clearActiveWorkout = () => db.kv.delete(K.active);

export const getRecentExerciseIds = () => getKV<string[]>(K.recents, []);
export async function touchRecentExercise(id: string) {
  const list = (await getRecentExerciseIds()).filter((x) => x !== id);
  list.unshift(id);
  await setKV(K.recents, list.slice(0, 8));
}

export async function getStatsMap(): Promise<Record<string, ExerciseStats>> {
  const rows = await db.exerciseStats.toArray();
  return Object.fromEntries(rows.map((r) => [r.exerciseId, r]));
}

// ── Backup ────────────────────────────────────────────────────────────────

export interface Backup {
  app: 'sage-workout';
  version: 1;
  exportedAt: string;
  profile: Profile;
  /** Settings without the API key — a backup file should never carry a secret. */
  settings: Omit<Settings, 'apiKey'>;
  recentExercises: string[];
  routines: Routine[];
  sessions: Session[];
  customExercises: Exercise[];
  exerciseStats: ExerciseStats[];
}

export async function exportAll(): Promise<Backup> {
  const { apiKey: _omit, ...settings } = await getSettings();
  void _omit;
  return {
    app: 'sage-workout',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: await getProfile(),
    settings,
    recentExercises: await getRecentExerciseIds(),
    routines: await db.routines.orderBy('order').toArray(),
    sessions: await db.sessions.orderBy('startedAt').toArray(),
    customExercises: await db.customExercises.toArray(),
    exerciseStats: await db.exerciseStats.toArray(),
  };
}

export function validateBackup(data: unknown): data is Backup {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    d.app === 'sage-workout' &&
    d.version === 1 &&
    Array.isArray(d.routines) &&
    Array.isArray(d.sessions) &&
    Array.isArray(d.customExercises) &&
    Array.isArray(d.exerciseStats) &&
    typeof d.profile === 'object' && d.profile !== null
  );
}

/** Replace everything on this device with the backup. The API key on the device is kept. */
export async function importAll(data: unknown): Promise<void> {
  if (!validateBackup(data)) throw new Error('This file is not a Sage backup.');
  const current = await getSettings();
  await db.transaction('rw', [db.kv, db.routines, db.sessions, db.customExercises, db.exerciseStats], async () => {
    await Promise.all([db.routines.clear(), db.sessions.clear(), db.customExercises.clear(), db.exerciseStats.clear()]);
    await db.kv.delete(K.active);
    await db.routines.bulkPut(data.routines);
    await db.sessions.bulkPut(data.sessions);
    await db.customExercises.bulkPut(data.customExercises);
    await db.exerciseStats.bulkPut(data.exerciseStats);
    await setKV(K.profile, { ...DEFAULT_PROFILE, ...data.profile });
    await setKV(K.settings, { ...DEFAULT_SETTINGS, ...data.settings, apiKey: current.apiKey });
    await setKV(K.recents, Array.isArray(data.recentExercises) ? data.recentExercises : []);
  });
}

export async function eraseAll(): Promise<void> {
  await db.transaction('rw', [db.kv, db.routines, db.sessions, db.customExercises, db.exerciseStats], async () => {
    await Promise.all([db.kv.clear(), db.routines.clear(), db.sessions.clear(), db.customExercises.clear(), db.exerciseStats.clear()]);
  });
}
