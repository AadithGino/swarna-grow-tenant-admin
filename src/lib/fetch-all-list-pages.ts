import type { ListPageMeta } from "@/src/lib/cursor-pagination";

type PageResult<T> = {
  items: T[];
  page: ListPageMeta;
};

/**
 * Walk cursor pages until exhausted (cap pages to avoid runaway exports).
 */
export async function fetchAllListPages<T>(
  fetchPage: (cursor?: string) => Promise<PageResult<T>>,
  maxPages = 40,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i += 1) {
    const result = await fetchPage(cursor);
    all.push(...result.items);
    if (!result.page.hasMore || !result.page.nextCursor) break;
    cursor = result.page.nextCursor;
  }
  return all;
}
