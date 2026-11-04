/** Plain-language display labels — stored API enums unchanged. */

export const PLAIN_LANGUAGE_GLOSSARY = {
  PAYABLE: "Amount owed",
  SETTLEMENT: "Payment recorded",
  PHYSICAL_OUT: "Metal handed over",
  REMITTANCE: "Courier payment",
} as const;

export const SELL_PAYMENT_DISPLAY: Record<string, string> = {
  AWAITING_ACCEPTANCE: "Previous request needs review",
  UNPAID: "Payment pending",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  PAYMENT_BEING_CHECKED: "Payment being checked",
};

const SELL_ORDER_STATUS: Record<string, string> = {
  RESERVED: "Quote reserved",
  PENDING_APPROVAL: "Previous request needs review",
  PAYABLE_OPEN: "Payment pending",
  EXECUTED: "Sale accepted",
  CANCELLED: "Cancelled",
  EXPIRED: "Quote expired",
};

const ECOMMERCE_ORDER_STATUS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_EXPIRED: "Payment window expired",
  PAYMENT_FAILED: "Payment failed",
  COD_PENDING_ACCEPTANCE: "Awaiting store acceptance",
  PAID: "Paid",
  PROCESSING: "Preparing order",
  READY_FOR_PICKUP: "Ready for pickup",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund in progress",
  REFUNDED: "Refunded",
};

/**
 * Cross-module plain-language labels for status codes whose title-cased enum
 * reads like jargon ("Payable open", "Cod pending acceptance"). Only genuine
 * status codes belong here; anything not listed keeps the title-case fallback.
 */
const GENERAL_STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Awaiting acceptance",
  PAYABLE_OPEN: "Payment pending",
  CHARGE_PAID: "Charges paid",
  COD_PENDING_ACCEPTANCE: "Awaiting store acceptance",
  READY_FOR_PICKUP: "Ready for pickup",
  WAITING_CUSTOMER: "Waiting on customer",
  PAYMENT_PENDING: "Awaiting payment",
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_EXPIRED: "Payment window expired",
  PAYMENT_FAILED: "Payment failed",
  PENDING_VERIFICATION: "Awaiting verification",
  PENDING_DECISION: "Awaiting decision",
  PENDING_RESOLUTION: "Awaiting resolution",
  REFUND_REVIEW: "Refund under review",
  AMOUNT_MISMATCH_PENDING_REVIEW: "Amount mismatch — under review",
  UNALLOCATED_PENDING_REVIEW: "Unmatched — under review",
  MANUAL_REVIEW: "Needs manual review",
  UNKNOWN_OUTCOME: "Outcome unclear",
  CLOSED_PREMATURE: "Closed early",
  PREMATURE_CLOSURE: "Closed early",
  ENROLMENT_EXPIRED: "Enrolment expired",
  IN_TRANSIT: "In transit",
  GRACE: "Grace period",
  DISCREPANCY: "Needs reconciliation",
};

export function plainLanguageStatusLabel(status?: string | null): string | undefined {
  const key = status?.trim()?.toUpperCase() ?? "";
  if (!key) return undefined;
  return SELL_ORDER_STATUS[key] ?? ECOMMERCE_ORDER_STATUS[key] ?? GENERAL_STATUS_LABELS[key];
}

/**
 * Context-free plain label. Unlike plainLanguageStatusLabel this never applies
 * the sell/ecommerce-specific maps, so it is safe as a default for a generic
 * status badge used across every module.
 */
export function generalStatusLabel(status?: string | null): string | undefined {
  const key = status?.trim()?.toUpperCase() ?? "";
  if (!key) return undefined;
  return GENERAL_STATUS_LABELS[key];
}

export function statusBadgeLabel(status?: string | null, explicit?: string): string {
  if (explicit) return explicit;
  return plainLanguageStatusLabel(status) ?? formatFallbackStatus(status);
}

function formatFallbackStatus(status?: string | null) {
  const key = status?.trim() ? status.trim() : "UNKNOWN";
  return key
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
