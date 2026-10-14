export type BannerListRow = {
  id: string;
  version: number;
  status?: string;
  placement?: string;
  [key: string]: unknown;
};

export type BannerListFilters = {
  status?: string;
  placement?: string;
};

export type TailPagination = "idle" | "exhausted" | string;

export function mergeBannerRowRecords<T extends BannerListRow>(a: T, b: T): T {
  return b.version >= a.version ? b : a;
}

export function bannerMatchesListFilters(row: BannerListRow, filters: BannerListFilters): boolean {
  if (filters.status && filters.status !== "ALL" && row.status !== filters.status) return false;
  if (filters.placement && filters.placement !== "ALL" && row.placement !== filters.placement) {
    return false;
  }
  return true;
}

export function mergeBannerRows<T extends BannerListRow>(pageOne: T[], extra: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of extra) byId.set(row.id, row);
  for (const row of pageOne) {
    const prev = byId.get(row.id);
    byId.set(row.id, prev ? mergeBannerRowRecords(prev, row) : row);
  }
  return [...byId.values()];
}

export function mergeBannerRowsForView<T extends BannerListRow>(
  pageOne: T[],
  extra: T[],
  filters: BannerListFilters,
): T[] {
  return mergeBannerRows(pageOne, extra).filter((row) => bannerMatchesListFilters(row, filters));
}

export function applyBannerUpdate<T extends BannerListRow>(
  pageOne: T[],
  extra: T[],
  updated: T,
  filters: BannerListFilters,
): { pageOne: T[]; extra: T[] } {
  const touch = (rows: T[]) => {
    if (!bannerMatchesListFilters(updated, filters)) {
      return rows.filter((row) => row.id !== updated.id);
    }
    const idx = rows.findIndex((row) => row.id === updated.id);
    if (idx === -1) return [...rows, updated];
    return rows.map((row) => (row.id === updated.id ? updated : row));
  };
  return { pageOne: touch(pageOne), extra: touch(extra) };
}

export function mergeExtraBannerPage<T extends BannerListRow>(prev: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of prev) byId.set(row.id, row);
  for (const row of incoming) {
    const prevRow = byId.get(row.id);
    byId.set(row.id, prevRow ? mergeBannerRowRecords(prevRow, row) : row);
  }
  return [...byId.values()];
}

export function resolveNextBannerCursor(
  tail: TailPagination,
  pageOneNext?: string | null,
): string | undefined {
  if (tail === "exhausted") return undefined;
  if (tail === "idle") return pageOneNext ?? undefined;
  return tail;
}

export function tailAfterLoadedPage(nextCursor?: string | null): TailPagination {
  return nextCursor ? nextCursor : "exhausted";
}

export function shouldApplyLoadMoreResult(
  requestFilterKey: string,
  currentFilterKey: string,
  requestGeneration: number,
  currentGeneration: number,
  requestListGeneration: number,
  currentListGeneration: number,
): boolean {
  return (
    requestFilterKey === currentFilterKey &&
    requestGeneration === currentGeneration &&
    requestListGeneration === currentListGeneration
  );
}

export function bannerListFilterKey(args: Record<string, unknown>): string {
  return JSON.stringify(args);
}
