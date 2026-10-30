/**
 * Per-user tour progress, kept in this browser. Storage can be blocked
 * (private mode, policies), so every access is guarded and the UI still works
 * without it — the welcome prompt just shows again next visit.
 */

export type TourProgress = {
  /** The first-login welcome prompt was answered (started or dismissed). */
  welcomeSeen: boolean;
  /** tour id → ISO date finished. */
  completed: Record<string, string>;
};

export type TourStorageScope = { tenantId: string; userId: string };

const EMPTY: TourProgress = { welcomeSeen: false, completed: {} };

function key(scope: TourStorageScope) {
  return `swarnagrow.tours.v1:${scope.tenantId}:${scope.userId}`;
}

export function readTourProgress(scope: TourStorageScope | null): TourProgress {
  if (!scope || typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(key(scope));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<TourProgress>;
    return {
      welcomeSeen: Boolean(parsed.welcomeSeen),
      completed:
        parsed.completed && typeof parsed.completed === "object"
          ? (parsed.completed as Record<string, string>)
          : {},
    };
  } catch {
    return EMPTY;
  }
}

export function writeTourProgress(
  scope: TourStorageScope | null,
  next: TourProgress,
): void {
  if (!scope || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(scope), JSON.stringify(next));
  } catch {
    // storage unavailable — progress lasts for this visit only
  }
}
