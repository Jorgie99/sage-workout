import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, GripVertical, NotebookPen, Plus, RefreshCw, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { AiCard, CoachCard, LearnMoreLink, WeeklySetsChart } from '../components/Coach';
import { ExercisePicker } from '../components/ExercisePicker';
import { SwipeRow } from '../components/SwipeRow';
import { ICON, ICON_SM, NumField, Segmented, Sheet, SplitBar, Stepper, Switch, useToast } from '../components/ui';
import { AiReviewError, requestReview, type AiSuggestion } from '../lib/ai';
import { analyze, applyFix, newItem, weekTally, type Suggestion } from '../lib/coach';
import { db, touchRecentExercise } from '../lib/db';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '../lib/exercises';
import {
  cooldownIdsFor, cooldownSteps, getStretch, getWarmupMove, stretchAlternatives, warmupAlternatives, warmupIdsFor,
  warmupSteps, STRETCH_HOLD_SEC, STRETCH_SIDE_SEC,
} from '../lib/prep';
import { estimateRoutine, rampUpItemIndex, startingWeightKg } from '../lib/timing';
import { MAX_ROUTINES, type Exercise, type Routine, type RoutineItem, type RoutineSet } from '../lib/types';
import { formatClock, formatMinutes, fromDisplayWeight, toDisplayWeight, uid } from '../lib/units';
import { blankRoutine, useData } from '../state';

type Tab = 'build' | 'prep' | 'coach';
interface Arrival {
  tab?: Tab;
  message?: string;
}

export default function RoutineEditor() {
  const { id } = useParams();
  const data = useData();
  const isNew = id === 'new';
  const existing = data.routines.find((r) => r.id === id);
  if (!isNew && !existing) return <Navigate to="/" replace />;
  if (isNew && data.routines.length >= MAX_ROUTINES) return <Navigate to="/" replace />;
  return <Editor key={id} initial={existing ?? blankRoutine(data.routines.length)} isNew={isNew} />;
}

