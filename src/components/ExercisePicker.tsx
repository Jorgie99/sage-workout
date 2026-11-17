import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Plus, Search } from 'lucide-react';
import { db } from '../lib/db';
import {
  customDefaults, EQUIPMENT_LABEL, EQUIPMENT_ORDER, MUSCLE_GROUPS, MUSCLE_LABEL, PATTERN_LABEL,
} from '../lib/exercises';
import type { Equipment, Exercise, Muscle, Pattern } from '../lib/types';
import { uid } from '../lib/units';
import { useData } from '../state';
import { ICON, ICON_SM, Sheet, Switch } from './ui';

const subtitle = (e: Exercise) => `${e.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} · ${EQUIPMENT_LABEL[e.equipment]}`;

/** Searchable bottom sheet: filter chips, recents on top, multi-select, custom exercises. */
export function ExercisePicker({ onClose, onAdd, exclude = [] }: { onClose: () => void; onAdd: (ids: string[]) => void; exclude?: string[] }) {
  const { exercises, recents } = useData();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const all = useMemo(() => Object.values(exercises).sort((a, b) => a.name.localeCompare(b.name)), [exercises]);
  const filtering = query.trim() !== '' || group != null || equipment != null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const muscles = MUSCLE_GROUPS.find((g) => g.id === group)?.muscles;
    return all.filter((e) => {
      if (equipment && e.equipment !== equipment) return false;
      if (muscles && !e.primary.some((m) => muscles.includes(m))) return false;
      if (!q) return true;
      const hay = `${e.name} ${e.primary.map((m) => MUSCLE_LABEL[m]).join(' ')} ${EQUIPMENT_LABEL[e.equipment]} ${PATTERN_LABEL[e.pattern]}`.toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });
  }, [all, query, group, equipment]);

  const recentList = useMemo(
    () => (filtering ? [] : recents.map((id) => exercises[id]).filter(Boolean).slice(0, 5)),
    [filtering, recents, exercises],
  );

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  if (creating) {
    return (
      <CustomExerciseForm
        initialName={query.trim()}
        onBack={() => setCreating(false)}
        onClose={onClose}
        onCreated={(id) => {
          setPicked((p) => [...p, id]);
          setQuery('');
          setCreating(false);
        }}
      />
    );
  }

  const row = (e: Exercise, keyPrefix = '') => {
    const on = picked.includes(e.id);
    const already = exclude.includes(e.id);
    return (
      <button key={keyPrefix + e.id} className={`pick-row${on ? ' on' : ''}`} onClick={() => toggle(e.id)} aria-pressed={on}>
        <span className="grow">
          <span style={{ display: 'block', fontWeight: 500 }}>{e.name}</span>
          <span className="tiny muted">
            {subtitle(e)}
            {e.custom ? ' · Custom' : ''}
            {already ? ' · In routine' : ''}
          </span>
        </span>
        <span className="pick-check">{on && <Check size={16} strokeWidth={2.5} />}</span>
      </button>
    );
  };

  return (
    <Sheet
      title="Add exercises"
      onClose={onClose}
      tall
      footer={
        <button className="btn primary block" disabled={picked.length === 0} onClick={() => onAdd(picked)}>
          {picked.length === 0 ? 'Select exercises' : `Add ${picked.length} exercise${picked.length === 1 ? '' : 's'}`}
        </button>
      }
    >
      <div className="search">
        <Search {...ICON_SM} />
        <input className="input" type="search" placeholder="Search exercises" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search exercises" autoComplete="off" />
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <div className="chip-scroll" role="group" aria-label="Filter by muscle group">
          {MUSCLE_GROUPS.map((g) => (
            <button key={g.id} className={`chip${group === g.id ? ' on' : ''}`} aria-pressed={group === g.id} onClick={() => setGroup(group === g.id ? null : g.id)}>
              {g.label}
            </button>
          ))}
        </div>
        <div className="chip-scroll" role="group" aria-label="Filter by equipment">
          {EQUIPMENT_ORDER.map((eq) => (
            <button key={eq} className={`chip${equipment === eq ? ' on' : ''}`} aria-pressed={equipment === eq} onClick={() => setEquipment(equipment === eq ? null : eq)}>
              {EQUIPMENT_LABEL[eq]}
            </button>
          ))}
        </div>
      </div>

      {recentList.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Recently used</div>
          {recentList.map((e) => row(e, 'recent-'))}
        </div>
      )}

      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>
          {filtering ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'All exercises'}
        </div>
        {results.map((e) => row(e))}
        {results.length === 0 && <p className="muted small" style={{ padding: '16px 0' }}>Nothing matches. You can add it as a custom exercise.</p>}
        <button className="pick-row" onClick={() => setCreating(true)} style={{ color: 'var(--sage-ink)', fontWeight: 500, borderBottom: 0 }}>
          <Plus {...ICON} />
          <span className="grow">Create a custom exercise{query.trim() ? ` “${query.trim()}”` : ''}</span>
        </button>
      </div>
    </Sheet>
  );
}

