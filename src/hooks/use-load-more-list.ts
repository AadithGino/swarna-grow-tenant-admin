"use client";

import { useCallback, useState } from "react";

/**
 * Cursor "Load more" lists: keeps already-loaded rows while the next page is fetched,
 * and starts over whenever `resetKey` (filters, search) changes.
 */
export function useLoadMoreList<T>(resetKey: string, getId: (row: T) => string) {
  const [state, setState] = useState<{ key: string; cursor?: string; stack: T[] }>({
    key: resetKey,
    stack: [],
  });
  if (state.key !== resetKey) {
    // Derived-state reset during render (React-endorsed pattern for "reset when key changes").
    setState({ key: resetKey, stack: [] });
  }
  const cursor = state.key === resetKey ? state.cursor : undefined;
  const stack = state.key === resetKey ? state.stack : [];

  const merge = useCallback(
    (batch: T[]) => {
      if (!cursor) return batch;
      const ids = new Set(stack.map(getId));
      return [...stack, ...batch.filter((r) => !ids.has(getId(r)))];
    },
    [cursor, stack, getId],
  );

  const loadMore = useCallback(
    (loaded: T[], nextCursor?: string | null) => {
      setState((prev) => ({ key: prev.key, stack: loaded, cursor: nextCursor ?? undefined }));
    },
    [],
  );

  return { cursor, merge, loadMore };
}
