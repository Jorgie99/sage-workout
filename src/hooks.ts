import { useEffect, useState } from 'react';

/**
 * Keep the screen on while `active`. iOS releases a wake lock whenever the app
 * is hidden, so it is requested again every time the app becomes visible.
 * Returns false when the Screen Wake Lock API is missing (iOS before 18.4 in
 * Home Screen apps).
 */
export function useWakeLock(active: boolean): boolean {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  useEffect(() => {
    if (!active || !supported) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) void l.release();
        else lock = l;
      } catch {
        // Denied (e.g. low power mode). The workout still runs; the screen may dim.
      }
    };

    void request();
    const onVisible = () => void request();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active, supported]);

  return supported;
}

/**
 * The current time, refreshed on an interval while visible and immediately
 * whenever the app comes back to the foreground. Timers may be throttled or
 * frozen in the background — that is fine, because nothing counts ticks: every
 * reading is derived from this timestamp.
 */
export function useNow(intervalMs: number, onWake?: (now: number) => void): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => {
      const t = Date.now();
      setNow(t);
      onWake?.(t);
    };
    const id = window.setInterval(update, intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', update);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', update);
      window.removeEventListener('focus', update);
    };
    // onWake is expected to be stable (a setState updater wrapper).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return now;
}
