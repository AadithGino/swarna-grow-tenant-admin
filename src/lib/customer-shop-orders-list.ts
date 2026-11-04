/** Normalizes GET /app/shop/orders after customerApi unwraps `{ success, data, meta }`. */
export function normalizeShopOrdersListResponse(raw: unknown): {
  items: Record<string, unknown>[];
  page: { nextCursor?: string | null };
} {
  if (Array.isArray(raw)) {
    return { items: raw as Record<string, unknown>[], page: { nextCursor: null } };
  }
  if (raw && typeof raw === "object" && "data" in raw) {
    const envelope = raw as {
      data: Record<string, unknown>[] | { items?: Record<string, unknown>[] };
      meta?: { nextCursor?: string | null };
    };
    const data = envelope.data;
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? (data.items ?? [])
        : [];
    return {
      items,
      page: { nextCursor: envelope.meta?.nextCursor ?? null },
    };
  }
  const legacy = raw as { items?: Record<string, unknown>[]; page?: { nextCursor?: string | null } };
  return {
    items: legacy.items ?? [],
    page: legacy.page ?? { nextCursor: null },
  };
}