function Editor({ initial, isNew }: { initial: Routine; isNew: boolean }) {
  const nav = useNavigate();
  const { routines, exercises, timing, profile, settings } = useData();
  const [draft, setDraft] = useState<Routine>(() => structuredClone(initial));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(!isNew);
  const arrival = useLocation().state as Arrival | null;
  const [tab, setTab] = useState<Tab>(arrival?.tab ?? 'build');
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const toast = useToast();
  const unit = profile.weightUnit;

  const update = (fn: (r: Routine) => Routine) => {
    setDraft((r) => fn(r));
    setDirty(true);
  };
  const updateItem = (itemId: string, fn: (i: RoutineItem) => RoutineItem) =>
    update((r) => ({ ...r, items: r.items.map((i) => (i.id === itemId ? fn(i) : i)) }));

  const estimate = useMemo(() => estimateRoutine(draft, timing), [draft, timing]);
  const allRoutines = useMemo(() => [...routines.filter((r) => r.id !== draft.id), draft], [routines, draft]);
  const suggestions = useMemo(
    () => analyze({ routine: draft, allRoutines, exercises, estimateSec: estimate.total }),
    [draft, allRoutines, exercises, estimate.total],
  );
  const week = useMemo(() => weekTally(allRoutines, exercises), [allRoutines, exercises]);

  const save = async (thenLeave = false) => {
    const toSave: Routine = { ...draft, name: draft.name.trim() || 'Untitled routine', updatedAt: Date.now() };
    await db.routines.put(toSave);
    setDraft(toSave);
    setDirty(false);
    setSaved(true);
    if (thenLeave) return nav('/');
    // Saving is when the coach speaks up.
    const n = suggestions.length;
    const message = n > 0 ? `Saved · ${n} suggestion${n === 1 ? '' : 's'} from your coach` : 'Saved';
    const nextTab: Tab = n > 0 ? 'coach' : tab;
    if (isNew) {
      // The URL changes from /routine/new to the real id, which remounts this
      // screen — carry the tab and the message across.
      return nav(`/routine/${toSave.id}`, { replace: true, state: { tab: nextTab, message } satisfies Arrival });
    }
    setTab(nextTab);
    if (n > 0) window.scrollTo({ top: 0 });
    toast.show(message);
  };

  useEffect(() => {
    if (arrival?.message) toast.show(arrival.message);
    // Only on arrival from a first save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async () => {
    await db.routines.delete(draft.id);
    nav('/');
  };

  const addExercises = (ids: string[]) => {
    update((r) => ({ ...r, items: [...r.items, ...ids.map((x) => exercises[x]).filter(Boolean).map((e) => newItem(e))] }));
    ids.forEach((x) => void touchRecentExercise(x));
    setPicking(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    update((r) => {
      const from = r.items.findIndex((i) => i.id === e.active.id);
      const to = r.items.findIndex((i) => i.id === e.over!.id);
      return from < 0 || to < 0 ? r : { ...r, items: arrayMove(r.items, from, to) };
    });
  };

  return (
    <div className="screen no-tabs">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back to routines" onClick={() => (dirty ? setConfirm('leave') : nav('/'))}>
          <ChevronLeft {...ICON} />
        </button>
        <span className="topbar-title">{isNew && !saved ? 'New routine' : 'Edit routine'}</span>
        <span style={{ width: 48 }} />
      </div>

      <input
        className="title-input"
        value={draft.name}
        placeholder="Routine name"
        aria-label="Routine name"
        maxLength={40}
        onChange={(e) => update((r) => ({ ...r, name: e.target.value }))}
      />

      <Segmented<Tab>
        label="Routine sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'build', label: 'Exercises' },
          { value: 'prep', label: 'Warm & cool' },
          { value: 'coach', label: <>Coach {suggestions.length > 0 && <span className="badge">{suggestions.length}</span>}</> },
        ]}
      />

      {tab === 'build' && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={draft.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="stack">
                {draft.items.map((item) => (
                  <ExerciseCard
                    key={item.id}
                    item={item}
                    exercise={exercises[item.exerciseId]}
                    unit={unit}
                    suggestedKg={exercises[item.exerciseId] ? startingWeightKg(exercises[item.exerciseId], profile) : null}
                    onChange={(fn) => updateItem(item.id, fn)}
                    onRemove={() => update((r) => ({ ...r, items: r.items.filter((i) => i.id !== item.id) }))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {draft.items.length === 0 && (
            <div className="empty">
              <h3>Start with a few big lifts</h3>
              <p className="small">A squat, a hinge, a push and a pull cover most of your body. The coach will help with the rest.</p>
            </div>
          )}

          <button className="btn soft block" onClick={() => setPicking(true)}>
            <Plus {...ICON_SM} /> Add exercise
          </button>

          <div className="card tight row between">
            <div>
              <div className="label">Times per week</div>
              <div className="hint">Used to count your weekly sets per muscle.</div>
            </div>
            <Stepper label="times per week" value={draft.timesPerWeek} min={1} max={7} onChange={(v) => update((r) => ({ ...r, timesPerWeek: v }))} />
          </div>

          {saved && (
            <button className="btn quiet danger" onClick={() => setConfirm('delete')}>
              <Trash2 {...ICON_SM} /> Delete routine
            </button>
          )}
        </>
      )}

      {tab === 'prep' && <PrepTab draft={draft} update={update} />}

      {tab === 'coach' && (
        <CoachTab
          draft={draft}
          allRoutines={allRoutines}
          suggestions={suggestions}
          week={week}
          onFix={(s) => {
            if (!s.fix) return;
            update((r) => applyFix(r, s.fix!, exercises));
            toast.show('Done — save to keep it');
          }}
          onDismiss={(s) => update((r) => ({ ...r, dismissed: [...r.dismissed, s.id] }))}
          onRestore={() => update((r) => ({ ...r, dismissed: [] }))}
          hasKey={settings.apiKey.trim() !== ''}
        />
      )}

      {draft.items.length > 0 && tab !== 'coach' && (
        <div className="card tight stack">
          <div className="eyebrow">Estimated time</div>
          <SplitBar breakdown={estimate} />
        </div>
      )}

      <div style={{ flex: 1 }} />
      <div className="est-bar">
        <div>
          <div className="big num">{draft.items.length ? formatMinutes(estimate.total) : '—'}</div>
          <div className="tiny">estimated · {draft.items.length} exercise{draft.items.length === 1 ? '' : 's'}</div>
        </div>
        <button className="btn" onClick={() => save()} disabled={!dirty && saved}>
          {!dirty && saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {picking && <ExercisePicker onClose={() => setPicking(false)} onAdd={addExercises} exclude={draft.items.map((i) => i.exerciseId)} />}

      {confirm === 'leave' && (
        <Sheet title="Save your changes?" onClose={() => setConfirm(null)}>
          <button className="btn primary block" onClick={() => save(true)}>Save and close</button>
          <button className="btn secondary block" onClick={() => nav('/')}>Discard changes</button>
          <button className="btn quiet block" onClick={() => setConfirm(null)}>Keep editing</button>
        </Sheet>
      )}
      {confirm === 'delete' && (
        <Sheet title="Delete this routine?" onClose={() => setConfirm(null)}>
          <p className="muted">Your past sessions stay in History. This can’t be undone.</p>
          <button className="btn block" style={{ background: 'var(--danger)', color: '#fff' }} onClick={remove}>Delete routine</button>
          <button className="btn quiet block" onClick={() => setConfirm(null)}>Keep it</button>
        </Sheet>
      )}
      {toast.node}
    </div>
  );
}

// ── Exercise card ─────────────────────────────────────────────────────────

function ExerciseCard({
  item, exercise, unit, suggestedKg, onChange, onRemove,
}: {
  item: RoutineItem; exercise: Exercise | undefined; unit: 'lb' | 'kg'; suggestedKg: number | null;
  onChange: (fn: (i: RoutineItem) => RoutineItem) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [noteOpen, setNoteOpen] = useState(item.note !== '');

  if (!exercise) {
    return (
      <div className="ex-card" ref={setNodeRef}>
        <div className="ex-head" style={{ paddingLeft: 18 }}>
          <span className="grow muted">This exercise was removed.</span>
          <button className="icon-btn" onClick={onRemove} aria-label="Remove"><Trash2 {...ICON_SM} /></button>
        </div>
      </div>
    );
  }

  const setSet = (setId: string, patch: Partial<RoutineSet>) =>
    onChange((i) => ({ ...i, sets: i.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));
  const addSet = () =>
    onChange((i) => {
      const last = i.sets[i.sets.length - 1];
      return { ...i, sets: [...i.sets, { id: uid('st'), weightKg: last?.weightKg ?? null, reps: last?.reps ?? 10 }] };
    });
  const removeSet = (setId: string) => onChange((i) => (i.sets.length > 1 ? { ...i, sets: i.sets.filter((s) => s.id !== setId) } : i));

  const noLoad = exercise.equipment === 'bodyweight' || exercise.equipment === 'band';
  const placeholder = suggestedKg != null ? String(toDisplayWeight(suggestedKg, unit)) : noLoad ? (exercise.equipment === 'band' ? 'band' : 'BW') : '—';
  const usesSuggestion = suggestedKg != null && item.sets.some((s) => s.weightKg == null);
  const repsHead = exercise.timed ? 'Seconds' : exercise.unilateral ? 'Reps / side' : 'Reps';

  return (
    <div
      ref={setNodeRef}
      className={`ex-card${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition, position: 'relative', zIndex: isDragging ? 2 : undefined }}
    >
      <div className="ex-head">
        <button className="handle" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Drag to reorder ${exercise.name}`}>
          <GripVertical {...ICON_SM} />
        </button>
        <div className="grow">
          <div className="name">{exercise.name}</div>
          <div className="tiny muted truncate">{exercise.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} · {EQUIPMENT_LABEL[exercise.equipment]}</div>
        </div>
        <button className="icon-btn" onClick={() => setNoteOpen((o) => !o)} aria-label="Add a note" aria-expanded={noteOpen}>
          <NotebookPen {...ICON_SM} />
        </button>
        <button className="icon-btn" onClick={onRemove} aria-label={`Remove ${exercise.name}`}>
          <Trash2 {...ICON_SM} />
        </button>
      </div>

      {noteOpen && (
        <div className="ex-note">
          <input className="input" value={item.note} placeholder="Note — e.g. seat height 4" aria-label={`Note for ${exercise.name}`} maxLength={120} onChange={(e) => onChange((i) => ({ ...i, note: e.target.value }))} />
        </div>
      )}

      <div className="set-grid set-head">
        <span className="center">Set</span>
        <span>{noLoad ? `+ ${unit}` : unit}</span>
        <span>{repsHead}</span>
      </div>
      {item.sets.map((set, idx) => (
        <SwipeRow key={set.id} onDelete={() => removeSet(set.id)} disabled={item.sets.length <= 1}>
          <div className="set-grid">
            <span className="set-num">{idx + 1}</span>
            <NumField
              className="set-input"
              ariaLabel={`Set ${idx + 1} weight in ${unit}`}
              placeholder={placeholder}
              value={set.weightKg == null ? null : toDisplayWeight(set.weightKg, unit)}
              onChange={(v) => setSet(set.id, { weightKg: v == null ? null : fromDisplayWeight(v, unit) })}
            />
            <NumField
              className="set-input"
              ariaLabel={`Set ${idx + 1} ${exercise.timed ? 'seconds' : 'reps'}`}
              decimal={false}
              max={600}
              value={set.reps}
              onChange={(v) => setSet(set.id, { reps: v == null ? 0 : Math.round(v) })}
            />
          </div>
        </SwipeRow>
      ))}
      {usesSuggestion && (
        <p className="hint" style={{ padding: '6px 18px 0' }}>
          {placeholder} {unit} is a cautious suggested start based on your body weight. Leave it blank to use it, or type your own.
        </p>
      )}
      <button className="add-set" onClick={addSet}>
        <Plus {...ICON_SM} /> Add set
      </button>
    </div>
  );
}

// ── Warm-up & cooldown ────────────────────────────────────────────────────

function PrepTab({ draft, update }: { draft: Routine; update: (fn: (r: Routine) => Routine) => void }) {
  const { exercises, timing } = useData();
  const [sheet, setSheet] = useState<{ kind: 'warmup' | 'cooldown'; index: number | null } | null>(null);

  const warmIds = warmupIdsFor(draft, exercises);
  const coolIds = cooldownIdsFor(draft, exercises);
  const warmTotal = warmupSteps(warmIds).reduce((s, x) => s + x.sec, 0);
  const coolTotal = cooldownSteps(coolIds).reduce((s, x) => s + x.sec, 0);
  const rampIndex = rampUpItemIndex(draft, timing);
  const rampName = rampIndex >= 0 ? exercises[draft.items[rampIndex].exerciseId]?.name : null;

  const setWarm = (ids: string[]) => update((r) => ({ ...r, warmupIds: ids }));
  const setCool = (ids: string[]) => update((r) => ({ ...r, cooldownIds: ids }));

  const choose = (id: string) => {
    if (!sheet) return;
    const list = sheet.kind === 'warmup' ? warmIds.slice() : coolIds.slice();
    if (sheet.index == null) list.push(id);
    else list[sheet.index] = id;
    (sheet.kind === 'warmup' ? setWarm : setCool)(list);
    setSheet(null);
  };

  const alternatives =
    sheet?.kind === 'warmup'
      ? warmupAlternatives(warmIds, draft, exercises).map((m) => ({ id: m.id, name: m.name, area: m.area, cue: m.cue, sec: `${m.sec} s` }))
      : sheet?.kind === 'cooldown'
        ? stretchAlternatives(coolIds, draft, exercises).map((s) => ({
            id: s.id, name: s.name, area: s.area, cue: s.cue,
            sec: s.perSide ? `${STRETCH_SIDE_SEC} s each side` : `${STRETCH_HOLD_SEC} s`,
          }))
        : [];

  return (
    <>
      <section className="stack">
        <div className="row between">
          <div>
            <h3>Warm-up</h3>
            <p className="tiny muted num">{formatClock(warmTotal)} · dynamic moves for what this routine uses</p>
          </div>
          {draft.warmupIds && (
            <button className="btn quiet sm" onClick={() => update((r) => ({ ...r, warmupIds: null }))}>
              <RotateCcw {...ICON_SM} /> Reset
            </button>
          )}
        </div>
        <div className="card flush">
          {warmIds.map((id, i) => {
            const m = getWarmupMove(id);
            if (!m) return null;
            return (
              <PrepRow key={`${id}-${i}`} name={m.name} area={m.area} cue={m.cue} sec={`${m.sec} s`}
                onSwap={() => setSheet({ kind: 'warmup', index: i })}
                onRemove={() => setWarm(warmIds.filter((_, k) => k !== i))} />
            );
          })}
          {warmIds.length === 0 && <p className="muted small" style={{ padding: 18 }}>No warm-up. Your first sets will do the warming up.</p>}
        </div>
        <div className="row between">
          <button className="btn quiet sm" onClick={() => setSheet({ kind: 'warmup', index: null })}><Plus {...ICON_SM} /> Add a move</button>
          <LearnMoreLink title="Why a short dynamic warm-up" sources={['fradkin2010', 'mcgowan2015', 'behm2016', 'iversen2021']}
            intro="A few minutes of movement raises muscle temperature and rehearses the patterns you’re about to load. Static holds are saved for the end." />
        </div>
      </section>

      <div className="card tight row between">
        <div className="grow">
          <div className="label">Ramp-up set</div>
          <div className="hint">
            {rampName
              ? `One lighter set of ${rampName} before the working sets — about half the weight, 8 easy reps.`
              : 'One lighter set before your first loaded compound lift. Add one to use this.'}
          </div>
        </div>
        <Switch label="Ramp-up set" checked={draft.rampUp} onChange={(v) => update((r) => ({ ...r, rampUp: v }))} />
      </div>

      <section className="stack">
        <div className="row between">
          <div>
            <h3>Cooldown</h3>
            <p className="tiny muted num">{formatClock(coolTotal)} · static stretches for the muscles worked</p>
          </div>
          {draft.cooldownIds && (
            <button className="btn quiet sm" onClick={() => update((r) => ({ ...r, cooldownIds: null }))}>
              <RotateCcw {...ICON_SM} /> Reset
            </button>
          )}
        </div>
        <div className="card flush">
          {coolIds.map((id, i) => {
            const s = getStretch(id);
            if (!s) return null;
            return (
              <PrepRow key={`${id}-${i}`} name={s.name} area={s.area} cue={s.cue}
                sec={s.perSide ? `${STRETCH_SIDE_SEC} s left, ${STRETCH_SIDE_SEC} s right` : `${STRETCH_HOLD_SEC} s`}
                onSwap={() => setSheet({ kind: 'cooldown', index: i })}
                onRemove={() => setCool(coolIds.filter((_, k) => k !== i))} />
            );
          })}
          {coolIds.length === 0 && <p className="muted small" style={{ padding: 18 }}>No cooldown stretches.</p>}
        </div>
        <div className="row between">
          <button className="btn quiet sm" onClick={() => setSheet({ kind: 'cooldown', index: null })}><Plus {...ICON_SM} /> Add a stretch</button>
          <LearnMoreLink title="What cooldown stretching does" sources={['garber2011', 'bandy1994', 'afonso2021']}
            intro="Holding a stretch for up to 30 seconds while you’re warm builds flexibility. It’s a calm way to finish — but it doesn’t prevent soreness, so skip it whenever you like." />
        </div>
      </section>

      {sheet && (
        <Sheet title={sheet.index == null ? (sheet.kind === 'warmup' ? 'Add a warm-up move' : 'Add a stretch') : 'Swap for…'} onClose={() => setSheet(null)}>
          <div>
            {alternatives.map((a) => (
              <button key={a.id} className="pick-row" onClick={() => choose(a.id)}>
                <span className="grow">
                  <span style={{ display: 'block', fontWeight: 500 }}>{a.name}</span>
                  <span className="tiny muted">{a.area} · {a.sec}</span>
                  <span className="tiny muted" style={{ display: 'block', marginTop: 2 }}>{a.cue}</span>
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function PrepRow({ name, area, cue, sec, onSwap, onRemove }: { name: string; area: string; cue: string; sec: string; onSwap: () => void; onRemove: () => void }) {
  return (
    <div className="prep-row">
      <div className="grow">
        <div style={{ fontWeight: 500 }}>{name}</div>
        <div className="sec">{area} · {sec}</div>
        <div className="tiny muted" style={{ marginTop: 3 }}>{cue}</div>
      </div>
      <button className="icon-btn" onClick={onSwap} aria-label={`Swap ${name}`}><RefreshCw {...ICON_SM} /></button>
      <button className="icon-btn" onClick={onRemove} aria-label={`Remove ${name}`}><X {...ICON_SM} /></button>
    </div>
  );
}

// ── Coach ─────────────────────────────────────────────────────────────────

function CoachTab({
  draft, allRoutines, suggestions, week, onFix, onDismiss, onRestore, hasKey,
}: {
  draft: Routine; allRoutines: Routine[]; suggestions: Suggestion[]; week: ReturnType<typeof weekTally>;
  onFix: (s: Suggestion) => void; onDismiss: (s: Suggestion) => void; onRestore: () => void; hasKey: boolean;
}) {
  const { exercises, profile, settings, timing } = useData();
  const [ai, setAi] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; items: AiSuggestion[]; error?: string }>({ status: 'idle', items: [] });

  const ask = async () => {
    setAi({ status: 'loading', items: [] });
    try {
      const ruleFindings = Object.fromEntries(
        allRoutines.map((r) => [r.id, analyze({ routine: { ...r, dismissed: [] }, allRoutines, exercises, estimateSec: estimateRoutine(r, timing).total })]),
      );
      const items = await requestReview({ apiKey: settings.apiKey.trim(), model: settings.model.trim(), routines: allRoutines, profile, exercises, ruleFindings });
      setAi({ status: 'done', items });
    } catch (err) {
      setAi({ status: 'error', items: [], error: err instanceof AiReviewError ? err.message : 'Something went wrong. Please try again.' });
    }
  };

  if (draft.items.length === 0) {
    return (
      <div className="empty">
        <h3>Nothing to review yet</h3>
        <p className="small">Add a few exercises and your coach will check the balance of your week.</p>
      </div>
    );
  }

  return (
    <>
      <p className="muted small">
        {allRoutines.length > 1 ? `Looking at this routine and your ${allRoutines.length} routines together.` : 'Looking at this routine as your whole week.'}
      </p>

      {suggestions.length === 0 ? (
        <div className="card coach-card">
          <p className="what" style={{ paddingRight: 0 }}>This looks well balanced.</p>
          <p className="why">Every movement pattern is covered, the order makes sense, and your weekly sets are in a good place. Nothing to fix.</p>
        </div>
      ) : (
        suggestions.map((s) => <CoachCard key={s.id} s={s} onFix={() => onFix(s)} onDismiss={() => onDismiss(s)} />)
      )}

      {draft.dismissed.length > 0 && (
        <button className="btn quiet sm" onClick={onRestore}>
          <RotateCcw {...ICON_SM} /> Show {draft.dismissed.length} dismissed suggestion{draft.dismissed.length === 1 ? '' : 's'}
        </button>
      )}

      <div className="card stack">
        <div className="row between">
          <h3>Weekly sets</h3>
          <LearnMoreLink title="How many sets per week" sources={['acsm2026', 'schoenfeld2017volume', 'iversen2021', 'pelland2026']}
            intro="More weekly sets per muscle builds more muscle, up to a point. Four is a useful minimum, ten or more is well supported, and past about twenty the returns fade." />
        </div>
        <WeeklySetsChart week={week} />
      </div>

      {hasKey && (
        <div className="stack">
          <button className="btn secondary block" onClick={ask} disabled={ai.status === 'loading'}>
            <Sparkles {...ICON_SM} /> {ai.status === 'loading' ? 'Asking Claude…' : ai.status === 'done' ? 'Ask Claude again' : 'Ask Claude for a review'}
          </button>
          {ai.status === 'idle' && <p className="hint center">Sends your routines, profile and the checks above to Anthropic using your key.</p>}
          {ai.status === 'error' && <div className="note warn"><span>{ai.error}</span></div>}
          {ai.items.map((s, i) => <AiCard key={i} s={s} />)}
          {ai.status === 'done' && ai.items.length === 0 && <p className="muted small center">Claude had nothing to add.</p>}
        </div>
      )}
    </>
  );
}
