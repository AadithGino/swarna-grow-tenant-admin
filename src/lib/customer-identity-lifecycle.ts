import { markCustomerIdentityRevalidation } from "@/src/lib/customer-identity";
import { onTokensPersisted, TOKEN_KEYS } from "@/src/lib/auth-token-storage";
import { store } from "@/src/store";
import { customerTokensReplaced } from "@/src/store/slices/customer-session-slice";

let started = false;

function onCustomerTokensChanged() {
  store.dispatch(customerTokensReplaced());
  markCustomerIdentityRevalidation(store.dispatch);
}

/** Module-scoped listeners survive CustomerIdentityProvider unmount/remount. */
export function ensureCustomerIdentityLifecycle() {
  if (started || typeof window === "undefined") return;
  started = true;
  onTokensPersisted("customer", onCustomerTokensChanged);
  window.addEventListener("swarnagrow:customer-tokens-updated", onCustomerTokensChanged);
  window.addEventListener("storage", (event: StorageEvent) => {
    if (!event.key?.startsWith("swarnagrow.customer.")) return;
    if (
      event.key === TOKEN_KEYS.customer.access
      || event.key === TOKEN_KEYS.customer.refresh
    ) {
      onCustomerTokensChanged();
    }
  });
}
