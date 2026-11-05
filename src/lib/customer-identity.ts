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

export function resetCustomerScopedClientState(dispatch: AppDispatch) {
  dispatch(customerDataEpochBump());
  dispatch(customerApi.util.resetApiState());
  if (typeof window !== "undefined") {
    clearCustomerPaymentSession();
  }
}

export function readCustomerDataEpoch(state: RootState): number {
  return state.customerSession.dataEpoch ?? 0;
}
