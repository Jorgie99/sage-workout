import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Play, Plus } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ICON, ICON_SM, Sparkline } from '../components/ui';
import { routineTimes } from '../lib/learning';
import { estimateRoutine } from '../lib/timing';
import { MAX_ROUTINES } from '../lib/types';
import { formatMinutes, formatRelativeDay } from '../lib/units';
import { useData } from '../state';

export default function Routines() {
  const nav = useNavigate();
  const { routines, sessions, timing } = useData();
  const full = routines.length >= MAX_ROUTINES;

  const cards = useMemo(
    () =>
      routines.map((r) => ({
        routine: r,
        estimate: estimateRoutine(r, timing),
        times: routineTimes(sessions, r.id),
        setCount: r.items.reduce((n, i) => n + i.sets.length, 0),
      })),
    [routines, sessions, timing],
  );

  return (
    <div className="screen">
      <div className="row" style={{ gap: 10, paddingTop: 4 }}>
        <Logo size={28} />
        <span className="wordmark">Sage</span>
      </div>
      <div className="screen-head" style={{ paddingTop: 0 }}>
        <div>
          <h1>Your routines</h1>
          <p className="sub">{routines.length === 0 ? 'Build your first one — the coach will help you balance it.' : `${routines.length} of ${MAX_ROUTINES} · tap one to edit`}</p>
        </div>
      </div>

      {cards.map(({ routine: r, estimate, times, setCount }) => (
        <article className="card routine-card" key={r.id}>
          <Link to={`/routine/${r.id}`} style={{ textDecoration: 'none', color: 'inherit' }} aria-label={`Edit ${r.name}`}>
            <div className="name">{r.name}</div>
            <div className="small muted" style={{ marginTop: 4 }}>
              {r.items.length} exercise{r.items.length === 1 ? '' : 's'} · {setCount} sets · {r.timesPerWeek}× a week
            </div>
          </Link>

          <div className="stat-pair">
            <div className="stat">
              <div className="k">Estimated</div>
              <div className="v num">{setCount ? formatMinutes(estimate.total) : '—'}</div>
            </div>
            <div className="stat">
              <div className="k">Your average</div>
              <div className="row" style={{ gap: 10 }}>
                <div className="v num">
                  {times.avgSec != null ? formatMinutes(times.avgSec) : '—'}
                  {times.count > 0 && <small> · {times.count}×</small>}
                </div>
                <Sparkline values={times.trend} width={64} height={26} />
              </div>
            </div>
          </div>

          <hr className="hairline" />
          <div className="row between">
            <span className="small muted">{times.lastAt ? `Last done ${formatRelativeDay(times.lastAt)}` : 'Not done yet'}</span>
            <div className="row" style={{ gap: 8 }}>
              <button className="icon-btn outlined" onClick={() => nav(`/routine/${r.id}`)} aria-label={`Edit ${r.name}`}>
                <Pencil {...ICON_SM} />
              </button>
              <button className="btn primary sm" disabled={setCount === 0} onClick={() => nav(`/workout?routine=${r.id}`)}>
                <Play {...ICON_SM} /> Start
              </button>
            </div>
          </div>
        </article>
      ))}

      <button className="add-routine" disabled={full} onClick={() => nav('/routine/new')} aria-label="New routine" aria-describedby="limit-note">
        <span className="plus"><Plus {...ICON} /></span>
        <span className="grow">
          <span style={{ display: 'block', fontWeight: 500 }}>New routine</span>
          <span className="small muted" id="limit-note">
            {full ? `You have all ${MAX_ROUTINES}. Three is plenty for a balanced week — edit or delete one to make room.` : 'Name it, add exercises, set your sets.'}
          </span>
        </span>
      </button>
    </div>
  );
}
