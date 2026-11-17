import { describe, expect, it } from 'vitest';
import {
  actualBreakdown, adjust, advance, currentPhase, editLog, endEarly, isFinished, pause,
  phaseElapsedMs, phaseRemainingMs, remainingEstimateSec, resume, sessionElapsedMs, skip,
  startWorkout, tick, type PlayerState,
} from './player';
import { summarise } from './timing';
import type { Phase } from './types';

const T0 = 1_700_000_000_000;
const s = (sec: number) => T0 + sec * 1000;

function plan(): Phase[] {
  return [
    { id: 'w1', kind: 'warmup', estSec: 30, title: 'WARM-UP 1 OF 2', name: 'March' },
    { id: 'w2', kind: 'warmup', estSec: 30, title: 'WARM-UP 2 OF 2', name: 'Squats' },
    { id: 'g', kind: 'transition', estSec: 45, title: 'GET SET', name: 'Goblet Squat' },
    { id: 's1', kind: 'set', estSec: 50, title: 'SET 1 OF 2', name: 'Goblet Squat', exerciseId: 'db-goblet-squat', itemIndex: 0, setIndex: 0, reps: 10, weightKg: 10 },
    { id: 'r1', kind: 'rest', estSec: 120, baseSec: 120, title: 'REST', name: 'walk it out', exerciseId: 'db-goblet-squat' },
    { id: 's2', kind: 'set', estSec: 50, title: 'SET 2 OF 2', name: 'Goblet Squat', exerciseId: 'db-goblet-squat', itemIndex: 0, setIndex: 1, reps: 10, weightKg: 10 },
    { id: 'c', kind: 'transition', estSec: 30, title: 'COOL DOWN', name: 'Find some floor space' },
    { id: 'c1', kind: 'cooldown', estSec: 30, title: 'COOLDOWN 1 OF 2', name: 'Fold' },
    { id: 'c2', kind: 'cooldown', estSec: 30, title: 'COOLDOWN 2 OF 2', name: 'Pose' },
  ];
}

function start(autoStart = false): PlayerState {
  const p = plan();
  return startWorkout({ routineId: 'r', routineName: 'Test', autoStart }, p, summarise(p), T0);
}

/** Walk the state to the first set by letting the warm-up run and tapping Start. */
function atFirstSet(): PlayerState {
  let st = tick(start(), s(60));
  st = advance(st, s(70)); // tap "Start set" 10 s into GET SET
  return st;
}

describe('timestamps, not ticks', () => {
  it('computes elapsed and remaining from the clock', () => {
    const st = start();
    expect(phaseElapsedMs(st, s(12))).toBe(12_000);
    expect(phaseRemainingMs(st, s(12))).toBe(18_000);
  });

  it('gives the same answer however rarely it is polled', () => {
    const often = [5, 10, 15, 20, 25, 31, 40, 59, 61].reduce((st, t) => tick(st, s(t)), start());
    const once = tick(start(), s(61));
    expect(once).toEqual(often);
  });

  it('auto-advances timed phases at the exact boundary, not at the wake-up time', () => {
    const st = tick(start(), s(47)); // woke 17 s into the second warm-up move
    expect(st.index).toBe(1);
    expect(st.phaseStartedAt).toBe(s(30));
    expect(st.actualSec[0]).toBe(30);
    expect(phaseRemainingMs(st, s(47))).toBe(13_000);
  });

  it('recovers after the phone was locked across several phases', () => {
    // Locked for five minutes during the warm-up: both moves are done, and the
    // player is waiting at GET SET (which needs a tap) — it never runs into a set.
    const st = tick(start(), s(300));
    expect(currentPhase(st)!.id).toBe('g');
    expect(st.phaseStartedAt).toBe(s(60));
    expect(phaseRemainingMs(st, s(300))).toBeLessThan(0);
  });

  it('does nothing if the clock has not reached the boundary', () => {
    const st = start();
    expect(tick(st, s(29.9))).toBe(st);
  });
});

describe('sets', () => {
  it('never end by themselves — the estimate running out flips to count-up', () => {
    const st = tick(atFirstSet(), s(70 + 500));
    expect(currentPhase(st)!.id).toBe('s1');
    expect(phaseRemainingMs(st, s(70 + 58))).toBe(-8_000); // "+0:08"
  });

  it('log the real set time when Done is tapped', () => {
    const st = advance(atFirstSet(), s(70 + 42));
    expect(st.logs).toHaveLength(1);
    expect(st.logs[0]).toMatchObject({ exerciseId: 'db-goblet-squat', reps: 10, weightKg: 10, setSec: 42, estSetSec: 50, skipped: false });
    expect(currentPhase(st)!.kind).toBe('rest');
  });

  it('can be corrected, and a new weight carries to the remaining sets', () => {
    let st = advance(atFirstSet(), s(112));
    st = editLog(st, 0, 8, 12.5);
    expect(st.logs[0]).toMatchObject({ reps: 8, weightKg: 12.5, targetReps: 10, targetWeightKg: 10 });
    expect(st.plan.find((p) => p.id === 's2')!.weightKg).toBe(12.5);
  });

  it('skipping a set logs it as skipped and skips its rest too', () => {
    const st = skip(atFirstSet(), s(75));
    expect(st.logs[0].skipped).toBe(true);
    expect(currentPhase(st)!.id).toBe('s2');
    expect(st.actualSec[4]).toBe(0);
  });
});

