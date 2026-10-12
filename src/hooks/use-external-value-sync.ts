"use client";

import { useEffect, useRef, useState } from "react";

function externalSnapshot(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Keeps local state in sync when an external value changes (e.g. API refetch),
 * while still allowing local edits between external updates.
 */
export function useExternalValueSync<T>(external: T): [T, (next: T) => void] {
  const [local, setLocal] = useState(external);
  const snapshotRef = useRef(externalSnapshot(external));

  useEffect(() => {
    const nextSnapshot = externalSnapshot(external);
    if (nextSnapshot !== snapshotRef.current) {
      snapshotRef.current = nextSnapshot;
      setLocal(external);
    }
  }, [external]);

  return [local, setLocal];
}
