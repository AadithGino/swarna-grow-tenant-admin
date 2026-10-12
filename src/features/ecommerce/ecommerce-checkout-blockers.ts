import type { ParsedApiError } from "@/src/lib/api-error";

export type CheckoutBlocker = { code?: string; message?: string };

export const CHECKOUT_BLOCKER_FIELD: Record<string, string> = {
  MISSING_CATALOG_DEFAULT_CLASSIFICATION: "taxDefaultClassification",
  MISSING_ACTIVE_TAX_RATES: "taxRates",
  TAX_PRESENTATION_UNCONFIGURED: "presentation",
  CHECKOUT_BLOCKED_ESTIMATE_ONLY: "presentation",
  MISSING_SELLER_LEGAL_NAME: "sellerLegalName",
  MISSING_OR_INVALID_SELLER_GSTIN: "sellerGstin",
  MISSING_REGISTERED_STATE: "registeredState",
  MISSING_DEFAULT_PLACE_OF_SUPPLY: "defaultPlaceOfSupplyState",
  MISSING_DEFAULT_ITEM_CLASSIFICATION: "defaultItemTaxClassification",
  UNKNOWN_ITEM_CLASSIFICATION: "defaultItemTaxClassification",
  MISSING_ACCOUNTANT_SIGN_OFF: "accountantSignOffReference",
  MISSING_ACCOUNTANT_APPROVED_AT: "accountantApprovedAt",
  MISSING_HSN_SAC_MAPPING: "hsnSacMappings",
  MISSING_SUPPORTED_DESTINATIONS: "supportedDestinationStates",
  MISSING_COMPONENT_TAX_LINES: "componentRules",
  INVALID_COMPONENT_LINE: "componentRules",
  INVALID_COMPONENT_RATE: "componentRules",
  STORE_POLICIES_NOT_PUBLISHED: "storePolicies",
};

export const CHECKOUT_BLOCKER_TAX_LINK = new Set([
  "MISSING_CATALOG_DEFAULT_CLASSIFICATION",
  "MISSING_ACTIVE_TAX_RATES",
  "MISSING_HSN_SAC_MAPPING",
  "UNKNOWN_ITEM_CLASSIFICATION",
]);

export function blockersFromReadiness(
  readiness?: { blockers?: CheckoutBlocker[] } | null,
): CheckoutBlocker[] {
  return readiness?.blockers ?? [];
}

export function blockersForField(
  blockers: CheckoutBlocker[],
  fieldKey: string,
): CheckoutBlocker[] {
  return blockers.filter((b) => b.code && CHECKOUT_BLOCKER_FIELD[b.code] === fieldKey);
}

function extractCheckoutBlockers(err: unknown): CheckoutBlocker[] {
  const rtk = err as { data?: { error?: { details?: unknown } } };
  const raw = rtk?.data?.error?.details;
  if (raw && typeof raw === "object" && Array.isArray((raw as { blockers?: CheckoutBlocker[] }).blockers)) {
    return (raw as { blockers: CheckoutBlocker[] }).blockers;
  }
  if (Array.isArray(raw)) return raw as CheckoutBlocker[];
  return [];
}

export function formatCheckoutNotReadyMessage(err: unknown, parsed: ParsedApiError): string {
  if (parsed.code !== "CHECKOUT_NOT_READY") return parsed.message;
  const blockers = extractCheckoutBlockers(err);
  if (!blockers.length) return parsed.message;
  const lines = blockers
    .map((b) => b.message ?? b.code)
    .filter(Boolean)
    .slice(0, 4);
  return `Checkout is not ready yet: ${lines.join(" ")}`;
}
