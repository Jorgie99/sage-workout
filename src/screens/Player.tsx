import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Pause, Pencil, Play, SkipForward } from 'lucide-react';
import { ICON_SM, Sheet, Stepper } from '../components/ui';
import { useNow, useWakeLock } from '../hooks';
import { clearActiveWorkout, db, saveActiveWorkout, saveSettings } from '../lib/db';
import { buildSession, learnFromWorkout, prefillRoutine } from '../lib/learning';
import {
  adjust, advance, editLog, endEarly, isPaused, pause, phaseDurationMs, phaseElapsedMs, phaseRemainingMs,
  remainingEstimateSec, resume, sessionElapsedMs, skip, tick, type PlayerState,
} from '../lib/player';
import { describeSet } from '../lib/timing';
import type { Phase } from '../lib/types';
import { formatClock, formatMinutes, fromDisplayWeight, toDisplayWeight } from '../lib/units';
import { useData } from '../state';

/** "SET 2 OF 4" → "Set 2 of 4" */
const sentenceCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const R = 138;
const CIRC = 2 * Math.PI * R;

export default function Player({ initial }: { initial: PlayerState }) {
  const nav = useNavigate();
  const data = useData();
  const { exercises, profile } = data;
  const unit = profile.weightUnit;

  const [state, setState] = useState<PlayerState>(() => tick(initial, Date.now()));
  const [ending, setEnding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const finalised = useRef(false);

  // The clock. `tick` is pure and returns the same object when nothing changed.
  const onWake = useCallback((t: number) => setState((s) => tick(s, t)), []);
  const now = useNow(200, onWake);
  const wakeLockSupported = useWakeLock(state.finishedAt == null);

  // Persist on every real change so the workout survives the app being closed.
  useEffect(() => {
    if (state.finishedAt == null) void saveActiveWorkout(state);
  }, [state]);

  // Finished: save the session, learn from it, pre-fill the routine.
  useEffect(() => {
    if (state.finishedAt == null || finalised.current) return;
    finalised.current = true;
    void (async () => {
      const completedSets = state.logs.filter((l) => !l.skipped).length;
      if (completedSets === 0) {
        await clearActiveWorkout();
        nav('/workout', { replace: true });
        return;
      }
      const at = state.finishedAt!;
      const session = buildSession(state, exercises, data.stats, profile, at);
      const learned = learnFromWorkout(state, exercises, data.stats, profile, data.settings.transitionFactor, at);
      const routine = data.routines.find((r) => r.id === state.routineId);
      await db.transaction('rw', [db.sessions, db.exerciseStats, db.routines, db.kv], async () => {
        await db.sessions.put(session);
        await db.exerciseStats.bulkPut(Object.values(learned.stats));
        if (routine) await db.routines.put(prefillRoutine(routine, session));
        await saveSettings({ ...data.settings, transitionFactor: learned.transitionFactor });
        await clearActiveWorkout();
      });
      nav(`/summary/${session.id}`, { replace: true });
    })();
  }, [state, data, exercises, profile, nav]);

  const act = (fn: (s: PlayerState, t: number) => PlayerState) => setState((s) => fn(tick(s, Date.now()), Date.now()));

  const phase = state.plan[state.index] as Phase | undefined;
  if (!phase) return <div className="player" data-phase="cooldown" />;

  const paused = isPaused(state);
  const next = state.plan[state.index + 1] as Phase | undefined;
  const remainingMs = phaseRemainingMs(state, now);
  const durationMs = phaseDurationMs(state);
  const over = remainingMs <= 0;
  const waits = phase.kind === 'rest' || phase.kind === 'transition';
  // Rest has run out and we're waiting for a tap: wash into the next phase and show it.
  const ready = over && waits;
  const shown = ready && next ? next : phase;
  const after = ready && next ? state.plan[state.index + 2] : next;

  const urgent = !over && remainingMs <= 5000 && !paused;
  const overSec = Math.floor(-remainingMs / 1000);
  const digits = over ? formatClock(overSec) : formatClock(Math.ceil(remainingMs / 1000));
  const frac = over || durationMs === 0 ? 0 : Math.min(1, remainingMs / durationMs);

  const caption = paused
    ? 'Paused'
    : ready
      ? 'extra rest · start when you’re ready'
      : over && phase.kind === 'set'
        ? 'past the estimate · no rush'
        : phase.kind === 'set'
          ? 'estimated'
          : '';

  const detail = (p: Phase) =>
    p.kind === 'set' ? describeSet(p.exerciseId ? exercises[p.exerciseId] : undefined, p.reps ?? 0, p.weightKg, unit) : p.detail ?? '';

  const lastLogIndex = state.logs.length - 1;
  const lastLog = state.logs[lastLogIndex];
  const showLogged = waits && lastLog && !lastLog.skipped && lastLog.phaseIndex === state.index - 1;

  const mainLabel = paused
    ? 'Resume'
    : phase.kind === 'set'
      ? 'Done'
      : phase.kind === 'warmup' || phase.kind === 'cooldown'
        ? next ? 'Next' : 'Finish'
        : next?.kind === 'cooldown'
          ? 'Start cooldown'
          : next?.kind === 'set'
            ? 'Start set'
            : 'Finish';

  const elapsedSec = sessionElapsedMs(state, now) / 1000;
  const leftSec = remainingEstimateSec(state, now);
  const completedSets = state.logs.filter((l) => !l.skipped).length;

  return (
    <div className="player" data-phase={shown.kind} aria-live="off">
      <div className="wash" key={`${state.index}-${ready ? 'r' : 'c'}`} />
      {paused && <div className="paused-veil" />}

      <div>
        <div className="progress" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={state.plan.length} aria-valuenow={state.index}>
          {state.plan.map((p, i) => {
            const fill = i < state.index ? 1 : i === state.index ? Math.min(1, phaseElapsedMs(state, now) / Math.max(1, durationMs)) : 0;
            return (
              <i key={p.id} style={{ flexGrow: Math.max(8, p.estSec), flexBasis: 0, ['--seg' as string]: `var(--${p.kind}-ring)` }}>
                <b style={{ width: `${fill * 100}%` }} />
              </i>
            );
          })}
        </div>
        <div className="progress-meta">
          <span>{formatClock(elapsedSec)} elapsed</span>
          <button className="btn quiet" onClick={() => setEnding(true)}>End workout</button>
          <span>{leftSec > 45 ? `about ${formatMinutes(leftSec)} left` : 'nearly done'}</span>
        </div>
      </div>

      <div className="phase-label" aria-live="polite">
        <div className="phase-title">{shown.title}</div>
        <div className="phase-name">{shown.name}</div>
        {detail(shown) && <div className="phase-detail">{detail(shown)}</div>}
      </div>

      <div className="ring-wrap">
        <div className={`ring${urgent ? ' urgent' : ''}${over ? ' over' : ''}`}>
          <svg viewBox="0 0 300 300" aria-hidden="true">
            <circle className="track" cx="150" cy="150" r={R} />
            <circle className="arc" cx="150" cy="150" r={R} strokeDasharray={CIRC} strokeDashoffset={-CIRC * (1 - frac)}
              style={{ transition: 'stroke-dashoffset 240ms linear, stroke-width 300ms, stroke 700ms' }} />
          </svg>
          <div className="ring-center" role="timer" aria-label={over ? `${digits} over` : `${digits} remaining`}>
            <div className="digits">
              {over && <span className="plus">+</span>}
              {digits.split('').map((ch, i) => <span key={i} className={ch === ':' ? 'sep' : ''}>{ch}</span>)}
            </div>
            <div className="ring-caption">{caption}</div>
          </div>
        </div>
      </div>

      <div className="cue">{shown.cue}</div>

      {showLogged && (
        <div className="logged">
          <button onClick={() => setEditing(lastLogIndex)}>
            <Check size={15} strokeWidth={2} />
            Logged {describeSet(exercises[lastLog.exerciseId], lastLog.reps, lastLog.weightKg, unit)}
            <Pencil size={14} strokeWidth={1.5} />
            <span className="muted">Edit</span>
          </button>
        </div>
      )}

      <div className="upnext" style={{ ['--next' as string]: after ? `var(--${after.kind}-ring)` : 'var(--taupe)' }}>
        <span className="dot" />
        <div className="grow">
          <div className="eyebrow" style={{ fontSize: 11 }}>Up next</div>
          {after ? (
            <div className="clamp2">
              <span style={{ fontWeight: 500 }}>
                {after.kind === 'rest' ? 'Rest' : after.kind === 'set' && after.name === shown.name ? sentenceCase(after.title) : after.name}
              </span>
              <span className="muted"> · {after.kind === 'set' ? detail(after) : after.kind === 'rest' ? after.name : after.detail}</span>
            </div>
          ) : (
            <div style={{ fontWeight: 500 }}>That’s the last one</div>
          )}
        </div>
        {after && <span className="small muted num">{formatClock(after.estSec)}</span>}
      </div>

      <div className="controls">
        <button className="ctl" onClick={() => act(paused ? resume : pause)} aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? <Play {...ICON_SM} /> : <Pause {...ICON_SM} />}
        </button>
        <button className="ctl" disabled={phase.kind === 'set' || over} onClick={() => act((s, t) => adjust(s, -15, t))} aria-label="15 seconds less">−15 s</button>
        <button className="ctl" disabled={phase.kind === 'set'} onClick={() => act((s, t) => adjust(s, 15, t))} aria-label="15 seconds more">+15 s</button>
        <button className="ctl" onClick={() => act(skip)} aria-label={phase.kind === 'set' ? 'Skip this set' : 'Skip'}>
          <SkipForward {...ICON_SM} /> Skip
        </button>
      </div>

      <button className="main-btn" onClick={() => act(paused ? resume : advance)}>
        {mainLabel}
      </button>

      {!wakeLockSupported && <p className="tiny muted center" style={{ marginTop: 6 }}>Your screen may dim — screen wake lock isn’t available on this device.</p>}

      {editing != null && state.logs[editing] && (
        <EditLogSheet
          title={exercises[state.logs[editing].exerciseId]?.name ?? 'Set'}
          timed={!!exercises[state.logs[editing].exerciseId]?.timed}
          reps={state.logs[editing].reps}
          weightKg={state.logs[editing].weightKg}
          unit={unit}
          onClose={() => setEditing(null)}
          onSave={(reps, weightKg) => {
            setState((s) => editLog(s, editing, reps, weightKg));
            setEditing(null);
          }}
        />
      )}

      {ending && (
        <Sheet title="End workout?" onClose={() => setEnding(false)}>
          <p className="muted">
            {completedSets > 0
              ? `You’ve done ${completedSets} set${completedSets === 1 ? '' : 's'} in ${formatClock(elapsedSec)}. Saving keeps them in your history.`
              : 'Nothing has been logged yet, so there’s nothing to save.'}
          </p>
          {completedSets > 0 && <button className="btn primary block" onClick={() => { setEnding(false); act(endEarly); }}>Save and finish</button>}
          <button
            className="btn secondary block"
            onClick={async () => {
              finalised.current = true;
              await clearActiveWorkout();
              nav('/workout', { replace: true });
            }}
          >
            Discard workout
          </button>
          <button className="btn quiet block" onClick={() => setEnding(false)}>Keep going</button>
        </Sheet>
      )}
    </div>
  );
}

