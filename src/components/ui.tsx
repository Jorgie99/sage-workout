import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, X } from 'lucide-react';
import type { Breakdown } from '../lib/types';
import { formatMinutes } from '../lib/units';

export const ICON = { size: 22, strokeWidth: 1.5 } as const;
export const ICON_SM = { size: 18, strokeWidth: 1.5 } as const;

// ── Bottom sheet ──────────────────────────────────────────────────────────

export function Sheet({
  title, onClose, children, footer, tall,
}: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="sheet-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${tall ? ' tall' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X {...ICON} />
          </button>
        </div>
        <div className="sheet-body grow">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ── Small controls ────────────────────────────────────────────────────────

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, label,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value, onChange, min = 0, max = 999, step = 1, label, format, large,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
  label: string; format?: (v: number) => string; large?: boolean;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div className={`stepper${large ? ' lg' : ''}`} role="group" aria-label={label}>
      <button className="icon-btn outlined" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Minus {...ICON_SM} />
      </button>
      <span className="value" aria-live="polite">{format ? format(value) : value}</span>
      <button className="icon-btn outlined" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus {...ICON_SM} />
      </button>
    </div>
  );
}

/** A numeric text input that keeps what you type while typing and reports numbers. */
export function NumField({
  value, onChange, placeholder, className = 'input', ariaLabel, decimal = true, max = 9999,
}: {
  value: number | null; onChange: (v: number | null) => void; placeholder?: string;
  className?: string; ariaLabel: string; decimal?: boolean; max?: number;
}) {
  const show = (v: number | null) => (v == null ? '' : String(Math.round(v * 10) / 10));
  const [text, setText] = useState(show(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(show(value));
  }, [value]);

  return (
    <input
      className={className}
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        setText(show(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.').replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
        setText(raw);
        if (raw === '' || raw === '.') return onChange(null);
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(Math.min(max, n));
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = msg ? createPortal(<div className="toast" role="status">{msg}</div>, document.body) : null;
  return { show, node };
}

// ── Time visuals ──────────────────────────────────────────────────────────

const PARTS: { key: keyof Omit<Breakdown, 'total'>; label: string; color: string }[] = [
  { key: 'warmup', label: 'Warm-up', color: 'var(--warmup-ring)' },
  { key: 'lifting', label: 'Lifting', color: 'var(--set-ring)' },
  { key: 'rest', label: 'Rests', color: 'var(--rest-ring)' },
  { key: 'cooldown', label: 'Cooldown', color: 'var(--cooldown-ring)' },
];

/** Estimated (or actual) time split into warm-up, lifting, rests and cooldown. */
export function SplitBar({ breakdown, legend = true }: { breakdown: Breakdown; legend?: boolean }) {
  const total = Math.max(1, breakdown.total);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="split-bar" aria-hidden="true">
        {PARTS.map((p) => breakdown[p.key] > 0 && <i key={p.key} style={{ width: `${(breakdown[p.key] / total) * 100}%`, background: p.color }} />)}
      </div>
      {legend && (
        <div className="legend">
          {PARTS.map((p) => (
            <span key={p.key}>
              <i style={{ background: p.color }} />
              {p.label}
              <b>{breakdown[p.key] > 0 ? formatMinutes(breakdown[p.key]) : '—'}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small trend line of the last sessions' durations. */
export function Sparkline({ values, width = 96, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Trend of your last ${values.length} session times`}>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--sage-deep)" />
    </svg>
  );
}
