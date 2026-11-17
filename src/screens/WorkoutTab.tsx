import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Play, Timer } from 'lucide-react';
import { ICON, ICON_SM, SplitBar } from '../components/ui';
import { getActiveWorkout, saveActiveWorkout } from '../lib/db';
import { routineTimes } from '../lib/learning';
import { startWorkout } from '../lib/player';
import { buildPlan } from '../lib/timing';
import type { Routine } from '../lib/types';
import { formatMinutes } from '../lib/units';
import { useData } from '../state';
import Player from './Player';

export default function WorkoutTab() {
  const { routines, sessions, timing, settings } = useData();
  const [params] = useSearchParams();
  const preferred = params.get('routine');
  // undefined = still loading, null = no workout in progress
  const active = useLiveQuery(async () => (await getActiveWorkout()) ?? null, [], undefined);

  const plans = useMemo(() => {
    const list = routines.map((r) => ({ routine: r, plan: buildPlan(r, timing), times: routineTimes(sessions, r.id) }));
    return list.sort((a, b) => Number(b.routine.id === preferred) - Number(a.routine.id === preferred));
  }, [routines, timing, sessions, preferred]);

  if (active === undefined) return <div className="screen" />;
  if (active) return <Player key={active.startedAt} initial={active} />;

  const start = async (routine: Routine) => {
    const plan = buildPlan(routine, timing);
    await saveActiveWorkout(
      startWorkout({ routineId: routine.id, routineName: routine.name, autoStart: settings.autoStart }, plan.phases, plan.breakdown, Date.now()),
    );
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Workout</h1>
          <p className="sub">Pick a routine. The ring does the counting.</p>
        </div>
      </div>

      {plans.length === 0 && (
        <div className="empty">
          <span className="glyph"><Timer {...ICON} /></span>
          <h3>No routines yet</h3>
          <p className="small">Build one first, then come back to start it.</p>
          <Link className="btn primary" to="/routine/new">Build a routine</Link>
        </div>
      )}

      {plans.map(({ routine, plan, times }) => {
        const sets = routine.items.reduce((n, i) => n + i.sets.length, 0);
        return (
          <article className="card stack" key={routine.id} style={{ gap: 16 }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.15 }}>{routine.name}</div>
                <div className="small muted" style={{ marginTop: 4 }}>{routine.items.length} exercises · {sets} sets</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="serif num" style={{ fontSize: 30, lineHeight: 1 }}>{sets ? formatMinutes(plan.breakdown.total) : '—'}</div>
                <div className="tiny muted">estimated</div>
              </div>
            </div>
            {sets > 0 && <SplitBar breakdown={plan.breakdown} />}
            {times.avgSec != null && (
              <p className="small muted">Your average is {formatMinutes(times.avgSec)} over {times.count} session{times.count === 1 ? '' : 's'}.</p>
            )}
            <button className="btn primary block" disabled={sets === 0} onClick={() => start(routine)}>
              <Play {...ICON_SM} /> Start workout
            </button>
            {sets === 0 && <p className="hint center">Add at least one exercise to start.</p>}
          </article>
        );
      })}

      {plans.length > 0 && (
        <p className="hint center">
          {settings.autoStart ? 'Sets start automatically when a rest ends.' : 'Tap Start set when you’re ready — your real rest time is logged.'} Change this in Settings.
        </p>
      )}
    </div>
  );
}
