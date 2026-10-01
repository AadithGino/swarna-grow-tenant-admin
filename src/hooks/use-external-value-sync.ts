"use client";

import { useState } from "react";

/**
 * Keeps local state in sync when an external value changes (e.g. Redux global search),
 * while still allowing local edits between external updates.
 */
export function useExternalValueSync<T>(external: T): [T, (next: T) => void] {
  const [local, setLocal] = useState(external);
  const [lastExternal, setLastExternal] = useState(external);
  if (lastExternal !== external) {
    setLastExternal(external);
    setLocal(external);
  }
  return [local, setLocal];
}
