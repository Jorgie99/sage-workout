import { useState } from 'react';
import { BookOpen, Check, ExternalLink, Sparkles, X } from 'lucide-react';
import type { AiSuggestion } from '../lib/ai';
import { CHART_MUSCLES, WEEKLY_SETS_HIGH, WEEKLY_SETS_LOW, WEEKLY_SETS_TARGET, type Suggestion, type WeekTally } from '../lib/coach';
import { MUSCLE_LABEL } from '../lib/exercises';
import { getSources } from '../lib/research';
import { ICON_SM, Sheet } from './ui';

export function LearnMore({ title, intro, sources, onClose }: { title: string; intro?: string; sources: string[]; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      {intro && <p className="muted">{intro}</p>}
      <div>
        {getSources(sources).map((s) => (
          <div className="source" key={s.id}>
            <div style={{ fontWeight: 500 }}>{s.label}</div>
            <p className="small" style={{ marginTop: 4 }}>{s.finding}</p>
            <p className="cite">{s.cite}</p>
            {s.url && (
              <a className="link" href={s.url} target="_blank" rel="noreferrer">
                Open source <ExternalLink size={14} strokeWidth={1.5} />
              </a>
            )}
          </div>
        ))}
      </div>
      <p className="hint">The full reasoning behind every rule is in RESEARCH.md in the project.</p>
    </Sheet>
  );
}

export function LearnMoreLink({ title, intro, sources, label = 'Learn more' }: { title: string; intro?: string; sources: string[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="link" onClick={() => setOpen(true)}>
        <BookOpen size={16} strokeWidth={1.5} /> {label}
      </button>
      {open && <LearnMore title={title} intro={intro} sources={sources} onClose={() => setOpen(false)} />}
    </>
  );
}

export function CoachCard({ s, onFix, onDismiss }: { s: Suggestion; onFix: () => void; onDismiss: () => void }) {
  return (
    <article className="card coach-card">
      <button className="icon-btn dismiss" onClick={onDismiss} aria-label={`Dismiss: ${s.what}`}>
        <X {...ICON_SM} />
      </button>
      <p className="what">{s.what}</p>
      <p className="why">{s.why}</p>
      <div className="actions">
        {s.fix && (
          <button className="btn soft sm" onClick={onFix}>
            <Check {...ICON_SM} /> {s.fix.label}
          </button>
        )}
        <LearnMoreLink title="Why this matters" intro={s.why} sources={s.sources} />
      </div>
    </article>
  );
}

export function AiCard({ s }: { s: AiSuggestion }) {
  return (
    <article className="card coach-card">
      <span className="ai-tag"><Sparkles size={14} strokeWidth={1.5} /> Claude</span>
      <p className="what" style={{ paddingRight: 0 }}>{s.what}</p>
      <p className="why">{s.why}</p>
      <p className="small" style={{ color: 'var(--sage-ink)', fontWeight: 500 }}>{s.fix}</p>
    </article>
  );
}

const SCALE_MAX = 24;

/** Weekly hard sets per muscle group against the researched range. */
export function WeeklySetsChart({ week }: { week: WeekTally }) {
  const pct = (n: number) => `${Math.min(100, (n / SCALE_MAX) * 100)}%`;
  return (
    <div className="sets-chart">
      {CHART_MUSCLES.map((m) => {
        const n = week.muscleSets[m];
        const tone = n > WEEKLY_SETS_HIGH ? 'high' : n < WEEKLY_SETS_LOW ? 'low' : '';
        return (
          <div className="sets-row" key={m}>
            <span>{MUSCLE_LABEL[m]}</span>
            <div className="track" role="img" aria-label={`${MUSCLE_LABEL[m]}: ${n} sets a week`}>
              <div className="zone" style={{ left: pct(WEEKLY_SETS_TARGET), width: pct(WEEKLY_SETS_HIGH - WEEKLY_SETS_TARGET) }} />
              <div className={`fill ${tone}`} style={{ width: pct(n) }} />
            </div>
            <span className="n">{Number.isInteger(n) ? n : n.toFixed(1)}</span>
          </div>
        );
      })}
      <p className="hint">
        Sets per week, counting half a set for muscles an exercise works indirectly. The shaded band is the well-supported {WEEKLY_SETS_TARGET}–{WEEKLY_SETS_HIGH} range; {WEEKLY_SETS_LOW}+ still builds muscle.
      </p>
    </div>
  );
}
