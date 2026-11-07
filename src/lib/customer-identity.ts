import type { AppDispatch, RootState } from "@/src/store";
import { customerApi } from "@/src/store/api/customer-api";
import { clearCustomerPaymentSession } from "@/src/lib/customer-payment-session";
import { customerDataEpochBump } from "@/src/store/slices/customer-session-slice";

export function customerUrlTenantMatchesSession(
  urlTenantId: string | null | undefined,
  sessionTenantId: string | null | undefined,
): boolean {
  if (!urlTenantId || !sessionTenantId) return false;
  return String(urlTenantId) === String(sessionTenantId);
}

export type ResetCustomerScopedClientStateOptions = {
  clearPaymentSession?: boolean;
};

export function resetCustomerScopedClientState(
  dispatch: AppDispatch,
  options: ResetCustomerScopedClientStateOptions = {},
) {
  const { clearPaymentSession = true } = options;
  dispatch(customerDataEpochBump());
  dispatch(customerApi.util.resetApiState());
  if (clearPaymentSession && typeof window !== "undefined") {
    clearCustomerPaymentSession();
  }
}

/** Cross-tab token changes: block protected work and drop stale cache without clearing checkout state yet. */
export function markCustomerIdentityRevalidation(dispatch: AppDispatch) {
  dispatch(customerDataEpochBump());
  dispatch(customerApi.util.invalidateTags(["CustomerProfile", "CustomerHome"]));
}

export function readCustomerDataEpoch(state: RootState): number {
  return state.customerSession.dataEpoch ?? 0;
}

export function readCustomerSessionGeneration(state: RootState): number {
  return state.customerSession.sessionGeneration ?? 0;
}

export function readCustomerIdentityRevalidating(state: RootState): boolean {
  return state.customerSession.identityRevalidating ?? false;
}
