"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LIST_LIMIT,
  type ListPageMeta,
} from "@/src/lib/cursor-pagination";

export function useCursorPagination(
  limit = DEFAULT_LIST_LIMIT,
  resetKey = "",
) {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  useEffect(() => {
    setPageIndex(0);
    setCursors([undefined]);
  }, [resetKey, limit]);

  const cursor = cursors[pageIndex];

  const goNext = useCallback((nextCursor: string | null | undefined) => {
    if (!nextCursor) return;
    setPageIndex((i) => {
      setCursors((stack) => [...stack.slice(0, i + 1), nextCursor]);
      return i + 1;
    });
  }, []);

  const goPrevious = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);

  const reset = useCallback(() => {
    setPageIndex(0);
    setCursors([undefined]);
  }, []);

  const queryParams = useMemo(
    () => ({
      limit,
      ...(cursor ? { cursor } : {}),
    }),
    [cursor, limit],
  );

  return {
    limit,
    cursor,
    pageIndex,
    canPrevious: pageIndex > 0,
    queryParams,
    goNext,
    goPrevious,
    reset,
  };
}