function EditLogSheet({
  title, timed, reps, weightKg, unit, onClose, onSave,
}: {
  title: string; timed: boolean; reps: number; weightKg: number | null; unit: 'lb' | 'kg';
  onClose: () => void; onSave: (reps: number, weightKg: number | null) => void;
}) {
  const [r, setR] = useState(reps);
  const [w, setW] = useState(weightKg == null ? 0 : toDisplayWeight(weightKg, unit));
  const step = unit === 'lb' ? 5 : 2.5;
  return (
    <Sheet title={`What you did · ${title}`} onClose={onClose}
      footer={<button className="btn primary block" onClick={() => onSave(r, w > 0 ? fromDisplayWeight(w, unit) : null)}>Save</button>}>
      <div className="stack center" style={{ alignItems: 'center', gap: 6 }}>
        <span className="eyebrow">{timed ? 'Seconds' : 'Reps'}</span>
        <Stepper large label={timed ? 'seconds' : 'reps'} value={r} onChange={setR} min={0} max={600} step={timed ? 5 : 1} />
      </div>
      <div className="stack center" style={{ alignItems: 'center', gap: 6 }}>
        <span className="eyebrow">Weight · {unit}</span>
        <Stepper large label="weight" value={w} onChange={setW} min={0} max={2000} step={step} />
      </div>
      <p className="hint center">A new weight carries over to your remaining sets of this exercise.</p>
    </Sheet>
  );
}
