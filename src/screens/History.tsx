import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, History as HistoryIcon, Trophy } from 'lucide-react';
import { ICON, ICON_SM } from '../components/ui';
import type { Session } from '../lib/types';
import { formatClock, formatNumber, kgToLb } from '../lib/units';
import { useData } from '../state';

function monthKey(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function History() {
  const { sessions, profile } = useData();
  const unit = profile.weightUnit;

  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const k = monthKey(s.startedAt);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [sessions]);

  const totalSec = sessions.reduce((n, s) => n + s.durationSec, 0);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>History</h1>
          <p className="sub">
            {sessions.length === 0
              ? 'Your finished workouts will collect here.'
              : `${sessions.length} session${sessions.length === 1 ? '' : 's'} · ${Math.round(totalSec / 60)} minutes of training`}
          </p>
        </div>
      </div>

      {sessions.length === 0 && (
        <div className="empty">
          <span className="glyph"><HistoryIcon {...ICON} /></span>
          <h3>Nothing yet</h3>
          <p className="small">Finish a workout and you’ll see your time, volume and personal bests.</p>
          <Link className="btn primary" to="/workout">Go to Workout</Link>
        </div>
      )}

      {groups.map(([month, list]) => (
        <section key={month} className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">{month}</span>
          <div className="card flush">
            {list.map((s) => {
              const d = new Date(s.startedAt);
              return (
                <Link key={s.id} to={`/history/${s.id}`} className="list-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 42, textAlign: 'center' }}>
                    <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="serif num" style={{ fontSize: 22, lineHeight: 1.1 }}>{d.getDate()}</div>
                  </div>
                  <div className="grow">
                    <div className="truncate" style={{ fontWeight: 500 }}>{s.routineName}</div>
                    <div className="small muted num">
                      {formatClock(s.durationSec)} · {formatNumber(unit === 'lb' ? kgToLb(s.volumeKg) : s.volumeKg)} {unit}
                      {!s.completed && ' · ended early'}
                    </div>
                  </div>
                  {s.prs.length > 0 && <Trophy {...ICON_SM} color="var(--warmup-ring)" aria-label={`${s.prs.length} personal best${s.prs.length === 1 ? '' : 's'}`} />}
                  <ChevronRight {...ICON_SM} color="var(--taupe)" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
