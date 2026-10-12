/** Matches backend `presentEcommerceAccessState`. */
export type EcommerceServerAccessState = {
  planEntitled?: boolean;
  enabled?: boolean;
  active?: boolean;
  /** Tenant has at least one ecommerce order (historical read). */
  hasOrderHistory?: boolean;
};

export function resolveEcommerceServerAccess(
  subscription?: { ecommerce?: EcommerceServerAccessState } | null,
  operations?: { ecommerce?: EcommerceServerAccessState } | null,
): EcommerceServerAccessState | null {
  const fromSubscription = subscription?.ecommerce;
  if (fromSubscription && typeof fromSubscription === "object") {
    return fromSubscription;
  }
  const fromOperations = operations?.ecommerce;
  if (fromOperations && typeof fromOperations === "object") {
    return fromOperations;
  }
  return null;
}

export function isEcommercePlanEntitled(
  state: EcommerceServerAccessState | null | undefined,
): boolean {
  return state?.planEntitled === true;
}

/** Customer storefront live — separate from admin catalog access. */
export function isEcommerceStorefrontActive(
  state: EcommerceServerAccessState | null | undefined,
): boolean {
  return state?.active === true;
}

export function hasEcommerceOrderHistory(
  state: EcommerceServerAccessState | null | undefined,
): boolean {
  return state?.hasOrderHistory === true;
}

/** Read-only orders/reports/history without current plan entitlement. */
export function canViewEcommerceHistoricalWorkspace(
  state: EcommerceServerAccessState | null | undefined,
): boolean {
  return isEcommercePlanEntitled(state) || hasEcommerceOrderHistory(state);
}
