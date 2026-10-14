import { useEffect, useMemo } from "react";

/** Signed banner image URLs expire after 15 minutes; list refresh does not revoke URLs already issued. */
export const CUSTOMER_BANNER_IMAGE_URL_TTL_MS = 15 * 60_000;

const MIN_POLL_MS = 30_000;
const MAX_POLL_MS = 120_000;
/** Maximum delay for a single setTimeout (2^31 - 1 ms). */
export const MAX_SCHEDULE_TIMEOUT_MS = 2_147_483_647;

type ScheduledBanner = {
  startsAt?: string | null;
  endsAt?: string | null;
};

export type CustomerBannerListMeta = {
  nextVisibilityChangeAt?: string | null;
  serverTime?: string | null;
};

/** Server clock advanced by elapsed time since the response was received. */
export function createScheduleClock(
  meta: CustomerBannerListMeta | null | undefined,
  receivedAtMs: number = Date.now(),
): () => number {
  const serverAtReceipt = meta?.serverTime
    ? new Date(meta.serverTime).getTime()
    : receivedAtMs;
  if (!Number.isFinite(serverAtReceipt)) {
    return () => Date.now();
  }
  const clientAtReceipt = receivedAtMs;
  return () => clientAtReceipt + (Date.now() - clientAtReceipt) + (serverAtReceipt - clientAtReceipt);
}

export function effectiveNowMs(meta?: CustomerBannerListMeta | null, nowMs: number = Date.now()): number {
  return createScheduleClock(meta, nowMs)();
}

export function nextBannerScheduleBoundaryMs(
  items: ScheduledBanner[],
  nowMs: number = Date.now(),
): number | null {
  let next: number | null = null;
  for (const row of items) {
    for (const raw of [row.startsAt, row.endsAt]) {
      if (!raw) continue;
      const t = new Date(raw).getTime();
      if (!Number.isFinite(t) || t <= nowMs) continue;
      if (next == null || t < next) next = t;
    }
  }
  return next;
}

export function resolveScheduleBoundaryMs(
  items: ScheduledBanner[],
  meta?: CustomerBannerListMeta | null,
  nowMs?: number,
): number | null {
  const now = nowMs ?? effectiveNowMs(meta);
  if (meta?.nextVisibilityChangeAt != null) {
    const t = new Date(meta.nextVisibilityChangeAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  return nextBannerScheduleBoundaryMs(items, now);
}

export function scheduleDelayMs(boundaryMs: number, clock: () => number): number {
  return boundaryMs - clock() + 250;
}

/**
 * Schedule refetch at boundary using chained timeouts for delays above MAX_SAFE_INTEGER.
 * Returns cancel function.
 */
export function scheduleRefetchAtBoundary(
  boundaryMs: number,
  refetch: () => void,
  clock: () => number,
): () => void {
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const tick = () => {
    if (cancelled) return;
    const delay = scheduleDelayMs(boundaryMs, clock);
    if (delay <= 0) {
      refetch();
      return;
    }
    const chunk = Math.min(delay, MAX_SCHEDULE_TIMEOUT_MS);
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      if (scheduleDelayMs(boundaryMs, clock) <= 0) refetch();
      else tick();
    }, chunk);
  };

  tick();
  return () => {
    cancelled = true;
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  };
}

export function customerBannerPollingIntervalMs(items: ScheduledBanner[]): number {
  const boundary = nextBannerScheduleBoundaryMs(items);
  if (boundary == null) return MAX_POLL_MS;
  const until = boundary - Date.now();
  if (until <= 0) return MIN_POLL_MS;
  return Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, until));
}

export function customerBannerQueryOptions(
  items: ScheduledBanner[] = [],
  meta?: CustomerBannerListMeta | null,
) {
  const clock = createScheduleClock(meta);
  const fromMeta = meta?.nextVisibilityChangeAt
    ? new Date(meta.nextVisibilityChangeAt).getTime() - clock()
    : null;
  const pollingInterval =
    fromMeta != null && fromMeta > 0
      ? Math.min(120_000, Math.max(30_000, fromMeta + 250))
      : customerBannerPollingIntervalMs(items);
  return {
    pollingInterval,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  } as const;
}

/** RTK Query options + refetch when the next scheduled start/end passes. */
export function useCustomerBannerScheduleRefetch(
  items: ScheduledBanner[],
  refetch: () => void,
  meta?: CustomerBannerListMeta | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const itemsScheduleKey = useMemo(
    () => items.map((row) => `${row.startsAt ?? ""}|${row.endsAt ?? ""}`).join(";"),
    [items],
  );
  const boundaryToken =
    meta?.nextVisibilityChangeAt ??
    (nextBannerScheduleBoundaryMs(items) != null
      ? String(nextBannerScheduleBoundaryMs(items))
      : "");

  useEffect(() => {
    if (!enabled) return;
    const receivedAt = Date.now();
    const clock = createScheduleClock(meta, receivedAt);
    const boundaryMs = resolveScheduleBoundaryMs(items, meta, clock());
    if (boundaryMs == null || !Number.isFinite(boundaryMs)) return;
    return scheduleRefetchAtBoundary(boundaryMs, refetch, clock);
    // items/meta summarized by itemsScheduleKey, boundaryToken, and meta.serverTime to avoid timer restarts on unrelated rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional schedule key deps
  }, [enabled, boundaryToken, itemsScheduleKey, meta?.serverTime, refetch]);
}