const ISO_PATTERNS: Pattern[] = ['gluteIso', 'coreAntiExt', 'coreAntiRot', 'coreFlex', 'armIso', 'upperIso', 'legIso', 'calves'];

function CustomExerciseForm({
  initialName, onBack, onClose, onCreated,
}: { initialName: string; onBack: () => void; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState(initialName);
  const [pattern, setPattern] = useState<Pattern>('hpush');
  const [equipment, setEquipment] = useState<Equipment>('dumbbell');
  const [primary, setPrimary] = useState<Muscle[]>([]);
  const [unilateral, setUnilateral] = useState(false);
  const valid = name.trim().length > 1 && primary.length > 0;

  const save = async () => {
    const compound = !ISO_PATTERNS.includes(pattern);
    const e: Exercise = {
      id: uid('custom'),
      name: name.trim(),
      pattern, equipment, primary, secondary: [], compound, unilateral,
      ...customDefaults(equipment, compound),
      cues: ['Move with control through a full, comfortable range.'],
      custom: true,
    };
    await db.customExercises.put(e);
    onCreated(e.id);
  };

  return (
    <Sheet
      title="Custom exercise"
      onClose={onClose}
      tall
      footer={
        <div className="row">
          <button className="icon-btn outlined" onClick={onBack} aria-label="Back to exercise list">
            <ChevronLeft {...ICON} />
          </button>
          <button className="btn primary grow" disabled={!valid} onClick={save}>Save exercise</button>
        </div>
      }
    >
      <label className="field">
        <span className="label">Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine Press" autoComplete="off" />
      </label>
      <label className="field">
        <span className="label">Movement pattern</span>
        <select className="select" value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
          {(Object.keys(PATTERN_LABEL) as Pattern[]).map((p) => <option key={p} value={p}>{PATTERN_LABEL[p]}</option>)}
        </select>
        <span className="hint">The coach uses this to check your week is balanced.</span>
      </label>
      <label className="field">
        <span className="label">Equipment</span>
        <select className="select" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
          {EQUIPMENT_ORDER.map((eq) => <option key={eq} value={eq}>{EQUIPMENT_LABEL[eq]}</option>)}
        </select>
      </label>
      <div className="field">
        <span className="label">Main muscles</span>
        <div className="row wrap" style={{ gap: 8 }}>
          {(Object.keys(MUSCLE_LABEL) as Muscle[]).map((m) => {
            const on = primary.includes(m);
            return (
              <button key={m} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setPrimary(on ? primary.filter((x) => x !== m) : [...primary, m])}>
                {MUSCLE_LABEL[m]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="row between">
        <div>
          <div className="label">One side at a time</div>
          <div className="hint">Reps are per side, and a set takes twice as long.</div>
        </div>
        <Switch checked={unilateral} onChange={setUnilateral} label="One side at a time" />
      </div>
    </Sheet>
  );
}
