import type { CustomerSchemeDetail, PaymentListItem, SchemeCard } from "@/src/types/customer";

export function formatInrPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, paise) / 100);
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Sum successful contributions for the active billing cycle (or calendar month fallback). */
export function paidThisCyclePaise(
  payments: PaymentListItem[],
  targetCycle?: string | null,
): number {
  const success = (payments ?? []).filter((p) => p.status === "SUCCESS");
  const cycle = targetCycle?.trim() || currentMonthKey();

  const byCycle = success.filter((p) => p.targetCycle === cycle);
  if (byCycle.length) {
    return byCycle.reduce((sum, p) => sum + p.amount.amountPaise, 0);
  }

  const [year, month] = cycle.split("-").map(Number);
  if (!year || !month) return 0;
  return success
    .filter((p) => {
      const when = new Date(p.paidAt ?? p.createdAt);
      return when.getFullYear() === year && when.getMonth() + 1 === month;
    })
    .reduce((sum, p) => sum + p.amount.amountPaise, 0);
}

export function resolveTotalPaidPaise(scheme: CustomerSchemeDetail): number {
  if (scheme.totalPaid?.amountPaise != null) return scheme.totalPaid.amountPaise;
  if (scheme.passbookSummary?.totalPaid?.amountPaise != null) {
    return scheme.passbookSummary.totalPaid.amountPaise;
  }
  return (scheme.payments ?? [])
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount.amountPaise, 0);
}

export function parseCappedPhaseMonths(scheme: CustomerSchemeDetail): number | null {
  const detail = scheme.progressDetail ?? "";
  const match = detail.match(/(\d+)-month capped phase/i);
  return match ? Number(match[1]) : null;
}

export function flexibleFreeTimeline(scheme: CustomerSchemeDetail) {
  const freeMonths =
    scheme.progressCard.freeWindowMonths ?? scheme.freeWindowMonths ?? 0;
  const currentMonth =
    scheme.progressCard.freeWindowMonth ?? scheme.freeWindowMonth ?? 1;
  const completed =
    scheme.progressCard.freeWindowMonthsCompleted ??
    Math.max(0, currentMonth - 1);
  const cappedMonths = parseCappedPhaseMonths(scheme);
  const planMonths =
    freeMonths + (cappedMonths ?? 0) > freeMonths
      ? freeMonths + (cappedMonths ?? 0)
      : null;

  return {
    freeMonths,
    cappedMonths,
    planMonths,
    currentMonth,
    completed,
  };
}

/** Cap / paid / remaining for the active calendar-month limit (home & list cards). */
export function cappedCycleAmounts(scheme: SchemeCard | CustomerSchemeDetail) {
  const detail = "progressCard" in scheme ? scheme : null;
  const cap = detail?.progressCard.cycleCap ?? scheme.cycleCap;
  const remaining = detail?.progressCard.remainingThisCycle ?? scheme.remainingThisCycle;
  const paidThisCyclePaise =
    detail?.progressCard.paidThisCycle?.amountPaise ??
    (cap && remaining ? Math.max(0, cap.amountPaise - remaining.amountPaise) : 0);
  return { cap, remaining, paidThisCyclePaise };
}

export function cappedCyclePaidPaise(scheme: CustomerSchemeDetail): number {
  const fromCard = scheme.progressCard.paidThisCycle?.amountPaise;
  if (fromCard != null) return fromCard;
  const fromRange = scheme.payableRange?.paidThisCycle?.amountPaise;
  if (fromRange != null) return fromRange;
  const capPaise = scheme.progressCard.cycleCap?.amountPaise ?? scheme.cycleCap?.amountPaise ?? 0;
  const remainingPaise =
    scheme.progressCard.remainingThisCycle?.amountPaise ??
    scheme.remainingThisCycle?.amountPaise ??
    scheme.payableRange?.remainingThisCycle?.amountPaise ??
    0;
  if (capPaise > 0) {
    return Math.max(0, capPaise - remainingPaise);
  }
  return paidThisCyclePaise(
    scheme.payments ?? [],
    scheme.payableRange?.targetCycle,
  );
}
