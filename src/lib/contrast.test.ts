// WCAG 2.1 contrast checks against the real colour tokens in styles.css.
// AA needs 4.5:1 for normal text and 3:1 for large text and meaningful graphics.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../styles.css', import.meta.url)), 'utf8');
const tokens: Record<string, string> = {};
for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) tokens[m[1]] = m[2];
const WHITE = '#FFFFFF';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const t = (name: string) => {
  expect(tokens[name], `token --${name} exists`).toBeDefined();
  return tokens[name];
};

const SURFACES = ['bg', 'card', 'sage-wash', 'danger-wash'];
const PHASES = ['warmup', 'set', 'rest', 'transition', 'cooldown'];

describe('WCAG AA contrast', () => {
  it('knows the formula (black on white is 21:1)', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('primary and secondary text pass 4.5:1 on every surface', () => {
    for (const s of SURFACES) {
      expect(contrast(t('text'), t(s)), `text on ${s}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t('text-2'), t(s)), `text-2 on ${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('primary and secondary text pass 4.5:1 on every phase tint', () => {
    for (const p of PHASES) {
      expect(contrast(t('text'), t(`${p}-bg`)), `text on ${p}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t('text-2'), t(`${p}-bg`)), `text-2 on ${p}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('sage link text passes 4.5:1 on cream, cards and the sage wash', () => {
    for (const s of ['bg', 'card', 'sage-wash']) {
      expect(contrast(t('sage-ink'), t(s)), `sage-ink on ${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('white text passes 4.5:1 on filled buttons', () => {
    expect(contrast(WHITE, t('sage-ink')), 'primary button').toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, t('text')), 'main workout button').toBeGreaterThanOrEqual(4.5);
    expect(contrast(WHITE, t('danger')), 'destructive button').toBeGreaterThanOrEqual(4.5);
  });

  it('destructive text passes 4.5:1 on cream and cards', () => {
    expect(contrast(t('danger'), t('bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t('danger'), t('card'))).toBeGreaterThanOrEqual(4.5);
  });

  it('each phase ring passes 3:1 against its own tint', () => {
    for (const p of PHASES) {
      expect(contrast(t(`${p}-ring`), t(`${p}-bg`)), `${p} ring`).toBeGreaterThanOrEqual(3);
    }
  });

  it('active icons and switches pass 3:1 on cream', () => {
    expect(contrast(t('sage-deep'), t('bg'))).toBeGreaterThanOrEqual(3);
    expect(contrast(t('sage-deep'), t('card'))).toBeGreaterThanOrEqual(3);
  });

  it('documents why the brief’s taupe and sage are not used for small text', () => {
    // ~#8A7F75 on cream is only ~3.5:1 and ~#6F8466 ~3.6:1 — fine for large
    // type and icons, not for body text. See DECISIONS.md.
    expect(contrast(t('taupe'), t('bg'))).toBeLessThan(4.5);
    expect(contrast(t('taupe'), t('bg'))).toBeGreaterThanOrEqual(3);
    expect(contrast(t('sage-deep'), t('bg'))).toBeLessThan(4.5);
  });
});
