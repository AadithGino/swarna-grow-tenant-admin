export type CapabilityBlocker = { code?: string; message?: string };

/** Mirrors backend deriveEcommerceCheckoutCapability payment gates (not tax-only). */
export const ECOMMERCE_PAYMENT_GATE_CODES = new Set([
  "STORE_NOT_OPERATIONAL",
  "PLAN_ECOMMERCE_DISABLED",
  "PLAN_ECOMMERCE_PAYMENTS_DISABLED",
  "CUSTOMER_PAYMENTS_DISABLED",
  "PAYMENT_GATEWAY_NOT_CONFIGURED",
  "ECOMMERCE_PAYMENTS_ROLLOUT_OFF",
  "TENANT_ECOMMERCE_PAYMENTS_ROLLOUT_OFF",
]);

export const ECOMMERCE_TAX_BLOCKER_CODES = new Set([
  "MISSING_CATALOG_DEFAULT_CLASSIFICATION",
  "MISSING_ACTIVE_TAX_RATES",
  "TAX_PRESENTATION_UNCONFIGURED",
  "CHECKOUT_BLOCKED_ESTIMATE_ONLY",
  "MISSING_SELLER_LEGAL_NAME",
  "MISSING_OR_INVALID_SELLER_GSTIN",
  "MISSING_REGISTERED_STATE",
  "MISSING_DEFAULT_PLACE_OF_SUPPLY",
  "MISSING_DEFAULT_ITEM_CLASSIFICATION",
  "UNKNOWN_ITEM_CLASSIFICATION",
  "MISSING_ACCOUNTANT_SIGN_OFF",
  "MISSING_ACCOUNTANT_APPROVED_AT",
  "MISSING_HSN_SAC_MAPPING",
  "MISSING_SUPPORTED_DESTINATIONS",
  "MISSING_COMPONENT_TAX_LINES",
  "INVALID_COMPONENT_LINE",
  "INVALID_COMPONENT_RATE",
]);

export function taxBlockers(blockers: CapabilityBlocker[] | undefined): CapabilityBlocker[] {
  return (blockers ?? []).filter((b) => b.code && ECOMMERCE_TAX_BLOCKER_CODES.has(b.code));
}

export function paymentGateBlockers(blockers: CapabilityBlocker[] | undefined): CapabilityBlocker[] {
  return (blockers ?? []).filter((b) => b.code && ECOMMERCE_PAYMENT_GATE_CODES.has(b.code));
}

export function formatPaymentBlockedReason(blockers: CapabilityBlocker[] | undefined): string | null {
  const gates = paymentGateBlockers(blockers);
  if (!gates.length) return null;
  return gates.map((b) => b.message ?? b.code).join(" ");
}
