export const DEFAULT_LIST_LIMIT = 8;
export const MAX_LIST_LIMIT = 100;

export type ListPageMeta = {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  total?: number;
};

type CursorPayload = { o: number };

export function listLimit(params: Record<string, unknown> | undefined): number {
  const n = Number(params?.limit);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.floor(n), MAX_LIST_LIMIT);
}

export function decodeListCursor(cursor: unknown): number {
  if (cursor == null || cursor === "") return 0;
  try {
    const raw = atob(String(cursor));
    const parsed = JSON.parse(raw) as CursorPayload;
    return Number.isFinite(parsed.o) && parsed.o >= 0 ? parsed.o : 0;
  } catch {
    return 0;
  }
}

export function encodeListCursor(offset: number): string {
  return btoa(JSON.stringify({ o: offset } satisfies CursorPayload));
}

export function paginateSlice<T>(
  items: T[],
  params: Record<string, unknown> | undefined,
): { items: T[]; page: ListPageMeta } {
  const limit = listLimit(params);
  const start = decodeListCursor(params?.cursor);
  const slice = items.slice(start, start + limit);
  const nextOffset = start + limit;
  const hasMore = nextOffset < items.length;
  return {
    items: slice,
    page: {
      nextCursor: hasMore ? encodeListCursor(nextOffset) : null,
      hasMore,
      limit,
      total: items.length,
    },
  };
}

export function mergePageMeta(
  raw: Record<string, unknown> | undefined,
  fallback?: Partial<ListPageMeta>,
): ListPageMeta {
  if (!raw) {
    return {
      nextCursor: fallback?.nextCursor ?? null,
      hasMore: fallback?.hasMore ?? false,
      limit: fallback?.limit ?? DEFAULT_LIST_LIMIT,
      total: fallback?.total,
    };
  }
  const nextCursor =
    (raw.nextCursor as string | null | undefined) ??
    (raw.page as ListPageMeta | undefined)?.nextCursor ??
    fallback?.nextCursor ??
    null;
  return {
    nextCursor,
    hasMore:
      Boolean(raw.hasMore) ||
      Boolean((raw.page as ListPageMeta | undefined)?.hasMore) ||
      Boolean(fallback?.hasMore) ||
      Boolean(nextCursor),
    limit:
      Number(raw.limit) ||
      (raw.page as ListPageMeta | undefined)?.limit ||
      fallback?.limit ||
      DEFAULT_LIST_LIMIT,
    total:
      typeof raw.total === "number"
        ? raw.total
        : typeof (raw.page as ListPageMeta | undefined)?.total === "number"
          ? (raw.page as ListPageMeta).total
          : fallback?.total,
  };
}

export function emptyPageMeta(limit = DEFAULT_LIST_LIMIT): ListPageMeta {
  return { nextCursor: null, hasMore: false, limit, total: 0 };
}

export function pageRangeLabel(
  pageIndex: number,
  page: ListPageMeta,
  rowCount: number,
): string {
  if (!page.total || rowCount === 0) {
    return pageIndex === 0 && !page.hasMore
      ? `${rowCount} record${rowCount === 1 ? "" : "s"}`
      : `Page ${pageIndex + 1}`;
  }
  const start = pageIndex * page.limit + 1;
  const end = pageIndex * page.limit + rowCount;
  return `${start}–${end} of ${page.total}`;
}
