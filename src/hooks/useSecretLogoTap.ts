import { useCallback, useEffect, useRef } from 'react';

export interface LogoTapState {
  nextCount: number;
  lastTapMs: number;
  triggered: boolean;
}

export function evaluateLogoTapSequence(
  prevCount: number,
  lastTapMs: number,
  nowMs: number,
  maxGapMs = 2500,
  targetTaps = 5
): LogoTapState {
  const withinWindow = lastTapMs > 0 && nowMs - lastTapMs <= maxGapMs;
  const count = withinWindow ? prevCount + 1 : 1;
  if (count >= targetTaps) {
    return {
      nextCount: 0,
      lastTapMs: 0,
      triggered: true,
    };
  }
  return {
    nextCount: count,
    lastTapMs: nowMs,
    triggered: false,
  };
}

export function useSecretLogoTap(onUnlock?: () => void, maxGapMs = 2500, targetTaps = 5) {
  const countRef = useRef(0);
  const lastTapRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const registerTap = useCallback(() => {
    const now = Date.now();
    const res = evaluateLogoTapSequence(
      countRef.current,
      lastTapRef.current,
      now,
      maxGapMs,
      targetTaps
    );
    countRef.current = res.nextCount;
    lastTapRef.current = res.lastTapMs;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (res.triggered) {
      onUnlock?.();
      return true;
    }

    timerRef.current = window.setTimeout(() => {
      countRef.current = 0;
      lastTapRef.current = 0;
    }, maxGapMs + 50);

    return false;
  }, [maxGapMs, onUnlock, targetTaps]);

  return { registerTap };
}
