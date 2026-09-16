"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Throttle value updates so filters don't spam the API.
 * Emits immediately on first change, then at most once per `intervalMs`.
 */
export function useThrottledValue<T>(value: T, intervalMs = 400): T {
  const [throttled, setThrottled] = useState(value);
  const lastEmittedAt = useRef(0);
  const pending = useRef<T | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastEmittedAt.current;

    if (elapsed >= intervalMs) {
      lastEmittedAt.current = now;
      setThrottled(value);
      return;
    }

    pending.current = value;
    if (timer.current != null) return;

    timer.current = window.setTimeout(() => {
      timer.current = null;
      lastEmittedAt.current = Date.now();
      if (pending.current !== null) {
        setThrottled(pending.current);
        pending.current = null;
      }
    }, intervalMs - elapsed);

    return () => {
      if (timer.current != null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [value, intervalMs]);

  return throttled;
}
