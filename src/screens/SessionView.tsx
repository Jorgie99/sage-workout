import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronLeft, Dumbbell, Flame, ListChecks, Trash2, Trophy } from 'lucide-react';
import { ICON, ICON_SM, Sheet, SplitBar } from '../components/ui';
import { db } from '../lib/db';
import { applyProgression, routineTimes, suggestProgression, type Progression } from '../lib/learning';
import { describeSet } from '../lib/timing';
import type { PersonalBest, WeightUnit } from '../lib/types';
import { formatClock, formatDate, formatNumber, formatWeight, kgToLb } from '../lib/units';
import { useData } from '../state';

const volumeText = (kg: number, unit: WeightUnit) => `${formatNumber(unit === 'lb' ? kgToLb(kg) : kg)}`;

function pbText(pb: PersonalBest, unit: WeightUnit): string {
  if (pb.kind === 'weight') return `${formatWeight(pb.value, unit)} — up from ${formatWeight(pb.previous, unit)}`;
  if (pb.kind === 'volume') return `${volumeText(pb.value, unit)} ${unit} in one set — up from ${volumeText(pb.previous, unit)}`;
  return `${pb.value} reps — up from ${pb.previous}`;
}

/** The post-workout summary (`fresh`) and the history detail view share this screen. */
export default function SessionView({ fresh = false }: { fresh?: boolean }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { sessions, routines, exercises, profile } = useData();
  // Right after a workout the shared session list may not have refreshed yet,
  // so fall back to reading this one session straight from the database.
  const direct = useLiveQuery(async () => (await db.sessions.get(id ?? '')) ?? null, [id], undefined);
  const session = sessions.find((s) => s.id === id) ?? direct ?? undefined;
  const [applied, setApplied] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const unit = profile.weightUnit;

  const routine = routines.find((r) => r.id === session?.routineId);
  const times = useMemo(() => (session ? routineTimes(sessions, session.routineId) : null), [sessions, session]);
  const progressions = useMemo<Progression[]>(() => {
    if (!session || !fresh || !routine) return [];
    return session.items
      .filter((item) => routine.items.some((i) => i.exerciseId === item.exerciseId))
      .map((item) => (exercises[item.exerciseId] ? suggestProgression(item, exercises[item.exerciseId], unit) : null))
      .filter((p): p is Progression => p != null);
  }, [session, fresh, routine, exercises, unit]);

  if (!session && direct === undefined) return <div className="screen no-tabs" />;
  if (!session) return <Navigate to={fresh ? '/' : '/history'} replace />;

  const setsDone = session.items.reduce((n, i) => n + i.sets.filter((s) => !s.skipped && !s.rampUp).length, 0);
  const diff = session.durationSec - session.estimateSec;
  const diffText = Math.abs(diff) < 45 ? 'right on the estimate' : `${formatClock(Math.abs(diff))} ${diff < 0 ? 'faster' : 'longer'} than estimated`;

  const apply = async (p: Progression) => {
    const current = await db.routines.get(session.routineId);
    if (!current) return;
    await db.routines.put(applyProgression(current, p));
    setApplied((a) => [...a, p.exerciseId]);
  };

  return (
    <div className="screen no-tabs">
      {!fresh && (
        <div className="topbar">
          <button className="icon-btn" aria-label="Back to history" onClick={() => nav('/history')}><ChevronLeft {...ICON} /></button>
          <span className="topbar-title">{formatDate(session.startedAt)}</span>
          <button className="icon-btn" aria-label="Delete this session" onClick={() => setConfirmDelete(true)}><Trash2 {...ICON_SM} /></button>
        </div>
      )}

      <div className="stack center" style={{ alignItems: 'center', gap: 8, paddingTop: fresh ? 28 : 4 }}>
        <span className="eyebrow">{fresh ? (session.completed ? 'Workout complete' : 'Workout saved') : session.completed ? 'Completed' : 'Ended early'}</span>
        <h2>{session.routineName}</h2>
        <div className="hero-time num" style={{ marginTop: 10 }}>{formatClock(session.durationSec)}</div>
        <p className="muted small">{session.completed ? diffText : 'ended before the last phase'}</p>
      </div>

      <div className="metric-grid">
        <div className="metric">
          <div className="k">Estimate</div>
          <div className="v num">{formatClock(session.estimateSec)}</div>
        </div>
        <div className="metric">
          <div className="k">Your average</div>
          <div className="v num">
            {times?.avgSec != null ? formatClock(times.avgSec) : '—'}
            {times && times.count > 0 && <small> · {times.count}×</small>}
          </div>
        </div>
        <div className="metric">
          <div className="k"><Dumbbell size={14} strokeWidth={1.5} /> Volume</div>
          <div className="v num">{volumeText(session.volumeKg, unit)} <small>{unit}</small></div>
        </div>
        <div className="metric">
          <div className="k"><Flame size={14} strokeWidth={1.5} /> Energy</div>
          <div className="v num">{session.kcal != null ? <>~{session.kcal} <small>kcal</small></> : <small>Add your weight in Settings</small>}</div>
        </div>
      </div>

      <div className="card tight stack">
        <div className="row between">
          <span className="eyebrow">Where the time went</span>
          <span className="small muted"><ListChecks size={14} strokeWidth={1.5} style={{ verticalAlign: -2 }} /> {setsDone} sets</span>
        </div>
        <SplitBar breakdown={session.breakdown} />
      </div>

      {session.prs.length > 0 && (
        <div className="card tight">
          <span className="eyebrow">Personal bests</span>
          {session.prs.map((pb) => (
            <div className="pb" key={pb.exerciseId + pb.kind}>
              <span className="medal"><Trophy {...ICON_SM} /></span>
              <div>
                <div style={{ fontWeight: 500 }}>{pb.name}</div>
                <div className="small muted">{pbText(pb, unit)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {fresh && routine && (
        <div className="card tight stack">
          <span className="eyebrow">Next time</span>
          <p className="small muted">Today’s weights are already filled in for your next session.</p>
          {progressions.map((p) => {
            const done = applied.includes(p.exerciseId);
            return (
              <div className="row between" key={p.exerciseId} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div className="grow">
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div className="small muted">You hit every rep. {p.text}.</div>
                </div>
                <button className="btn soft sm" disabled={done} onClick={() => apply(p)}>
                  {done ? <><Check {...ICON_SM} /> Set</> : 'Apply'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="stack">
        {session.items.map((item, k) => {
          const e = exercises[item.exerciseId];
          return (
            <div className="card tight" key={k}>
              <h3>{item.name}</h3>
              <table className="set-table" style={{ marginTop: 8 }}>
                <thead>
                  <tr><th>Set</th><th>Done</th><th>Time</th><th>Rest</th></tr>
                </thead>
                <tbody>
                  {item.sets.map((s, i) => (
                    <tr key={i} style={s.skipped ? { color: 'var(--text-2)' } : undefined}>
                      <td>{s.rampUp ? 'Ramp' : item.sets.slice(0, i + 1).filter((x) => !x.rampUp).length}</td>
                      <td>{s.skipped ? 'Skipped' : describeSet(e, s.reps, s.weightKg, unit)}</td>
                      <td>{s.skipped ? '—' : formatClock(s.setSec)}</td>
                      <td>{s.restSec != null && !s.skipped ? formatClock(s.restSec) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {fresh && <button className="btn primary block" onClick={() => nav('/', { replace: true })}>Done</button>}

      {confirmDelete && (
        <Sheet title="Delete this session?" onClose={() => setConfirmDelete(false)}>
          <p className="muted">It will be removed from your history and averages. What the app learned about your pace stays.</p>
          <button className="btn block" style={{ background: 'var(--danger)', color: '#fff' }} onClick={async () => { await db.sessions.delete(session.id); nav('/history', { replace: true }); }}>
            Delete session
          </button>
          <button className="btn quiet block" onClick={() => setConfirmDelete(false)}>Keep it</button>
        </Sheet>
      )}
    </div>
  );
}
