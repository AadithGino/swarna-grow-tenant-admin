import type { AppDispatch } from "@/src/store";
import { customerApi } from "@/src/store/api/customer-api";
import { clearCustomerPaymentSession } from "@/src/lib/customer-payment-session";

export function customerUrlTenantMatchesSession(
  urlTenantId: string | null | undefined,
  sessionTenantId: string | null | undefined,
): boolean {
  if (!urlTenantId || !sessionTenantId) return false;
  return String(urlTenantId) === String(sessionTenantId);
}

export function resetCustomerScopedClientState(dispatch: AppDispatch) {
  dispatch(customerApi.util.resetApiState());
  if (typeof window !== "undefined") {
    clearCustomerPaymentSession();
  }
}
