"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_LIST_LIMIT } from "@/src/lib/cursor-pagination";

export function useCursorPagination(
  limit = DEFAULT_LIST_LIMIT,
  resetKey = "",
) {
  const [pagination, setPagination] = useState({
    resetKey,
    limit,
    pageIndex: 0,
    cursors: [undefined] as (string | undefined)[],
  });

  if (
    pagination.resetKey !== resetKey ||
    pagination.limit !== limit
  ) {
    setPagination({
      resetKey,
      limit,
      pageIndex: 0,
      cursors: [undefined],
    });
  }

  const { pageIndex, cursors } = pagination;
  const cursor = cursors[pageIndex];

  const goNext = useCallback((nextCursor: string | null | undefined) => {
    if (!nextCursor) return;
    setPagination((prev) => {
      const i = prev.pageIndex;
      return {
        ...prev,
        pageIndex: i + 1,
        cursors: [...prev.cursors.slice(0, i + 1), nextCursor],
      };
    });
  }, []);

  const goPrevious = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: Math.max(0, prev.pageIndex - 1),
    }));
  }, []);

  const reset = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
      cursors: [undefined],
    }));
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
