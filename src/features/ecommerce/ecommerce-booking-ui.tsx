import { formatInrFromPaise } from "@/src/lib/digital-metals-display";

export const inr = formatInrFromPaise;

export function dateTime(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Basis points as a percentage, e.g. 2500 → "25%". */
export function bpsLabel(bps: unknown): string {
  const n = Number(bps);
  if (!Number.isFinite(n)) return "—";
  return `${(n / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING_ADVANCE: "Awaiting advance",
  CONFIRMED: "Confirmed",
  BALANCE_PENDING: "Awaiting balance",
  CONVERTED: "Converted to order",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export const REFUND_STATUS_LABEL: Record<string, string> = {
  NONE: "No refund",
  PENDING: "Refund pending",
  SETTLED: "Refund settled",
  FAILED: "Refund failed",
};

export const RATE_RULE_LABEL: Record<string, string> = {
  BOOKED_RATE: "Booked rate while protected, otherwise the day's rate",
  BILLING_DAY: "Always the day's rate at billing",
  LOWER_OF_BOOKED_AND_BILLING_DAY: "Lower of booked and billing-day rate",
};

export const OPEN_BOOKING = new Set(["PENDING_ADVANCE", "CONFIRMED", "BALANCE_PENDING"]);
export const TERMINAL_REFUND = new Set(["SUCCEEDED", "COMPLETED", "MANUAL_RECORDED", "CLOSED"]);

/**
 * Rate protection and the balance deadline both start when the advance is paid. When protection is
 * shorter, a final bill made late in the balance window uses the billing-day rate instead of the
 * rate the customer was shown.
 */
export function rateProtectionEndsEarly(p: { rateRule?: unknown; rateProtectionHours?: unknown; balanceWindowHours?: unknown }): boolean {
  if (String(p.rateRule) === "BILLING_DAY") return false;
  return Math.max(0, Number(p.rateProtectionHours ?? 0)) < Math.max(1, Number(p.balanceWindowHours ?? 72));
}

export const RATE_PROTECTION_WARNING =
  "Rate protection ends before the balance is due. If staff bill after it ends, the billing-day gold rate applies, not the rate the customer was shown.";

/** "2 days left", "5 h left", "12 min left", or "overdue". */
export function timeLeftShort(iso: unknown, now = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(String(iso)).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "overdue";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h} h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))} min left`;
}

export type BookingNextStep = {
  /** Who acts next: the shop, the customer, or nobody. */
  owner: "STAFF" | "CUSTOMER" | "NONE";
  label: string;
  detail?: string;
  tone: "action" | "waiting" | "danger" | "done";
};

type NextStepInput = {
  status?: string;
  refundStatus?: string;
  advanceDueAt?: unknown;
  balanceDueAt?: unknown;
  rateProtectedUntil?: unknown;
  refunds?: { status?: string }[];
};

/** What has to happen next on a booking, phrased for the shop. Refund trouble outranks everything. */
export function bookingNextStep(b: NextStepInput, now = Date.now()): BookingNextStep {
  const refunds = b.refunds ?? [];
  if (refunds.some((r) => r.status === "FAILED")) {
    return { owner: "STAFF", label: "Refund failed", detail: "Retry it or record it as paid outside", tone: "danger" };
  }
  if (refunds.some((r) => r.status === "ASSIGNED")) {
    return { owner: "STAFF", label: "Send the refund", detail: "Waiting for staff to dispatch", tone: "action" };
  }
  switch (b.status) {
    case "PENDING_ADVANCE":
      return { owner: "CUSTOMER", label: "Customer paying advance", detail: timeLeftShort(b.advanceDueAt, now) ?? undefined, tone: "waiting" };
    case "CONFIRMED": {
      const protectedLeft = timeLeftShort(b.rateProtectedUntil, now);
      return {
        owner: "STAFF",
        label: "Prepare the final bill",
        detail: protectedLeft && protectedLeft !== "overdue" ? `Booked rate for ${protectedLeft.replace(" left", "")}` : `Bill by ${dateTime(b.balanceDueAt)}`,
        tone: "action",
      };
    }
    case "BALANCE_PENDING":
      return { owner: "CUSTOMER", label: "Customer paying balance", detail: timeLeftShort(b.balanceDueAt, now) ?? undefined, tone: "waiting" };
    case "CONVERTED":
      return { owner: "NONE", label: "Order created", tone: "done" };
    default:
      if (b.refundStatus === "PENDING") return { owner: "NONE", label: "Refund in progress", tone: "waiting" };
      return { owner: "NONE", label: "Closed", tone: "done" };
  }
}

export const BOOKING_STAGES = [
  { key: "PENDING_ADVANCE", label: "Booked" },
  { key: "CONFIRMED", label: "Advance paid" },
  { key: "BALANCE_PENDING", label: "Billed" },
  { key: "CONVERTED", label: "Order created" },
] as const;

/** Index of the last completed stage, or null when the booking was cancelled or expired. */
export function bookingStageIndex(status: unknown): number | null {
  const i = BOOKING_STAGES.findIndex((x) => x.key === String(status));
  return i < 0 ? null : i;
}
