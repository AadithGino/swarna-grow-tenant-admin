/** Mutually exclusive enrollment status buckets (each account has exactly one). */
export type EnrollmentStatusBreakdown = {
  notStarted: number;
  activePaying: number;
  planCapped: number;
  defaulted: number;
  /** Paying + capped + defaulted — live scheme, instalment path started or in default. */
  open: number;
  matured: number;
  completed: number;
  inProgress: number;
  total: number;
};

export function openEnrollmentCount(
  data: Pick<
    EnrollmentStatusBreakdown,
    "open" | "activePaying" | "planCapped" | "defaulted"
  >,
): number {
  if (typeof data.open === "number" && Number.isFinite(data.open)) {
    return data.open;
  }
  return data.activePaying + data.planCapped + data.defaulted;
}

export function openEnrollmentDetail(
  data: Pick<
    EnrollmentStatusBreakdown,
    "activePaying" | "planCapped" | "defaulted"
  >,
): string {
  const parts: string[] = [];
  if (data.activePaying > 0) parts.push(`${data.activePaying} paying`);
  if (data.planCapped > 0) parts.push(`${data.planCapped} capped`);
  if (data.defaulted > 0) parts.push(`${data.defaulted} defaulted`);
  return parts.length ? parts.join(" · ") : "Paying, capped, or defaulted";
}

export const ENROLLMENT_STATUS_LABELS = {
  notStarted: "Not started",
  activePaying: "Paying instalments",
  planCapped: "Plan capped",
  defaulted: "Defaulted",
  matured: "Matured",
  completed: "Completed",
} as const;

export function adaptEnrollmentStatusBreakdown(
  raw: Record<string, unknown> | undefined | null,
): EnrollmentStatusBreakdown | null {
  if (!raw || typeof raw !== "object") return null;
  const n = (key: string) => {
    const v = Number((raw as Record<string, unknown>)[key] ?? 0);
    return Number.isFinite(v) ? v : 0;
  };
  const notStarted = n("notStarted");
  const activePaying = n("activePaying");
  const planCapped = n("planCapped");
  const defaulted = n("defaulted");
  const matured = n("matured");
  const completed = n("completed");
  const open =
    n("open") || activePaying + planCapped + defaulted;
  const inProgress = n("inProgress") || notStarted + open;
  const total = n("total") || inProgress + matured + completed;
  return {
    notStarted,
    activePaying,
    planCapped,
    defaulted,
    open,
    matured,
    completed,
    inProgress,
    total,
  };
}

/** Legacy API fields before `statusBreakdown` was added. */
export function enrollmentStatusFromLegacyFields(
  raw: Record<string, unknown> | undefined | null,
): EnrollmentStatusBreakdown | null {
  if (!raw) return null;
  const n = (key: string) => {
    const v = Number(raw[key] ?? 0);
    return Number.isFinite(v) ? v : 0;
  };
  const notStarted =
    n("pendingFirstPayment") || n("pendingFirstPaymentEnrollments");
  const planCapped = n("planCapped") || n("planCappedEnrollments") || n("locked");
  const activeAndLocked =
    n("activeAndLocked") ||
    n("activeAndLockedEnrollments") ||
    n("activeEnrollments") ||
    n("active");
  const activePaying =
    n("activePaying") ||
    n("activePayingEnrollments") ||
    Math.max(0, activeAndLocked - planCapped);
  const defaulted = n("defaulted");
  const matured = n("matured");
  const completed = n("completed") || n("redeemed");
  if (
    !notStarted &&
    !activePaying &&
    !planCapped &&
    !defaulted &&
    !matured &&
    !completed
  ) {
    return null;
  }
  return adaptEnrollmentStatusBreakdown({
    notStarted,
    activePaying,
    planCapped,
    defaulted,
    matured,
    completed,
  });
}
