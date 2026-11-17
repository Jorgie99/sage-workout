import type { WeightUnit } from './types';

export const LB_PER_KG = 2.2046226218;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;

export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const v = unit === 'lb' ? kgToLb(kg) : kg;
  return Math.round(v * 2) / 2; // nearest 0.5
}

export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === 'lb' ? lbToKg(value) : value;
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit): string {
  if (kg == null) return '';
  const v = toDisplayWeight(kg, unit);
  return `${Number.isInteger(v) ? v : v.toFixed(1)} ${unit}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}

export function ftInToCm(ft: number, inch: number): number {
  return (ft * 12 + inch) * CM_PER_IN;
}

/** 95 -> "1:35", 3725 -> "1:02:05" */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const ss = String(sec).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

/** 1500 -> "25 min" */
export function formatMinutes(totalSec: number): string {
  const m = Math.max(1, Math.round(totalSec / 60));
  return `${m} min`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatRelativeDay(ts: number, now = Date.now()): string {
  const startOf = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOf(now) - startOf(ts)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return formatDate(ts);
}

export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}-${rand}` : rand;
}
