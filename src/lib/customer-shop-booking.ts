/** Pure display rules for a customer's advance booking. The server decides; this only words it. */

export type BookingRefund = { id: string; amountPaise: number; status: string };

export type CustomerBooking = {
  id: string;
  bookingNumber?: string;
  status: string;
  refundStatus?: string | null;
  product?: { id?: string; name?: string; sku?: string };
  pickupBranchId?: string;
  estimateTotalPaise?: number | null;
  advance?: { requiredPaise?: number | null; capturedPaise?: number; capturedAt?: string | null };
  balance?: { requiredPaise?: number | null; capturedPaise?: number };
  finalBilling?: { totalPaise?: number; balancePaise?: number; excessAdvancePaise?: number; rateSource?: string } | null;
  rateProtectedUntil?: string | null;
  advanceDueAt?: string | null;
  balanceDueAt?: string | null;
  policy?: { termsText?: string; cancellationFeeBps?: number; rateRule?: string };
  order?: { id: string; orderNumber?: string; status?: string; totalPaise?: number } | null;
  cancelledAt?: string | null;
  cancellationFeePaise?: number | null;
  refunds?: BookingRefund[];
  createdAt?: string | null;
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING_ADVANCE: "Advance due",
  CONFIRMED: "Booked",
  BALANCE_PENDING: "Balance due",
  CONVERTED: "Order placed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const CLOSED = new Set(["CONVERTED", "CANCELLED", "EXPIRED"]);

export const bookingStatusLabel = (status: unknown) => BOOKING_STATUS_LABEL[String(status)] ?? "In progress";

export type BookingPayAction = {
  kind: "ADVANCE" | "BALANCE";
  amountPaise: number;
  dueAt: string | null;
  label: string;
};

/** What the customer can pay right now, if anything. */
export function bookingPayAction(b: Pick<CustomerBooking, "status" | "advance" | "balance" | "advanceDueAt" | "balanceDueAt">): BookingPayAction | null {
  if (b.status === "PENDING_ADVANCE" && Number(b.advance?.requiredPaise) > 0) {
    return { kind: "ADVANCE", amountPaise: Number(b.advance?.requiredPaise), dueAt: b.advanceDueAt ?? null, label: "Pay advance" };
  }
  if (b.status === "BALANCE_PENDING" && Number(b.balance?.requiredPaise) > 0) {
    return { kind: "BALANCE", amountPaise: Number(b.balance?.requiredPaise), dueAt: b.balanceDueAt ?? null, label: "Pay balance" };
  }
  return null;
}

export type BookingStep = { key: string; label: string; state: "done" | "current" | "upcoming" | "stopped" };

/** The four stages a booking moves through: advance, billing, balance, order. */
export function bookingSteps(b: Pick<CustomerBooking, "status">): BookingStep[] {
  const order = ["PENDING_ADVANCE", "CONFIRMED", "BALANCE_PENDING", "CONVERTED"];
  const labels = ["Pay advance", "Piece reserved", "Pay balance", "Order placed"];
  const stopped = b.status === "CANCELLED" || b.status === "EXPIRED";
  const at = order.indexOf(b.status);
  return labels.map((label, i) => ({
    key: order[i],
    label,
    state: stopped ? "stopped" : at > i || b.status === "CONVERTED" ? "done" : at === i ? "current" : "upcoming",
  }));
}

/** Fee the policy keeps if the customer cancels now, and what goes back. Same rounding as the server. */
export function estimateCancellation(b: Pick<CustomerBooking, "advance" | "policy">) {
  const captured = Math.max(0, Number(b.advance?.capturedPaise ?? 0));
  const bps = Math.max(0, Number(b.policy?.cancellationFeeBps ?? 0));
  const feePaise = Math.round((captured * bps) / 10_000);
  return { capturedPaise: captured, feePaise, refundPaise: captured - feePaise };
}

export const canCancelBooking = (b: Pick<CustomerBooking, "status">) =>
  ["PENDING_ADVANCE", "CONFIRMED", "BALANCE_PENDING"].includes(b.status);

export type RefundNotice = { tone: "info" | "ok" | "warn"; title: string; detail: string; amountPaise: number };

/** One plain sentence about the money coming back, or null when no refund is involved. */
export function bookingRefundNotice(b: Pick<CustomerBooking, "refundStatus" | "refunds">): RefundNotice | null {
  const status = String(b.refundStatus ?? "NONE");
  if (status === "NONE") return null;
  const amountPaise = (b.refunds ?? []).reduce((sum, r) => sum + Number(r.amountPaise ?? 0), 0);
  if (status === "SETTLED") {
    return { tone: "ok", title: "Refund sent", amountPaise, detail: "Your refund has been sent to your original payment method. Banks can take a few days to show it." };
  }
  if (status === "FAILED") {
    return { tone: "warn", title: "Refund needs the store's help", amountPaise, detail: "We could not send your refund automatically. The store has been alerted and will sort it out with you." };
  }
  return { tone: "info", title: "Refund on the way", amountPaise, detail: "Your refund is being processed. This page updates when it is sent." };
}

/** Keep polling while the booking can still change: open, or closed with a refund still moving. */
export function bookingPollMs(b: Pick<CustomerBooking, "status" | "refundStatus"> | undefined, activeMs = 5_000): number {
  if (!b) return activeMs;
  if (!CLOSED.has(b.status)) return activeMs;
  return String(b.refundStatus ?? "NONE") === "PENDING" ? activeMs : 0;
}

export const isBookingClosed = (status: unknown) => CLOSED.has(String(status));

/** "12 Jan, 4:30 pm" for a due time; empty when there is none. */
export function formatBookingWhen(iso: unknown): string {
  if (!iso) return "";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** "30 minutes" / "2 hours" / "3 days" for a window length given in minutes. */
export function formatWindow(minutes: unknown): string {
  const m = Math.max(0, Number(minutes ?? 0));
  if (m >= 1440 && m % 1440 === 0) return `${m / 1440} ${m / 1440 === 1 ? "day" : "days"}`;
  if (m >= 60 && m % 60 === 0) return `${m / 60} ${m / 60 === 1 ? "hour" : "hours"}`;
  return `${m} ${m === 1 ? "minute" : "minutes"}`;
}

/** A line about the payment the customer just made, from the payment attempt's own status. */
export function bookingPaymentHint(attempt: { status?: unknown } | null | undefined): string | null {
  switch (String(attempt?.status ?? "")) {
    case "SUCCEEDED":
      return "Payment received. Confirming your booking…";
    case "INITIATED":
    case "PENDING":
      return "Your payment is in progress. If you have already paid, this page updates in a moment.";
    case "FAILED":
      return "That payment did not go through. You can try again.";
    case "EXPIRED":
      return "That payment window ended. You can start a new payment.";
    default:
      return null;
  }
}

const PURPOSE_FOR: Record<BookingPayAction["kind"], string> = { ADVANCE: "BOOKING_ADVANCE", BALANCE: "BOOKING_BALANCE" };

/** Key under which the in-flight attempt is remembered: one per payment stage, never shared. */
export const bookingAttemptKey = (bookingId: string, kind: BookingPayAction["kind"]) => `${bookingId}:${kind}`;

/**
 * The attempt that belongs to the stage being paid now. A paid advance is SUCCEEDED forever; it
 * must not be read as the state of the balance payment that follows it.
 */
export function attemptForStage<T extends { purpose?: unknown }>(attempt: T | null | undefined, kind: BookingPayAction["kind"] | undefined): T | null {
  if (!attempt || !kind) return null;
  return String(attempt.purpose ?? "") === PURPOSE_FOR[kind] ? attempt : null;
}

/** Excess advance is only "refunded" once the money has actually been sent. */
export function excessAdvanceLabel(refundStatus: unknown): string {
  return String(refundStatus ?? "NONE") === "SETTLED"
    ? "Advance above final price (refunded)"
    : "Advance above final price (will be refunded)";
}

export type BookableBranch<P = unknown> = { id: string; name: string; code?: string | null; preview: P };

/**
 * Which bookable branch is selected: the customer's choice if it is still bookable, else their own
 * branch if it is, else the first one. Only branches that can take the booking are ever offered, so
 * an ineligible default branch never hides the others.
 */
export function selectBookableBranch<P>(
  branches: BookableBranch<P>[],
  chosenId: string,
  profileBranchId?: string,
): BookableBranch<P> | undefined {
  return (
    branches.find((b) => b.id === chosenId) ??
    branches.find((b) => b.id === profileBranchId) ??
    branches[0]
  );
}

export type BookingQuote = {
  productId: string;
  pickupBranchId: string;
  policyVersionId: string;
  advanceRequiredPaise: number;
  estimateTotalPaise: number;
  ratePerGramPaise: number | null;
};

/** What the customer is agreeing to: the terms, the gold rate, the estimate it gives and the advance. */
export function bookingQuoteSignature(q: BookingQuote): string {
  return [
    q.productId, q.pickupBranchId, q.policyVersionId, q.advanceRequiredPaise, q.estimateTotalPaise, q.ratePerGramPaise ?? "fixed",
  ].join("|");
}

/** The request body for exactly the quote the customer accepted. */
export function bookingRequestBody(q: BookingQuote) {
  return {
    productId: q.productId,
    pickupBranchId: q.pickupBranchId,
    acceptedPolicyVersionId: q.policyVersionId,
    acceptedAdvancePaise: q.advanceRequiredPaise,
    acceptedEstimateTotalPaise: q.estimateTotalPaise,
    acceptedRatePerGramPaise: q.ratePerGramPaise,
  };
}

/**
 * A booking request that was sent but whose outcome is not known yet. It is kept in browser storage,
 * body and key together, so after a refresh the very same request is sent again and the server
 * returns the booking it already made (or reports why none was made) instead of making a second one.
 */
export type PendingBooking = { key: string; at: number; signature: string; body: ReturnType<typeof bookingRequestBody> };

const PENDING_MAX_AGE_MS = 24 * 60 * 60_000;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
/** Saved requests belong to one signed-in customer: another customer on the same browser never sees them. */
export type PendingScope = { tenantSlug: string; customerId: string; productId: string };
const pendingStorageKey = (scope: PendingScope) => `sg:booking-pending:${scope.tenantSlug}:${scope.customerId}:${scope.productId}`;

export function loadPendingBooking(storage: StorageLike | null, scope: PendingScope, now = Date.now()): PendingBooking | null {
  try {
    if (!scope.customerId) return null;
    const raw = storage?.getItem(pendingStorageKey(scope));
    if (!raw) return null;
    const v = JSON.parse(raw) as PendingBooking;
    if (!v?.key || !v.body || typeof v.at !== "number" || now - v.at > PENDING_MAX_AGE_MS) {
      storage?.removeItem(pendingStorageKey(scope));
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

export function savePendingBooking(storage: StorageLike | null, scope: PendingScope, pending: PendingBooking): void {
  try {
    if (!scope.customerId) return;
    storage?.setItem(pendingStorageKey(scope), JSON.stringify(pending));
  } catch {
    /* storage can be unavailable (private mode); the in-page retry still works */
  }
}

export function clearPendingBooking(storage: StorageLike | null, scope: PendingScope): void {
  try {
    if (!scope.customerId) return;
    storage?.removeItem(pendingStorageKey(scope));
  } catch {
    /* ignore */
  }
}

/**
 * True when the server answered and refused the request, so no booking was made and the key can be
 * dropped. A network failure, timeout, 5xx, or "an identical request is already being processed"
 * leaves the outcome unknown: the first request may still finish, so keep the key and retry with it.
 */
export function isDefinitiveBookingFailure(httpStatus: unknown, code?: string): boolean {
  if (code === "REQUEST_IN_PROGRESS") return false;
  return typeof httpStatus === "number" && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408;
}

/**
 * What a customer is told about the gold rate before confirming: how long it is protected after the
 * advance is paid, and what applies once protection has ended.
 */
export function rateProtectionCopy(q: {
  rateRule: unknown;
  rateProtectionHours?: number;
  balanceWindowHours?: number;
}): string {
  const hours = Math.max(0, Number(q.rateProtectionHours ?? 0));
  const balance = Math.max(0, Number(q.balanceWindowHours ?? 0));
  const span = formatWindow(hours * 60);
  const rule = String(q.rateRule);
  const fallback = "the gold rate on the day the store bills you applies, so the final price can be higher or lower than this estimate";
  if (rule === "BILLING_DAY" || hours <= 0) {
    return "The final price is set at the gold rate on the billing day, so it can be higher or lower than this estimate.";
  }
  const whole = balance > 0 && hours >= balance;
  if (rule === "LOWER_OF_BOOKED_AND_BILLING_DAY") {
    return whole
      ? `Until your balance is due you pay whichever is lower: today's gold rate or the rate on the billing day.`
      : `For ${span} after you pay the advance you pay whichever is lower: today's gold rate or the rate on the billing day. If you are billed after that, ${fallback}.`;
  }
  return whole
    ? "Today's gold rate is held for you until your balance is due."
    : `Today's gold rate is held for ${span} after you pay the advance. If you are billed after that, ${fallback}.`;
}