describe('rests', () => {
  const resting = () => advance(atFirstSet(), s(112)); // rest starts at t=112

  it('wait for a tap by default and log a late start', () => {
    let st = tick(resting(), s(112 + 150));
    expect(currentPhase(st)!.kind).toBe('rest'); // still resting, 30 s over
    st = advance(st, s(112 + 150));
    expect(st.actualSec[4]).toBe(150);
    expect(currentPhase(st)!.id).toBe('s2');
  });

  it('log an early start', () => {
    const st = advance(resting(), s(112 + 80));
    expect(st.actualSec[4]).toBe(80);
  });

  it('start the next set by themselves when auto-start is on', () => {
    let st = tick(start(true), s(60 + 45)); // warm-up, then GET SET auto-advances
    expect(currentPhase(st)!.id).toBe('s1');
    st = advance(st, s(150)); // Done → rest from t=150
    st = tick(st, s(150 + 121));
    expect(currentPhase(st)!.id).toBe('s2');
    expect(st.phaseStartedAt).toBe(s(270));
  });

  it('+15 s and −15 s move the countdown, but not below zero', () => {
    let st = resting();
    st = adjust(st, 15, s(120));
    expect(phaseRemainingMs(st, s(120))).toBe((120 + 15 - 8) * 1000);
    st = adjust(st, -15, s(120));
    st = adjust(st, -15, s(120));
    expect(phaseRemainingMs(st, s(120))).toBe((105 - 8) * 1000);
    for (let i = 0; i < 20; i++) st = adjust(st, -15, s(120));
    expect(phaseRemainingMs(st, s(120))).toBe(0);
  });

  it('cannot be adjusted during a set', () => {
    const st = atFirstSet();
    expect(adjust(st, 15, s(80))).toBe(st);
  });
});

describe('pause', () => {
  it('freezes the countdown and excludes paused time everywhere', () => {
    let st = atFirstSet(); // set started at t=70
    st = pause(st, s(80));
    expect(phaseElapsedMs(st, s(500))).toBe(10_000);
    expect(sessionElapsedMs(st, s(500))).toBe(80_000);
    st = resume(st, s(200));
    expect(phaseElapsedMs(st, s(205))).toBe(15_000);
    st = advance(st, s(220));
    expect(st.logs[0].setSec).toBe(30); // 150 s total minus 120 s paused
    expect(sessionElapsedMs(st, s(220))).toBe(100_000);
  });

  it('holds timed phases while paused, even across a long gap', () => {
    let st = pause(start(), s(10));
    st = tick(st, s(1000));
    expect(st.index).toBe(0);
    st = resume(st, s(1000));
    st = tick(st, s(1019));
    expect(st.index).toBe(0);
    st = tick(st, s(1021));
    expect(st.index).toBe(1);
  });

  it('tapping the main button while paused resumes first', () => {
    let st = pause(atFirstSet(), s(90));
    st = advance(st, s(190));
    expect(st.pausedAt).toBeNull();
    expect(st.logs[0].setSec).toBe(20);
  });
});

describe('progress and finishing', () => {
  it('estimates time remaining from the current phase plus everything after it', () => {
    const st = start();
    const total = summarise(plan()).total;
    expect(remainingEstimateSec(st, T0)).toBe(total);
    expect(remainingEstimateSec(st, s(10))).toBe(total - 10);
  });

  it('finishes when the last cooldown step ends, at the boundary time', () => {
    let st = atFirstSet();
    st = advance(st, s(112)); // set 1 done
    st = advance(st, s(232)); // start set 2
    st = advance(st, s(280)); // set 2 done → COOL DOWN transition
    st = advance(st, s(300)); // start cooldown
    st = tick(st, s(10_000)); // left the phone on the mat
    expect(isFinished(st)).toBe(true);
    expect(st.finishedAt).toBe(s(360));
    expect(sessionElapsedMs(st, s(10_000))).toBe(360_000);
    const b = actualBreakdown(st);
    expect(b).toMatchObject({ warmup: 60, lifting: 42 + 48, cooldown: 60 });
    expect(b.rest).toBe(10 + 120 + 20);
    expect(b.total).toBe(360);
  });

  it('can be ended early without logging the set in progress', () => {
    const st = endEarly(atFirstSet(), s(90));
    expect(isFinished(st)).toBe(true);
    expect(st.logs).toHaveLength(0);
    expect(sessionElapsedMs(st, s(999))).toBe(90_000);
  });

  it('ignores input once finished', () => {
    const done = endEarly(start(), s(5));
    expect(advance(done, s(6))).toBe(done);
    expect(tick(done, s(600))).toBe(done);
  });
});
